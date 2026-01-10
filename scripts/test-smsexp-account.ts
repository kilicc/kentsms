/**
 * Smsexp hesabı - CepSMS API V1.1.3 dokümantasyonuna göre test
 * 
 * Kullanım:
 *   npx tsx scripts/test-smsexp-account.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getAccountByUsername } from '../lib/utils/cepsmsAccounts';
import axios from 'axios';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function testSmsexpWithAPIDoc() {
  console.log('=== Smsexp Hesabı - CepSMS API V1.1.3 Format Testi ===\n');

  // Smsexp hesabını al
  const account = getAccountByUsername('Smsexp');
  
  if (!account) {
    console.error('❌ Smsexp hesabı bulunamadı!');
    process.exit(1);
  }

  console.log('✅ Hesap bilgileri:');
  console.log(`   Username: ${account.username}`);
  console.log(`   Password: ${account.password}`);
  console.log(`   Phone: ${account.phone || '(boş)'}\n`);

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
      User: account.username,
      Pass: account.password,
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

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test tamamlandı!');
  console.log('='.repeat(80) + '\n');
}

// Script'i çalıştır
testSmsexpWithAPIDoc().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});
