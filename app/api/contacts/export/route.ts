import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/contacts/export - Rehberi CSV/Excel formatında export et
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
    const format = searchParams.get('format') || 'csv'; // csv veya xlsx
    const groupId = searchParams.get('groupId');

    // Get all contacts using Supabase
    let query = supabaseServer
      .from('contacts')
      .select('*, contact_groups(id, name)')
      .eq('user_id', auth.user.userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data: contactsData, error: contactsError } = await query;

    if (contactsError) {
      return NextResponse.json(
        { success: false, message: contactsError.message || 'Kişiler alınamadı' },
        { status: 500 }
      );
    }

    const contacts = contactsData || [];

    if (contacts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Export edilecek kişi bulunamadı' },
        { status: 400 }
      );
    }

    // Format contacts for export
    const exportData = contacts.map((contact: any) => ({
      'İsim': contact.name || '',
      'Telefon': contact.phone || '',
      'E-posta': contact.email || '',
      'Grup': contact.contact_groups?.name || '',
      'Notlar': contact.notes || '',
      'Etiketler': Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
      'Oluşturulma Tarihi': contact.created_at ? new Date(contact.created_at).toLocaleDateString('tr-TR') : '',
    }));

    if (format === 'csv') {
      // CSV export
      const headers = ['İsim', 'Telefon', 'E-posta', 'Grup', 'Notlar', 'Etiketler', 'Oluşturulma Tarihi'];
      const csvRows = [
        headers.join(','), // Header row
        ...exportData.map((row) =>
          headers.map((header) => {
            const value = row[header as keyof typeof row] || '';
            // CSV formatı için özel karakterleri escape et
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');
      const csvBlob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM for Excel

      return new NextResponse(csvBlob, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8;',
          'Content-Disposition': `attachment; filename="rehber_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'xlsx') {
      // Excel export using xlsx library
      const XLSX = require('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rehber');

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="rehber_${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Geçersiz format. csv veya xlsx kullanın' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Contacts export error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Export hatası' },
      { status: 500 }
    );
  }
}

