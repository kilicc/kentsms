import { readFileSync } from 'fs';
import { join } from 'path';
import { getSupabaseServer } from '../lib/supabase-server';
import { hashPassword } from '../lib/utils/password';

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
    console.warn('⚠️  .env dosyası bulunamadı veya okunamadı');
  }
}

loadEnvFile();

async function resetAdmin2Password() {
  console.log('🔐 Admin2 Kullanıcı Şifresi Sıfırlanıyor...\n');
  const supabase = getSupabaseServer();

  try {
    const username = 'admin2';
    const email = 'admin2@kentsms.com';
    const newPassword = '123';

    console.log('🔍 Kullanıcı aranıyor...');
    
    // Kullanıcıyı bul
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('id, username, email, role, password_hash')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1);

    if (findError) {
      throw new Error(`Kullanıcı bulunurken hata: ${findError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('❌ Kullanıcı bulunamadı! Önce kullanıcıyı oluşturun:');
      console.log('   npx tsx scripts/create-admin2-user.ts');
      process.exit(1);
    }

    const user = users[0];
    console.log('✅ Kullanıcı bulundu:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Mevcut Password Hash: ${user.password_hash?.substring(0, 20)}...\n`);

    // Yeni şifreyi hash'le
    console.log('🔐 Yeni şifre hashleniyor...');
    const passwordHash = await hashPassword(newPassword);
    console.log(`   Yeni Password Hash: ${passwordHash.substring(0, 20)}...\n`);

    // Şifreyi güncelle
    console.log('💾 Şifre güncelleniyor...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        role: 'admin', // Admin rolünü de garantile
        credit: 999999 // Kredi de garantile
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Şifre güncellenirken hata: ${updateError.message}`);
    }

    console.log('✅ Şifre başarıyla güncellendi!\n');
    console.log('📋 Güncellenmiş Bilgiler:');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Şifre: ${newPassword}`);
    console.log(`   Role: admin`);
    console.log(`   Credit: 999999`);
    console.log('\n🔗 Giriş yapmak için:');
    console.log('   https://kentsms.com/login');
    console.log('\n🔐 Giriş Bilgileri:');
    console.log(`   Kullanıcı Adı: ${username} VEYA ${email}`);
    console.log(`   Şifre: ${newPassword}`);

  } catch (error: any) {
    console.error('\n❌ Hata:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

resetAdmin2Password()
  .then(() => {
    console.log('\n✅ İşlem tamamlandı!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Beklenmeyen hata:', error);
    process.exit(1);
  });

