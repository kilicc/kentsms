/**
 * Demir1 hesabı - From alanı ile test (yeni format)
 * 
 * Kullanım:
 *   npx tsx scripts/test-Demir1-with-From.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function testDemir1WithFrom() {
  console.log('=== Demir1 Hesabı - From Alanı ile Test ===\n');

  const username = 'Demir2';
  const password = 'SxRtu2952!!opeq'; // API ŞİFRESİ (Panel şifresi değil!)
  const from = 'Baslik'; // Panelde tanımlı başlık
  const testPhone = '05075708797';
  const testMessage = 'selam test';
  const endpoint = 'https://panel6.cepsms.com/smsapi';

  console.log('✅ Test Bilgileri:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password} (API ŞİFRESİ)`);
  console.log(`   From: ${from} (Panelde tanımlı başlık)`);
  console.log(`   Test Phone: ${testPhone}\n`);

  console.log('='.repeat(80));
  console.log('🔍 Testing with From field:');
  console.log('='.repeat(80) + '\n');

  try {
    const requestData = {
      From: from,          // panelde tanımlı başlık
      User: username,
      Pass: password,      // API ŞİFRESİ (PANEL ŞİFRESİ DEĞİL)
      Message: testMessage,
      Coding: 'default',
      StartDate: null,
      ValidityPeriod: 1140,
      Numbers: [
        testPhone
      ]
    };

    console.log('📤 Request:');
    console.log(JSON.stringify({
      From: requestData.From,
      User: requestData.User,
      Pass: '***',
      Message: requestData.Message,
      Coding: requestData.Coding,
      StartDate: requestData.StartDate,
      ValidityPeriod: requestData.ValidityPeriod,
      Numbers: requestData.Numbers,
    }, null, 2));

    const response = await axios.post(
      endpoint,
      requestData,
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    console.log(`\n📥 Status Code: ${response.status}`);
    console.log('📥 Response:');
    console.log(JSON.stringify(response.data, null, 2));

    const status = response.data?.Status || response.data?.status;
    if (status === 'OK' || status === 200) {
      console.log('\n✅ BAŞARILI! SMS gönderildi.');
      if (response.data?.MessageId) {
        console.log(`   MessageId: ${response.data.MessageId}`);
      }
    } else if (status === 'User Error') {
      console.log('\n❌ User Error - Kullanıcı adı veya şifre hatalı');
      console.log('   ⚠️  NOT: Pass alanı API şifresi olmalı (panel şifresi değil!)');
    } else if (status === 'System Error') {
      console.log('\n⚠️  System Error - Sistem hatası');
    } else if (status === 'Source address (From) is invalid') {
      console.log('\n❌ From alanı geçersiz');
      console.log('   ⚠️  NOT: From alanı panelde tanımlı bir başlık olmalı');
    } else {
      console.log(`\n⚠️  Status: ${status}`);
    }
  } catch (error: any) {
    console.log(`\n❌ Hata: ${error.message}`);
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // From olmadan da deneyelim
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Testing WITHOUT From field:');
  console.log('='.repeat(80) + '\n');

  try {
    const requestDataNoFrom = {
      User: username,
      Pass: password,
      Message: testMessage,
      Numbers: [testPhone]
    };

    console.log('📤 Request (From olmadan):');
    console.log(JSON.stringify({
      User: requestDataNoFrom.User,
      Pass: '***',
      Message: requestDataNoFrom.Message,
      Numbers: requestDataNoFrom.Numbers,
    }, null, 2));

    const responseNoFrom = await axios.post(
      endpoint,
      requestDataNoFrom,
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    console.log(`\n📥 Status Code: ${responseNoFrom.status}`);
    console.log('📥 Response:');
    console.log(JSON.stringify(responseNoFrom.data, null, 2));

    const statusNoFrom = responseNoFrom.data?.Status || responseNoFrom.data?.status;
    if (statusNoFrom === 'OK' || statusNoFrom === 200) {
      console.log('\n✅ BAŞARILI! SMS gönderildi (From olmadan).');
      if (responseNoFrom.data?.MessageId) {
        console.log(`   MessageId: ${responseNoFrom.data.MessageId}`);
      }
    } else if (statusNoFrom === 'User Error') {
      console.log('\n❌ User Error - Kullanıcı adı veya şifre hatalı');
    } else {
      console.log(`\n⚠️  Status: ${statusNoFrom}`);
    }
  } catch (error: any) {
    console.log(`\n❌ Hata: ${error.message}`);
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 Önemli Notlar:');
  console.log('='.repeat(80));
  console.log('1. Pass alanı API ŞİFRESİ olmalı (panel şifresi değil!)');
  console.log('2. From alanı panelde tanımlı bir başlık olmalı');
  console.log('3. From alanı bazı hesaplarda opsiyonel, bazılarında zorunlu olabilir');
  console.log('4. CepSMS panelinde "Api Şifre" alanını kontrol edin\n');

  console.log('='.repeat(80));
  console.log('✅ Test tamamlandı!');
  console.log('='.repeat(80) + '\n');
}

// Script'i çalıştır
testDemir1WithFrom().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});

