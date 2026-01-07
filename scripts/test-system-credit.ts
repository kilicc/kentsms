/**
 * Sistem Kredisi Test Script
 * 
 * Bu script sistem kredisi sistemini test eder:
 * 1. Mevcut sistem kredisini gösterir
 * 2. Test SMS gönderir
 * 3. Sistem kredisinin düştüğünü doğrular
 */

import { getSystemCredit, deductSystemCredit, addSystemCredit } from '../lib/utils/systemCredit';

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
        // Tırnak işaretlerini kaldır
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key.trim()] = cleanValue;
      }
    }
  });
}

async function testSystemCredit() {
  try {
    console.log('🔍 Sistem Kredisi Test Başlatılıyor...\n');

    // .env dosyasını yükle
    loadEnvFile();

    // 1. Mevcut sistem kredisini al
    console.log('📊 Mevcut sistem kredisi kontrol ediliyor...');
    const initialCredit = await getSystemCredit();
    console.log(`✅ Mevcut Sistem Kredisi: ${initialCredit.toLocaleString()} SMS\n`);

    if (initialCredit === 0) {
      console.log('⚠️  Sistem kredisi 0! Test için kredi ekleniyor...');
      await addSystemCredit(1000);
      const newCredit = await getSystemCredit();
      console.log(`✅ Sistem kredisi 1000'e yükseltildi: ${newCredit.toLocaleString()} SMS\n`);
    }

    // 2. Test SMS gönderimi simülasyonu (kredi düşürme)
    console.log('📤 Test SMS gönderimi simüle ediliyor...');
    const testSmsCount = 5; // 5 SMS gönder
    const requiredCredit = testSmsCount; // Her SMS = 1 kredi

    console.log(`📝 ${testSmsCount} SMS gönderilecek (${requiredCredit} kredi düşecek)...`);

    const deductResult = await deductSystemCredit(requiredCredit);

    if (!deductResult.success) {
      console.error('❌ Sistem kredisi düşürülemedi:', deductResult.error);
      return;
    }

    console.log(`✅ ${requiredCredit} kredi düşürüldü`);
    console.log(`📊 Kalan Sistem Kredisi: ${deductResult.remainingCredit.toLocaleString()} SMS\n`);

    // 3. Doğrulama
    const finalCredit = await getSystemCredit();
    const expectedCredit = initialCredit - requiredCredit;

    console.log('🔍 Doğrulama yapılıyor...');
    console.log(`   Başlangıç Kredisi: ${initialCredit.toLocaleString()}`);
    console.log(`   Düşen Kredi: ${requiredCredit.toLocaleString()}`);
    console.log(`   Beklenen Kredi: ${expectedCredit.toLocaleString()}`);
    console.log(`   Gerçek Kredi: ${finalCredit.toLocaleString()}`);

    if (finalCredit === expectedCredit) {
      console.log('\n✅ TEST BAŞARILI! Sistem kredisi doğru şekilde düşürüldü.\n');
    } else {
      console.error('\n❌ TEST BAŞARISIZ! Sistem kredisi beklenen değerle eşleşmiyor.');
      console.error(`   Fark: ${Math.abs(finalCredit - expectedCredit)}`);
      return;
    }

    // 4. Krediyi geri ekle (test için)
    console.log('🔄 Test için düşürülen kredi geri ekleniyor...');
    await addSystemCredit(requiredCredit);
    const restoredCredit = await getSystemCredit();
    console.log(`✅ Sistem kredisi geri yüklendi: ${restoredCredit.toLocaleString()} SMS\n`);

    console.log('🎉 Tüm testler başarıyla tamamlandı!');

  } catch (error: any) {
    console.error('❌ Test hatası:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Script'i çalıştır
testSystemCredit()
  .then(() => {
    console.log('\n✅ Test script tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script hatası:', error);
    process.exit(1);
  });

