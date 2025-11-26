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

async function checkLastSMS() {
  try {
    const supabaseServer = getSupabaseServer();
    const userId = '05d072f8-523c-4676-824c-3c8e792d72a9'; // telco user ID
    
    console.log('📱 Son SMS Kayıtları');
    console.log('='.repeat(80));
    console.log('');
    
    // Son 5 SMS kaydını kontrol et
    const { data: recentSMS, error: smsError } = await supabaseServer
      .from('sms_messages')
      .select('id, phone_number, message, status, cost, sent_at, cep_sms_message_id')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(5);
    
    if (smsError) {
      console.error('❌ SMS kayıtları alınamadı:', smsError.message);
      process.exit(1);
    }
    
    if (!recentSMS || recentSMS.length === 0) {
      console.log('   Henüz SMS kaydı yok.');
    } else {
      console.log(`✅ Son ${recentSMS.length} SMS Kaydı:\n`);
      recentSMS.forEach((sms, index) => {
        const statusIcon = sms.status === 'iletildi' || sms.status === 'gönderildi' ? '✅' : 
                          sms.status === 'failed' ? '❌' : '⚠️';
        console.log(`${statusIcon} SMS ${index + 1}:`);
        console.log(`   Mesaj: ${sms.message?.substring(0, 50)}${sms.message && sms.message.length > 50 ? '...' : ''}`);
        console.log(`   Numara: ${sms.phone_number}`);
        console.log(`   Durum: ${sms.status}`);
        console.log(`   Kredi: ${sms.cost || 0}`);
        if (sms.cep_sms_message_id) {
          console.log(`   CepSMS MessageId: ${sms.cep_sms_message_id}`);
        }
        console.log(`   Tarih: ${sms.sent_at}`);
        console.log('');
      });
      
      const successCount = recentSMS.filter(sms => sms.status === 'iletildi' || sms.status === 'gönderildi').length;
      const failedCount = recentSMS.filter(sms => sms.status === 'failed').length;
      
      console.log('📊 Özet:');
      console.log(`   Toplam: ${recentSMS.length}`);
      console.log(`   Başarılı: ${successCount}`);
      console.log(`   Başarısız: ${failedCount}`);
    }
    
    console.log('');
    console.log('='.repeat(80));
    
  } catch (error: any) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkLastSMS();

