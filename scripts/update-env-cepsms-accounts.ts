#!/usr/bin/env ts-node

/**
 * .env dosyasını CepSMS hesapları ile güncelle
 * 
 * Kullanım:
 *   npx tsx scripts/update-env-cepsms-accounts.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { getAllAccounts } from '../lib/utils/cepsmsAccounts';

function updateEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  
  console.log(`📝 .env dosyası güncelleniyor: ${envPath}\n`);
  
  // Mevcut .env dosyasını oku
  let envContent = '';
  try {
    envContent = readFileSync(envPath, 'utf-8');
    console.log('✅ Mevcut .env dosyası okundu\n');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('⚠️  .env dosyası bulunamadı, yeni dosya oluşturuluyor...\n');
      envContent = '';
    } else {
      console.error('❌ .env dosyası okunamadı:', error.message);
      process.exit(1);
    }
  }
  
  // Mevcut .env içeriğini satır satır parse et
  const lines = envContent.split('\n');
  const newLines: string[] = [];
  let inCepSMSSection = false;
  let cepsmsSectionEnded = false;
  
  // Mevcut içeriği koru, sadece CepSMS kısmını güncelle
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // CepSMS ile ilgili satırları atla (sonra güncel hali eklenecek)
    if (trimmedLine.startsWith('CEPSMS_USERNAME=') || 
        trimmedLine.startsWith('CEPSMS_PASSWORD=') || 
        trimmedLine.startsWith('CEPSMS_FROM=') ||
        trimmedLine.startsWith('CEPSMS_API_URL=')) {
      if (!inCepSMSSection) {
        inCepSMSSection = true;
        // CepSMS yorum satırı ekle
        newLines.push('');
        newLines.push('# CepSMS Configuration');
        // Varsayılan değerler (ilk hesap)
        const accounts = getAllAccounts();
        if (accounts.length > 0) {
          const firstAccount = accounts[0];
          newLines.push(`CEPSMS_USERNAME=${firstAccount.username}`);
          newLines.push(`CEPSMS_PASSWORD=${firstAccount.password}`);
          newLines.push(`CEPSMS_FROM=${firstAccount.from || 'CepSMS'}`);
          newLines.push(`CEPSMS_API_URL=${process.env.CEPSMS_API_URL || 'https://panel4.cepsms.com/smsapi'}`);
        }
        cepsmsSectionEnded = true;
      }
      // Bu satırı atla (yukarıda eklendi)
      continue;
    }
    
    // CepSMS yorum satırını koru veya ekle
    if (trimmedLine === '# CepSMS Configuration' || trimmedLine.startsWith('# CepSMS')) {
      if (!inCepSMSSection) {
        inCepSMSSection = true;
      }
      continue;
    }
    
    // Diğer satırları koru
    newLines.push(line);
  }
  
  // Eğer CepSMS bölümü eklenmediyse, dosyanın sonuna ekle
  if (!cepsmsSectionEnded) {
    newLines.push('');
    newLines.push('# CepSMS Configuration');
    const accounts = getAllAccounts();
    if (accounts.length > 0) {
      const firstAccount = accounts[0];
      newLines.push(`CEPSMS_USERNAME=${firstAccount.username}`);
      newLines.push(`CEPSMS_PASSWORD=${firstAccount.password}`);
      newLines.push(`CEPSMS_FROM=${firstAccount.from || 'CepSMS'}`);
      newLines.push(`CEPSMS_API_URL=${process.env.CEPSMS_API_URL || 'https://panel4.cepsms.com/smsapi'}`);
    }
  }
  
  // CepSMS hesapları listesi (yorum olarak)
  newLines.push('');
  newLines.push('# CepSMS Accounts List');
  newLines.push('# Format: username password');
  const accounts = getAllAccounts();
  accounts.forEach((account) => {
    newLines.push(`# ${account.username} ${account.password} ${account.phone}`);
  });
  
  // Yeni içeriği dosyaya yaz
  const newContent = newLines.join('\n');
  
  try {
    writeFileSync(envPath, newContent, 'utf-8');
    console.log('✅ .env dosyası başarıyla güncellendi!\n');
    console.log('📋 Güncellenen CepSMS ayarları:');
    console.log(`   CEPSMS_USERNAME=${accounts[0]?.username || 'N/A'}`);
    console.log(`   CEPSMS_PASSWORD=${accounts[0]?.password ? '***' : 'N/A'}`);
    console.log(`   CEPSMS_FROM=${accounts[0]?.from || 'CepSMS'}`);
    console.log(`   CEPSMS_API_URL=https://panel4.cepsms.com/smsapi\n`);
    console.log(`📊 Toplam ${accounts.length} hesap listelendi\n`);
  } catch (error: any) {
    console.error('❌ .env dosyası yazılamadı:', error.message);
    console.error('💡 İzin hatası alıyorsanız, şu komutu çalıştırın:');
    console.error(`   chmod 644 ${envPath}`);
    process.exit(1);
  }
}

// Script'i çalıştır
updateEnvFile();
