/**
 * Sistem Kredisi Sıfırlama Script
 * 
 * Bu script sistem kredisini 0'a ayarlar
 */

import { updateSystemCredit, getSystemCredit } from '../lib/utils/systemCredit';

// .env dosyasını manuel olarak yükle
function loadEnvFile() {
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env dosyası bulunamadı:', envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');

  envLines.forEach((line: string) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key.trim()] = cleanValue;
      }
    }
  });
}

async function resetSystemCredit() {
  try {
    console.log('🔄 Sistem Kredisi Sıfırlanıyor...\n');

    // .env dosyasını yükle
    loadEnvFile();

    // Mevcut sistem kredisini al
    console.log('📊 Mevcut sistem kredisi kontrol ediliyor...');
    const currentCredit = await getSystemCredit();
    console.log(`   Mevcut Sistem Kredisi: ${currentCredit.toLocaleString()} SMS\n`);

    // Sistem kredisini 0'a ayarla
    console.log('⚠️  Sistem kredisi 0\'a ayarlanıyor...');
    const success = await updateSystemCredit(0);

    if (!success) {
      console.error('❌ Sistem kredisi sıfırlanamadı!');
      process.exit(1);
    }

    // Doğrulama
    const newCredit = await getSystemCredit();
    
    if (newCredit === 0) {
      console.log('✅ Sistem kredisi başarıyla sıfırlandı!');
      console.log(`   Eski Kredi: ${currentCredit.toLocaleString()} SMS`);
      console.log(`   Yeni Kredi: ${newCredit.toLocaleString()} SMS\n`);
    } else {
      console.error('❌ Sistem kredisi sıfırlanamadı! Beklenen: 0, Gerçek:', newCredit);
      process.exit(1);
    }

    console.log('💡 Admin panelinden sistem kredisi ekleyebilirsiniz.');

  } catch (error: any) {
    console.error('❌ Hata:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Script'i çalıştır
resetSystemCredit()
  .then(() => {
    console.log('\n✅ Script tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error);
    process.exit(1);
  });

