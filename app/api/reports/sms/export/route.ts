import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';
import * as XLSX from 'xlsx';

// GET /api/reports/sms/export - SMS raporlarını Excel veya PDF olarak export et
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
    const phoneNumber = searchParams.get('phoneNumber');
    const messageSearch = searchParams.get('messageSearch');

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

    // Date filtering
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

    if (phoneNumber) {
      query = query.ilike('phone_number', `%${phoneNumber}%`);
    }

    if (messageSearch) {
      query = query.ilike('message', `%${messageSearch}%`);
    }

    // Get all SMS messages (no pagination for export)
    const { data: messagesData, error: messagesError } = await query
      .order('sent_at', { ascending: false });

    if (messagesError) {
      throw new Error(messagesError.message);
    }

    // Format messages data
    const messages = (messagesData || []).map((msg: any) => ({
      ID: msg.id,
      Kullanici: isAdmin ? (msg.users?.username || '-') : '-',
      Email: isAdmin ? (msg.users?.email || '-') : '-',
      Kisi: msg.contacts?.name || '-',
      Telefon: msg.phone_number,
      Mesaj: msg.message,
      Durum: msg.status,
      Maliyet: msg.cost || 0,
      Tarih: msg.sent_at ? new Date(msg.sent_at).toLocaleString('tr-TR') : '-',
    }));

    if (format === 'excel') {
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(messages);
      
      // Set column widths
      const columnWidths = [
        { wch: 36 }, // ID
        { wch: 15 }, // Kullanici
        { wch: 25 }, // Email
        { wch: 20 }, // Kisi
        { wch: 15 }, // Telefon
        { wch: 50 }, // Mesaj
        { wch: 12 }, // Durum
        { wch: 10 }, // Maliyet
        { wch: 20 }, // Tarih
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'SMS Raporlari');
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="sms-raporlari-${new Date().toISOString().split('T')[0]}.xlsx"`,
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
            <h1>SMS Raporları</h1>
            <p>Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
            <table>
              <thead>
                <tr>
                  ${Object.keys(messages[0] || {}).map(key => `<th>${key}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${messages.map(msg => `
                  <tr>
                    ${Object.values(msg).map(val => `<td>${String(val || '-')}</td>`).join('')}
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
          'Content-Disposition': `attachment; filename="sms-raporlari-${new Date().toISOString().split('T')[0]}.html"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Geçersiz format. excel veya pdf kullanın.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('SMS export error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Export hatası' },
      { status: 500 }
    );
  }
}

