/**
 * Klas1 hesabı - CepSMS API V1.1.3 dokümantasyonuna göre test
 * 
 * Kullanım:
 *   npx tsx scripts/test-Klas1-account.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function testKlas1Account() {
  console.log('=== Klas1 Hesabı - CepSMS API V1.1.3 Format Testi ===\n');

  const username = 'Klas1';
  const password = 'Tkaipd773773!';

  console.log('✅ Hesap bilgileri:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password.substring(0, 3)}***`);
  console.log(`   Password Length: ${password.length}\n`);

  const testPhone = process.env.TEST_PHONE || '905551234567';
  console.log(`Test telefon numarası: ${testPhone}\n`);

  const endpoint = 'https://panel4.cepsms.com/smsapi';
  const testMessage = 'selam test';

  console.log('='.repeat(80));
  console.log('🔍 Testing: https://panel4.cepsms.com/smsapi');
  console.log('='.repeat(80) + '\n');

  // 1. Send SMS Simple (API Dokümantasyonu Formatı)
  console.log('1️⃣  Send SMS Simple (API Dokümantasyonu Formatı):');
  try {
    const simpleRequest = {
      User: username,
      Pass: password,
      Message: testMessage,
      Numbers: [testPhone],
    };

    console.log('📤 Request:');
    console.log(JSON.stringify({
      User: simpleRequest.User,
      Pass: '***',
      Message: simpleRequest.Message,
      Numbers: simpleRequest.Numbers,
    }, null, 2));

    const simpleResp = await axios.post(endpoint, simpleRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
      validateStatus: (status) => status < 500,
    });

    console.log(`\n📥 Status Code: ${simpleResp.status}`);
    console.log('📥 Response:');
    console.log(JSON.stringify(simpleResp.data, null, 2));
    
    const status = simpleResp.data?.Status || simpleResp.data?.status;
    if (status === 'OK' || status === 200) {
      console.log('\n✅ BAŞARILI! SMS gönderildi.');
      if (simpleResp.data?.MessageId) {
        console.log(`   MessageId: ${simpleResp.data.MessageId}`);
      }
    } else if (status === 'User Error') {
      console.log('\n❌ User Error - Kullanıcı adı veya şifre hatalı');
    } else if (status === 'System Error') {
      console.log('\n⚠️  System Error - Sistem hatası');
    } else if (status === 'Error') {
      console.log('\n❌ Error - API hatası');
    } else {
      console.log(`\n⚠️  Status: ${status}`);
    }
  } catch (error: any) {
    console.log(`\n❌ Hata: ${error.message}`);
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. Send SMS (Gelişmiş Format - From ile)
  console.log('\n' + '='.repeat(80));
  console.log('2️⃣  Send SMS (Gelişmiş Format - From ile):');
  console.log('='.repeat(80));
  
  try {
    const advancedRequest = {
      From: 'CepSMS',
      User: username,
      Pass: password,
      Message: testMessage,
      Coding: 'default',
      StartDate: null,
      ValidityPeriod: 1140,
      Numbers: [testPhone],
    };

    console.log('\n📤 Request:');
    console.log(JSON.stringify({
      From: advancedRequest.From,
      User: advancedRequest.User,
      Pass: '***',
      Message: advancedRequest.Message,
      Coding: advancedRequest.Coding,
      StartDate: advancedRequest.StartDate,
      ValidityPeriod: advancedRequest.ValidityPeriod,
      Numbers: advancedRequest.Numbers,
    }, null, 2));

    const advancedResp = await axios.post(endpoint, advancedRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
      validateStatus: (status) => status < 500,
    });

    console.log(`\n📥 Status Code: ${advancedResp.status}`);
    console.log('📥 Response:');
    console.log(JSON.stringify(advancedResp.data, null, 2));
    
    const status = advancedResp.data?.Status || advancedResp.data?.status;
    if (status === 'OK' || status === 200) {
      console.log('\n✅ BAŞARILI! SMS gönderildi.');
      if (advancedResp.data?.MessageId) {
        console.log(`   MessageId: ${advancedResp.data.MessageId}`);
      }
    } else if (status === 'User Error') {
      console.log('\n❌ User Error - Kullanıcı adı veya şifre hatalı');
    } else if (status === 'System Error') {
      console.log('\n⚠️  System Error - Sistem hatası');
    } else if (status === 'Error') {
      console.log('\n❌ Error - API hatası');
    } else {
      console.log(`\n⚠️  Status: ${status}`);
    }
  } catch (error: any) {
    console.log(`\n❌ Hata: ${error.message}`);
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test tamamlandı!');
  console.log('='.repeat(80) + '\n');
}

// Script'i çalıştır
testKlas1Account().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});
