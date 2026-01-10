/**
 * pasha1 hesabını test et
 * 
 * Kullanım:
 *   npx tsx scripts/test-pasha1-account.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getAccountByUsername } from '../lib/utils/cepsmsAccounts';
import { sendSMS } from '../lib/utils/cepSMSProvider';
import axios from 'axios';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function testPasha1Account() {
  console.log('=== pasha1 Hesabı Test ===\n');

  const testPhone = process.env.TEST_PHONE || '905551234567';
  console.log(`Test telefon numarası: ${testPhone}\n`);

  // pasha1 hesabını al
  const account = getAccountByUsername('pasha1');
  
  if (!account) {
    console.error('❌ pasha1 hesabı bulunamadı!');
    process.exit(1);
  }

  console.log('✅ Hesap bulundu:');
  console.log(`   Username: ${account.username}`);
  console.log(`   Password: ${account.password.substring(0, 5)}... (${account.password.length} karakter)`);
  console.log(`   Phone: ${account.phone}\n`);

  // Direkt API test
  console.log('📡 Direkt API bağlantı testi yapılıyor...\n');
  
  const API_URL = process.env.CEPSMS_API_URL || 'https://panel4.cepsms.com/smsapi';
  
  const testPayload = {
    User: account.username,
    Pass: account.password,
    Message: 'Test SMS - API bağlantı testi',
    Numbers: [testPhone],
  };

  console.log('📤 API Request:');
  console.log(`   URL: ${API_URL}`);
  console.log(`   User: ${account.username}`);
  console.log(`   Pass: ${account.password.substring(0, 5)}...`);
  console.log(`   Message: ${testPayload.Message}`);
  console.log(`   Numbers: [${testPhone}]\n`);

  try {
    // JSON formatında dene
    console.log('1️⃣  JSON formatında deneniyor...');
    const response = await axios.post(API_URL, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
      validateStatus: (status) => status < 500,
    });

    console.log('📥 API Response:');
    console.log(`   Status Code: ${response.status}`);
    console.log(`   Response Data:`, JSON.stringify(response.data, null, 2));
    console.log('');

    const status = response.data?.Status || response.data?.status || response.data?.statusCode;
    const messageId = response.data?.MessageId || response.data?.messageId;
    const error = response.data?.Error || response.data?.error;

    if (status === 'OK' || status === 200) {
      console.log('✅ BAŞARILI! SMS gönderildi.');
      console.log(`   MessageId: ${messageId}`);
    } else if (status === 'System Error' || status === 'SYSTEM ERROR') {
      console.log('❌ System Error alındı. Alternatif formatlar deneniyor...\n');
      
      // Form-encoded formatında dene
      console.log('2️⃣  Form-encoded formatında deneniyor...');
      const formData = new URLSearchParams();
      formData.append('User', account.username);
      formData.append('Pass', account.password);
      formData.append('Message', testPayload.Message);
      formData.append('Numbers', testPhone);

      const formResponse = await axios.post(API_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      console.log('📥 Form-encoded Response:');
      console.log(`   Status Code: ${formResponse.status}`);
      console.log(`   Response Data:`, JSON.stringify(formResponse.data, null, 2));
      console.log('');

      const formStatus = formResponse.data?.Status || formResponse.data?.status;
      if (formStatus === 'OK' || formStatus === 200) {
        console.log('✅ BAŞARILI! (Form-encoded formatı çalıştı)');
        console.log(`   MessageId: ${formResponse.data?.MessageId || formResponse.data?.messageId}`);
      } else {
        console.log('❌ Form-encoded formatı da başarısız.');
        console.log('💡 Öneriler:');
        console.log('   1. CepSMS panelinden hesabın aktif olduğunu kontrol edin');
        console.log('   2. Şifrenin doğru olduğunu kontrol edin');
        console.log('   3. Hesabın SMS gönderme yetkisi olduğunu kontrol edin');
        console.log('   4. CepSMS destek ekibiyle iletişime geçin');
      }
    } else if (status === 'User Error' || status === 'USER ERROR') {
      console.log('❌ User Error alındı.');
      console.log('   Bu genellikle kullanıcı adı veya şifre yanlış olduğunda olur.');
      console.log('💡 CepSMS panelinden hesap bilgilerini kontrol edin.');
    } else {
      console.log(`⚠️  Beklenmeyen durum: ${status}`);
      console.log(`   Error: ${error || 'Yok'}`);
    }

    // sendSMS fonksiyonu ile de test et
    console.log('\n3️⃣  sendSMS fonksiyonu ile test ediliyor...');
    const smsResult = await sendSMS(testPhone, 'Test SMS - sendSMS fonksiyonu', 'pasha1');
    
    if (smsResult.success) {
      console.log('✅ sendSMS fonksiyonu başarılı!');
      console.log(`   MessageId: ${smsResult.messageId}`);
    } else {
      console.log('❌ sendSMS fonksiyonu başarısız:');
      console.log(`   Error: ${smsResult.error}`);
    }

  } catch (error: any) {
    console.error('❌ API bağlantı hatası:');
    console.error(`   Message: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
  }
}

// Script'i çalıştır
testPasha1Account().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});
