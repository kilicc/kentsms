import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// POST /api/contacts/import-file - CSV/Excel dosyasından rehber import et
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const groupId = formData.get('groupId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Dosya yüklenmedi' },
        { status: 400 }
      );
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isCSV = fileExtension === 'csv';
    const isExcel = fileExtension === 'xlsx' || fileExtension === 'xls';

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { success: false, message: 'Sadece CSV veya Excel dosyaları destekleniyor' },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer);

    let contacts: any[] = [];

    if (isCSV) {
      // CSV parse
      const Papa = require('papaparse');
      const csvText = fileContent.toString('utf-8');
      
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        encoding: 'utf-8',
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        console.error('CSV parse errors:', parseResult.errors);
      }

      contacts = parseResult.data || [];
    } else if (isExcel) {
      // Excel parse
      const XLSX = require('xlsx');
      const workbook = XLSX.read(fileContent, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      contacts = XLSX.utils.sheet_to_json(worksheet);
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Dosyada kişi bulunamadı' },
        { status: 400 }
      );
    }

    // Get existing contacts for this user using Supabase
    const { data: existingContacts } = await supabaseServer
      .from('contacts')
      .select('phone')
      .eq('user_id', auth.user.userId);

    const existingPhones = new Set((existingContacts || []).map((c: any) => c.phone));

    // Map CSV/Excel columns to contact fields
    // Support multiple column name variations
    const contactsToInsert: any[] = [];
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const contactData of contacts) {
      let phoneValue = 'Unknown';
      try {
        // Map column names (case-insensitive)
        const nameField = Object.keys(contactData).find(
          (key) => key.toLowerCase().includes('isim') || key.toLowerCase().includes('name') || key.toLowerCase().includes('ad')
        );
        const phoneField = Object.keys(contactData).find(
          (key) => key.toLowerCase().includes('telefon') || key.toLowerCase().includes('phone') || key.toLowerCase().includes('numara')
        );
        const emailField = Object.keys(contactData).find(
          (key) => key.toLowerCase().includes('email') || key.toLowerCase().includes('e-posta') || key.toLowerCase().includes('eposta')
        );
        const groupField = Object.keys(contactData).find(
          (key) => key.toLowerCase().includes('grup') || key.toLowerCase().includes('group')
        );
        const notesField = Object.keys(contactData).find(
          (key) => key.toLowerCase().includes('not') || key.toLowerCase().includes('note')
        );

        const name = nameField ? String(contactData[nameField] || '').trim() : '';
        const phone = phoneField ? String(contactData[phoneField] || '').trim().replace(/\D/g, '') : '';
        phoneValue = phone || (phoneField ? String(contactData[phoneField] || 'Unknown') : 'Unknown');
        const email = emailField ? String(contactData[emailField] || '').trim() : '';
        const notes = notesField ? String(contactData[notesField] || '').trim() : '';

        if (!name || !phone) {
          results.failed++;
          results.errors.push(`${phoneValue}: İsim ve telefon gerekli`);
          continue;
        }

        // Check if phone already exists
        if (existingPhones.has(phone)) {
          results.failed++;
          results.errors.push(`${phoneValue}: Zaten kayıtlı`);
          continue;
        }

        // If group name is provided, find group ID
        let finalGroupId = groupId || null;
        if (groupField && contactData[groupField]) {
          const groupName = String(contactData[groupField] || '').trim();
          if (groupName) {
            // Find group by name
            const { data: groupData } = await supabaseServer
              .from('contact_groups')
              .select('id')
              .eq('user_id', auth.user.userId)
              .ilike('name', groupName)
              .limit(1)
              .single();

            if (groupData) {
              finalGroupId = groupData.id;
            }
          }
        }

        contactsToInsert.push({
          user_id: auth.user.userId,
          name,
          phone,
          email: email || null,
          notes: notes || null,
          group_id: finalGroupId,
        });

        existingPhones.add(phone);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${phoneValue}: ${error.message}`);
      }
    }

    // Bulk insert contacts using Supabase
    if (contactsToInsert.length > 0) {
      const { error: insertError } = await supabaseServer
        .from('contacts')
        .insert(contactsToInsert);

      if (insertError) {
        return NextResponse.json(
          { success: false, message: insertError.message || 'Kişiler import edilemedi' },
          { status: 500 }
        );
      }
    }

    // Update group contact count if groupId exists
    if (groupId && results.success > 0) {
      const { data: groupData } = await supabaseServer
        .from('contact_groups')
        .select('contact_count')
        .eq('id', groupId)
        .single();

      if (groupData) {
        await supabaseServer
          .from('contact_groups')
          .update({ contact_count: (groupData.contact_count || 0) + results.success })
          .eq('id', groupId);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import tamamlandı: ${results.success} başarılı, ${results.failed} başarısız`,
      data: results,
    });
  } catch (error: any) {
    console.error('Contacts import file error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Import hatası' },
      { status: 500 }
    );
  }
}

