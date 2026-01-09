#!/usr/bin/env ts-node

/**
 * Mevcut kullanıcıları CepSMS hesaplarıyla eşleştir
 * 
 * Kullanım:
 *   npx ts-node scripts/migrate-users-cepsms-accounts.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getAllAccounts } from '../lib/utils/cepsmsAccounts';

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

async function migrateUsersCepSMSAccounts() {
  try {
    console.log('🔄 Kullanıcıları CepSMS hesaplarıyla eşleştirme başlatılıyor...\n');

    // Tüm kullanıcıları al
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, cepsms_username')
      .order('username');

    if (usersError) {
      throw new Error(`Kullanıcılar alınamadı: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('⚠️  Veritabanında kullanıcı bulunamadı.');
      return;
    }

    console.log(`📋 Toplam ${users.length} kullanıcı bulundu.\n`);

    // CepSMS hesaplarını al
    const cepsmsAccounts = getAllAccounts();
    console.log(`📋 Toplam ${cepsmsAccounts.length} CepSMS hesabı mevcut.\n`);

    // Kullanıcı adına göre eşleştirme yap
    let matched = 0;
    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const user of users) {
      // Zaten eşleştirilmiş mi kontrol et
      if (user.cepsms_username) {
        console.log(`⏭️  ${user.username} zaten eşleştirilmiş: ${user.cepsms_username}`);
        skipped++;
        continue;
      }

      // Kullanıcı adına göre CepSMS hesabı bul
      const account = cepsmsAccounts.find(acc => acc.username === user.username);

      if (account) {
        // Eşleştirme yap
        const { error: updateError } = await supabase
          .from('users')
          .update({ cepsms_username: account.username })
          .eq('id', user.id);

        if (updateError) {
          console.error(`❌ ${user.username} güncellenemedi: ${updateError.message}`);
          notFound++;
        } else {
          console.log(`✅ ${user.username} → ${account.username} (${account.phone})`);
          updated++;
          matched++;
        }
      } else {
        console.log(`⚠️  ${user.username} için CepSMS hesabı bulunamadı`);
        notFound++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Özet:');
    console.log(`   ✅ Eşleştirilen: ${matched}`);
    console.log(`   🔄 Güncellenen: ${updated}`);
    console.log(`   ⏭️  Zaten eşleştirilmiş: ${skipped}`);
    console.log(`   ⚠️  Hesap bulunamadı: ${notFound}`);
    console.log('='.repeat(80) + '\n');

    if (notFound > 0) {
      console.log('💡 Not: Hesap bulunamayan kullanıcılar için manuel eşleştirme yapabilirsiniz.');
      console.log('   Admin panelinden kullanıcı düzenleme sayfasından CepSMS kullanıcı adını ekleyebilirsiniz.\n');
    }

    console.log('✅ Migration tamamlandı!');
  } catch (error: any) {
    console.error('❌ Migration hatası:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Script'i çalıştır
migrateUsersCepSMSAccounts();
