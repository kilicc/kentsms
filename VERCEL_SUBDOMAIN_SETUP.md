# Vercel Subdomain Yapılandırma Rehberi

## 📋 Genel Bakış

Bu proje iki farklı subdomain ile çalışır:
- **panel.finsms.io** - Admin paneli için
- **platform.finsms.io** - Kullanıcı platformu için

## 🚀 Vercel'de Subdomain Yapılandırması

### 1. Vercel Dashboard Ayarları

#### Adım 1: Projeyi Deploy Et
1. GitHub repository'yi Vercel'e bağla
2. Projeyi deploy et

#### Adım 2: Domain Ekleme
1. Vercel Dashboard → Proje → **Settings** → **Domains**
2. **Add Domain** butonuna tıkla
3. Her iki subdomain'i ekle:
   - `panel.finsms.io`
   - `platform.finsms.io`

#### Adım 3: DNS Ayarları
Ana domain'iniz (`finsms.io`) için DNS kayıtlarınızı kontrol edin:

**DNS Kayıtları (DNS Provider'ınızda):**
```
Type: CNAME
Name: panel
Value: cname.vercel-dns.com
```

```
Type: CNAME
Name: platform
Value: cname.vercel-dns.com
```

**Veya Vercel'in önerdiği DNS kayıtlarını kullanın:**
- Vercel Dashboard → Domains → Her domain için DNS kayıtlarını gösterir

### 2. Middleware Yapılandırması

Proje zaten `middleware.ts` dosyası ile yapılandırılmıştır:

**Özellikler:**
- `panel.finsms.io` → Admin sayfalarına yönlendirme
- `platform.finsms.io` → Kullanıcı sayfalarına yönlendirme
- Root path (`/`) subdomain'e göre otomatik yönlendirme
- Admin sayfalarına erişim kontrolü

### 3. Environment Variables

Vercel Dashboard → Settings → Environment Variables:

**Production için:**
```
NEXT_PUBLIC_API_URL=https://panel.finsms.io/api
# veya
NEXT_PUBLIC_API_URL=https://platform.finsms.io/api
```

**Not:** API URL'ini subdomain'e göre dinamik yapabilirsiniz:

```typescript
// hooks/useAuth.tsx içinde
const API_BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api`
  : '/api';
```

### 4. Deployment Ayarları

**Vercel Dashboard → Settings → General:**

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (otomatik)
- **Install Command:** `npm install`

### 5. Routing Mantığı

**Admin Subdomain (panel.finsms.io):**
- `/` → `/admin` (redirect)
- `/admin` → Admin Dashboard
- `/login` → Login (admin için)
- Diğer sayfalar → `/admin` (redirect)

**Platform Subdomain (platform.finsms.io):**
- `/` → `/dashboard` (redirect)
- `/dashboard` → Dashboard
- `/sms` → SMS Gönder
- `/contacts` → Rehberim
- `/admin` → `/dashboard` (redirect, admin erişimi engellenir)

## 🔧 Geliştirme Ortamı

### Localhost için

Localhost'ta subdomain yoksa, middleware normal çalışır:
- `http://localhost:3000` → Normal routing
- Tüm sayfalar erişilebilir

### Local Subdomain Test

**macOS/Linux için `/etc/hosts` dosyasına ekleyin:**
```
127.0.0.1 panel.localhost
127.0.0.1 platform.localhost
```

**Sonra:**
- `http://panel.localhost:3000` → Admin paneli
- `http://platform.localhost:3000` → Kullanıcı platformu

## 📝 Önemli Notlar

1. **SSL/HTTPS:** Vercel otomatik olarak SSL sertifikası sağlar
2. **DNS Propagation:** DNS değişiklikleri 24-48 saat sürebilir
3. **Middleware:** Her request'te çalışır, performans etkisi minimal
4. **API Routes:** API route'ları (`/api/*`) subdomain kontrolünden muaf

## 🐛 Sorun Giderme

### Subdomain çalışmıyor
1. DNS kayıtlarını kontrol edin
2. Vercel Dashboard → Domains → DNS kayıtlarını doğrulayın
3. DNS propagation süresini bekleyin (24-48 saat)

### Yönlendirme çalışmıyor
1. `middleware.ts` dosyasının root dizinde olduğundan emin olun
2. Build'i yeniden yapın
3. Vercel deployment loglarını kontrol edin

### Admin sayfasına erişilemiyor
1. Kullanıcının `role: 'admin'` olduğundan emin olun
2. `app/admin/page.tsx` içindeki role kontrolünü kontrol edin
3. Token'ın geçerli olduğundan emin olun

## 📚 Referanslar

- [Vercel Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [DNS Configuration](https://vercel.com/docs/concepts/projects/domains/add-a-domain)

