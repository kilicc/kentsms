import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { sendSMS, formatPhoneNumber } from '@/lib/utils/cepSMSProvider';

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

    // Admin kullanıcıları için rol kontrolü
    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    // Get user to check credit using Supabase (admin değilse)
    let userCredit = 0;
    let requiredCredit = 0;
    let creditPerMessage = 0;
    
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
      userCredit = user.credit || 0;
    }

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

    // Kredi hesaplama: 180 karakter = 1 kredi
    // Her numara için mesaj uzunluğuna göre kredi hesaplanır
    const messageLength = message.length;
    creditPerMessage = Math.ceil(messageLength / 180) || 1; // En az 1 kredi
    requiredCredit = contacts.length * creditPerMessage; // Her numara için kredi
    
    if (!isAdmin && userCredit < requiredCredit) {
      return NextResponse.json(
        {
          success: false,
          message: `Yetersiz kredi. Gerekli: ${requiredCredit} (${contacts.length} numara × ${creditPerMessage} kredi = ${requiredCredit} kredi), Mevcut: ${userCredit}`,
        },
        { status: 400 }
      );
    }

    // Kredi düş (başarılı veya başarısız olsun, tüm SMS'ler için kredi düşülecek, başarısız olursa 48 saat sonra iade edilecek) - Admin değilse
    if (!isAdmin) {
      const { data: currentUser } = await supabaseServer
        .from('users')
        .select('credit')
        .eq('id', auth.user.userId)
        .single();

      if (currentUser) {
        // Tüm SMS'ler için kredi düş (başarısız olursa 48 saat sonra iade edilecek)
        const newCredit = Math.max(0, (currentUser.credit || 0) - requiredCredit);
        await supabaseServer
          .from('users')
          .update({ credit: newCredit })
          .eq('id', auth.user.userId);
      }
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
    // Gruptaki numaralar kadar kredi düşülür
    for (const contact of contacts) {
      try {
        // Her numara için SMS gönder
        const smsResult = await sendSMS(contact.phone, message);

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
              cost: isAdmin ? 0 : creditPerMessage, // Admin kullanıcıları için cost: 0
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
            results.totalCost += creditPerMessage; // 180 karakter = 1 kredi
            results.messageIds.push(smsMessageData.id);
          } else {
            results.failed++;
            results.errors.push(`${contact.phone}: SMS kaydı oluşturulamadı`);
            // SMS kaydı oluşturulamadı ama kredi düşüldü, otomatik iade oluştur
            const { data: failedSmsData, error: failedError } = await supabaseServer
              .from('sms_messages')
              .insert({
                user_id: auth.user.userId,
                contact_id: contact.id,
                phone_number: contact.phone,
                message,
                sender: sender || null,
              status: 'failed',
              cost: isAdmin ? 0 : creditPerMessage, // Admin kullanıcıları için cost: 0
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
                  original_cost: creditPerMessage,
                  refund_amount: creditPerMessage,
                  reason: 'SMS kaydı oluşturulamadı - Otomatik iade (48 saat)',
                  status: 'pending',
                });
            }
          }
        } else {
          // SMS gönderim başarısız - kredi düşüldü, otomatik iade oluştur (48 saat sonra iade edilecek)
          const { data: failedSmsData, error: failedError } = await supabaseServer
            .from('sms_messages')
            .insert({
              user_id: auth.user.userId,
              contact_id: contact.id,
              phone_number: contact.phone,
              message,
              sender: sender || null,
              status: 'failed',
              cost: isAdmin ? 0 : creditPerMessage, // Admin kullanıcıları için cost: 0
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
                original_cost: creditPerMessage,
                refund_amount: creditPerMessage,
                reason: 'SMS gönderim başarısız - Otomatik iade (48 saat)',
                status: 'pending',
              });
          }

          results.failed++;
          results.errors.push(`${contact.phone}: ${smsResult.error || 'Bilinmeyen hata'}`);
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${contact.phone}: ${error.message}`);
      }
    }

    // Kredi zaten düşüldü (başarılı ve başarısız tüm SMS'ler için)
    // Başarısız olanlar için otomatik iade oluşturuldu, 48 saat sonra iade edilecek

    // Get updated user credit using Supabase
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
        remainingCredit: updatedUser?.credit || 0,
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

