import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { sendSMS, formatPhoneNumber } from '@/lib/utils/cepSMSProvider';

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

    // Telefon numarası normalizasyonu: 905**, 05**, 5**, +905** formatlarını kabul et ve CepSMS formatına dönüştür
    const phoneNumbers = phone.split(/[,\n]/).map((p: string) => p.trim()).filter((p: string) => p);
    
    if (phoneNumbers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Telefon numarası gerekli' },
        { status: 400 }
      );
    }

    // Her numarayı formatPhoneNumber ile normalize et ve geçerliliğini kontrol et
    interface PhoneResult {
      original: string;
      formatted?: string;
      error?: string;
    }
    
    const phoneResults: PhoneResult[] = [];
    
    for (const phoneNum of phoneNumbers) {
      try {
        const formatted = formatPhoneNumber(phoneNum);
        phoneResults.push({ original: phoneNum, formatted });
      } catch (error: any) {
        phoneResults.push({ original: phoneNum, error: error.message || 'Geçersiz format' });
      }
    }
    
    const validPhones = phoneResults.filter(p => p.formatted);
    
    if (validPhones.length === 0) {
      const invalidNumbers = phoneResults.map(p => p.original).join(', ');
      return NextResponse.json(
        { 
          success: false, 
          message: `Tüm telefon numaraları geçersiz: ${invalidNumbers}. Desteklenen formatlar: 905**, 05**, 5**, +905**`,
          data: { results: phoneResults }
        },
        { status: 400 }
      );
    }

    // Sistem kredisi kontrolü - Her SMS = 1 kredi
    const requiredCredit = 1; // Her SMS 1 kredi
    
    // Admin/moderator kontrolü
    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    // Kullanıcı bilgilerini al (kredi kontrolü, düşürme ve CepSMS hesabı için)
    let currentUser: { credit: number; role?: string; cepsms_username?: string } | null = null;
    let userError: any = null;

    // Tüm kullanıcılar için bilgi al (admin değilse kredi kontrolü için, admin ise CepSMS hesabı için)
    const userResult = await supabaseServer
      .from('users')
      .select('credit, role, cepsms_username')
      .eq('id', auth.user.userId)
      .single();
    
    currentUser = userResult.data;
    userError = userResult.error;

    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bilgileri alınamadı' },
        { status: 500 }
      );
    }

    // Kullanıcının CepSMS hesabı
    const userCepsmsUsername = currentUser.cepsms_username;

    // Kullanıcıya CepSMS hesabı atanmamışsa hata ver (admin değilse)
    if (!isAdmin && (!userCepsmsUsername || userCepsmsUsername.trim() === '')) {
      console.error('[SMS Send] Kullanıcıya CepSMS hesabı atanmamış:', {
        userId: auth.user.userId,
        username: currentUser.role || 'unknown',
      });
      return NextResponse.json(
        {
          success: false,
          message: 'CepSMS hesabı atanmamış! Lütfen admin panelinden kullanıcınıza bir CepSMS hesabı atayın.',
        },
        { status: 400 }
      );
    }

    // Kullanıcıya CepSMS hesabı atanmışsa, hesabın mevcut olduğunu kontrol et (admin değilse)
    if (!isAdmin && userCepsmsUsername && userCepsmsUsername.trim() !== '') {
      const { getAccountByUsername } = await import('@/lib/utils/cepsmsAccounts');
      const account = getAccountByUsername(userCepsmsUsername);
      if (!account) {
        const { getAllAccounts } = await import('@/lib/utils/cepsmsAccounts');
        const allAccounts = getAllAccounts();
        const availableAccounts = allAccounts.map(a => a.username).join(', ');
        console.error('[SMS Send] Kullanıcı hesabı bulunamadı:', {
          userId: auth.user.userId,
          cepsmsUsername: userCepsmsUsername,
          availableAccounts,
        });
        return NextResponse.json(
          {
            success: false,
            message: `CepSMS hesabı "${userCepsmsUsername}" sistemde bulunamadı. Mevcut hesaplar: ${availableAccounts}. Lütfen admin panelinden kullanıcınıza doğru bir hesap atayın.`,
          },
          { status: 400 }
        );
      }
    }

    if (!isAdmin) {
      const userCredit = currentUser.credit || 0;
      const totalRequiredCredit = validPhones.length * requiredCredit;
      
      if (userCredit < totalRequiredCredit) {
        return NextResponse.json(
          {
            success: false,
            message: `Yetersiz kredi! Mevcut krediniz: ${userCredit}. ${validPhones.length} SMS göndermek için en az ${totalRequiredCredit} kredi gereklidir.`,
          },
          { status: 400 }
        );
      }
    }

    // Log: Kullanıcının CepSMS hesabı bilgisini logla
    console.log('[SMS Send] Kullanıcı bilgileri:', {
      userId: auth.user.userId,
      cepsmsUsername: userCepsmsUsername || '(atanmamış)',
      isAdmin,
      credit: currentUser.credit || 0,
    });

    // Her numara için SMS gönder ve sonuçları topla
    interface SendResult {
      phone: string;
      original: string;
      success: boolean;
      messageId?: string;
      error?: string;
      smsRecordId?: string;
    }

    const sendResults: SendResult[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Geçersiz numaralar için sonuç ekle
    for (const phoneResult of phoneResults) {
      if (!phoneResult.formatted) {
        sendResults.push({
          phone: phoneResult.original,
          original: phoneResult.original,
          success: false,
          error: phoneResult.error || 'Geçersiz telefon numarası formatı',
        });
        totalFailed++;
      }
    }

    // Tek bir SMS gönderme fonksiyonu
    const sendSingleSMS = async (phoneResult: { formatted?: string; original: string }): Promise<SendResult> => {
      if (!phoneResult.formatted) {
        return {
          phone: phoneResult.original,
          original: phoneResult.original,
          success: false,
          error: 'Geçersiz telefon numarası formatı',
        };
      }

      const phoneNumber = phoneResult.formatted;
      const originalPhone = phoneResult.original;

      if (!auth.user) {
        return {
          phone: phoneNumber,
          original: originalPhone,
          success: false,
          error: 'Kullanıcı bilgisi bulunamadı',
        };
      }

      // Kullanıcının CepSMS hesabını kullan
      const cepsmsUsername = currentUser?.cepsms_username || undefined;
      
      // Log: SMS gönderim öncesi bilgi
      console.log('[SMS Send] SMS gönderim öncesi:', {
        phone: phoneNumber,
        originalPhone: originalPhone,
        cepsmsUsername: cepsmsUsername || '(atanmamış)',
        userId: auth.user.userId,
      });
      
      // SMS gönder (kullanıcıya özel hesap ile) - Kredi düşürme batch işlemede yapılacak
      const smsResult = await sendSMS(phoneNumber, message, cepsmsUsername);

      if (smsResult.success && smsResult.messageId) {
        // SMS kaydı oluştur
        const { data: smsMessageData, error: createError } = await supabaseServer
          .from('sms_messages')
          .insert({
            user_id: auth.user.userId,
            phone_number: phoneNumber,
            message,
            sender: serviceName || null,
            status: 'gönderildi',
            cost: requiredCredit,
            cep_sms_message_id: smsResult.messageId,
            sent_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError || !smsMessageData) {
          return {
            phone: phoneNumber,
            original: originalPhone,
            success: false,
            error: createError?.message || 'SMS kaydı oluşturulamadı',
          };
        } else {
          return {
            phone: phoneNumber,
            original: originalPhone,
            success: true,
            messageId: smsResult.messageId,
            smsRecordId: smsMessageData.id,
          };
        }
      } else {
        // SMS gönderim başarısız - kredi düşürülmedi (sadece başarılı olanlar için düşürülüyor)
        // Başarısız SMS kaydı oluştur (log için)
        await supabaseServer
          .from('sms_messages')
          .insert({
            user_id: auth.user.userId,
            phone_number: phoneNumber,
            message,
            sender: serviceName || null,
            status: 'failed',
            cost: 0, // Başarısız SMS için kredi düşürülmedi
            failed_at: new Date().toISOString(),
          });

        return {
          phone: phoneNumber,
          original: originalPhone,
          success: false,
          error: smsResult.error || 'SMS gönderim hatası',
        };
      }
    };

    // CepSMS servisi aynı anda ortalama 500 SMS gönderebiliyor
    // 1000+ numara için 500'lük paketler halinde işle
    const BATCH_SIZE = validPhones.length >= 1000 ? 500 : Math.max(1, validPhones.length);
    const batches: Array<Array<{ formatted?: string; original: string }>> = [];
    
    for (let i = 0; i < validPhones.length; i += BATCH_SIZE) {
      batches.push(validPhones.slice(i, i + BATCH_SIZE));
    }

    console.log(`[SMS Send] ${validPhones.length} numara, ${batches.length} paket halinde işlenecek (paket boyutu: ${BATCH_SIZE})`);

    // Her paketi işle
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`[SMS Send] Paket ${batchIndex + 1}/${batches.length} işleniyor (${batch.length} numara)...`);

      // CepSMS servisi aynı anda 500 SMS gönderebiliyor, bu yüzden CONCURRENT_LIMIT = 500
      const CONCURRENT_LIMIT = 500; // CepSMS servisinin kapasitesi
      
      for (let i = 0; i < batch.length; i += CONCURRENT_LIMIT) {
        const concurrentBatch = batch.slice(i, i + CONCURRENT_LIMIT);
        
        // Paralel gönderim (500'lük gruplar halinde)
        const batchResults = await Promise.all(
          concurrentBatch.map(phoneResult => sendSingleSMS(phoneResult))
        );

        // Sonuçları topla
        for (const result of batchResults) {
          sendResults.push(result);
          if (result.success) {
            totalSent++;
          } else {
            totalFailed++;
          }
        }

        // Kullanıcı kredisini toplu güncelle (her concurrent batch sonrası - sadece başarılı SMS'ler için)
        if (!isAdmin && currentUser && auth.user) {
          const sentInBatch = batchResults.filter(r => r.success).length;
          if (sentInBatch > 0) {
            // Güncel krediyi al (diğer batch'lerden sonra güncel olsun)
            const { data: updatedUser, error: userUpdateError } = await supabaseServer
              .from('users')
              .select('credit')
              .eq('id', auth.user.userId)
              .single();
            
            if (userUpdateError || !updatedUser) {
              console.error('[SMS Send] Kullanıcı kredisi alınamadı:', {
                userId: auth.user.userId,
                batchIndex: batchIndex + 1,
                concurrentBatchIndex: Math.floor(i / CONCURRENT_LIMIT) + 1,
                sentInBatch,
                error: userUpdateError,
              });
              // SMS'ler gönderildi ama kredi düşürülemedi - kritik hata
            } else {
              const userCredit = updatedUser.credit || 0;
              const newUserCredit = Math.max(0, userCredit - (sentInBatch * requiredCredit));
              const { error: updateError } = await supabaseServer
                .from('users')
                .update({ credit: newUserCredit })
                .eq('id', auth.user.userId);
              
              if (updateError) {
                console.error('[SMS Send] Kredi düşürme hatası:', {
                  userId: auth.user.userId,
                  batchIndex: batchIndex + 1,
                  concurrentBatchIndex: Math.floor(i / CONCURRENT_LIMIT) + 1,
                  currentCredit: userCredit,
                  requiredCredit: sentInBatch * requiredCredit,
                  newCredit: newUserCredit,
                  sentInBatch,
                  error: updateError,
                });
                // SMS'ler gönderildi ama kredi düşürülemedi - kritik hata
              } else {
                currentUser.credit = newUserCredit;
              }
            }
          }
        }

        // Rate limiting için kısa bir bekleme (500 SMS gönderildikten sonra)
        // CepSMS servisinin yeni batch'i işlemesi için kısa bir süre bekle
        if (i + CONCURRENT_LIMIT < batch.length) {
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms bekleme
        }
      }

      // Paketler arası kısa bekleme (500'lük paket tamamlandıktan sonra)
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms bekleme
      }
    }

    // Kullanıcı kredisini al (güncel değer için)
    const { data: updatedUser } = await supabaseServer
      .from('users')
      .select('credit')
      .eq('id', auth.user.userId)
      .single();

    // Sonuç mesajı oluştur
    const successMessage = totalSent > 0 
      ? `${totalSent} SMS başarıyla gönderildi${totalFailed > 0 ? `, ${totalFailed} SMS gönderilemedi` : ''}`
      : `${totalFailed} SMS gönderilemedi`;

    return NextResponse.json({
      success: totalSent > 0,
      message: successMessage,
      data: {
        results: sendResults,
        totalSent,
        totalFailed,
        remainingUserCredit: updatedUser?.credit || 0,
      },
    });
  } catch (error: any) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'SMS gönderim hatası' },
      { status: 500 }
    );
  }
}

