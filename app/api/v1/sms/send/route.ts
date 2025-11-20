import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateApiKey } from '@/lib/middleware/apiKeyAuth';
import { sendSMS, formatPhoneNumber } from '@/lib/utils/cepSMSProvider';

/**
 * POST /api/v1/sms/send
 * Basit SMS gönderimi - CepSMS formatına benzer
 */
export async function POST(request: NextRequest) {
  try {
    // API Key authentication
    const auth = await authenticateApiKey(request);
    
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        {
          MessageId: 0,
          Status: 'Error',
          Error: auth.error || 'Unauthorized',
        },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch (error: any) {
      return NextResponse.json(
        {
          MessageId: 0,
          Status: 'Error',
          Error: 'Geçersiz JSON formatı veya request body okunamadı',
        },
        { status: 400 }
      );
    }
    const { Message, Numbers } = body;

    // Validation
    if (!Message || !Numbers || !Array.isArray(Numbers) || Numbers.length === 0) {
      return NextResponse.json(
        {
          MessageId: 0,
          Status: 'Error',
          Error: 'Message ve Numbers (array) gerekli',
        },
        { status: 400 }
      );
    }

    // Telefon numarası validasyonu
    const phoneNumbers = Numbers.map((num: string) => {
      try {
        return formatPhoneNumber(num);
      } catch (error: any) {
        throw new Error(`Geçersiz telefon numarası: ${num}`);
      }
    });

    // Kredi kontrolü (admin değilse)
    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    const supabaseServer = getSupabaseServer();
    let userCredit = 0;
    let requiredCredit = 0;

    if (!isAdmin) {
      const { data: user, error: userError } = await supabaseServer
        .from('users')
        .select('credit')
        .eq('id', auth.user.id)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          {
            MessageId: 0,
            Status: 'Error',
            Error: 'Kullanıcı bulunamadı',
          },
          { status: 404 }
        );
      }

      userCredit = user.credit || 0;
      const messageLength = Message.length;
      requiredCredit = Math.ceil(messageLength / 180) || 1; // 180 karakter = 1 kredi
      const totalRequiredCredit = phoneNumbers.length * requiredCredit;

      if (userCredit < totalRequiredCredit) {
        return NextResponse.json(
          {
            MessageId: 0,
            Status: 'Error',
            Error: `Yetersiz kredi. Gerekli: ${totalRequiredCredit}, Mevcut: ${userCredit}`,
          },
          { status: 400 }
        );
      }

      // Kredi düş
      await supabaseServer
        .from('users')
        .update({ credit: Math.max(0, userCredit - totalRequiredCredit) })
        .eq('id', auth.user.id);
    } else {
      const messageLength = Message.length;
      requiredCredit = Math.ceil(messageLength / 180) || 1;
    }

    // İlk numaraya SMS gönder (basit send için sadece ilk numara)
    const firstPhone = phoneNumbers[0];
    const smsResult = await sendSMS(firstPhone, Message);

    if (smsResult.success && smsResult.messageId) {
      // SMS kaydı oluştur
      const { data: smsMessageData, error: createError } = await supabaseServer
        .from('sms_messages')
        .insert({
          user_id: auth.user.id,
          phone_number: firstPhone,
          message: Message,
          status: 'gönderildi',
          cost: isAdmin ? 0 : requiredCredit,
          cep_sms_message_id: smsResult.messageId,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !smsMessageData) {
        // Kredi geri ver (admin değilse)
        if (!isAdmin) {
          await supabaseServer
            .from('users')
            .update({ credit: userCredit })
            .eq('id', auth.user.id);
        }
        return NextResponse.json(
          {
            MessageId: 0,
            Status: 'Error',
            Error: 'SMS kaydı oluşturulamadı',
          },
          { status: 500 }
        );
      }

      // CepSMS formatına uyumlu: MessageId string veya number olabilir
      return NextResponse.json({
        MessageId: smsMessageData.id,
        Status: 'OK',
      });
    } else {
      // SMS gönderim başarısız - kredi düşüldü, otomatik iade oluştur
      const { data: failedSmsData } = await supabaseServer
        .from('sms_messages')
        .insert({
          user_id: auth.user.id,
          phone_number: firstPhone,
          message: Message,
          status: 'failed',
          cost: isAdmin ? 0 : requiredCredit,
          failed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (failedSmsData && !isAdmin) {
        await supabaseServer
          .from('refunds')
          .insert({
            user_id: auth.user.id,
            sms_id: failedSmsData.id,
            original_cost: requiredCredit,
            refund_amount: requiredCredit,
            reason: 'SMS gönderim başarısız - Otomatik iade (48 saat)',
            status: 'pending',
          });
      }

      return NextResponse.json(
        {
          MessageId: 0,
          Status: 'Error',
          Error: smsResult.error || 'SMS gönderim başarısız',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      {
        MessageId: 0,
        Status: 'Error',
        Error: error.message || 'SMS gönderim hatası',
      },
      { status: 500 }
    );
  }
}

