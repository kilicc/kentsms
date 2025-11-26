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

async function testApiKey() {
  try {
    const supabaseServer = getSupabaseServer();
    const apiKey = 'c7d6a924407dd6627c6b08363a9673ef0bc6827c3b6e3aa4b84365323a91ab96';
    const apiSecret = '3117601f4fb43dbf1e7fbf3a7ee382b228a6454f9785bba83facc108985e4698';
    
    console.log('🔍 API Key Testi');
    console.log('='.repeat(80));
    console.log('');
    
    // 1. API key'i bul
    console.log('📋 API Key Bilgileri:');
    console.log(`   API Key: ${apiKey.substring(0, 20)}...`);
    console.log(`   API Secret: ${apiSecret.substring(0, 20)}...`);
    console.log('');
    
    const { data: apiKeyData, error: apiKeyError } = await supabaseServer
      .from('api_keys')
      .select('id, api_key, user_id, name, is_active, last_used_at, users!api_keys_user_id_fkey(id, username, email, credit, role)')
      .eq('api_key', apiKey)
      .single();
    
    if (apiKeyError || !apiKeyData) {
      console.error('❌ API Key bulunamadı:', apiKeyError?.message);
      process.exit(1);
    }
    
    const apiUser = (apiKeyData as any).users;
    
    console.log('✅ API Key Bulundu:');
    console.log(`   API Key ID: ${apiKeyData.id}`);
    console.log(`   Name: ${apiKeyData.name || 'N/A'}`);
    console.log(`   Is Active: ${apiKeyData.is_active}`);
    console.log(`   Last Used: ${apiKeyData.last_used_at || 'Never'}`);
    console.log('');
    
    console.log('👤 API Key Sahibi:');
    console.log(`   User ID: ${apiUser.id}`);
    console.log(`   Username: ${apiUser.username}`);
    console.log(`   Email: ${apiUser.email}`);
    console.log(`   Credit: ${apiUser.credit || 0}`);
    console.log(`   Role: ${apiUser.role || 'user'}`);
    console.log('');
    
    // 2. API Secret kontrolü
    const { data: apiKeyFull, error: secretError } = await supabaseServer
      .from('api_keys')
      .select('api_secret')
      .eq('id', apiKeyData.id)
      .single();
    
    if (secretError || !apiKeyFull) {
      console.error('❌ API Secret alınamadı:', secretError?.message);
      process.exit(1);
    }
    
    const secretMatch = apiKeyFull.api_secret === apiSecret;
    console.log('🔐 API Secret Kontrolü:');
    console.log(`   Secret Eşleşmesi: ${secretMatch ? '✅ Doğru' : '❌ Yanlış'}`);
    console.log('');
    
    if (!secretMatch) {
      console.error('❌ API Secret eşleşmiyor!');
      process.exit(1);
    }
    
    // 3. Kullanıcının SMS kayıtlarını kontrol et
    const { count: smsCount } = await supabaseServer
      .from('sms_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', apiUser.id);
    
    console.log('📊 Kullanıcı İstatistikleri:');
    console.log(`   Toplam SMS: ${smsCount || 0}`);
    console.log(`   Mevcut Kredi: ${apiUser.credit || 0}`);
    console.log('');
    
    // 4. API endpoint testi (simüle)
    console.log('🧪 API Endpoint Test Senaryosu:');
    console.log('');
    console.log('1. API ile SMS gönderimi:');
    console.log('   - POST /api/v1/sms/send');
    console.log('   - POST /api/v1/sms/send-advanced');
    console.log('   - POST /api/v1/sms/send-multi');
    console.log('   → Bu endpoint\'ler API key ile çalışır');
    console.log('   → SMS kayıtları bu kullanıcıya (user_id) kaydedilir');
    console.log('   → Kredi bu kullanıcıdan düşer');
    console.log('');
    
    console.log('2. Web Panel ile SMS gönderimi:');
    console.log('   - POST /api/sms/send');
    console.log('   - POST /api/bulk-sms/send-bulk');
    console.log('   → Bu endpoint\'ler JWT token ile çalışır');
    console.log('   → Kullanıcı login olur (telco@finsms.io / 123456)');
    console.log('   → SMS kayıtları aynı kullanıcıya (user_id) kaydedilir');
    console.log('   → Kredi aynı kullanıcıdan düşer');
    console.log('');
    
    console.log('3. Web Panel ile SMS görüntüleme:');
    console.log('   - GET /api/sms/history');
    console.log('   - GET /api/bulk-sms/history');
    console.log('   → Kullanıcı login olur');
    console.log('   → Sadece kendi SMS kayıtlarını görür (user_id filtresi)');
    console.log('   → API ile gönderilen SMS\'ler de görünür');
    console.log('');
    
    // 5. Paralel kullanım kontrolü
    console.log('🔄 Paralel Kullanım Kontrolü:');
    console.log('');
    console.log('✅ EVET, API ve Web Panel paralel çalışabilir!');
    console.log('');
    console.log('Neden:');
    console.log('   - API key ve web panel login aynı kullanıcıya (user_id) bağlı');
    console.log('   - Her ikisi de aynı veritabanı kayıtlarını kullanır');
    console.log('   - SMS kayıtları user_id ile filtrelenir');
    console.log('   - Kredi aynı kullanıcı hesabından düşer');
    console.log('');
    console.log('Örnek Senaryo:');
    console.log('   1. Müşteri API ile SMS gönderir → SMS kaydı oluşur');
    console.log('   2. Siz web panelden giriş yaparsınız → Aynı SMS kaydını görürsünüz');
    console.log('   3. Müşteri tekrar API ile SMS gönderir → Yeni kayıt oluşur');
    console.log('   4. Siz web panelden rapor görüntülersiniz → Tüm kayıtları görürsünüz');
    console.log('   5. Her iki yöntem de aynı kredi hesabını kullanır');
    console.log('');
    
    // 6. Test SMS gönderimi önerisi
    console.log('💡 Test Önerisi:');
    console.log('');
    console.log('API ile test SMS göndermek için:');
    console.log('   curl -X POST https://panel.finsms.io/api/v1/sms/send \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d \'{"User": "${apiKey}", "Pass": "${apiSecret}", "Message": "Test mesaj", "Numbers": ["905551234567"]}\'`);
    console.log('');
    console.log('Web panelden kontrol için:');
    console.log('   1. https://panel.finsms.io/login adresine gidin');
    console.log(`   2. Email: ${apiUser.email}`);
    console.log('   3. Password: 123456');
    console.log('   4. SMS geçmişini görüntüleyin');
    console.log('');
    
    console.log('='.repeat(80));
    console.log('✅ Test tamamlandı!');
    
  } catch (error: any) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testApiKey();

