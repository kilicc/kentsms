import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { sendSMS, formatPhoneNumber } from '@/lib/utils/cepSMSProvider';
import { deductSystemCredit, getSystemCredit, addSystemCredit } from '@/lib/utils/systemCredit';

// POST /api/bulk-sms/send-bulk - Toplu SMS gönderimi
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
    const { contactIds, message, templateId, sender } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Kişi listesi gerekli' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Mesaj içeriği gerekli' },
        { status: 400 }
      );
    }

    // Remove duplicate contact IDs (eğer aynı kişi hem grup hem manuel seçilmişse)
    const uniqueContactIds = [...new Set(contactIds)];

    // Get contacts using Supabase
    const { data: contactsData, error: contactsError } = await supabaseServer
      .from('contacts')
      .select('id, phone')
      .in('id', uniqueContactIds)
      .eq('user_id', auth.user.userId)
      .eq('is_active', true)
      .eq('is_blocked', false);

    if (contactsError) {
      return NextResponse.json(
        { success: false, message: contactsError.message || 'Kişiler alınamadı' },
        { status: 500 }
      );
    }

    const contacts = contactsData || [];

    if (contacts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Geçerli kişi bulunamadı' },
        { status: 400 }
      );
    }

    // Sistem kredisi kontrolü - Her SMS = 1 kredi
    const requiredCredit = contacts.length; // Her SMS = 1 kredi
    const systemCreditCheck = await deductSystemCredit(requiredCredit);
    
    if (!systemCreditCheck.success) {
      return NextResponse.json(
        {
          success: false,
          message: systemCreditCheck.error || `Yetersiz sistem kredisi. Gerekli: ${requiredCredit}, Mevcut: ${systemCreditCheck.remainingCredit}`,
        },
        { status: 400 }
      );
    }

    // Kullanıcı kredisini de düş (görüntüleme ve takip için)
    const { data: currentUser, error: userError } = await supabaseServer
      .from('users')
      .select('credit')
      .eq('id', auth.user.userId)
      .single();

    if (!userError && currentUser) {
      const userCredit = currentUser.credit || 0;
      const newUserCredit = Math.max(0, userCredit - requiredCredit);
      await supabaseServer
        .from('users')
        .update({ credit: newUserCredit })
        .eq('id', auth.user.userId);
    }

    const results = {
      sent: 0,
      failed: 0,
      totalCost: 0,
      messageIds: [] as string[],
      errors: [] as string[],
    };

    // Send SMS to each contact
    // Her bir numara için 1 SMS = 1 kredi
    console.log(`[Bulk SMS] Toplam ${contacts.length} kişiye SMS gönderiliyor...`);
    
    for (const contact of contacts) {
      try {
        console.log(`[Bulk SMS] SMS gönderiliyor: ${contact.phone}`);
        // Her numara için SMS gönder
        const smsResult = await sendSMS(contact.phone, message);
        console.log(`[Bulk SMS] SMS sonucu:`, smsResult);

        if (smsResult.success && smsResult.messageId) {
          // Create SMS message record using Supabase
          // Her SMS kaydı = 1 kredi (cost: 1)
          const { data: smsMessageData, error: createError } = await supabaseServer
            .from('sms_messages')
            .insert({
              user_id: auth.user.userId,
              contact_id: contact.id,
              phone_number: contact.phone,
              message,
              sender: sender || null,
              status: 'gönderildi',
              cost: 1, // Her SMS = 1 kredi
              cep_sms_message_id: smsResult.messageId,
              sent_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!createError && smsMessageData) {
            // Update contact last contacted using Supabase
            const { data: contactData } = await supabaseServer
              .from('contacts')
              .select('contact_count')
              .eq('id', contact.id)
              .single();

            if (contactData) {
              await supabaseServer
                .from('contacts')
                .update({
                  last_contacted: new Date().toISOString(),
                  contact_count: (contactData.contact_count || 0) + 1,
                })
                .eq('id', contact.id);
            }

            results.sent++;
            results.totalCost += 1; // Her SMS = 1 kredi
            results.messageIds.push(smsMessageData.id);
          } else {
            results.failed++;
            results.errors.push(`${contact.phone}: SMS kaydı oluşturulamadı`);
            // SMS kaydı oluşturulamadı ama sistem kredisi düşüldü, otomatik iade oluştur
            const { data: failedSmsData, error: failedError } = await supabaseServer
              .from('sms_messages')
              .insert({
                user_id: auth.user.userId,
                contact_id: contact.id,
                phone_number: contact.phone,
                message,
                sender: sender || null,
                status: 'failed',
                cost: 1, // Her SMS = 1 kredi
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
                  original_cost: 1,
                  refund_amount: 1,
                  reason: 'SMS kaydı oluşturulamadı - Otomatik iade (48 saat)',
                  status: 'pending',
                });
            }
          }
        } else {
          console.error(`[Bulk SMS] SMS gönderim hatası (${contact.phone}):`, smsResult.error);
          results.failed++;
          results.errors.push(`${contact.phone}: ${smsResult.error || 'SMS gönderim hatası'}`);
          // SMS gönderim başarısız - sistem kredisi düşüldü, otomatik iade oluştur (48 saat sonra iade edilecek)
          const { data: failedSmsData, error: failedError } = await supabaseServer
            .from('sms_messages')
            .insert({
              user_id: auth.user.userId,
              contact_id: contact.id,
              phone_number: contact.phone,
              message,
              sender: sender || null,
              status: 'failed',
              cost: 1, // Her SMS = 1 kredi
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
                original_cost: 1,
                refund_amount: 1,
                reason: 'SMS gönderim başarısız - Otomatik iade (48 saat)',
                status: 'pending',
              });
          }
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${contact.phone}: ${error.message}`);
      }
    }

    // Sistem kredisi zaten düşüldü (başarılı ve başarısız tüm SMS'ler için)
    // Başarısız olanlar için otomatik iade oluşturuldu, 48 saat sonra sistem kredisini geri verecek

    // Sistem kredisini ve kullanıcı kredisini al (güncel değer için)
    const remainingSystemCredit = await getSystemCredit();
    const { data: updatedUser } = await supabaseServer
      .from('users')
      .select('credit')
      .eq('id', auth.user.userId)
      .single();

    return NextResponse.json({
      success: true,
      message: `Toplu SMS gönderimi tamamlandı: ${results.sent} başarılı, ${results.failed} başarısız`,
      data: {
        ...results,
        remainingSystemCredit: remainingSystemCredit,
        remainingUserCredit: updatedUser?.credit || 0,
      },
    });
  } catch (error: any) {
    console.error('Bulk SMS error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'SMS gönderim hatası' },
      { status: 500 }
    );
  }
}

