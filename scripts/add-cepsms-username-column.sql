-- CepSMS Username kolonu ekleme script'i
-- Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. cepsms_username kolonunu ekle
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cepsms_username VARCHAR(50);

-- 2. Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_users_cepsms_username ON users(cepsms_username);

-- 3. Kolonun eklendiğini kontrol et
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'cepsms_username';
