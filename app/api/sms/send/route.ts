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

    // Admin kullanıcıları için rol kontrolü
    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    // Get user to check credit using Supabase (admin değilse)
    let userCredit = 0;
    let requiredCredit = 0;
    let updatedUser: any = null;
    
    if (!isAdmin) {
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
      // 180 karakter = 1 kredi
      const messageLength = message.length;
      requiredCredit = Math.ceil(messageLength / 180) || 1; // En az 1 kredi
      userCredit = user.credit || 0;
      
      if (userCredit < requiredCredit) {
        return NextResponse.json(
          {
            success: false,
            message: `Yetersiz kredi. Gerekli: ${requiredCredit} (${messageLength} karakter / 180 = ${requiredCredit} kredi), Mevcut: ${userCredit}`,
          },
          { status: 400 }
        );
      }

      // Kredi düş (başarılı veya başarısız olsun, kredi düşülecek, başarısız olursa 48 saat sonra iade edilecek)
      const { data: updatedUserData, error: updateError } = await supabaseServer
        .from('users')
        .update({ credit: Math.max(0, (userCredit || 0) - requiredCredit) })
        .eq('id', auth.user.userId)
        .select('credit')
        .single();

      if (updateError) {
        return NextResponse.json(
          { success: false, message: updateError.message || 'Kredi güncellenemedi' },
          { status: 500 }
        );
      }
      
      updatedUser = updatedUserData;
    } else {
      // Admin kullanıcıları için kredi hesaplama (sadece cost için)
      const messageLength = message.length;
      requiredCredit = Math.ceil(messageLength / 180) || 1; // En az 1 kredi (sadece cost için)
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
          cost: isAdmin ? 0 : requiredCredit, // Admin kullanıcıları için cost: 0
          cep_sms_message_id: smsResult.messageId,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !smsMessageData) {
        // SMS kaydı oluşturulamadı, krediyi geri ver (admin değilse)
        if (!isAdmin) {
          await supabaseServer
            .from('users')
            .update({ credit: userCredit })
            .eq('id', auth.user.userId);
        }
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
          remainingCredit: isAdmin ? null : (updatedUser ? updatedUser.credit : 0), // Admin için kredi gösterilmez
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
          cost: isAdmin ? 0 : requiredCredit, // Admin kullanıcıları için cost: 0
          failed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!failedError && failedSmsData && !isAdmin) {
        // Otomatik iade oluştur (48 saat sonra işlenecek) - Admin kullanıcıları için iade oluşturulmaz
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

      return NextResponse.json(
        {
          success: false,
          message: isAdmin 
            ? (smsResult.error || 'SMS gönderim hatası.')
            : (smsResult.error || 'SMS gönderim hatası. Kredi düşüldü, 48 saat içinde otomatik iade edilecektir.'),
          data: {
            remainingCredit: isAdmin ? null : (updatedUser ? updatedUser.credit : 0), // Admin için kredi gösterilmez
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

