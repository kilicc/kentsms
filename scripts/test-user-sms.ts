/**
 * Kullanıcı adı ve şifreyle SMS gönderme testi
 * 
 * Kullanım:
 *   npx tsx scripts/test-user-sms.ts <username> <password> <phone>
 * 
 * Örnek:
 *   npx tsx scripts/test-user-sms.ts bahi1 <password> 905551234567
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getAccountByUsername, getAllAccounts } from '../lib/utils/cepsmsAccounts';
import { sendSMS } from '../lib/utils/cepSMSProvider';
import { getSupabaseServer } from '../lib/supabase-server';
import * as bcrypt from 'bcryptjs';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function testUserSMS() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Kullanım: npx tsx scripts/test-user-sms.ts <username> <password> <phone>');
    console.error('');
    console.error('Örnek:');
    console.error('  npx tsx scripts/test-user-sms.ts bahi1 password123 905551234567');
    console.error('');
    console.error('Mevcut CepSMS hesapları:');
    const accounts = getAllAccounts();
    accounts.forEach(acc => {
      console.error(`  - ${acc.username} (${acc.phone})`);
    });
    process.exit(1);
  }

  const testUsername = args[0];
  const testPassword = args[1];
  const testPhone = args[2] || '905551234567';

  console.log('=== Kullanıcı SMS Gönderim Testi ===\n');
  console.log(`Kullanıcı Adı: ${testUsername}`);
  console.log(`Telefon: ${testPhone}\n`);

  try {
    // 1. Kullanıcıyı bul
    const supabase = getSupabaseServer();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, email, password_hash, cepsms_username, credit, role')
      .eq('username', testUsername)
      .single();

    if (userError || !user) {
      console.error(`❌ Kullanıcı bulunamadı: ${testUsername}`);
      console.error('   Hata:', userError?.message);
      process.exit(1);
    }

    console.log(`✅ Kullanıcı bulundu: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   CepSMS Username: ${user.cepsms_username || '(atanmamış)'}`);
    console.log(`   Kredi: ${user.credit || 0}`);
    console.log(`   Rol: ${user.role || 'user'}\n`);

    // 2. Şifre kontrolü
    if (!user.password_hash) {
      console.error('❌ Kullanıcının şifre hash\'i yok!');
      process.exit(1);
    }

    const passwordValid = await bcrypt.compare(testPassword, user.password_hash);
    if (!passwordValid) {
      console.error('❌ Şifre yanlış!');
      process.exit(1);
    }

    console.log('✅ Şifre doğru\n');

    // 3. CepSMS hesabı kontrolü
    if (!user.cepsms_username || user.cepsms_username.trim() === '') {
      console.error('❌ Kullanıcıya CepSMS hesabı atanmamış!');
      console.error('   Admin panelinden kullanıcıya bir CepSMS hesabı atayın.\n');
      process.exit(1);
    }

    const account = getAccountByUsername(user.cepsms_username);
    if (!account) {
      console.error(`❌ CepSMS hesabı bulunamadı: ${user.cepsms_username}`);
      console.error('   Mevcut hesaplar:');
      const allAccounts = getAllAccounts();
      allAccounts.forEach(acc => {
        console.error(`     - ${acc.username}`);
      });
      process.exit(1);
    }

    console.log(`✅ CepSMS hesabı bulundu: ${account.username}`);
    console.log(`   Telefon: ${account.phone}\n`);

    // 4. SMS gönder
    console.log('📤 SMS gönderiliyor...');
    const message = `Test SMS - ${user.username} hesabından gönderildi. ${new Date().toLocaleString('tr-TR')}`;
    
    const result = await sendSMS(testPhone, message, user.cepsms_username);

    if (result.success && result.messageId) {
      console.log('✅ SMS başarıyla gönderildi!');
      console.log(`   MessageId: ${result.messageId}`);
      console.log(`   Telefon: ${testPhone}`);
      console.log(`   Mesaj: ${message.substring(0, 50)}...\n`);
      
      // SMS kaydını oluştur
      const { error: insertError } = await supabase
        .from('sms_messages')
        .insert({
          user_id: user.id,
          phone_number: testPhone,
          message: message,
          status: 'gönderildi',
          cost: 1,
          cep_sms_message_id: result.messageId,
          sent_at: new Date().toISOString(),
        });

      if (insertError) {
        console.warn('⚠️  SMS kaydı oluşturulamadı:', insertError.message);
      } else {
        console.log('✅ SMS kaydı oluşturuldu');
      }
    } else {
      console.error('❌ SMS gönderilemedi!');
      console.error('   Hata:', result.error || 'Bilinmeyen hata');
      process.exit(1);
    }

    console.log('\n✅ Test başarıyla tamamlandı!');
  } catch (error: any) {
    console.error('❌ Test hatası:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Script'i çalıştır
testUserSMS();
