/**
 * bahi1 hesabı bağlantı testi
 * 
 * Kullanım:
 *   npx tsx scripts/test-bahi1-connection.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getAccountByUsername } from '../lib/utils/cepsmsAccounts';
import axios from 'axios';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function testBahi1Connection() {
  console.log('=== bahi1 Hesabı Bağlantı Testi ===\n');

  // bahi1 hesabını al
  const account = getAccountByUsername('bahi1');
  
  if (!account) {
    console.error('❌ bahi1 hesabı bulunamadı!');
    process.exit(1);
  }

  console.log('✅ Hesap bilgileri:');
  console.log(`   Username: ${account.username}`);
  console.log(`   Password: ${account.password}`);
  console.log(`   Phone: ${account.phone}\n`);

  const testPhone = process.env.TEST_PHONE || '905551234567';
  console.log(`Test telefon numarası: ${testPhone}\n`);

  // API endpoint'leri
  const apiEndpoints = [
    'https://panel4.cepsms.com/smsapi',
    'https://api.cepsms.com/sms/send',
    'https://www.cepsms.com/api/sms/send',
    'https://panel.cepsms.com/api/sms/send',
  ];

  const testMessage = 'Bağlantı testi - bahi1 hesabı';

  // Her endpoint ve format kombinasyonunu test et
  for (const endpoint of apiEndpoints) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Testing: ${endpoint}`);
    console.log('='.repeat(80));

    // 1. JSON format - Numbers array
    console.log('\n1️⃣  JSON format (Numbers: array):');
    try {
      const jsonResp = await axios.post(endpoint, {
        User: account.username,
        Pass: account.password,
        Message: testMessage,
        Numbers: [testPhone],
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      console.log(`   Status Code: ${jsonResp.status}`);
      console.log(`   Response:`, JSON.stringify(jsonResp.data, null, 2));
      
      const status = jsonResp.data?.Status || jsonResp.data?.status;
      if (status === 'OK' || status === 200) {
        console.log('   ✅ BAŞARILI!');
      } else {
        console.log(`   ⚠️  Status: ${status}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Hata: ${error.message}`);
    }

    // 2. JSON format - Numbers string
    console.log('\n2️⃣  JSON format (Numbers: string):');
    try {
      const jsonStrResp = await axios.post(endpoint, {
        User: account.username,
        Pass: account.password,
        Message: testMessage,
        Numbers: testPhone, // String format
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      console.log(`   Status Code: ${jsonStrResp.status}`);
      console.log(`   Response:`, JSON.stringify(jsonStrResp.data, null, 2));
      
      const status = jsonStrResp.data?.Status || jsonStrResp.data?.status;
      if (status === 'OK' || status === 200) {
        console.log('   ✅ BAŞARILI!');
      } else {
        console.log(`   ⚠️  Status: ${status}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Hata: ${error.message}`);
    }

    // 3. Form-encoded format - Numbers[]
    console.log('\n3️⃣  Form-encoded format (Numbers[]):');
    try {
      const formData1 = new URLSearchParams();
      formData1.append('User', account.username);
      formData1.append('Pass', account.password);
      formData1.append('Message', testMessage);
      formData1.append('Numbers[]', testPhone);

      const formResp1 = await axios.post(endpoint, formData1.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      console.log(`   Status Code: ${formResp1.status}`);
      console.log(`   Response:`, JSON.stringify(formResp1.data, null, 2));
      
      const status = formResp1.data?.Status || formResp1.data?.status;
      if (status === 'OK' || status === 200) {
        console.log('   ✅ BAŞARILI!');
      } else {
        console.log(`   ⚠️  Status: ${status}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Hata: ${error.message}`);
    }

    // 4. Form-encoded format - Numbers (tek değer)
    console.log('\n4️⃣  Form-encoded format (Numbers: tek değer):');
    try {
      const formData2 = new URLSearchParams();
      formData2.append('User', account.username);
      formData2.append('Pass', account.password);
      formData2.append('Message', testMessage);
      formData2.append('Numbers', testPhone);

      const formResp2 = await axios.post(endpoint, formData2.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      console.log(`   Status Code: ${formResp2.status}`);
      console.log(`   Response:`, JSON.stringify(formResp2.data, null, 2));
      
      const status = formResp2.data?.Status || formResp2.data?.status;
      if (status === 'OK' || status === 200) {
        console.log('   ✅ BAŞARILI!');
      } else {
        console.log(`   ⚠️  Status: ${status}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Hata: ${error.message}`);
    }

    // 5. GET request format
    console.log('\n5️⃣  GET request format:');
    try {
      const getParams = new URLSearchParams({
        User: account.username,
        Pass: account.password,
        Message: testMessage,
        Numbers: testPhone,
      });

      const getResp = await axios.get(`${endpoint}?${getParams.toString()}`, {
        headers: {
          'Accept': 'application/json',
        },
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      console.log(`   Status Code: ${getResp.status}`);
      console.log(`   Response:`, JSON.stringify(getResp.data, null, 2));
      
      const status = getResp.data?.Status || getResp.data?.status;
      if (status === 'OK' || status === 200) {
        console.log('   ✅ BAŞARILI!');
      } else {
        console.log(`   ⚠️  Status: ${status}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Hata: ${error.message}`);
    }

    // Her endpoint arasında kısa bekleme
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test tamamlandı!');
  console.log('='.repeat(80) + '\n');
}

// Script'i çalıştır
testBahi1Connection().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});
