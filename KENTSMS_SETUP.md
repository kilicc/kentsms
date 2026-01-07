# 🚀 KENTSMS Kurulum Rehberi

Bu doküman, KENTSMS sistemini yeni bir domain ve veritabanı ile kurmak için gereken adımları içerir.

## 📋 Ön Gereksinimler

1. **GitHub Repository:** `https://github.com/kilicc/kentsms.git`
2. **Supabase Projesi:** Mevcut veya yeni oluşturulacak
3. **Domain:** `https://kentsms.com` (veya kendi domain'iniz)
4. **Dokploy veya Vercel:** Deployment platformu

---

## 🔧 1. Environment Variables Kurulumu

Dokploy Dashboard'da veya `.env` dosyasında şu değişkenleri ayarlayın:

```env
# Supabase Configuration
SUPABASE_URL=https://otnggzsbuxejrgcoopii.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://otnggzsbuxejrgcoopii.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_D1M7VvGnVKJgAHD1DNd2rQ_cu3X7F6w
SUPABASE_SERVICE_KEY=sb_secret_RQYBbEhsngaT4sOF1cPJtw_qYv_rQ4i

# Database (Supabase PostgreSQL)
# Supabase Dashboard > Settings > Database > Connection String > URI
# Şifreyi [YOUR-PASSWORD] yerine gerçek şifrenizle değiştirin
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@otnggzsbuxejrgcoopii.supabase.co:5432/postgres

# JWT Configuration
JWT_SECRET=098d0422-6f3e-41bc-b9c8-cc000b0fb38f
JWT_EXPIRE=7d

# Next.js Configuration
NEXT_PUBLIC_BASE_URL=https://kentsms.com
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SHORT_LINK_DOMAIN=go.kentsms.com

# CepSMS Configuration
CEPSMS_USERNAME=your_cepsms_username
CEPSMS_PASSWORD=your_cepsms_password
CEPSMS_FROM=KENTSMS
CEPSMS_REJECT_UNAUTHORIZED=false

# Crypto Payment Configuration (Optional)
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
COLD_WALLET_DEFAULT=your_crypto_wallet_address

# Cron Job Configuration (Optional)
CRON_SECRET_KEY=your_cron_secret_key_here
```

---

## 🗄️ 2. Supabase Veritabanı Kurulumu

### 2.1. Supabase Dashboard'a Giriş

1. [Supabase Dashboard](https://app.supabase.com) açın
2. Proje: `otnggzsbuxejrgcoopii` seçin

### 2.2. Database Connection String Alın

1. **Settings** → **Database** → **Connection String** → **URI**
2. Şifreyi ekleyin ve `DATABASE_URL` olarak kopyalayın
3. Format: `postgresql://postgres:[PASSWORD]@otnggzsbuxejrgcoopii.supabase.co:5432/postgres`

### 2.3. Prisma Schema'yı Çekin

```bash
# Repository'yi klonlayın
git clone https://github.com/kilicc/kentsms.git
cd kentsms

# Bağımlılıkları yükleyin
npm install

# .env dosyasını oluşturun ve DATABASE_URL'i ekleyin
cp .env.example .env
# .env dosyasını düzenleyin ve DATABASE_URL'i ekleyin

# Supabase'den şemayı çekin
npx prisma db pull

# Prisma Client'ı oluşturun
npx prisma generate
```

---

## 🌐 3. Dokploy Deployment

### 3.1. Yeni Proje Oluşturma

1. **Dokploy Dashboard** açın
2. **Projects** → **Create New Project**
3. **Name:** `kentsms`
4. **Source:** GitHub → `kilicc/kentsms` repository'sini seçin

### 3.2. Environment Variables Ekleme

Dokploy Dashboard'da:

1. **Settings** → **Environment Variables** → **Add Variable**
2. Yukarıdaki tüm environment variables'ları ekleyin
3. **ÖNEMLİ:** `DATABASE_URL` içindeki özel karakterler URL encode edilmelidir!

### 3.3. Domain Ayarları

1. **Settings** → **Domains** → **Add Domain**
2. **Domain:** `kentsms.com` (veya subdomain: `panel.kentsms.com`)
3. **SSL Certificate:** Let's Encrypt (otomatik)

### 3.4. DNS Ayarları

Domain sağlayıcınızda (Cloudflare, Namecheap, vb.):

```
Type: A
Name: @ (veya panel)
Value: [Sunucu IP Adresi]
TTL: Auto
```

Veya CNAME kullanarak:

```
Type: CNAME
Name: panel (veya @)
Value: [Mevcut domain]
TTL: Auto
```

### 3.5. Deploy

1. **Deploy** → **Deploy Now**
2. Build tamamlandığında sistem hazır!

---

## 📝 4. İlk Kullanıcı Oluşturma

Supabase Dashboard'da manuel olarak veya script ile:

```bash
# Admin kullanıcı oluşturma scripti
npx tsx scripts/create-admin-user.ts
```

---

## ✅ 5. Kurulum Doğrulama

1. **Domain'e Erişim:** `https://kentsms.com`
2. **Login Sayfası:** `/login`
3. **API Health Check:** `https://kentsms.com/api/health`

---

## 🎨 6. Marka Özelleştirme

### Logo Değiştirme

1. `public/logo3.png` dosyasını KENTSMS logosu ile değiştirin
2. Boyut: 120x120px (minimum)

### Renk Özelleştirme

Renkleri değiştirmek için:

1. **`lib/theme.ts`** - MUI Theme renkleri
2. **`app/globals.css`** - CSS variables
3. **`tailwind.config.js`** - Tailwind renkleri

### Marka İsmi

Tüm dosyalarda "KENTSMS" olarak güncellenmiştir. Ek değişiklik için:

```bash
# Tüm dosyalarda "Finsms" arayın
grep -r "Finsms" --include="*.ts" --include="*.tsx" --include="*.md"
```

---

## 🔒 7. Güvenlik Kontrol Listesi

- [ ] `JWT_SECRET` güçlü ve benzersiz
- [ ] `SUPABASE_SERVICE_KEY` güvenli tutuluyor
- [ ] `DATABASE_URL` URL encode edilmiş
- [ ] SSL sertifikası aktif
- [ ] CORS ayarları yapılmış
- [ ] API rate limiting aktif (opsiyonel)

---

## 📞 8. Destek ve Sorun Giderme

### Yaygın Sorunlar

1. **Database Connection Error**
   - `DATABASE_URL` doğru mu kontrol edin
   - Supabase şifresi doğru mu?
   - Connection pooling aktif mi?

2. **SSL Sertifika Hatası**
   - Let's Encrypt otomatik olmalı
   - DNS kayıtları doğru mu?

3. **Build Hatası**
   - `npx prisma generate` çalıştırıldı mı?
   - Environment variables eksik mi?

### Log Kontrolü

```bash
# Dokploy'da
# Logs sekmesinden build ve runtime loglarını kontrol edin

# Supabase'de
# Logs → Database Logs veya API Logs
```

---

## 🚀 9. Production Checklist

- [ ] Environment variables ayarlandı
- [ ] Database şeması çekildi (`prisma db pull`)
- [ ] Prisma Client oluşturuldu (`prisma generate`)
- [ ] Domain DNS ayarları yapıldı
- [ ] SSL sertifikası aktif
- [ ] İlk admin kullanıcı oluşturuldu
- [ ] API test edildi
- [ ] SMS gönderimi test edildi
- [ ] Health check endpoint çalışıyor (`/api/health`)

---

## 📚 Ek Kaynaklar

- **GitHub Repository:** https://github.com/kilicc/kentsms.git
- **Supabase Dashboard:** https://app.supabase.com/project/otnggzsbuxejrgcoopii
- **Dokploy Docs:** https://dokploy.com/docs

---

**© 2025 KENTSMS. All rights reserved.**

