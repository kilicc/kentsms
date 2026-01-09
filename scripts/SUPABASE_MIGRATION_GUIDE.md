# 🗄️ Supabase Veritabanı Migration Rehberi

Bu rehber, Supabase Dashboard üzerinden veritabanı migration'larını nasıl yapacağınızı açıklar.

## 📋 Adım 1: Supabase Dashboard'a Giriş

1. [Supabase Dashboard](https://app.supabase.com) açın
2. Projenizi seçin: `otnggzsbuxejrgcoopii`
3. Sol menüden **SQL Editor** sekmesine tıklayın

## 🔧 Adım 2: CepSMS Username Kolonu Ekleme

1. **SQL Editor**'de **New Query** butonuna tıklayın
2. `scripts/add-cepsms-username-column.sql` dosyasındaki SQL kodunu kopyalayın
3. SQL Editor'e yapıştırın
4. **Run** butonuna tıklayın (veya `Ctrl+Enter` / `Cmd+Enter`)

**SQL Kodu:**
```sql
-- cepsms_username kolonunu ekle
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cepsms_username VARCHAR(50);

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_users_cepsms_username ON users(cepsms_username);
```

**Kontrol:**
```sql
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'cepsms_username';
```

## 🔗 Adım 3: CepSMS Hesaplarını Eşleştirme

1. **SQL Editor**'de yeni bir query oluşturun
2. `scripts/migrate-cepsms-accounts-sql.sql` dosyasındaki SQL kodunu kopyalayın
3. SQL Editor'e yapıştırın
4. **Run** butonuna tıklayın

**SQL Kodu:**
```sql
-- Kullanıcı adına göre CepSMS hesaplarını eşleştir
UPDATE users
SET cepsms_username = CASE username
  WHEN 'bahi1' THEN 'bahi1'
  WHEN 'dede1' THEN 'dede1'
  WHEN 'grand1' THEN 'grand1'
  WHEN 'venom1' THEN 'venom1'
  WHEN 'asus1' THEN 'asus1'
  WHEN 'ramada1' THEN 'ramada1'
  WHEN 'super1' THEN 'super1'
  WHEN 'maxwin1' THEN 'maxwin1'
  WHEN 'royal1' THEN 'royal1'
  WHEN 'pasha1' THEN 'pasha1'
  ELSE NULL
END
WHERE username IN ('bahi1', 'dede1', 'grand1', 'venom1', 'asus1', 'ramada1', 'super1', 'maxwin1', 'royal1', 'pasha1');
```

**Kontrol:**
```sql
SELECT 
  username,
  cepsms_username,
  credit,
  role
FROM users
WHERE cepsms_username IS NOT NULL
ORDER BY username;
```

## ✅ Adım 4: Doğrulama

Tüm işlemler tamamlandıktan sonra, aşağıdaki sorguyu çalıştırarak kontrol edin:

```sql
-- Tüm kullanıcıları ve CepSMS hesaplarını göster
SELECT 
  id,
  username,
  cepsms_username,
  credit,
  role,
  created_at
FROM users
ORDER BY username;
```

## 🎯 Beklenen Sonuç

- ✅ `cepsms_username` kolonu `users` tablosuna eklendi
- ✅ Index oluşturuldu
- ✅ 10 kullanıcı CepSMS hesaplarıyla eşleştirildi
- ✅ Her kullanıcı kendi CepSMS hesabını kullanacak

## 📝 Notlar

- Admin kullanıcısı için CepSMS hesabı eşleştirilmedi (isteğe bağlı)
- Yeni kullanıcılar için CepSMS hesabı admin panelinden manuel olarak eklenebilir
- Migration script'leri (`scripts/migrate-users-cepsms-accounts.ts`) artık kullanılmayabilir, SQL ile yapıldı

## 🔄 Alternatif: Prisma Push (Eğer bağlantı çalışırsa)

Eğer `npx prisma db push` komutu çalışırsa, SQL script'lerine gerek kalmaz:

```bash
npx prisma db push
```

Ancak SQL ile yapmak daha hızlı ve güvenilirdir.
