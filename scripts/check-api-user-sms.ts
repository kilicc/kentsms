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

async function checkApiUserSMS() {
  try {
    const supabaseServer = getSupabaseServer();
    
    // 1. API key'i bul (c7d6a924 ile başlayan)
    console.log('🔍 API key aranıyor (c7d6a924 ile başlayan)...');
    const { data: apiKeys, error: apiKeyError } = await supabaseServer
      .from('api_keys')
      .select('id, api_key, user_id, name, is_active, last_used_at, users!api_keys_user_id_fkey(id, username, email, credit)')
      .like('api_key', 'c7d6a924%');
    
    if (apiKeyError) {
      console.error('❌ API key bulunurken hata:', apiKeyError.message);
      process.exit(1);
    }
    
    if (!apiKeys || apiKeys.length === 0) {
      console.error('❌ API key bulunamadı');
      process.exit(1);
    }
    
    const apiKey = apiKeys[0];
    const apiUser = (apiKey as any).users;
    
    console.log('✅ API Key Bulundu:');
    console.log(`   API Key ID: ${apiKey.id}`);
    console.log(`   API Key: ${apiKey.api_key.substring(0, 20)}...`);
    console.log(`   Name: ${apiKey.name || 'N/A'}`);
    console.log(`   Is Active: ${apiKey.is_active}`);
    console.log(`   Last Used: ${apiKey.last_used_at || 'Never'}`);
    console.log('');
    console.log('👤 API Key Sahibi:');
    console.log(`   User ID: ${apiUser.id}`);
    console.log(`   Username: ${apiUser.username}`);
    console.log(`   Email: ${apiUser.email}`);
    console.log(`   Credit: ${apiUser.credit || 0}`);
    console.log('');
    
    // 2. telco@kentsms.com kullanıcısını bul
    console.log('🔍 telco@kentsms.com kullanıcısı aranıyor...');
    const { data: telcoUsers, error: telcoError } = await supabaseServer
      .from('users')
      .select('id, username, email, credit')
      .eq('email', 'telco@kentsms.com');
    
    if (telcoError) {
      console.error('❌ Kullanıcı bulunurken hata:', telcoError.message);
      process.exit(1);
    }
    
    if (!telcoUsers || telcoUsers.length === 0) {
      console.error('❌ telco@kentsms.com kullanıcısı bulunamadı');
      process.exit(1);
    }
    
    const telcoUser = telcoUsers[0];
    console.log('✅ telco@kentsms.com Kullanıcısı:');
    console.log(`   User ID: ${telcoUser.id}`);
    console.log(`   Username: ${telcoUser.username}`);
    console.log(`   Email: ${telcoUser.email}`);
    console.log(`   Credit: ${telcoUser.credit || 0}`);
    console.log('');
    
    // 3. Kullanıcılar aynı mı kontrol et
    if (apiUser.id === telcoUser.id) {
      console.log('✅ API Key ve telco@kentsms.com kullanıcısı AYNI kullanıcıya ait!');
    } else {
      console.log('⚠️  UYARI: API Key ve telco@kentsms.com kullanıcısı FARKLI kullanıcılara ait!');
      console.log(`   API Key User ID: ${apiUser.id}`);
      console.log(`   telco User ID: ${telcoUser.id}`);
      console.log('');
      console.log('💡 Çözüm: API key\'in user_id\'sini telco kullanıcısının ID\'si ile güncellemelisiniz.');
    }
    console.log('');
    
    // 4. API key sahibinin SMS kayıtlarını kontrol et
    console.log('📊 API Key Sahibinin SMS Kayıtları:');
    const { data: apiUserSMS, error: apiUserSMSError } = await supabaseServer
      .from('sms_messages')
      .select('id, phone_number, message, status, cost, sent_at, user_id')
      .eq('user_id', apiUser.id)
      .order('sent_at', { ascending: false })
      .limit(10);
    
    if (apiUserSMSError) {
      console.error('❌ SMS kayıtları alınırken hata:', apiUserSMSError.message);
    } else {
      console.log(`   Toplam SMS (son 10): ${apiUserSMS?.length || 0}`);
      if (apiUserSMS && apiUserSMS.length > 0) {
        const totalCost = apiUserSMS.reduce((sum, sms) => sum + (sms.cost || 0), 0);
        console.log(`   Son 10 SMS'in toplam maliyeti: ${totalCost} kredi`);
        console.log('');
        console.log('   Son SMS Kayıtları:');
        apiUserSMS.forEach((sms, index) => {
          console.log(`   ${index + 1}. ${sms.phone_number} - ${sms.status} - ${sms.cost || 0} kredi - ${sms.sent_at}`);
        });
      }
    }
    console.log('');
    
    // 5. API key sahibinin toplam SMS sayısı ve maliyeti
    const { count: totalSMSCount, error: countError } = await supabaseServer
      .from('sms_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', apiUser.id);
    
    const { data: allSMS, error: allSMSError } = await supabaseServer
      .from('sms_messages')
      .select('cost')
      .eq('user_id', apiUser.id);
    
    if (!countError && totalSMSCount !== null) {
      const totalCost = allSMS?.reduce((sum, sms) => sum + (sms.cost || 0), 0) || 0;
      console.log('📈 API Key Sahibinin Toplam İstatistikleri:');
      console.log(`   Toplam SMS Sayısı: ${totalSMSCount}`);
      console.log(`   Toplam Kullanılan Kredi: ${totalCost} kredi`);
      console.log(`   Mevcut Kredi: ${apiUser.credit || 0} kredi`);
      console.log('');
    }
    
    // 6. telco kullanıcısının SMS kayıtlarını kontrol et
    console.log('📊 telco@kentsms.com Kullanıcısının SMS Kayıtları:');
    const { data: telcoSMS, error: telcoSMSError } = await supabaseServer
      .from('sms_messages')
      .select('id, phone_number, message, status, cost, sent_at, user_id')
      .eq('user_id', telcoUser.id)
      .order('sent_at', { ascending: false })
      .limit(10);
    
    if (telcoSMSError) {
      console.error('❌ SMS kayıtları alınırken hata:', telcoSMSError.message);
    } else {
      console.log(`   Toplam SMS (son 10): ${telcoSMS?.length || 0}`);
      if (telcoSMS && telcoSMS.length > 0) {
        const totalCost = telcoSMS.reduce((sum, sms) => sum + (sms.cost || 0), 0);
        console.log(`   Son 10 SMS'in toplam maliyeti: ${totalCost} kredi`);
        console.log('');
        console.log('   Son SMS Kayıtları:');
        telcoSMS.forEach((sms, index) => {
          console.log(`   ${index + 1}. ${sms.phone_number} - ${sms.status} - ${sms.cost || 0} kredi - ${sms.sent_at}`);
        });
      }
    }
    console.log('');
    
    // 7. telco kullanıcısının toplam SMS sayısı ve maliyeti
    const { count: telcoSMSCount, error: telcoCountError } = await supabaseServer
      .from('sms_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', telcoUser.id);
    
    const { data: telcoAllSMS, error: telcoAllSMSError } = await supabaseServer
      .from('sms_messages')
      .select('cost')
      .eq('user_id', telcoUser.id);
    
    if (!telcoCountError && telcoSMSCount !== null) {
      const totalCost = telcoAllSMS?.reduce((sum, sms) => sum + (sms.cost || 0), 0) || 0;
      console.log('📈 telco@kentsms.com Kullanıcısının Toplam İstatistikleri:');
      console.log(`   Toplam SMS Sayısı: ${telcoSMSCount}`);
      console.log(`   Toplam Kullanılan Kredi: ${totalCost} kredi`);
      console.log(`   Mevcut Kredi: ${telcoUser.credit || 0} kredi`);
      console.log('');
    }
    
    // 8. Kredi düşüş analizi
    console.log('💰 Kredi Düşüş Analizi:');
    console.log(`   Başlangıç Kredisi (tahmin): 125000`);
    console.log(`   Mevcut Kredi: ${telcoUser.credit || 0}`);
    console.log(`   Düşen Kredi: ${125000 - (telcoUser.credit || 0)}`);
    console.log(`   Gönderilen SMS (API Key sahibi): ${totalSMSCount || 0}`);
    console.log(`   Gönderilen SMS (telco kullanıcısı): ${telcoSMSCount || 0}`);
    console.log('');
    
    if (apiUser.id !== telcoUser.id) {
      console.log('⚠️  SORUN TESPİT EDİLDİ:');
      console.log('   API Key farklı bir kullanıcıya ait!');
      console.log('   Bu yüzden SMS\'ler farklı kullanıcıya kaydediliyor ve kredi düşüşü yanlış yapılıyor.');
      console.log('');
      console.log('🔧 ÇÖZÜM:');
      console.log(`   API key'in user_id'sini güncelle: ${apiKey.id} -> user_id: ${telcoUser.id}`);
    } else if ((totalSMSCount || 0) > 0 && (125000 - (telcoUser.credit || 0)) < (totalSMSCount || 0)) {
      console.log('⚠️  SORUN TESPİT EDİLDİ:');
      console.log(`   ${totalSMSCount || 0} SMS gönderilmiş ama sadece ${125000 - (telcoUser.credit || 0)} kredi düşmüş!`);
      console.log('   Kredi düşüş mantığında bir sorun olabilir.');
    }
    
  } catch (error: any) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkApiUserSMS();

