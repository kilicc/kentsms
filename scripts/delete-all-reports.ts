/**
 * Tüm Raporları Silme Script
 * 
 * Bu script tüm rapor verilerini siler:
 * - SMS mesajları
 * - İade kayıtları
 * - Ödeme kayıtları
 * - Ödeme talepleri
 * 
 * ⚠️  DİKKAT: Bu işlem geri alınamaz!
 */

import { getSupabaseServer } from '../lib/supabase-server';

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

async function deleteAllReports() {
  try {
    console.log('🗑️  Tüm Raporlar Siliniyor...\n');
    console.log('⚠️  DİKKAT: Bu işlem geri alınamaz!\n');

    // .env dosyasını yükle
    loadEnvFile();

    const supabase = getSupabaseServer();

    // 1. Önce sayıları göster
    console.log('📊 Mevcut Rapor Sayıları:');
    const [refundsCount, smsCount, paymentsCount, paymentRequestsCount] = await Promise.all([
      supabase.from('refunds').select('*', { count: 'exact', head: true }),
      supabase.from('sms_messages').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }),
      supabase.from('payment_requests').select('*', { count: 'exact', head: true }),
    ]);

    console.log(`   İade kayıtları: ${refundsCount.count || 0}`);
    console.log(`   SMS mesajları: ${smsCount.count || 0}`);
    console.log(`   Ödeme kayıtları: ${paymentsCount.count || 0}`);
    console.log(`   Ödeme talepleri: ${paymentRequestsCount.count || 0}\n`);

    // 2. İade kayıtlarını sil (foreign key sorununu önlemek için önce)
    console.log('🔄 İade kayıtları siliniyor...');
    const { error: refundsError } = await supabase.from('refunds').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (refundsError) {
      console.error('❌ İade kayıtları silinemedi:', refundsError.message);
    } else {
      console.log('✅ İade kayıtları silindi');
    }

    // 3. SMS mesajlarını sil
    console.log('📧 SMS mesajları siliniyor...');
    const { error: smsError } = await supabase.from('sms_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (smsError) {
      console.error('❌ SMS mesajları silinemedi:', smsError.message);
    } else {
      console.log('✅ SMS mesajları silindi');
    }

    // 4. Ödeme kayıtlarını sil
    console.log('💳 Ödeme kayıtları siliniyor...');
    const { error: paymentsError } = await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (paymentsError) {
      console.error('❌ Ödeme kayıtları silinemedi:', paymentsError.message);
    } else {
      console.log('✅ Ödeme kayıtları silindi');
    }

    // 5. Ödeme taleplerini sil
    console.log('💰 Ödeme talepleri siliniyor...');
    const { error: paymentRequestsError } = await supabase.from('payment_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (paymentRequestsError) {
      console.error('❌ Ödeme talepleri silinemedi:', paymentRequestsError.message);
    } else {
      console.log('✅ Ödeme talepleri silindi');
    }

    // 6. Doğrulama
    console.log('\n📊 Doğrulama:');
    const [refundsFinal, smsFinal, paymentsFinal, paymentRequestsFinal] = await Promise.all([
      supabase.from('refunds').select('*', { count: 'exact', head: true }),
      supabase.from('sms_messages').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }),
      supabase.from('payment_requests').select('*', { count: 'exact', head: true }),
    ]);

    console.log(`   İade kayıtları: ${refundsFinal.count || 0}`);
    console.log(`   SMS mesajları: ${smsFinal.count || 0}`);
    console.log(`   Ödeme kayıtları: ${paymentsFinal.count || 0}`);
    console.log(`   Ödeme talepleri: ${paymentRequestsFinal.count || 0}\n`);

    const totalRemaining = (refundsFinal.count || 0) + (smsFinal.count || 0) + (paymentsFinal.count || 0) + (paymentRequestsFinal.count || 0);

    if (totalRemaining === 0) {
      console.log('✅ Tüm raporlar başarıyla silindi!');
    } else {
      console.log(`⚠️  ${totalRemaining} kayıt hala mevcut. Lütfen manuel olarak kontrol edin.`);
    }

    console.log('\n💡 Not: Kullanıcılar, kişiler, gruplar ve şablonlar korundu.');

  } catch (error: any) {
    console.error('❌ Hata:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Script'i çalıştır
deleteAllReports()
  .then(() => {
    console.log('\n✅ Script tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error);
    process.exit(1);
  });

