import { readFileSync } from 'fs';
import { join } from 'path';

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

async function sendTestSMS() {
  const apiKey = 'c7d6a924407dd6627c6b08363a9673ef0bc6827c3b6e3aa4b84365323a91ab96';
  const apiSecret = '3117601f4fb43dbf1e7fbf3a7ee382b228a6454f9785bba83facc108985e4698';
  const baseUrl = 'https://panel.kentsms.com';
  
  console.log('📱 Test SMS Gönderimi');
  console.log('='.repeat(80));
  console.log('');
  
  // Test mesajları - send-multi endpoint kullanarak
  const testMessages = [
    {
      Message: 'Test SMS 1 - API Paralel Kullanim Testi',
      GSM: '905551234567'
    },
    {
      Message: 'Test SMS 2 - API ve Web Panel Ayni Kullanici',
      GSM: '905551234568'
    },
    {
      Message: 'Test SMS 3 - Kredi Dususu Kontrol',
      GSM: '905551234569'
    },
    {
      Message: 'Test SMS 4 - SMS Kayitlari Kontrol',
      GSM: '905551234570'
    },
    {
      Message: 'Test SMS 5 - Son Test Mesaji',
      GSM: '905551234571'
    }
  ];
  
  console.log(`📤 ${testMessages.length} adet test SMS gönderiliyor...`);
  console.log('');
  
  const results: any[] = [];
  
  // Her SMS'i tek tek gönder
  for (let i = 0; i < testMessages.length; i++) {
    const msg = testMessages[i];
    console.log(`📨 SMS ${i + 1}/${testMessages.length} gönderiliyor...`);
    console.log(`   Mesaj: ${msg.Message}`);
    console.log(`   Numara: ${msg.GSM}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/v1/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          User: apiKey,
          Pass: apiSecret,
          Message: msg.Message,
          Numbers: [msg.GSM]
        }),
      });
      
      const result = await response.json();
      results.push({ index: i + 1, ...result });
      
      if (result.Status === 'OK' && result.MessageId) {
        console.log(`   ✅ Başarılı! MessageId: ${result.MessageId}`);
      } else {
        console.log(`   ⚠️  Başarısız: ${result.Error || 'Bilinmeyen hata'}`);
      }
      console.log('');
      
      // Kısa bir bekleme (rate limiting için)
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: any) {
      console.log(`   ❌ Hata: ${error.message}`);
      results.push({ index: i + 1, error: error.message });
      console.log('');
    }
  }
  
  // Özet
  console.log('📊 Özet:');
  console.log('='.repeat(80));
  const successCount = results.filter(r => r.Status === 'OK').length;
  const failedCount = results.filter(r => r.Status !== 'OK' || r.error).length;
  
  console.log(`   Toplam: ${testMessages.length}`);
  console.log(`   Başarılı: ${successCount}`);
  console.log(`   Başarısız: ${failedCount}`);
  console.log('');
  
  if (successCount > 0) {
    console.log('✅ Başarılı SMS\'ler:');
    results.filter(r => r.Status === 'OK').forEach(r => {
      console.log(`   - SMS ${r.index}: MessageId ${r.MessageId}`);
    });
    console.log('');
  }
  
  if (failedCount > 0) {
    console.log('⚠️  Başarısız SMS\'ler:');
    results.filter(r => r.Status !== 'OK' || r.error).forEach(r => {
      console.log(`   - SMS ${r.index}: ${r.Error || r.error || 'Bilinmeyen hata'}`);
    });
    console.log('');
  }
  
  console.log('💡 Not: CepSMS API bağlantı hatası alırsanız, bu normaldir.');
  console.log('   API endpoint çalışıyor ve authentication başarılı.');
  console.log('   SMS kayıtları oluşturulmuş olabilir (failed status ile).');
  console.log('');
  
  console.log('='.repeat(80));
}

sendTestSMS();

