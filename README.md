# KENTSMS - Advanced SMS Verification System - Next.js 16

KENTSMS - Gelişmiş SMS Doğrulama Sistemi - Next.js 16, React 19, TypeScript, Prisma, Supabase

## 🚀 Özellikler

- **JWT Authentication** - Güvenli kimlik doğrulama sistemi
- **2FA (Two-Factor Authentication)** - QR kod ile iki faktörlü kimlik doğrulama
- **Kripto Ödeme** - BTC, ETH, USDT, USDC, TRX ile ödeme desteği
- **CepSMS Entegrasyonu** - Gerçek SMS gönderimi
- **Toplu SMS Gönderimi** - Çoklu kişiye SMS gönderme
- **Kişi ve Grup Yönetimi** - Rehber ve grup yönetimi
- **SMS Şablonları** - Hızlı mesaj şablonları
- **İade Yönetimi** - Başarısız SMS iade sistemi
- **Admin Paneli** - Sistem yönetimi

## 📋 Gereksinimler

- Node.js 18+ 
- npm 9+
- Supabase hesabı
- CepSMS hesabı

## 🛠️ Kurulum

### 1. Projeyi klonlayın

```bash
git clone https://github.com/kilicc/kentsms.git
cd kentsms
```

### 2. Bağımlılıkları yükleyin

```bash
npm install
```

### 3. Ortam değişkenlerini ayarlayın

`.env.example` dosyasını `.env` olarak kopyalayın ve değerleri doldurun:

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRE=7d

# CepSMS Configuration
CEPSMS_USERNAME=Testfn
CEPSMS_PASSWORD=Qaswed
CEPSMS_FROM=CepSMS

# Crypto Payment Configuration
COINMARKETCAP_API_KEY=17aa5b111c584455912e0242e7dee2ce
COLD_WALLET_DEFAULT=TDRrweahDMPgpCYZLMyEwxqNUkM12ptuw5

# Next.js Configuration
NEXT_PUBLIC_API_URL=/api
```

### 4. Prisma şemasını Supabase'den çekin

```bash
npx prisma db pull
```

### 5. Prisma Client'ı oluşturun

```bash
npx prisma generate
```

### 6. Development server'ı başlatın

```bash
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacaktır.

## 📁 Proje Yapısı

```
kentsms/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── contacts/      # Contacts management
│   │   ├── bulk-sms/      # Bulk SMS endpoints
│   │   ├── payment/        # Payment endpoints
│   │   ├── refunds/       # Refund endpoints
│   │   └── admin/         # Admin endpoints
│   ├── dashboard/          # Dashboard page
│   ├── login/             # Login page
│   ├── register/          # Register page
│   ├── sms/               # SMS interface
│   ├── advanced-sms/      # Advanced SMS
│   ├── contacts/          # Contacts page
│   ├── payment/           # Payment page
│   ├── profile/           # Profile page
│   ├── admin/             # Admin panel
│   ├── reports/           # SMS reports
│   └── refunds/           # Refunds page
├── components/             # React components
│   ├── Navbar.tsx         # Sidebar navigation
│   ├── ProtectedRoute.tsx # Route protection
│   └── ThemeProvider.tsx  # MUI theme provider
├── hooks/                 # Custom React hooks
│   └── useAuth.tsx        # Authentication hook
├── lib/                   # Utility libraries
│   ├── prisma.ts          # Prisma client
│   ├── supabase.ts        # Supabase client
│   ├── theme.ts           # MUI theme
│   ├── middleware/        # Middleware functions
│   └── utils/             # Utility functions
│       ├── jwt.ts         # JWT utilities
│       ├── password.ts    # Password hashing
│       ├── 2fa.ts         # 2FA utilities
│       ├── cepSMSProvider.ts # CepSMS integration
│       └── cryptoPayment.ts  # Crypto payment
├── prisma/                # Prisma schema
│   └── schema.prisma      # Database schema
└── public/                # Static files
    └── logo3.png          # Logo
```

## 🗄️ Veritabanı

Supabase PostgreSQL kullanılmaktadır. Prisma ORM ile yönetilir.

### Şema çekme

```bash
npx prisma db pull
```

### Şema oluşturma

```bash
npx prisma db push
```

### Prisma Studio

```bash
npx prisma studio
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Giriş
- `GET /api/auth/profile` - Profil bilgisi
- `PUT /api/auth/profile` - Profil güncelleme
- `PUT /api/auth/change-password` - Şifre değiştirme
- `POST /api/auth/enable-2fa` - 2FA etkinleştir
- `POST /api/auth/verify-2fa` - 2FA doğrula
- `POST /api/auth/disable-2fa` - 2FA devre dışı bırak

### Contacts
- `GET /api/contacts` - Kişi listesi
- `POST /api/contacts` - Kişi ekle
- `PUT /api/contacts/:id` - Kişi güncelle
- `DELETE /api/contacts/:id` - Kişi sil
- `GET /api/contacts/search` - Kişi ara
- `POST /api/contacts/import` - Toplu kişi import
- `GET /api/contacts/stats` - İstatistikler

### SMS
- `POST /api/sms/send` - Tekli SMS gönder
- `POST /api/bulk-sms/send-bulk` - Toplu SMS gönder
- `GET /api/bulk-sms/history` - SMS geçmişi
- `GET /api/bulk-sms/status/:messageId` - SMS durumu

### Payment
- `GET /api/payment/packages` - Kredi paketleri
- `GET /api/payment/crypto-currencies` - Desteklenen kripto paralar
- `GET /api/payment/crypto-price/:currency` - Kripto fiyatı
- `POST /api/payment/crypto-create` - Ödeme oluştur
- `GET /api/payment/crypto-status/:paymentId` - Ödeme durumu

## 🚀 Production Build

```bash
npm run build
npm start
```

## 🌐 Vercel Deployment

Proje Vercel'e deploy edilmeye hazırdır. Detaylı bilgi için `VERCEL_DEPLOY.md` dosyasına bakın.

### Hızlı Deploy

1. [Vercel Dashboard](https://vercel.com/dashboard) açın
2. GitHub repository'yi import edin: `https://github.com/kilicc/kentsms.git`
3. Environment variables'ları ekleyin (`.env.example` dosyasına bakın)
4. Deploy butonuna tıklayın

**ÖNEMLİ:** `DATABASE_URL` içindeki özel karakterler URL encode edilmelidir!

## 📝 Lisans

Bu proje özel bir lisans altındadır.

## 👥 Katkıda Bulunanlar

- Development Team

## 📞 İletişim

Sorularınız için lütfen iletişime geçin.
