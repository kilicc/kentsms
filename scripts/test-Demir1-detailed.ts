/**
 * Demir1 hesabı - Detaylı sorun tespiti
 * 
 * Kullanım:
 *   npx tsx scripts/test-Demir1-detailed.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function testDemir1Detailed() {
  console.log('=== Demir1 Hesabı - Detaylı Sorun Tespiti ===\n');

  const username = 'Demir1';
  const password = 'DemirxCies72819.Kepw';
  const endpoint = 'https://panel4.cepsms.com/smsapi';
  const testPhone = '905075708797';
  const testMessage = 'test';

  console.log('✅ Test Bilgileri:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`   Password Length: ${password.length}`);
  console.log(`   Password Characters: ${password.split('').map(c => {
    if (/[a-z]/.test(c)) return 'lowercase';
    if (/[A-Z]/.test(c)) return 'uppercase';
    if (/[0-9]/.test(c)) return 'digit';
    if (/[^a-zA-Z0-9]/.test(c)) return 'special';
    return 'other';
  }).join(', ')}\n`);

  console.log('='.repeat(80));
  console.log('🔍 Olası Sorunlar:');
  console.log('='.repeat(80));
  console.log('1. API aktif değil olabilir');
  console.log('2. API şifresi panel şifresinden farklı olabilir');
  console.log('3. Alt hesap/sub-account sorunu olabilir');
  console.log('4. IP kısıtlaması olabilir');
  console.log('5. Hesap yetkileri eksik olabilir');
  console.log('6. Karakter encoding sorunu olabilir');
  console.log('7. Farklı endpoint gereksinimi olabilir\n');

  // 1. Basit format (Smsexp ile aynı)
  console.log('1️⃣  Basit Format (Smsexp ile aynı format):');
  try {
    const simpleResp = await axios.post(endpoint, {
      User: username,
      Pass: password,
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

    console.log(`   Status: ${simpleResp.data?.Status}`);
    console.log(`   Response:`, JSON.stringify(simpleResp.data, null, 2));
    
    if (simpleResp.data?.Status === 'OK') {
      console.log('   ✅ BAŞARILI!');
    } else if (simpleResp.data?.Status === 'User Error') {
      console.log('   ❌ User Error - Kullanıcı adı veya şifre hatası');
    }
  } catch (error: any) {
    console.log(`   ❌ Hata: ${error.message}`);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. Username/Password format (alternatif format)
  console.log('\n2️⃣  Username/Password Format (alternatif format):');
  try {
    const altResp = await axios.post(endpoint, {
      Username: username,
      Password: password,
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

    console.log(`   Status: ${altResp.data?.Status}`);
    console.log(`   Response:`, JSON.stringify(altResp.data, null, 2));
    
    if (altResp.data?.Status === 'OK') {
      console.log('   ✅ BAŞARILI!');
    } else if (altResp.data?.Status === 'User Error') {
      console.log('   ❌ User Error - Bu format da çalışmıyor');
    }
  } catch (error: any) {
    console.log(`   ❌ Hata: ${error.message}`);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Şifreyi URL encode et
  console.log('\n3️⃣  URL Encoded Password (özel karakterler için):');
  try {
    const encodedPassword = encodeURIComponent(password);
    const encodedResp = await axios.post(endpoint, {
      User: username,
      Pass: encodedPassword,
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

    console.log(`   Status: ${encodedResp.data?.Status}`);
    console.log(`   Response:`, JSON.stringify(encodedResp.data, null, 2));
    
    if (encodedResp.data?.Status === 'OK') {
      console.log('   ✅ BAŞARILI!');
    } else if (encodedResp.data?.Status === 'User Error') {
      console.log('   ❌ User Error - URL encoding da çalışmıyor');
    }
  } catch (error: any) {
    console.log(`   ❌ Hata: ${error.message}`);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. Smsexp ile karşılaştırma
  console.log('\n4️⃣  Smsexp Hesabı ile Karşılaştırma (çalışan hesap):');
  try {
    const smsexpResp = await axios.post(endpoint, {
      User: 'Smsexp',
      Pass: 'JıX8492cmr',
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

    console.log(`   Status: ${smsexpResp.data?.Status}`);
    if (smsexpResp.data?.Status === 'OK') {
      console.log('   ✅ Smsexp hesabı ÇALIŞIYOR');
      console.log(`   MessageId: ${smsexpResp.data?.MessageId}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Hata: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 Sonuç ve Öneriler:');
  console.log('='.repeat(80));
  console.log('\n✅ Çalışan: Smsexp hesabı');
  console.log('❌ Çalışmayan: Demir1 hesabı\n');
  
  console.log('🔍 Yapılması Gerekenler:');
  console.log('1. CepSMS panelinde Demir1 hesabına giriş yapın');
  console.log('2. "Api aktif mi?" alanının İŞARETLİ olduğundan emin olun');
  console.log('3. "Api Şifre" alanını kontrol edin (API şifresi panel şifresinden farklı olabilir)');
  console.log('4. Hesap tipini kontrol edin (Ana hesap mı, alt hesap mı?)');
  console.log('5. SMS gönderme yetkisinin aktif olduğunu kontrol edin');
  console.log('6. IP kısıtlaması olup olmadığını kontrol edin');
  console.log('7. Hesabın aktif olduğunu ve askıya alınmadığını kontrol edin\n');

  console.log('='.repeat(80));
  console.log('✅ Test tamamlandı!');
  console.log('='.repeat(80) + '\n');
}

// Script'i çalıştır
testDemir1Detailed().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});
