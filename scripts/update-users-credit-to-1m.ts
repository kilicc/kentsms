#!/usr/bin/env ts-node

/**
 * Mevcut tüm kullanıcıların kredilerini 1,000,000 (1 milyon) yap
 * 
 * Kullanım:
 *   npx ts-node scripts/update-users-credit-to-1m.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// .env dosyasını yükle (proje kök dizininden)
config({ path: resolve(process.cwd(), '.env') });

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL ve SUPABASE_SERVICE_KEY environment variable\'ları gerekli!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateUsersCreditTo1M() {
  try {
    console.log('🔄 Kullanıcı kredilerini 1,000,000 (1 milyon) yapma işlemi başlatılıyor...\n');

    // Tüm kullanıcıları al
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, credit')
      .order('username');

    if (usersError) {
      throw new Error(`Kullanıcılar alınamadı: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('⚠️  Veritabanında kullanıcı bulunamadı.');
      return;
    }

    console.log(`📋 Toplam ${users.length} kullanıcı bulundu.\n`);

    const TARGET_CREDIT = 1000000; // 1 milyon
    let updated = 0;
    let alreadyCorrect = 0;
    let failed = 0;

    for (const user of users) {
      const currentCredit = user.credit || 0;

      // Zaten 1 milyon ise atla
      if (currentCredit === TARGET_CREDIT) {
        console.log(`⏭️  ${user.username} zaten ${TARGET_CREDIT.toLocaleString('tr-TR')} krediye sahip`);
        alreadyCorrect++;
        continue;
      }

      // Krediyi 1 milyon yap
      const { error: updateError } = await supabase
        .from('users')
        .update({ credit: TARGET_CREDIT })
        .eq('id', user.id);

      if (updateError) {
        console.error(`❌ ${user.username} güncellenemedi: ${updateError.message}`);
        failed++;
      } else {
        console.log(`✅ ${user.username}: ${currentCredit.toLocaleString('tr-TR')} → ${TARGET_CREDIT.toLocaleString('tr-TR')} kredi`);
        updated++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Özet:');
    console.log(`   ✅ Güncellenen: ${updated}`);
    console.log(`   ⏭️  Zaten doğru: ${alreadyCorrect}`);
    console.log(`   ❌ Hata: ${failed}`);
    console.log('='.repeat(80) + '\n');

    console.log('✅ İşlem tamamlandı!');
  } catch (error: any) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Script'i çalıştır
updateUsersCreditTo1M();
