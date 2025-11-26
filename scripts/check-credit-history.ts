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

async function checkCreditHistory() {
  try {
    const supabaseServer = getSupabaseServer();
    const userId = '05d072f8-523c-4676-824c-3c8e792d72a9'; // telco user ID
    
    console.log('🔍 Kredi Geçmişi Analizi');
    console.log('='.repeat(80));
    console.log('');
    
    // 1. Kullanıcı bilgisi
    const { data: user } = await supabaseServer
      .from('users')
      .select('id, username, email, credit')
      .eq('id', userId)
      .single();
    
    console.log('👤 Kullanıcı:');
    console.log(`   ${user?.username} (${user?.email})`);
    console.log(`   Mevcut Kredi: ${user?.credit || 0}`);
    console.log('');
    
    // 2. SMS kayıtları ve toplam maliyet
    const { data: allSMS } = await supabaseServer
      .from('sms_messages')
      .select('id, cost, status, sent_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });
    
    const totalSMSCost = allSMS?.reduce((sum, sms) => sum + (sms.cost || 0), 0) || 0;
    const successSMS = allSMS?.filter(sms => sms.status === 'iletildi' || sms.status === 'gönderildi') || [];
    const failedSMS = allSMS?.filter(sms => sms.status === 'failed' || sms.status === 'iletilmedi') || [];
    
    console.log('📊 SMS İstatistikleri:');
    console.log(`   Toplam SMS: ${allSMS?.length || 0}`);
    console.log(`   Başarılı SMS: ${successSMS.length}`);
    console.log(`   Başarısız SMS: ${failedSMS.length}`);
    console.log(`   Toplam SMS Maliyeti (kayıtlarda): ${totalSMSCost} kredi`);
    console.log('');
    
    // 3. Refund kayıtları
    const { data: refunds } = await supabaseServer
      .from('refunds')
      .select('id, sms_id, original_cost, refund_amount, status, reason, created_at, processed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    const totalRefundAmount = refunds?.reduce((sum, r) => {
      if (r.status === 'completed') {
        return sum + (r.refund_amount || 0);
      }
      return sum;
    }, 0) || 0;
    
    const pendingRefunds = refunds?.filter(r => r.status === 'pending') || [];
    const completedRefunds = refunds?.filter(r => r.status === 'completed') || [];
    
    console.log('💰 Refund İstatistikleri:');
    console.log(`   Toplam Refund Kaydı: ${refunds?.length || 0}`);
    console.log(`   Bekleyen Refund: ${pendingRefunds.length}`);
    console.log(`   Tamamlanan Refund: ${completedRefunds.length}`);
    console.log(`   Toplam İade Edilen Kredi: ${totalRefundAmount} kredi`);
    console.log('');
    
    if (pendingRefunds.length > 0) {
      console.log('⏳ Bekleyen Refundlar:');
      pendingRefunds.slice(0, 10).forEach((refund, index) => {
        console.log(`   ${index + 1}. ${refund.refund_amount} kredi - ${refund.reason} - ${refund.created_at}`);
      });
      console.log('');
    }
    
    // 4. Kredi hesabı
    console.log('💳 Kredi Hesabı:');
    console.log(`   Başlangıç Kredisi (tahmin): 125000`);
    console.log(`   SMS'ler için düşen kredi: ${totalSMSCost}`);
    console.log(`   İade edilen kredi: ${totalRefundAmount}`);
    console.log(`   Bekleyen iade: ${pendingRefunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0)}`);
    console.log(`   Hesaplanan kredi: ${125000 - totalSMSCost + totalRefundAmount}`);
    console.log(`   Mevcut kredi: ${user?.credit || 0}`);
    console.log(`   Fark: ${(125000 - totalSMSCost + totalRefundAmount) - (user?.credit || 0)}`);
    console.log('');
    
    // 5. Son SMS'lerin detayları
    console.log('📱 Son 20 SMS Detayı:');
    allSMS?.slice(0, 20).forEach((sms, index) => {
      console.log(`   ${index + 1}. ${sms.status} - ${sms.cost || 0} kredi - ${sms.sent_at}`);
    });
    console.log('');
    
    // 6. Sorun analizi
    const expectedCredit = 125000 - totalSMSCost + totalRefundAmount;
    const actualCredit = user?.credit || 0;
    const difference = expectedCredit - actualCredit;
    
    if (Math.abs(difference) > 1) {
      console.log('⚠️  SORUN TESPİT EDİLDİ:');
      console.log(`   Hesaplanan kredi ile mevcut kredi arasında ${difference} kredi fark var!`);
      console.log('');
      console.log('🔍 Olası Nedenler:');
      console.log('   1. Kredi düşüşü yapılmıyor olabilir');
      console.log('   2. Kredi düşüşü yanlış kullanıcıdan yapılıyor olabilir');
      console.log('   3. Refund işlemleri yanlış yapılıyor olabilir');
      console.log('   4. Manuel kredi ekleme/çıkarma yapılmış olabilir');
      console.log('');
      
      // Bekleyen refund'ları kontrol et
      const pendingRefundTotal = pendingRefunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
      if (pendingRefundTotal > 0) {
        console.log(`   ⚠️  ${pendingRefundTotal} kredi bekleyen refund'da!`);
        console.log('   Bu refundlar islendiginde kredi geri gelecek.');
      }
    } else {
      console.log('✅ Kredi hesabı doğru görünüyor!');
    }
    
  } catch (error: any) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkCreditHistory();

