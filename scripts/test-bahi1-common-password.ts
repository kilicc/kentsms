/**
 * bahi1 hesabı - Ortak API şifresi ile test
 * 
 * Kullanım:
 *   npx tsx scripts/test-bahi1-common-password.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function testBahi1WithCommonPassword() {
  console.log('=== bahi1 Hesabı - Ortak API Şifresi ile Test ===\n');

  const username = 'bahi1';
  const commonApiPassword = 'SxRtu2952!!opeq'; // Ortak API şifresi
  const testPhone = '905551234567';
  const testMessage = 'selam test';
  const endpoint = 'https://panel6.cepsms.com/smsapi';

  console.log('✅ Test Bilgileri:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${commonApiPassword.substring(0, 3)}*** (Ortak API Şifresi)`);
  console.log(`   Test Phone: ${testPhone}\n`);

  console.log('='.repeat(80));
  console.log('🔍 Testing with Common API Password:');
  console.log('='.repeat(80) + '\n');

  // 1. Basit format (From olmadan)
  console.log('1️⃣  Basit Format (From olmadan):');
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
    console.log(`\n❌ Hata: ${error.message}`);
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. Gelişmiş format (From ile)
  console.log('\n' + '='.repeat(80));
  console.log('2️⃣  Gelişmiş Format (From ile):');
  console.log('='.repeat(80));
  
  try {
    const advancedRequest = {
      From: 'CepSMS',
      User: username,
      Pass: commonApiPassword,
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
    } else if (status === 'Payment Required') {
      console.log('\n⚠️  Payment Required - Hesap kredisi/bakiyesi yok');
      console.log('   ✅ API şifresi DOĞRU çalışıyor!');
    } else if (status === 'Source address (From) is invalid') {
      console.log('\n⚠️  From alanı geçersiz');
      console.log('   ✅ API şifresi DOĞRU çalışıyor! (From sorunu)');
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
  console.log('📋 Sonuç ve Öneriler:');
  console.log('='.repeat(80));
  console.log('\n✅ Ortak API Şifresi: SxRtu2952!!opeq');
  console.log('✅ Kullanıcı Adı: bahi1\n');
  
  console.log('🔍 Olası Sorunlar:');
  console.log('1. Hesap kredisi/bakiyesi yok olabilir (Payment Required)');
  console.log('2. From alanı geçersiz olabilir (Source address invalid)');
  console.log('3. API aktif değil olabilir (User Error)');
  console.log('4. Kullanıcı adı yanlış olabilir (User Error)\n');

  console.log('='.repeat(80));
  console.log('✅ Test tamamlandı!');
  console.log('='.repeat(80) + '\n');
}

// Script'i çalıştır
testBahi1WithCommonPassword().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});
