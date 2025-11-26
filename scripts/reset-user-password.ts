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
  }
}

// Load environment variables
loadEnvFile();

async function resetUserPassword() {
  try {
    // Environment variables kontrolü
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase environment variables eksik!');
      console.error('   SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_URL gerekli');
      console.error('   SUPABASE_SERVICE_KEY gerekli');
      console.error('');
      console.error('   .env dosyanızda bu değişkenlerin tanımlı olduğundan emin olun.');
      process.exit(1);
    }

    const email = 'telco@finsms.io';
    const newPassword = '123456';

    // Supabase client'ı al
    const supabaseServer = getSupabaseServer();

    console.log(`🔍 Kullanıcı aranıyor: ${email}...`);

    // Kullanıcıyı bul
    const { data: users, error: findError } = await supabaseServer
      .from('users')
      .select('id, username, email, role')
      .eq('email', email)
      .limit(1);

    if (findError) {
      console.error('❌ Kullanıcı bulunurken hata:', findError.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.error(`❌ Kullanıcı bulunamadı: ${email}`);
      process.exit(1);
    }

    const user = users[0];
    console.log(`✅ Kullanıcı bulundu:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role || 'user'}`);
    console.log('');

    // Şifreyi hash'le
    console.log('🔐 Şifre hashleniyor...');
    const passwordHash = await hashPassword(newPassword);

    // Şifreyi güncelle
    console.log('💾 Şifre güncelleniyor...');
    const { error: updateError } = await getSupabaseServer()
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Şifre güncellenirken hata:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Şifre başarıyla güncellendi!');
    console.log('');
    console.log('📋 Güncellenmiş Bilgiler:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Yeni Şifre: ${newPassword}`);
    console.log('');
    console.log('🔗 Giriş yapmak için:');
    console.log('   https://panel.finsms.io/login');
  } catch (error: any) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

resetUserPassword();

