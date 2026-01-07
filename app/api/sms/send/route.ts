import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { sendSMS } from '@/lib/utils/cepSMSProvider';
import { deductSystemCredit, getSystemCredit, addSystemCredit } from '@/lib/utils/systemCredit';

// POST /api/sms/send - Tekli SMS gönderimi
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phone, message, serviceName } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, message: 'Telefon numarası ve mesaj gerekli' },
        { status: 400 }
      );
    }

    // Telefon numarası validasyonu: Sadece 905**, 05**, 5** formatları kabul edilir
    const phoneNumbers = phone.split(/[,\n]/).map((p: string) => p.trim()).filter((p: string) => p);
    const phoneRegex = /^(905|05|5)\d+$/;
    const invalidPhones = phoneNumbers.filter((p: string) => !phoneRegex.test(p));
    
    if (invalidPhones.length > 0) {
      return NextResponse.json(
        { success: false, message: `Geçersiz telefon numarası formatı: ${invalidPhones.join(', ')}. Sadece 905**, 05**, 5** formatları kabul edilir.` },
        { status: 400 }
      );
    }

    // Birden fazla numara varsa, her numaraya ayrı SMS gönder
    // Şimdilik sadece ilk numaraya gönder (toplu SMS için bulk-sms endpoint'i kullanılmalı)
    const firstPhone = phoneNumbers[0];

    // Sistem kredisi kontrolü - Her SMS = 1 kredi
    const requiredCredit = 1; // Her SMS 1 kredi
    const systemCreditCheck = await deductSystemCredit(requiredCredit);
    
    if (!systemCreditCheck.success) {
      return NextResponse.json(
        {
          success: false,
          message: systemCreditCheck.error || 'Yetersiz sistem kredisi',
        },
        { status: 400 }
      );
    }

    // Send SMS (birden fazla numara varsa sadece ilk numaraya gönder)
    const smsResult = await sendSMS(firstPhone, message);

    if (smsResult.success && smsResult.messageId) {
      // Create SMS message record using Supabase
      // Her SMS kaydı = 1 kredi (cost: 1)
      const { data: smsMessageData, error: createError } = await supabaseServer
        .from('sms_messages')
        .insert({
          user_id: auth.user.userId,
          phone_number: firstPhone,
          message,
          sender: serviceName || null,
          status: 'gönderildi',
          cost: requiredCredit, // Her SMS = 1 kredi
          cep_sms_message_id: smsResult.messageId,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !smsMessageData) {
        // SMS kaydı oluşturulamadı, sistem kredisini geri ver
        await addSystemCredit(requiredCredit);
        return NextResponse.json(
          { success: false, message: createError?.message || 'SMS kaydı oluşturulamadı' },
          { status: 500 }
        );
      }

      // Sistem kredisini al (güncel değer için)
      const remainingSystemCredit = await getSystemCredit();
      
      return NextResponse.json({
        success: true,
        message: 'SMS başarıyla gönderildi',
        data: {
          messageId: smsMessageData.id,
          cepSmsMessageId: smsResult.messageId,
          remainingSystemCredit: remainingSystemCredit,
        },
      });
    } else {
      // SMS gönderim başarısız - kredi düşüldü, otomatik iade oluştur (48 saat sonra iade edilecek)
      const { data: failedSmsData, error: failedError } = await supabaseServer
        .from('sms_messages')
        .insert({
          user_id: auth.user.userId,
          phone_number: firstPhone,
          message,
          sender: serviceName || null,
          status: 'failed',
          cost: requiredCredit, // Her SMS = 1 kredi
          failed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!failedError && failedSmsData) {
        // Otomatik iade oluştur (48 saat sonra işlenecek) - Sistem kredisini geri verecek
        await supabaseServer
          .from('refunds')
          .insert({
            user_id: auth.user.userId,
            sms_id: failedSmsData.id,
            original_cost: requiredCredit,
            refund_amount: requiredCredit,
            reason: 'SMS gönderim başarısız - Otomatik iade (48 saat)',
            status: 'pending',
          });
      }

      // Sistem kredisini al (güncel değer için)
      const remainingSystemCredit = await getSystemCredit();

      return NextResponse.json(
        {
          success: false,
          message: smsResult.error || 'SMS gönderim hatası. Sistem kredisi düşüldü, 48 saat içinde otomatik iade edilecektir.',
          data: {
            remainingSystemCredit: remainingSystemCredit,
          },
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'SMS gönderim hatası' },
      { status: 500 }
    );
  }
}

