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
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = cleanValue;
          }
        }
      }
    }
  } catch (error) {
    // .env file not found or can't be read, continue with existing env vars
    console.warn('⚠️  .env dosyası bulunamadı veya okunamadı, mevcut environment variables kullanılacak');
  }
}

// Load environment variables
loadEnvFile();

async function createAdmin2User() {
  console.log('🚀 KENTSMS Admin2 Kullanıcısı Oluşturuluyor...\n');
  const supabase = getSupabaseServer();

  try {
    const username = 'admin2';
    const email = 'admin2@kentsms.com';
    const password = '123';
    const role = 'admin';

    // Kullanıcı zaten var mı kontrol et
    console.log('🔍 Kullanıcı kontrol ediliyor...');
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, username, email, role, credit')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') {
      throw new Error(`Kullanıcı kontrol hatası: ${findError.message}`);
    }

    if (existingUser) {
      console.log('⚠️  Kullanıcı zaten mevcut! Admin yetkileri güncelleniyor...\n');
      
      // Şifreyi güncelle
      const passwordHash = await hashPassword(password);
      
      // Kullanıcıyı admin yap ve şifreyi güncelle
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          role: 'admin',
          credit: 999999, // Admin için sınırsız kredi
        })
        .eq('id', existingUser.id)
        .select('id, username, email, role, credit')
        .single();

      if (updateError) {
        throw new Error(`Kullanıcı güncellenirken hata: ${updateError.message}`);
      }

      console.log('✅ Kullanıcı başarıyla admin yapıldı!\n');
      console.log('📋 Admin Kullanıcı Bilgileri:');
      console.log(`   ID: ${updatedUser.id}`);
      console.log(`   Username: ${updatedUser.username}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Şifre: ${password}`);
      console.log(`   Role: ${updatedUser.role}`);
      console.log(`   Credit: ${updatedUser.credit}`);
      console.log('\n🔗 Giriş yapmak için:');
      console.log('   https://kentsms.com/login');
      console.log('\n🔗 Admin panele erişmek için:');
      console.log('   https://kentsms.com/admin');
      return;
    }

    // Şifreyi hash'le
    console.log('🔐 Şifre hashleniyor...');
    const passwordHash = await hashPassword(password);

    // Admin kullanıcı oluştur
    console.log('💾 Admin kullanıcı oluşturuluyor...');
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        username: username,
        email: email,
        password_hash: passwordHash,
        role: role,
        credit: 999999, // Admin için sınırsız kredi
      })
      .select('id, username, email, role, credit, created_at')
      .single();

    if (createError) {
      throw new Error(`Kullanıcı oluşturulurken hata: ${createError.message}`);
    }

    console.log('\n✅ Admin kullanıcı başarıyla oluşturuldu!\n');
    console.log('📋 Admin Kullanıcı Bilgileri:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Şifre: ${password}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Credit: ${user.credit}`);
    console.log(`   Oluşturulma: ${user.created_at}`);
    console.log('\n🔗 Giriş yapmak için:');
    console.log('   https://kentsms.com/login');
    console.log('\n🔗 Admin panele erişmek için:');
    console.log('   https://kentsms.com/admin');
    console.log('\n🔐 Giriş Bilgileri:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);

  } catch (error: any) {
    console.error('\n❌ Admin kullanıcı oluşturma hatası:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Script'i çalıştır
createAdmin2User()
  .then(() => {
    console.log('\n✅ İşlem tamamlandı!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Beklenmeyen hata:', error);
    process.exit(1);
  });

