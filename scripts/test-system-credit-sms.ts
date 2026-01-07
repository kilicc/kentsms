/**
 * Sistem Kredisi ve SMS Gönderimi Test Script
 * 
 * Bu script:
 * 1. Mevcut sistem kredisini gösterir
 * 2. Test SMS gönderir (gerçek API endpoint kullanarak)
 * 3. Sistem kredisinin düştüğünü doğrular
 */

import { getSystemCredit } from '../lib/utils/systemCredit';
import { getSupabaseServer } from '../lib/supabase-server';
import crypto from 'crypto';

// .env dosyasını manuel olarak yükle
function loadEnvFile() {
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env dosyası bulunamadı:', envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');

  envLines.forEach((line: string) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key.trim()] = cleanValue;
      }
    }
  });
}

async function loginUser(username: string, password: string): Promise<string | null> {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();
    
    if (data.success && data.token) {
      return data.token;
    }
    
    return null;
  } catch (error: any) {
    console.error('Login hatası:', error.message);
    return null;
  }
}

async function sendTestSMS(token: string, phone: string, message: string) {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${BASE_URL}/api/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('SMS gönderim hatası:', error.message);
    return { success: false, error: error.message };
  }
}

async function testSystemCreditSMS() {
  try {
    console.log('🔍 Sistem Kredisi ve SMS Test Başlatılıyor...\n');

    // .env dosyasını yükle
    loadEnvFile();

    // 1. Mevcut sistem kredisini al
    console.log('📊 Mevcut sistem kredisi kontrol ediliyor...');
    const initialCredit = await getSystemCredit();
    console.log(`✅ Mevcut Sistem Kredisi: ${initialCredit.toLocaleString()} SMS\n`);

    if (initialCredit === 0) {
      console.log('⚠️  Sistem kredisi 0! Test için en az 1 kredi gerekli.');
      console.log('💡 Admin panelinden sistem kredisi ekleyin.\n');
      return;
    }

    // 2. Test kullanıcısı ile login ol
    console.log('🔐 Test kullanıcısı ile login olunuyor...');
    const testUsername = process.env.TEST_USERNAME || 'admin2';
    const testPassword = process.env.TEST_PASSWORD || '123';
    
    const token = await loginUser(testUsername, testPassword);
    
    if (!token) {
      console.error('❌ Login başarısız! Kullanıcı adı ve şifreyi kontrol edin.');
      console.log(`   Kullanıcı: ${testUsername}`);
      console.log(`   Şifre: ${testPassword}\n`);
      return;
    }
    
    console.log('✅ Login başarılı!\n');

    // 3. Test SMS gönder
    console.log('📤 Test SMS gönderiliyor...');
    const testPhone = process.env.TEST_PHONE || '905321234567';
    const testMessage = `Sistem Kredisi Test - ${new Date().toLocaleTimeString('tr-TR')}`;
    
    console.log(`   Telefon: ${testPhone}`);
    console.log(`   Mesaj: ${testMessage}`);
    
    const smsResult = await sendTestSMS(token, testPhone, testMessage);
    
    if (!smsResult.success) {
      console.error(`❌ SMS gönderim başarısız: ${smsResult.message || smsResult.error}`);
      return;
    }
    
    console.log('✅ SMS gönderildi!');
    if (smsResult.data?.remainingSystemCredit !== undefined) {
      console.log(`📊 Kalan Sistem Kredisi (API'den): ${smsResult.data.remainingSystemCredit.toLocaleString()} SMS\n`);
    }

    // 4. Sistem kredisini tekrar kontrol et
    console.log('🔍 Sistem kredisi tekrar kontrol ediliyor...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
    
    const finalCredit = await getSystemCredit();
    const expectedCredit = initialCredit - 1; // Her SMS = 1 kredi

    console.log('📊 Doğrulama:');
    console.log(`   Başlangıç Kredisi: ${initialCredit.toLocaleString()}`);
    console.log(`   Düşen Kredi: 1 SMS`);
    console.log(`   Beklenen Kredi: ${expectedCredit.toLocaleString()}`);
    console.log(`   Gerçek Kredi: ${finalCredit.toLocaleString()}`);

    if (finalCredit === expectedCredit) {
      console.log('\n✅ TEST BAŞARILI! Sistem kredisi doğru şekilde düşürüldü.');
      console.log(`   ${initialCredit.toLocaleString()} → ${finalCredit.toLocaleString()} (${initialCredit - finalCredit} kredi düştü)\n`);
    } else {
      console.error('\n❌ TEST BAŞARISIZ! Sistem kredisi beklenen değerle eşleşmiyor.');
      console.error(`   Fark: ${Math.abs(finalCredit - expectedCredit)} kredi\n`);
      return;
    }

    // 5. SMS kaydını kontrol et
    console.log('📋 SMS kaydı kontrol ediliyor...');
    const supabase = getSupabaseServer();
    const { data: smsMessages, error: smsError } = await supabase
      .from('sms_messages')
      .select('id, phone_number, message, status, cost, sent_at')
      .eq('phone_number', testPhone)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (smsError || !smsMessages) {
      console.log('⚠️  SMS kaydı bulunamadı veya hata oluştu:', smsError?.message);
    } else {
      console.log('✅ SMS kaydı bulundu:');
      console.log(`   ID: ${smsMessages.id}`);
      console.log(`   Telefon: ${smsMessages.phone_number}`);
      console.log(`   Durum: ${smsMessages.status}`);
      console.log(`   Maliyet: ${smsMessages.cost} kredi`);
      console.log(`   Tarih: ${new Date(smsMessages.sent_at).toLocaleString('tr-TR')}\n`);
    }

    console.log('🎉 Tüm testler başarıyla tamamlandı!');
    console.log('\n📝 Özet:');
    console.log(`   ✅ Sistem kredisi başlangıçta: ${initialCredit.toLocaleString()}`);
    console.log(`   ✅ SMS gönderildi (1 kredi düştü)`);
    console.log(`   ✅ Sistem kredisi son durum: ${finalCredit.toLocaleString()}`);
    console.log(`   ✅ Her SMS = 1 kredi (mesaj uzunluğu önemli değil)\n`);

  } catch (error: any) {
    console.error('❌ Test hatası:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Script'i çalıştır
testSystemCreditSMS()
  .then(() => {
    console.log('✅ Test script tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script hatası:', error);
    process.exit(1);
  });

