import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { sendSMS } from '@/lib/utils/cepSMSProvider';

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

    // Get user to check credit using Supabase
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('credit')
      .eq('id', auth.user.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Check credit
    // Her bir numara için 1 SMS = 1 kredi
    const userCredit = user.credit || 0;
    const requiredCredit = 1; // 1 numara = 1 SMS = 1 kredi
    
    if (userCredit < requiredCredit) {
      return NextResponse.json(
        {
          success: false,
          message: `Yetersiz kredi. Gerekli: ${requiredCredit} (1 numara × 1 kredi), Mevcut: ${userCredit}`,
        },
        { status: 400 }
      );
    }

    // Kredi düş (başarılı veya başarısız olsun, kredi düşülecek, başarısız olursa 48 saat sonra iade edilecek)
    const { data: updatedUser, error: updateError } = await supabaseServer
      .from('users')
      .update({ credit: Math.max(0, (userCredit || 0) - 1) })
      .eq('id', auth.user.userId)
      .select('credit')
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, message: updateError.message || 'Kredi güncellenemedi' },
        { status: 500 }
      );
    }

    // Send SMS
    const smsResult = await sendSMS(phone, message);

    if (smsResult.success && smsResult.messageId) {
      // Create SMS message record using Supabase
      // Her SMS kaydı = 1 kredi (cost: 1)
      const { data: smsMessageData, error: createError } = await supabaseServer
        .from('sms_messages')
        .insert({
          user_id: auth.user.userId,
          phone_number: phone,
          message,
          sender: serviceName || null,
          status: 'sent',
          cost: 1, // Her numara için 1 kredi
          cep_sms_message_id: smsResult.messageId,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !smsMessageData) {
        // SMS kaydı oluşturulamadı, krediyi geri ver
        await supabaseServer
          .from('users')
          .update({ credit: userCredit })
          .eq('id', auth.user.userId);
        return NextResponse.json(
          { success: false, message: createError?.message || 'SMS kaydı oluşturulamadı' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'SMS başarıyla gönderildi',
        data: {
          messageId: smsMessageData.id,
          cepSmsMessageId: smsResult.messageId,
          remainingCredit: updatedUser?.credit || 0,
        },
      });
    } else {
      // SMS gönderim başarısız - kredi düşüldü, otomatik iade oluştur (48 saat sonra iade edilecek)
      const { data: failedSmsData, error: failedError } = await supabaseServer
        .from('sms_messages')
        .insert({
          user_id: auth.user.userId,
          phone_number: phone,
          message,
          sender: serviceName || null,
          status: 'failed',
          cost: 1,
          failed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!failedError && failedSmsData) {
        // Otomatik iade oluştur (48 saat sonra işlenecek)
        await supabaseServer
          .from('refunds')
          .insert({
            user_id: auth.user.userId,
            sms_id: failedSmsData.id,
            original_cost: 1,
            refund_amount: 1,
            reason: 'SMS gönderim başarısız - Otomatik iade (48 saat)',
            status: 'pending',
          });
      }

      return NextResponse.json(
        {
          success: false,
          message: smsResult.error || 'SMS gönderim hatası. Kredi düşüldü, 48 saat içinde otomatik iade edilecektir.',
          data: {
            remainingCredit: updatedUser?.credit || 0,
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

