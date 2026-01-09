import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateApiKey } from '@/lib/middleware/apiKeyAuth';
import { sendSMS, formatPhoneNumber } from '@/lib/utils/cepSMSProvider';

/**
 * POST /api/v1/sms/send-advanced
 * CepSMS formatına benzer gelişmiş SMS gönderimi
 * 
 * Request (JSON):
 * {
 *   "From": "Baslik",
 *   "User": "API_KEY",
 *   "Pass": "API_SECRET",
 *   "Message": "selam test",
 *   "Coding": "default", (default or turkish)
 *   "StartDate": null,
 *   "ValidityPeriod": 1140,
 *   "Numbers": ["905321234567"]
 * }
 * 
 * Response:
 * {
 *   "MessageId": "uuid",
 *   "Status": "OK"
 * }
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

    const body = await request.json();
    const { From, Message, Coding, StartDate, ValidityPeriod, Numbers } = body;

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

    // Kullanıcı bilgilerini al (kredi ve CepSMS hesabı için)
    let userCepsmsUsername: string | undefined = undefined;
    
    if (!isAdmin) {
      const { data: user, error: userError } = await supabaseServer
        .from('users')
        .select('credit, cepsms_username')
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
      userCepsmsUsername = user.cepsms_username || undefined;
      const messageLength = Message.length;
      requiredCredit = Math.ceil(messageLength / 180) || 1;
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
    } else {
      // Admin için de CepSMS hesabı al
      const { data: user } = await supabaseServer
        .from('users')
        .select('cepsms_username')
        .eq('id', auth.user.id)
        .single();
      userCepsmsUsername = user?.cepsms_username || undefined;
      
      const messageLength = Message.length;
      requiredCredit = Math.ceil(messageLength / 180) || 1;
    }

    // İlk numaraya SMS gönder (kullanıcıya özel hesap ile)
    const firstPhone = phoneNumbers[0];
    const smsResult = await sendSMS(firstPhone, Message, userCepsmsUsername);

    if (smsResult.success && smsResult.messageId) {
      // SMS başarılı - kullanıcı kredisinden düş (admin değilse)
      if (!isAdmin && userCredit !== undefined) {
        await supabaseServer
          .from('users')
          .update({ credit: Math.max(0, userCredit - requiredCredit) })
          .eq('id', auth.user.id);
      }

      // SMS kaydı oluştur
      const { data: smsMessageData, error: createError } = await supabaseServer
        .from('sms_messages')
        .insert({
          user_id: auth.user.id,
          phone_number: firstPhone,
          message: Message,
          sender: From || null,
          status: 'gönderildi',
          cost: isAdmin ? 0 : requiredCredit,
          cep_sms_message_id: smsResult.messageId,
          sent_at: StartDate ? new Date(StartDate).toISOString() : new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !smsMessageData) {
        // SMS kaydı oluşturulamadı, kredi geri ver (admin değilse)
        if (!isAdmin && userCredit !== undefined) {
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

      return NextResponse.json({
        MessageId: smsMessageData.id,
        Status: 'OK',
      });
    } else {
      // SMS gönderim başarısız - kredi düşürülmedi (sadece başarılı SMS'ler için düşürülüyor)
      // Başarısız SMS kaydı oluştur (log için)
      await supabaseServer
        .from('sms_messages')
        .insert({
          user_id: auth.user.id,
          phone_number: firstPhone,
          message: Message,
          sender: From || null,
          status: 'failed',
          cost: 0, // Başarısız SMS için kredi düşürülmedi
          failed_at: new Date().toISOString(),
        });

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
    console.error('SMS send advanced error:', error);
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

