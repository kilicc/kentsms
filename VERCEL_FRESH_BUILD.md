# 🚀 Vercel'de Sıfırdan Build Rehberi

## ✅ Proje Durumu
- Tüm kod GitHub'a push edildi
- Build başarılı (local'de test edildi)
- Prisma Client hazır

## 📋 Vercel'de Yapılacaklar

### 1. Projeyi Vercel'e Import Edin

1. **Vercel Dashboard** → https://vercel.com/dashboard
2. **Add New...** → **Project**
3. **Import Git Repository** → `kilicc/finsms2` seçin
4. **Configure Project** butonuna tıklayın

### 2. Project Settings

**Framework Preset:** Next.js (otomatik algılanmalı)

**Root Directory:** `./` (kök dizin)

**Build Command:** `npm run build` (otomatik)

**Output Directory:** `.next` (otomatik)

**Install Command:** `npm install --legacy-peer-deps` (önerilen)

### 3. Environment Variables Ekleme

**⚠️ ÖNEMLİ:** Tüm environment variable'ları manuel olarak eklemelisiniz!

Vercel Dashboard → Proje → **Settings** → **Environment Variables**

Aşağıdaki tüm değişkenleri ekleyin:

#### Database (ÖNEMLİ!)
```
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[ŞİFRE]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**⚠️ ÖNEMLİ:** Connection Pooling (port 6543) kullanın!
- Supabase Dashboard → Settings → Database → Connection Pooling
- **Transaction mode** seçin
- URI formatını kopyalayın
- Sonuna `&connection_limit=1` ekleyin

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

#### JWT
```
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRE=7d
```

#### CepSMS
```
CEPSMS_USERNAME=Testfn
CEPSMS_PASSWORD=Qaswed
CEPSMS_FROM=CepSMS
```

#### Crypto Payment
```
COINMARKETCAP_API_KEY=17aa5b111c584455912e0242e7dee2ce
COLD_WALLET_DEFAULT=TDRrweahDMPgpCYZLMyEwxqNUkM12ptuw5
```

#### Next.js
```
NEXT_PUBLIC_API_URL=/api
```

### 4. Environment Variable Formatı

**Production, Preview, Development** için aynı değerleri ekleyin.

**ÖNEMLİ:** `DATABASE_URL` için şifrede özel karakterler varsa URL encode edin:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `/` → `%2F`
- `=` → `%3D`
- `?` → `%3F`
- `!` → `%21`

### 5. Deploy

1. **Deploy** butonuna tıklayın
2. Build sürecini izleyin
3. Build tamamlandığında **Visit** butonuna tıklayın

## 🔍 Build Süreci Kontrolü

### Build Logs'da Görmeniz Gerekenler:

1. ✅ `npm install` başarılı
2. ✅ `prisma generate` çalıştı (postinstall hook)
3. ✅ `next build` başarılı
4. ✅ Prisma Client oluşturuldu
5. ✅ Static pages oluşturuldu
6. ✅ API routes hazır

### Hata Durumunda:

1. **Environment Variables** kontrol edin
2. **DATABASE_URL** formatını kontrol edin (connection pooling)
3. **Build Logs** detaylarını inceleyin
4. **Prisma Client** hatası varsa `prisma generate` manuel çalıştırın

## 📝 Önemli Notlar

### Prisma Client
- `postinstall` hook otomatik olarak `prisma generate` çalıştırır
- Vercel build sırasında Prisma Client otomatik oluşturulur
- Hata alırsanız: `vercel.json` içinde `buildCommand` kontrol edin

### Database Connection
- **Connection Pooling (port 6543)** kullanın
- Direct connection (port 5432) Vercel'de çalışmayabilir
- `connection_limit=1` parametresi Prisma için önemli

### Build Time
- İlk build: ~3-5 dakika
- Sonraki build'ler: ~1-2 dakika

## ✅ Build Başarılı Kontrol Listesi

- [ ] Environment variables eklendi
- [ ] DATABASE_URL connection pooling kullanıyor
- [ ] Build başarılı
- [ ] Prisma Client oluşturuldu
- [ ] API routes çalışıyor
- [ ] Frontend sayfaları açılıyor
- [ ] Database bağlantısı çalışıyor

## 🐛 Sorun Giderme

### "Cannot find module '@prisma/client'"
**Çözüm:** `postinstall` hook'un çalıştığından emin olun. `package.json`'da `"postinstall": "prisma generate"` olmalı.

### "Prepared statement already exists"
**Çözüm:** `DATABASE_URL`'de `connection_limit=1` parametresi var mı kontrol edin.

### "Can't reach database server"
**Çözüm:** Connection Pooling (port 6543) kullanın, direct connection (port 5432) değil.

### Build timeout
**Çözüm:** Vercel'de build timeout'u artırın veya build'i optimize edin.

## 🔗 Yararlı Linkler

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma + Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)

