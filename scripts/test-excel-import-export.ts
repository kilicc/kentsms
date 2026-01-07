/**
 * Excel Export/Import Test Script
 * 
 * Bu script, export edilen Excel dosyasının formatını test eder
 * ve import fonksiyonunun bu formatı doğru şekilde okuyup okuyamadığını kontrol eder.
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Test verileri - Export formatında
const testExportData = [
  {
    'İsim': 'Ahmet Yılmaz',
    'Telefon': '5551234567',
    'E-posta': 'ahmet@example.com',
    'Grup': 'Müşteriler',
    'Notlar': 'VIP müşteri',
    'Etiketler': 'önemli, aktif',
    'Oluşturulma Tarihi': '07.01.2025',
  },
  {
    'İsim': 'Ayşe Demir',
    'Telefon': '5559876543',
    'E-posta': 'ayse@example.com',
    'Grup': 'Tedarikçiler',
    'Notlar': 'Hızlı teslimat',
    'Etiketler': 'hızlı',
    'Oluşturulma Tarihi': '07.01.2025',
  },
  {
    'İsim': 'Mehmet Kaya',
    'Telefon': '5555555555',
    'E-posta': '',
    'Grup': '',
    'Notlar': 'Yeni müşteri',
    'Etiketler': '',
    'Oluşturulma Tarihi': '07.01.2025',
  },
  {
    'İsim': 'Fatma Şahin',
    'Telefon': '5551111111',
    'E-posta': 'fatma@example.com',
    'Grup': 'Müşteriler',
    'Notlar': '',
    'Etiketler': 'potansiyel',
    'Oluşturulma Tarihi': '07.01.2025',
  },
  {
    'İsim': 'Ali Öztürk',
    'Telefon': '5552222222',
    'E-posta': 'ali@example.com',
    'Grup': 'Tedarikçiler',
    'Notlar': 'Uzun vadeli anlaşma',
    'Etiketler': 'uzun vadeli, güvenilir',
    'Oluşturulma Tarihi': '07.01.2025',
  },
];

function createTestExcelFile() {
  console.log('📝 Test Excel dosyası oluşturuluyor...');
  
  // Workbook oluştur
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(testExportData);
  
  // Sheet'i workbook'a ekle
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rehber');
  
  // Dosyayı kaydet
  const outputPath = path.join(__dirname, 'test-export-import.xlsx');
  XLSX.writeFile(workbook, outputPath);
  
  console.log(`✅ Test Excel dosyası oluşturuldu: ${outputPath}`);
  return outputPath;
}

function readAndParseExcel(filePath: string) {
  console.log('\n📖 Excel dosyası okunuyor ve parse ediliyor...');
  
  // Dosyayı oku
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // JSON'a çevir (import fonksiyonunun yaptığı gibi)
  const contacts = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`✅ ${contacts.length} satır okundu`);
  
  // Debug: İlk satırın kolonlarını göster
  if (contacts.length > 0) {
    console.log('\n🔍 İlk satırın kolonları:');
    console.log(Object.keys(contacts[0] as Record<string, any>));
    console.log('\n📄 İlk satır verisi:');
    console.log(JSON.stringify(contacts[0], null, 2));
  }
  
  return contacts;
}

function testImportMapping(contacts: any[]) {
  console.log('\n🔍 Import mapping testi yapılıyor...');
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
    mappedContacts: [] as any[],
  };
  
  for (const contactData of contacts) {
    try {
      // Debug: Tüm kolonları göster
      const contactDataTyped = contactData as Record<string, any>;
      const allKeys = Object.keys(contactDataTyped);
      if (results.mappedContacts.length === 0) {
        console.log('\n🔍 Mevcut kolonlar:', allKeys);
      }
      
      // Import fonksiyonunun yaptığı mapping işlemi (güncellenmiş versiyon)
      const normalizeKey = (key: string) => key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'i');
      
      const nameField = Object.keys(contactDataTyped).find(
        (key) => {
          const normalized = normalizeKey(key);
          return normalized.includes('isim') || normalized.includes('name') || normalized.includes('ad');
        }
      );
      const phoneField = Object.keys(contactDataTyped).find(
        (key) => {
          const normalized = normalizeKey(key);
          return normalized.includes('telefon') || normalized.includes('phone') || normalized.includes('numara');
        }
      );
      const emailField = Object.keys(contactDataTyped).find(
        (key) => {
          const normalized = normalizeKey(key);
          return normalized.includes('email') || normalized.includes('e-posta') || normalized.includes('eposta') || normalized.includes('e posta');
        }
      );
      const groupField = Object.keys(contactDataTyped).find(
        (key) => {
          const normalized = normalizeKey(key);
          return normalized.includes('grup') || normalized.includes('group');
        }
      );
      const notesField = Object.keys(contactDataTyped).find(
        (key) => {
          const normalized = normalizeKey(key);
          return normalized.includes('not') || normalized.includes('note');
        }
      );
      
      // Debug: Bulunan field'ları göster
      if (results.mappedContacts.length === 0) {
        console.log('\n🔍 Bulunan field\'lar:');
        console.log(`  nameField: ${nameField || 'BULUNAMADI'}`);
        console.log(`  phoneField: ${phoneField || 'BULUNAMADI'}`);
        console.log(`  emailField: ${emailField || 'BULUNAMADI'}`);
        console.log(`  groupField: ${groupField || 'BULUNAMADI'}`);
        console.log(`  notesField: ${notesField || 'BULUNAMADI'}`);
      }
      
      const name = nameField ? String(contactDataTyped[nameField] || '').trim() : '';
      const phone = phoneField ? String(contactDataTyped[phoneField] || '').trim().replace(/\D/g, '') : '';
      const email = emailField ? String(contactDataTyped[emailField] || '').trim() : '';
      const notes = notesField ? String(contactDataTyped[notesField] || '').trim() : '';
      const group = groupField ? String(contactDataTyped[groupField] || '').trim() : '';
      
      // Debug: Parse edilen değerleri göster
      if (results.mappedContacts.length === 0) {
        console.log('\n🔍 Parse edilen değerler:');
        console.log(`  name: "${name}"`);
        console.log(`  phone: "${phone}"`);
        console.log(`  email: "${email}"`);
        console.log(`  notes: "${notes}"`);
        console.log(`  group: "${group}"`);
      }
      
      if (!name || !phone) {
        results.failed++;
        results.errors.push(`${phone || 'Unknown'}: İsim ve telefon gerekli`);
        continue;
      }
      
      results.mappedContacts.push({
        name,
        phone,
        email: email || null,
        notes: notes || null,
        group: group || null,
      });
      
      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push(`Parse hatası: ${error.message}`);
    }
  }
  
  return results;
}

function printResults(results: any) {
  console.log('\n📊 Test Sonuçları:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Başarılı: ${results.success}`);
  console.log(`❌ Başarısız: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Hatalar:');
    results.errors.forEach((error: string) => console.log(`   - ${error}`));
  }
  
  console.log('\n📋 Map edilen kişiler:');
  results.mappedContacts.forEach((contact: any, index: number) => {
    console.log(`\n${index + 1}. ${contact.name}`);
    console.log(`   Telefon: ${contact.phone}`);
    console.log(`   E-posta: ${contact.email || '(boş)'}`);
    console.log(`   Grup: ${contact.group || '(boş)'}`);
    console.log(`   Notlar: ${contact.notes || '(boş)'}`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Orijinal verilerle karşılaştır
  console.log('\n🔄 Orijinal verilerle karşılaştırma:');
  for (let i = 0; i < testExportData.length; i++) {
    const original = testExportData[i];
    const mapped = results.mappedContacts[i];
    
    if (mapped) {
      const nameMatch = mapped.name === original['İsim'];
      const phoneMatch = mapped.phone === original['Telefon'].replace(/\D/g, '');
      const emailMatch = mapped.email === (original['E-posta'] || null);
      const groupMatch = mapped.group === (original['Grup'] || null);
      const notesMatch = mapped.notes === (original['Notlar'] || null);
      
      console.log(`\n${i + 1}. ${original['İsim']}:`);
      console.log(`   İsim: ${nameMatch ? '✅' : '❌'}`);
      console.log(`   Telefon: ${phoneMatch ? '✅' : '❌'} (${original['Telefon']} → ${mapped.phone})`);
      console.log(`   E-posta: ${emailMatch ? '✅' : '❌'} (${original['E-posta'] || '(boş)'} → ${mapped.email || '(boş)'})`);
      console.log(`   Grup: ${groupMatch ? '✅' : '❌'} (${original['Grup'] || '(boş)'} → ${mapped.group || '(boş)'})`);
      console.log(`   Notlar: ${notesMatch ? '✅' : '❌'} (${original['Notlar'] || '(boş)'} → ${mapped.notes || '(boş)'})`);
    }
  }
}

// Ana test fonksiyonu
function runTest() {
  console.log('🧪 Excel Export/Import Test Başlatılıyor...\n');
  
  try {
    // 1. Test Excel dosyası oluştur
    const excelPath = createTestExcelFile();
    
    // 2. Excel dosyasını oku ve parse et
    const contacts = readAndParseExcel(excelPath);
    
    // 3. Import mapping testi
    const results = testImportMapping(contacts);
    
    // 4. Sonuçları yazdır
    printResults(results);
    
    // 5. Özet
    console.log('\n✨ Test Özeti:');
    if (results.success === testExportData.length && results.failed === 0) {
      console.log('✅ TÜM TESTLER BAŞARILI! Export edilen dosya import edilebilir.');
    } else {
      console.log('⚠️  BAZI TESTLER BAŞARISIZ! Export/Import formatları uyumsuz olabilir.');
    }
    
    console.log(`\n📁 Test dosyası: ${excelPath}`);
    console.log('💡 Bu dosyayı manuel olarak import edip test edebilirsiniz.\n');
    
  } catch (error: any) {
    console.error('❌ Test hatası:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Script çalıştır
runTest();

