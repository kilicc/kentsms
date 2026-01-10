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
      requiredCredit = Math.ceil(messageLength / 180) || 1; // 180 karakter = 1 kredi
      const totalRequiredCredit = phoneNumbers.length * requiredCredit;

      // Admin2 gibi çalışması için: cepsms_username boşsa veya hesap bulunamazsa varsayılan hesaba fallback yap
      if (userCepsmsUsername && userCepsmsUsername.trim() !== '') {
        const { getAccountByUsername } = await import('@/lib/utils/cepsmsAccounts');
        const account = getAccountByUsername(userCepsmsUsername);
        if (!account) {
          // Hesap bulunamadı - varsayılan hesaba fallback yap
          console.warn('[SMS Send V1] Kullanıcı hesabı bulunamadı, varsayılan hesaba fallback yapılıyor:', {
            userId: auth.user.id,
            cepsmsUsername: userCepsmsUsername,
          });
          userCepsmsUsername = undefined; // undefined = varsayılan hesap kullan
        }
      } else {
        // Hesap atanmamış - varsayılan hesabı kullan (admin2 gibi)
        console.warn('[SMS Send V1] Kullanıcıya CepSMS hesabı atanmamış, varsayılan hesap kullanılıyor:', {
          userId: auth.user.id,
        });
        userCepsmsUsername = undefined; // undefined = varsayılan hesap kullan
      }

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

    // Log: SMS gönderim öncesi bilgi
    console.log('[SMS Send V1] SMS gönderim öncesi:', {
      userId: auth.user.id,
      cepsmsUsername: userCepsmsUsername || '(atanmamış)',
      isAdmin,
      firstPhone: phoneNumbers[0],
    });

    // İlk numaraya SMS gönder (basit send için sadece ilk numara, kullanıcıya özel hesap ile)
    const firstPhone = phoneNumbers[0];
    const smsResult = await sendSMS(firstPhone, Message, userCepsmsUsername);

    if (smsResult.success && smsResult.messageId) {
      // SMS başarılı - kullanıcı kredisinden düş (admin değilse)
      if (!isAdmin && userCredit !== undefined) {
        const newCredit = Math.max(0, userCredit - requiredCredit);
        const { error: updateError } = await supabaseServer
          .from('users')
          .update({ credit: newCredit })
          .eq('id', auth.user.id);
        
        if (updateError) {
          console.error('[SMS Send V1] Kredi düşürme hatası:', {
            userId: auth.user.id,
            phone: firstPhone,
            requiredCredit,
            userCredit,
            newCredit,
            error: updateError,
          });
          // SMS gönderildi ama kredi düşürülemedi - kritik hata
          // SMS kaydını oluşturmaya devam ediyoruz ama kredi geri verme işlemini yapmamalıyız
          // Çünkü kredi zaten düşürülmedi
        }
      }

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
        // SMS kaydı oluşturulamadı, kredi geri ver (admin değilse)
        if (!isAdmin && userCredit !== undefined) {
          const { error: refundError } = await supabaseServer
            .from('users')
            .update({ credit: userCredit })
            .eq('id', auth.user.id);
          
          if (refundError) {
            console.error('[SMS Send V1] Kredi geri verme hatası:', {
              userId: auth.user.id,
              phone: firstPhone,
              originalCredit: userCredit,
              error: refundError,
            });
            // Kritik hata: SMS gönderildi, kredi düşürüldü ama kayıt oluşturulamadı ve kredi geri verilemedi
          }
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
      // SMS gönderim başarısız - kredi düşürülmedi (sadece başarılı SMS'ler için düşürülüyor)
      // Başarısız SMS kaydı oluştur (log için)
      await supabaseServer
        .from('sms_messages')
        .insert({
          user_id: auth.user.id,
          phone_number: firstPhone,
          message: Message,
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

