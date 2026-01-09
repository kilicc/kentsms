import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateApiKey } from '@/lib/middleware/apiKeyAuth';
import { sendSMS, formatPhoneNumber } from '@/lib/utils/cepSMSProvider';

/**
 * POST /api/v1/sms/send-multi
 * CepSMS formatına benzer çoklu SMS gönderimi
 * 
 * Request (JSON):
 * {
 *   "From": "Baslik",
 *   "User": "API_KEY",
 *   "Pass": "API_SECRET",
 *   "Coding": "default", (default or turkish)
 *   "StartDate": null,
 *   "ValidityPeriod": 1440,
 *   "Messages": [
 *     {
 *       "Message": "test mesaj 1",
 *       "GSM": "905321234567"
 *     },
 *     {
 *       "Message": "test mesaj 2",
 *       "GSM": "905441234567"
 *     }
 *   ]
 * }
 * 
 * Response:
 * {
 *   "MessageIds": ["uuid1", "uuid2"],
 *   "Status": "OK",
 *   "SuccessCount": 2,
 *   "FailedCount": 0
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // API Key authentication
    const auth = await authenticateApiKey(request);
    
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        {
          MessageIds: [],
          Status: 'Error',
          Error: auth.error || 'Unauthorized',
          SuccessCount: 0,
          FailedCount: 0,
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { From, Coding, StartDate, ValidityPeriod, Messages } = body;

    // Validation
    if (!Messages || !Array.isArray(Messages) || Messages.length === 0) {
      return NextResponse.json(
        {
          MessageIds: [],
          Status: 'Error',
          Error: 'Messages (array) gerekli',
          SuccessCount: 0,
          FailedCount: 0,
        },
        { status: 400 }
      );
    }

    // Kullanıcı rolü kontrolü
    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    const supabaseServer = getSupabaseServer();
    let userCredit = 0;
    let totalRequiredCredit = 0;

    // Toplam kredi hesapla
    Messages.forEach((msg: any) => {
      if (!msg.Message || !msg.GSM) {
        throw new Error('Her mesajda Message ve GSM gerekli');
      }
      const messageLength = msg.Message.length;
      const requiredCredit = Math.ceil(messageLength / 180) || 1;
      totalRequiredCredit += requiredCredit;
    });

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
            MessageIds: [],
            Status: 'Error',
            Error: 'Kullanıcı bulunamadı',
            SuccessCount: 0,
            FailedCount: 0,
          },
          { status: 404 }
        );
      }

      userCredit = user.credit || 0;
      userCepsmsUsername = user.cepsms_username || undefined;

      if (userCredit < totalRequiredCredit) {
        return NextResponse.json(
          {
            MessageIds: [],
            Status: 'Error',
            Error: `Yetersiz kredi. Gerekli: ${totalRequiredCredit}, Mevcut: ${userCredit}`,
            SuccessCount: 0,
            FailedCount: 0,
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
    }

    // Her mesajı gönder
    const messageIds: string[] = [];
    let successCount = 0;
    let failedCount = 0;
    let totalCost = 0;

    for (const msg of Messages) {
      try {
        const phone = formatPhoneNumber(msg.GSM);
        const message = msg.Message;
        const messageLength = message.length;
        const requiredCredit = Math.ceil(messageLength / 180) || 1;

        // Kullanıcıya özel hesap ile SMS gönder
        const smsResult = await sendSMS(phone, message, userCepsmsUsername);

        if (smsResult.success && smsResult.messageId) {
          // SMS başarılı - kullanıcı kredisinden düş (admin değilse)
          if (!isAdmin && userCredit !== undefined) {
            // Güncel krediyi al ve düş
            const { data: currentUser } = await supabaseServer
              .from('users')
              .select('credit')
              .eq('id', auth.user.id)
              .single();
            
            if (currentUser) {
              const currentCredit = currentUser.credit || 0;
              const newCredit = Math.max(0, currentCredit - requiredCredit);
              await supabaseServer
                .from('users')
                .update({ credit: newCredit })
                .eq('id', auth.user.id);
              userCredit = newCredit; // Güncel krediyi güncelle
            }
          }

          // SMS kaydı oluştur
          const { data: smsMessageData } = await supabaseServer
            .from('sms_messages')
            .insert({
              user_id: auth.user.id,
              phone_number: phone,
              message: message,
              sender: From || null,
              status: 'gönderildi',
              cost: isAdmin ? 0 : requiredCredit,
              cep_sms_message_id: smsResult.messageId,
              sent_at: StartDate ? new Date(StartDate).toISOString() : new Date().toISOString(),
            })
            .select()
            .single();

          if (smsMessageData) {
            messageIds.push(smsMessageData.id);
            successCount++;
            totalCost += isAdmin ? 0 : requiredCredit;
          } else {
            // SMS kaydı oluşturulamadı, kredi geri ver (admin değilse)
            if (!isAdmin && userCredit !== undefined) {
              await supabaseServer
                .from('users')
                .update({ credit: (userCredit || 0) + requiredCredit })
                .eq('id', auth.user.id);
            }
            failedCount++;
          }
        } else {
          // SMS gönderim başarısız - kredi düşürülmedi (sadece başarılı SMS'ler için düşürülüyor)
          // Başarısız SMS kaydı oluştur (log için)
          await supabaseServer
            .from('sms_messages')
            .insert({
              user_id: auth.user.id,
              phone_number: phone,
              message: message,
              sender: From || null,
              status: 'failed',
              cost: 0, // Başarısız SMS için kredi düşürülmedi
              failed_at: new Date().toISOString(),
            });

          failedCount++;
        }
      } catch (error: any) {
        console.error('Multi SMS send error:', error);
        failedCount++;
      }
    }

    // Kredi zaten sadece başarılı SMS'ler için düşürüldü, geri verme gerekmez

    // CepSMS formatına uyumlu: Eğer tek mesaj varsa MessageId döndür, çoklu ise MessageIds
    if (Messages.length === 1) {
      return NextResponse.json({
        MessageId: messageIds[0] || 0,
        Status: successCount > 0 ? 'OK' : 'Error',
      });
    }
    
    return NextResponse.json({
      MessageIds: messageIds,
      Status: successCount > 0 ? 'OK' : 'Error',
      SuccessCount: successCount,
      FailedCount: failedCount,
    });
  } catch (error: any) {
    console.error('SMS send multi error:', error);
    return NextResponse.json(
      {
        MessageIds: [],
        Status: 'Error',
        Error: error.message || 'SMS gönderim hatası',
        SuccessCount: 0,
        FailedCount: 0,
      },
      { status: 500 }
    );
  }
}

