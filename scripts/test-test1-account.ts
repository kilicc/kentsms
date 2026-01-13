/**
 * test1 hesabı - CepSMS API V1.1.3 dokümantasyonuna göre test
 * 
 * Kullanım:
 *   npx tsx scripts/test-test1-account.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function testTest1Account() {
  console.log('=== test1 Hesabı - CepSMS API V1.1.3 Format Testi ===\n');

  const username = 'test1';
  const commonApiPassword = process.env.COMMON_API_PASSWORD || 'SxRtu2952!!opeq'; // Ortak API şifresi
  const accountPassword = 'Tkaipd771Tka'; // Hesap şifresi
  const testPhone = process.env.TEST_PHONE || '905551234567';
  const testMessage = 'selam test';
  const endpoint = 'https://panel6.cepsms.com/smsapi';

  console.log('✅ Test Bilgileri:');
  console.log(`   Username: ${username}`);
  console.log(`   Common API Password: ${commonApiPassword.substring(0, 3)}***`);
  console.log(`   Account Password: ${accountPassword.substring(0, 3)}***`);
  console.log(`   Test Phone: ${testPhone}`);
  console.log(`   Endpoint: ${endpoint}\n`);

  console.log('='.repeat(80));
  console.log('🔍 Testing with Common API Password:');
  console.log('='.repeat(80) + '\n');

  // 1. Basit format (From olmadan) - Ortak API şifresi ile
  console.log('1️⃣  Basit Format (From olmadan) - Ortak API Şifresi:');
  try {
    const simpleRequest = {
      User: username,
      Pass: commonApiPassword,
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
    } else if (status === 'Payment Required') {
      console.log('\n⚠️  Payment Required - Hesap kredisi/bakiyesi yok');
      console.log('   ✅ API şifresi DOĞRU çalışıyor!');
    } else {
      console.log(`\n⚠️  Status: ${status}`);
    }
  } catch (error: any) {
    console.log(`\n❌ HATA: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response:`, error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔍 Testing with Account Password:');
  console.log('='.repeat(80) + '\n');

  // 2. Basit format (From olmadan) - Hesap şifresi ile
  console.log('2️⃣  Basit Format (From olmadan) - Hesap Şifresi:');
  try {
    const simpleRequest = {
      User: username,
      Pass: accountPassword,
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
    } else if (status === 'Payment Required') {
      console.log('\n⚠️  Payment Required - Hesap kredisi/bakiyesi yok');
      console.log('   ✅ API şifresi DOĞRU çalışıyor!');
    } else {
      console.log(`\n⚠️  Status: ${status}`);
    }
  } catch (error: any) {
    console.log(`\n❌ HATA: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response:`, error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test tamamlandı!');
  console.log('='.repeat(80) + '\n');
}

testTest1Account().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});
