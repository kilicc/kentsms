/**
 * Test kullanıcısını yapılandır
 * - Smsexp hesabını kullan (admin2 gibi)
 * - Kredisi 100 olsun
 * 
 * Kullanım:
 *   npx tsx scripts/configure-test-user.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getSupabaseServer } from '../lib/supabase-server';

// .env dosyasını yükle
config({ path: resolve(process.cwd(), '.env') });

async function configureTestUser() {
  console.log('=== Test Kullanıcısı Yapılandırılıyor ===\n');

  const supabaseServer = getSupabaseServer();
  
  // Test kullanıcısını bul (username = 'test' veya 'testuser')
  const { data: testUser, error: findError } = await supabaseServer
    .from('users')
    .select('id, username, email, credit, role, cepsms_username')
    .or('username.eq.test,username.eq.testuser')
    .limit(1)
    .single();

  if (findError || !testUser) {
    console.error('❌ Test kullanıcısı bulunamadı!');
    console.error('   Lütfen önce test kullanıcısını oluşturun (username: test veya testuser)');
    console.error('   Hata:', findError?.message);
    process.exit(1);
  }

  console.log('✅ Test kullanıcısı bulundu:');
  console.log(`   ID: ${testUser.id}`);
  console.log(`   Username: ${testUser.username}`);
  console.log(`   Email: ${testUser.email}`);
  console.log(`   Mevcut Kredi: ${testUser.credit || 0}`);
  console.log(`   Mevcut Rol: ${testUser.role || 'user'}`);
  console.log(`   Mevcut CepSMS Username: ${testUser.cepsms_username || '(atanmamış)'}\n`);

  // Test kullanıcısını güncelle
  const { data: updatedUser, error: updateError } = await supabaseServer
    .from('users')
    .update({
      cepsms_username: 'Smsexp', // Admin2 gibi Smsexp kullan
      credit: 100, // Kredisi 100 olsun
      // role: 'user' // Admin değil, böylece kredi kontrolü yapılacak
    })
    .eq('id', testUser.id)
    .select('id, username, email, credit, role, cepsms_username')
    .single();

  if (updateError || !updatedUser) {
    console.error('❌ Test kullanıcısı güncellenemedi!');
    console.error('   Hata:', updateError?.message);
    process.exit(1);
  }

  console.log('✅ Test kullanıcısı başarıyla güncellendi:');
  console.log(`   Username: ${updatedUser.username}`);
  console.log(`   Email: ${updatedUser.email}`);
  console.log(`   Yeni Kredi: ${updatedUser.credit}`);
  console.log(`   Rol: ${updatedUser.role}`);
  console.log(`   CepSMS Username: ${updatedUser.cepsms_username}\n`);

  console.log('📋 Yapılandırma Özeti:');
  console.log('   ✅ Smsexp hesabı kullanılacak (admin2 gibi)');
  console.log('   ✅ Kredisi 100');
  console.log('   ✅ Kredi kontrolü yapılacak (admin olmadığı için)\n');

  console.log('✅ Test kullanıcısı yapılandırıldı!');
}

configureTestUser().catch(error => {
  console.error('Hata:', error);
  process.exit(1);
});
