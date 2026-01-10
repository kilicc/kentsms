/**
 * admin2 kullanıcısının bağlantı testi
 * admin2'nin hangi CepSMS hesabını kullandığını test eder
 * 
 * Kullanım:
 *   npx tsx scripts/test-admin2-connection.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getAccountByUsername } from '../lib/utils/cepsmsAccounts';
import axios from 'axios';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function testAdmin2Connection() {
  console.log('=== admin2 Kullanıcısı Bağlantı Testi ===\n');

  // Önce admin2'nin hangi hesabı kullanacağını simüle edelim
  // Admin ise: Smsexp hesabı
  // Admin değilse: varsayılan .env hesabı
  
  const CEPSMS_USERNAME = process.env.CEPSMS_USERNAME;
  const CEPSMS_PASSWORD = process.env.CEPSMS_PASSWORD;
  
  console.log('📋 Senaryo 1: Admin2 Admin rolünde ise "Smsexp" hesabı kullanır');
  console.log('📋 Senaryo 2: Admin2 Admin değilse varsayılan .env hesabı kullanır\n');
  
  // Senaryo 1: Admin2 Admin ise (Smsexp hesabı)
  console.log('='.repeat(80));
  console.log('🔍 Senaryo 1: Admin2 Admin → Smsexp Hesabı');
  console.log('='.repeat(80));
  
  const smsexpAccount = getAccountByUsername('Smsexp');
  if (smsexpAccount) {
    console.log('\n✅ Smsexp hesabı bulundu:');
    console.log(`   Username: ${smsexpAccount.username}`);
    console.log(`   Password: ${smsexpAccount.password}`);
    console.log(`   Phone: ${smsexpAccount.phone}\n`);
    
    await testAccount(smsexpAccount, 'Smsexp (Admin2 Admin rolünde)');
  } else {
    console.log('❌ Smsexp hesabı bulunamadı!\n');
  }

  // Senaryo 2: Admin2 Admin değilse (varsayılan .env hesabı)
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Senaryo 2: Admin2 Admin Değil → Varsayılan .env Hesabı');
  console.log('='.repeat(80));
  
  if (CEPSMS_USERNAME && CEPSMS_PASSWORD) {
    console.log('\n✅ Varsayılan .env hesabı:');
    console.log(`   Username: ${CEPSMS_USERNAME}`);
    console.log(`   Password: ${CEPSMS_PASSWORD.substring(0, 3)}***\n`);
    
    const defaultAccount = {
      username: CEPSMS_USERNAME,
      password: CEPSMS_PASSWORD,
      phone: '00000000000',
      from: 'CepSMS',
    };
    
    await testAccount(defaultAccount, 'Varsayılan .env (Admin2 Admin değil)');
  } else {
    console.log('❌ Varsayılan .env hesabı bulunamadı!\n');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test tamamlandı!');
  console.log('='.repeat(80) + '\n');
}

async function testAccount(account: { username: string; password: string; phone: string; from?: string }, scenario: string) {
  const testPhone = process.env.TEST_PHONE || '905551234567';
  const testMessage = `Bağlantı testi - ${scenario}`;
  const endpoint = 'https://panel4.cepsms.com/smsapi';

  console.log(`\n🔍 Testing: ${endpoint}`);
  console.log(`📋 Senaryo: ${scenario}\n`);

  // JSON format - Numbers array (en yaygın format)
  console.log('1️⃣  JSON format (Numbers: array):');
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
    } else if (status === 'User Error') {
      console.log('   ⚠️  User Error - Kullanıcı adı veya şifre hatalı');
    } else if (status === 'System Error') {
      console.log('   ⚠️  System Error - Sistem hatası');
    } else {
      console.log(`   ⚠️  Status: ${status}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Hata: ${error.message}`);
  }

  // JSON format - Numbers string
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
    } else if (status === 'User Error') {
      console.log('   ⚠️  User Error - Kullanıcı adı veya şifre hatalı');
    } else if (status === 'System Error') {
      console.log('   ⚠️  System Error - Sistem hatası');
    } else {
      console.log(`   ⚠️  Status: ${status}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Hata: ${error.message}`);
  }

  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Script'i çalıştır
testAdmin2Connection().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});
