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

    // Kullanıcı kredisi kontrolü - Her SMS = 1 kredi
    const requiredCredit = 1; // Her SMS = 1 kredi
    const totalRequiredCredit = contacts.length * requiredCredit;

    // Admin/moderator kontrolü
    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    // Kullanıcı bilgilerini al (kredi ve CepSMS hesabı için)
    const { data: currentUser, error: userError } = await supabaseServer
      .from('users')
      .select('credit, cepsms_username, role')
      .eq('id', auth.user.userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bilgileri alınamadı' },
        { status: 500 }
      );
    }

    const userCepsmsUsername = currentUser.cepsms_username || undefined;

    // Kullanıcı kredisi kontrolü (admin değilse)
    if (!isAdmin) {
      const userCredit = currentUser.credit || 0;
      
      if (userCredit < totalRequiredCredit) {
        return NextResponse.json(
          {
            success: false,
            message: `Yetersiz kredi! Mevcut krediniz: ${userCredit}. ${contacts.length} SMS göndermek için en az ${totalRequiredCredit} kredi gereklidir.`,
          },
          { status: 400 }
        );
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
    console.log(`[Bulk SMS] Toplam ${contacts.length} kişiye SMS gönderiliyor...`);
    
    for (const contact of contacts) {
      try {
        console.log(`[Bulk SMS] SMS gönderiliyor: ${contact.phone}`);
        // Her numara için SMS gönder (kullanıcıya özel hesap ile)
        const smsResult = await sendSMS(contact.phone, message, userCepsmsUsername);
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
              cost: requiredCredit,
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
            results.totalCost += requiredCredit;
            results.messageIds.push(smsMessageData.id);
          } else {
            results.failed++;
            results.errors.push(`${contact.phone}: SMS kaydı oluşturulamadı`);
          }
        } else {
          // SMS gönderim başarısız - kredi düşürülmedi (sadece başarılı olanlar için düşürülüyor)
          results.failed++;
          results.errors.push(`${contact.phone}: ${smsResult.error || 'SMS gönderim hatası'}`);
          // Başarısız SMS kaydı oluştur (log için)
          await supabaseServer
            .from('sms_messages')
            .insert({
              user_id: auth.user.userId,
              contact_id: contact.id,
              phone_number: contact.phone,
              message,
              sender: sender || null,
              status: 'failed',
              cost: 0, // Başarısız SMS için kredi düşürülmedi
              failed_at: new Date().toISOString(),
            });
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${contact.phone}: ${error.message}`);
      }
    }

    // Kullanıcı kredisini toplu güncelle (sadece başarılı SMS'ler için)
    if (!isAdmin && currentUser && results.sent > 0) {
      // Güncel krediyi al (diğer işlemlerden sonra güncel olsun)
      const { data: updatedUser, error: userUpdateError } = await supabaseServer
        .from('users')
        .select('credit')
        .eq('id', auth.user.userId)
        .single();

      if (!userUpdateError && updatedUser) {
        const userCredit = updatedUser.credit || 0;
        const newUserCredit = Math.max(0, userCredit - (results.sent * requiredCredit));
        await supabaseServer
          .from('users')
          .update({ credit: newUserCredit })
          .eq('id', auth.user.userId);
      }
    }

    // Kullanıcı kredisini al (response için)
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

