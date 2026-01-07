# 🗄️ KENTSMS Supabase Veritabanı Kurulum Rehberi

## 📋 Gereksinimler

- Supabase Proje URL: `https://otnggzsbuxejrgcoopii.supabase.co`
- Supabase Dashboard erişimi: https://app.supabase.com/project/otnggzsbuxejrgcoopii

---

## 🚀 Hızlı Kurulum (Önerilen)

### Adım 1: Supabase SQL Editor'a Gidin

1. **Supabase Dashboard:** https://app.supabase.com/project/otnggzsbuxejrgcoopii
2. Sol menüden **SQL Editor** seçin
3. **New Query** butonuna tıklayın

### Adım 2: SQL Scriptini Çalıştırın

1. `scripts/kentsms-setup-database.sql` dosyasını açın
2. **Tüm içeriği** kopyalayın
3. SQL Editor'e yapıştırın
4. **Run** butonuna tıklayın (veya `Ctrl+Enter` / `Cmd+Enter`)

### Adım 3: Sonuçları Kontrol Edin

1. Sol menüden **Table Editor** seçin
2. Aşağıdaki tabloların oluşturulduğunu kontrol edin:
   - ✅ `users`
   - ✅ `contacts`
   - ✅ `contact_groups`
   - ✅ `sms_messages`
   - ✅ `sms_templates`
   - ✅ `refunds`
   - ✅ `payments`
   - ✅ `payment_requests`
   - ✅ `payment_packages`
   - ✅ `crypto_currencies`
   - ✅ `api_keys`
   - ✅ `short_links`
   - ✅ `short_link_clicks`

---

## 📝 Script İçeriği

Script şunları oluşturur:

### ✅ Tablolar (14 adet)
- Tüm tablolar Prisma schema'ya göre oluşturulur
- Foreign key ilişkileri kurulur
- Unique constraint'ler eklenir

### ✅ Indexler
- Performans için gerekli tüm indexler oluşturulur
- User ID, status, date field'ları için indexler

### ✅ Row Level Security (RLS)
- Tüm tablolarda RLS aktif
- Kullanıcılar sadece kendi verilerini görebilir
- Admin kullanıcılar tüm verileri görebilir

### ✅ Varsayılan Veriler
- **3 Ödeme Paketi:**
  - Başlangıç Paketi (1000 SMS, ₺1,500)
  - Pro Paketi (5000 SMS, ₺7,000)
  - Premium Paketi (10000 SMS, ₺13,000)

- **5 Kripto Para:**
  - Bitcoin (BTC)
  - Ethereum (ETH)
  - Tether (USDT)
  - USD Coin (USDC)
  - Tron (TRX)

---

## 👤 Admin2 Kullanıcısını Oluşturma

Tablolar oluşturulduktan sonra, admin2 kullanıcısını oluşturun:

```bash
npx tsx scripts/create-admin2-user.ts
```

**Kullanıcı Bilgileri:**
- Username: `admin2`
- Email: `admin2@kentsms.com`
- Password: `123`
- Role: `admin`
- Credit: `999999`

---

## 🔧 Alternatif: Prisma ile Kurulum

Eğer `.env` dosyanızda doğru `DATABASE_URL` varsa:

```bash
# .env dosyasını kontrol edin
# DATABASE_URL=postgresql://postgres:[ŞİFRE]@otnggzsbuxejrgcoopii.supabase.co:5432/postgres

npx prisma db push
```

**⚠️ ÖNEMLİ:** DATABASE_URL formatı:
```
postgresql://postgres:[YOUR-PASSWORD]@otnggzsbuxejrgcoopii.supabase.co:5432/postgres
```

Supabase Dashboard > Settings > Database > Connection String > URI'dan alabilirsiniz.

---

## ✅ Kurulum Kontrolü

Kurulum başarılı mı kontrol edin:

### 1. Tablolar Kontrolü
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

14 tablo görmelisiniz.

### 2. Indexler Kontrolü
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### 3. RLS Kontrolü
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Tüm tablolarda `rowsecurity = true` olmalı.

---

## 🆘 Sorun Giderme

### "Table already exists" Hatası
- Normal, `IF NOT EXISTS` kullanıldığı için güvenli
- Devam edebilirsiniz

### "Permission denied" Hatası
- Service Role Key kullanın (anon key değil)
- SQL Editor'da çalıştırırken otomatik olarak service role kullanır

### "Connection refused" Hatası
- Supabase projeniz aktif mi kontrol edin
- Database URL doğru mu kontrol edin

---

## 📞 Destek

Sorun yaşarsanız:
1. SQL Editor'da hata mesajını kontrol edin
2. Table Editor'da hangi tablolar oluştu kontrol edin
3. Logları kontrol edin

---

**© 2025 KENTSMS. All rights reserved.**

