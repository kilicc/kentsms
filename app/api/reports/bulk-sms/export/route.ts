import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';
import * as XLSX from 'xlsx';

// GET /api/reports/bulk-sms/export - Toplu SMS raporlarını Excel veya PDF olarak export et
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel'; // excel veya pdf
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const messageSearch = searchParams.get('messageSearch');
    const messageIdsParam = searchParams.get('messageIds'); // Belirli mesaj ID'leri için

    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    // Build Supabase query
    let query = supabaseServer
      .from('sms_messages')
      .select('*, contacts(id, name, phone), users(id, username, email)')
      .eq('user_id', auth.user.userId);

    // Admin ise tüm kullanıcıların SMS'lerini görebilir
    if (isAdmin) {
      query = supabaseServer
        .from('sms_messages')
        .select('*, contacts(id, name, phone), users(id, username, email)');
    }

    // Belirli mesaj ID'leri varsa sadece onları getir
    if (messageIdsParam) {
      const messageIds = messageIdsParam.split(',').filter(id => id.trim());
      if (messageIds.length > 0) {
        query = query.in('id', messageIds);
      }
    } else {
      // Date filtering (sadece messageIds yoksa)
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query = query.gte('sent_at', start.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte('sent_at', end.toISOString());
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (messageSearch) {
        query = query.ilike('message', `%${messageSearch}%`);
      }
    }

    // Get all SMS messages
    const { data: messagesData, error: messagesError } = await query
      .order('sent_at', { ascending: false });

    if (messagesError) {
      throw new Error(messagesError.message);
    }

    let reports: any[] = [];

    // Eğer messageIds varsa, direkt mesaj detaylarını export et
    if (messageIdsParam) {
      reports = (messagesData || []).map((msg: any) => ({
        Telefon: msg.phone_number,
        Mesaj: msg.message,
        Durum: msg.status === 'iletildi' || msg.status === 'gönderildi' ? 'Başarılı' : 
               msg.status === 'failed' || msg.status === 'iletilmedi' ? 'Başarısız' : 
               msg.status || '-',
        Maliyet: msg.cost || 0,
        Tarih: msg.sent_at ? new Date(msg.sent_at).toLocaleString('tr-TR') : '-',
        Kisi: msg.contacts?.name || '-',
        Kullanici: isAdmin ? (msg.users?.username || '-') : '-',
        Email: isAdmin ? (msg.users?.email || '-') : '-',
      }));
    } else {
      // Group messages by message content (bulk SMS reports)
      const groupedMessages = new Map<string, {
        message: string;
        recipients: number;
        successCount: number;
        failedCount: number;
        sentAt: string;
        status: string;
        userId?: string;
        username?: string;
        email?: string;
      }>();

      (messagesData || []).forEach((msg: any) => {
        const messageText = msg.message || '';
        const key = messageText.substring(0, 100); // İlk 100 karakteri key olarak kullan
        
        if (!groupedMessages.has(key)) {
          groupedMessages.set(key, {
            message: messageText,
            recipients: 0,
            successCount: 0,
            failedCount: 0,
            sentAt: msg.sent_at,
            status: 'sent',
            userId: msg.user_id,
            username: msg.users?.username,
            email: msg.users?.email,
          });
        }

        const group = groupedMessages.get(key)!;
        group.recipients++;
        
        if (msg.status === 'iletildi' || msg.status === 'gönderildi') {
          group.successCount++;
        } else if (msg.status === 'failed' || msg.status === 'iletilmedi') {
          group.failedCount++;
        }

        // En son gönderim tarihini al
        if (new Date(msg.sent_at) > new Date(group.sentAt)) {
          group.sentAt = msg.sent_at;
        }

        // Durum belirleme
        if (group.failedCount > 0 && group.successCount > 0) {
          group.status = 'partial';
        } else if (group.failedCount === group.recipients) {
          group.status = 'failed';
        } else {
          group.status = 'sent';
        }
      });

      // Format for export
      reports = Array.from(groupedMessages.values()).map((report) => ({
        Mesaj: report.message.substring(0, 200),
        Alıcı_Sayisi: report.recipients,
        Basarili: report.successCount,
        Basarisiz: report.failedCount,
        Durum: report.status === 'sent' ? 'Başarılı' : report.status === 'failed' ? 'Başarısız' : 'Kısmen Başarılı',
        Tarih: report.sentAt ? new Date(report.sentAt).toLocaleString('tr-TR') : '-',
        Kullanici: isAdmin ? (report.username || '-') : '-',
        Email: isAdmin ? (report.email || '-') : '-',
      }));
    }

    if (format === 'excel') {
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(reports);
      
      // Set column widths - messageIds varsa farklı kolonlar var
      if (messageIdsParam) {
        const columnWidths = [
          { wch: 15 }, // Telefon
          { wch: 50 }, // Mesaj
          { wch: 12 }, // Durum
          { wch: 10 }, // Maliyet
          { wch: 20 }, // Tarih
          { wch: 20 }, // Kisi
          { wch: 15 }, // Kullanici
          { wch: 25 }, // Email
        ];
        worksheet['!cols'] = columnWidths;
      } else {
        const columnWidths = [
          { wch: 50 }, // Mesaj
          { wch: 12 }, // Alıcı_Sayisi
          { wch: 10 }, // Basarili
          { wch: 10 }, // Basarisiz
          { wch: 15 }, // Durum
          { wch: 20 }, // Tarih
          { wch: 15 }, // Kullanici
          { wch: 25 }, // Email
        ];
        worksheet['!cols'] = columnWidths;
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Toplu SMS Raporlari');
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="toplu-sms-raporlari-${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    } else if (format === 'pdf') {
      // PDF export - simple HTML to PDF conversion
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #1976d2; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #1976d2; color: white; }
              tr:nth-child(even) { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Toplu SMS Raporları</h1>
            <p>Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
            <table>
              <thead>
                <tr>
                  ${Object.keys(reports[0] || {}).map(key => `<th>${key}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${reports.map(report => `
                  <tr>
                    ${Object.values(report).map(val => `<td>${String(val || '-')}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="toplu-sms-raporlari-${new Date().toISOString().split('T')[0]}.html"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Geçersiz format. excel veya pdf kullanın.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Bulk SMS export error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Export hatası' },
      { status: 500 }
    );
  }
}

