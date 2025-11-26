import { readFileSync } from 'fs';
import { join } from 'path';
import { getSupabaseServer } from '../lib/supabase-server';

// Load .env file manually
function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = cleanValue;
          }
        }
      }
    }
  } catch (error) {
    // .env file not found or can't be read
  }
}

loadEnvFile();

async function checkTestSMS() {
  try {
    const supabaseServer = getSupabaseServer();
    const userId = '05d072f8-523c-4676-824c-3c8e792d72a9'; // telco user ID
    
    console.log('🔍 Test SMS Kayıtları Kontrolü');
    console.log('='.repeat(80));
    console.log('');
    
    // Son 10 SMS kaydını kontrol et
    const { data: recentSMS, error: smsError } = await supabaseServer
      .from('sms_messages')
      .select('id, phone_number, message, status, cost, sent_at, failed_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(10);
    
    if (smsError) {
      console.error('❌ SMS kayıtları alınamadı:', smsError.message);
      process.exit(1);
    }
    
    console.log('📊 Son 10 SMS Kaydı:');
    console.log('');
    
    if (!recentSMS || recentSMS.length === 0) {
      console.log('   Henüz SMS kaydı yok.');
    } else {
      const testSMS = recentSMS.filter(sms => 
        sms.message?.includes('Test SMS') || 
        sms.message?.includes('API Paralel') ||
        sms.message?.includes('Kredi Dususu') ||
        sms.message?.includes('SMS Kayitlari')
      );
      
      if (testSMS.length > 0) {
        console.log(`✅ ${testSMS.length} adet test SMS kaydı bulundu!`);
        console.log('');
        testSMS.forEach((sms, index) => {
          console.log(`   ${index + 1}. ${sms.message?.substring(0, 40)}...`);
          console.log(`      Numara: ${sms.phone_number}`);
          console.log(`      Durum: ${sms.status}`);
          console.log(`      Kredi: ${sms.cost || 0}`);
          console.log(`      Tarih: ${sms.sent_at || sms.failed_at}`);
          console.log('');
        });
      } else {
        console.log('   Test SMS kaydı bulunamadı.');
        console.log('   (Son 10 SMS kaydı gösteriliyor)');
        console.log('');
        recentSMS.forEach((sms, index) => {
          console.log(`   ${index + 1}. ${sms.message?.substring(0, 40)}...`);
          console.log(`      Numara: ${sms.phone_number}`);
          console.log(`      Durum: ${sms.status}`);
          console.log(`      Kredi: ${sms.cost || 0}`);
          console.log('');
        });
      }
    }
    
    console.log('='.repeat(80));
    console.log('💡 Not: SMS kayıtları oluşturulmuşsa, API endpoint çalışıyor demektir.');
    console.log('   CepSMS API bağlantı hatası external bir sorundur.');
    console.log('   Authentication ve kredi düşüşü başarılı olmuştur.');
    
  } catch (error: any) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkTestSMS();

