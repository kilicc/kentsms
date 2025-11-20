import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateApiKey } from '@/lib/middleware/apiKeyAuth';
import { checkSMSStatus } from '@/lib/utils/cepSMSProvider';

/**
 * POST /api/v1/sms/report
 * CepSMS formatına benzer SMS raporu
 * 
 * Request (JSON):
 * {
 *   "User": "API_KEY",
 *   "Pass": "API_SECRET",
 *   "MessageId": "uuid"
 * }
 * 
 * Response:
 * {
 *   "Status": "OK",
 *   "Report": [
 *     {
 *       "GSM": "905321234567",
 *       "State": "İletildi",
 *       "Network": "Turkcell"
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // API Key authentication
    const auth = await authenticateApiKey(request);
    
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        {
          Status: 'Error',
          Error: auth.error || 'Unauthorized',
          Report: [],
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { MessageId } = body;

    if (!MessageId) {
      return NextResponse.json(
        {
          Status: 'Error',
          Error: 'MessageId gerekli',
          Report: [],
        },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    // SMS mesajını bul
    const { data: smsMessage, error: smsError } = await supabaseServer
      .from('sms_messages')
      .select('id, phone_number, status, network, cep_sms_message_id, user_id')
      .eq('id', MessageId)
      .eq('user_id', auth.user.id)
      .single();

    if (smsError || !smsMessage) {
      return NextResponse.json(
        {
          Status: 'Error',
          Error: 'SMS mesajı bulunamadı',
          Report: [],
        },
        { status: 404 }
      );
    }

    // Durum kontrolü yap (eğer cep_sms_message_id varsa)
    let currentStatus = smsMessage.status;
    let network = smsMessage.network;

    if (smsMessage.cep_sms_message_id) {
      try {
        const statusResult = await checkSMSStatus(
          smsMessage.cep_sms_message_id,
          smsMessage.phone_number
        );

        if (statusResult.success && statusResult.status) {
          currentStatus = statusResult.status;
          if (statusResult.network) {
            network = statusResult.network;
          }

          // Durumu güncelle
          await supabaseServer
            .from('sms_messages')
            .update({
              status: currentStatus,
              network: network,
              updated_at: new Date().toISOString(),
            })
            .eq('id', smsMessage.id);
        }
      } catch (error) {
        console.error('Status check error:', error);
        // Hata olsa bile mevcut durumu döndür
      }
    }

    // Durumları Türkçe'ye çevir
    const statusMap: Record<string, string> = {
      'gönderildi': 'Rapor Bekliyor',
      'sent': 'Rapor Bekliyor',
      'rapor_bekliyor': 'Rapor Bekliyor',
      'iletildi': 'İletildi',
      'delivered': 'İletildi',
      'iletilmedi': 'İletilmedi',
      'failed': 'İletilmedi',
      'zaman_aşımı': 'Zaman Aşımı',
      'timeout': 'Zaman Aşımı',
    };

    const state = statusMap[currentStatus] || currentStatus || 'Rapor Bekliyor';

    // Operatör isimlerini düzelt
    const networkMap: Record<string, string> = {
      'TTMobile': 'TTMobile',
      'Turkcell': 'Turkcell',
      'Vodafone': 'Vodafone',
      'KKTCell': 'KKTCell',
      'Telsim': 'Telsim',
    };

    const networkName = network && networkMap[network] ? networkMap[network] : (network || 'Şebeke Dışı');

    return NextResponse.json({
      Status: 'OK',
      Report: [
        {
          GSM: smsMessage.phone_number,
          State: state,
          Network: networkName,
        },
      ],
    });
  } catch (error: any) {
    console.error('SMS report error:', error);
    return NextResponse.json(
      {
        Status: 'Error',
        Error: error.message || 'Rapor alınamadı',
        Report: [],
      },
      { status: 500 }
    );
  }
}

