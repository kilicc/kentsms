/**
 * Tüm CepSMS hesaplarını test et
 * Her hesaptan birer test SMS göndererek bağlantıları kontrol eder
 * 
 * Kullanım:
 *   npx tsx scripts/test-all-cepsms-accounts.ts
 *   veya
 *   ./node_modules/.bin/tsx scripts/test-all-cepsms-accounts.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getAllAccounts } from '../lib/utils/cepsmsAccounts';
import { sendSMS } from '../lib/utils/cepSMSProvider';

// .env dosyasını yükle (proje kök dizininden)
config({ path: resolve(process.cwd(), '.env') });

async function testAllCepSMSAccounts() {
  console.log('=== CepSMS Hesapları Test Başlatılıyor ===\n');

  const accounts = getAllAccounts();
  console.log(`Toplam ${accounts.length} hesap bulundu.\n`);

  const results: Array<{
    account: string;
    phone: string;
    success: boolean;
    error?: string;
    messageId?: string;
  }> = [];

  // Test telefon numarası (kendi numaranızı buraya yazın)
  const testPhone = process.env.TEST_PHONE || '905551234567';

  console.log(`Test telefon numarası: ${testPhone}\n`);
  console.log('Her hesaptan test SMS gönderiliyor...\n');

  for (const account of accounts) {
    console.log(`\n[Test] Hesap: ${account.username} (${account.phone})`);
    console.log(`  Şifre uzunluğu: ${account.password.length} karakter`);

    try {
      const result = await sendSMS(testPhone, `Test SMS - ${account.username} hesabından gönderildi.`, account.username);

      if (result.success && result.messageId) {
        console.log(`  ✅ BAŞARILI - MessageId: ${result.messageId}`);
        results.push({
          account: account.username,
          phone: account.phone,
          success: true,
          messageId: result.messageId,
        });
      } else {
        console.log(`  ❌ BAŞARISIZ - Hata: ${result.error || 'Bilinmeyen hata'}`);
        results.push({
          account: account.username,
          phone: account.phone,
          success: false,
          error: result.error || 'Bilinmeyen hata',
        });
      }
    } catch (error: any) {
      console.log(`  ❌ HATA - ${error.message || error}`);
      results.push({
        account: account.username,
        phone: account.phone,
        success: false,
        error: error.message || String(error),
      });
    }

    // Her SMS arasında kısa bir bekleme (rate limiting)
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye bekle
  }

  // Özet rapor
  console.log('\n\n=== TEST SONUÇLARI ===\n');
  
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  console.log(`Toplam: ${results.length} hesap`);
  console.log(`✅ Başarılı: ${successCount}`);
  console.log(`❌ Başarısız: ${failedCount}\n`);

  if (successCount > 0) {
    console.log('✅ Başarılı Hesaplar:');
    results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`  - ${r.account} (${r.phone}) - MessageId: ${r.messageId}`);
      });
    console.log('');
  }

  if (failedCount > 0) {
    console.log('❌ Başarısız Hesaplar:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.account} (${r.phone})`);
        console.log(`    Hata: ${r.error}`);
      });
    console.log('');
  }

  // Öneriler
  if (failedCount > 0) {
    console.log('💡 Öneriler:');
    console.log('  1. Başarısız hesapların şifrelerini CepSMS panelinden kontrol edin');
    console.log('  2. Hesapların aktif olduğundan emin olun');
    console.log('  3. CepSMS panelinde SMS gönderme yetkisi olduğunu kontrol edin');
    console.log('  4. API endpoint\'inin doğru olduğunu kontrol edin');
    console.log('');
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

// Script'i çalıştır
testAllCepSMSAccounts().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});
