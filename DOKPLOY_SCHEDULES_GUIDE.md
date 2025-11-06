# 📅 Dokploy Schedules - Cron Job Kurulum Rehberi

Dokploy'da **"Schedules"** sekmesi ile cron job'ları kolayca kurabilirsiniz!

## 🎯 Dokploy Schedules Nedir?

Dokploy'un **"Schedules"** özelliği, belirli zamanlarda otomatik olarak HTTP istekleri gönderen bir cron job sistemidir. Bu özellik sayesinde sunucuda manuel cron job kurmanıza gerek kalmaz.

## 🚀 Adım Adım Kurulum

### 1. Dokploy Dashboard'a Giriş

1. Dokploy Dashboard'a gidin: `http://YOUR_VPS_IP:3000`
2. Projenizi seçin: **Projects** → **finsms** → **production** → **v1**
3. **"Schedules"** sekmesine tıklayın

### 2. CRON_SECRET_KEY Oluşturma

Önce `CRON_SECRET_KEY` oluşturmanız gerekiyor:

**Dokploy Dashboard'da:**
1. Projenizi seçin
2. **"Environment"** sekmesine gidin
3. **"Add Environment Variable"** butonuna tıklayın
4. Şu değerleri ekleyin:
   - **Key**: `CRON_SECRET_KEY`
   - **Value**: Güvenli bir key oluşturun:
     ```bash
     openssl rand -hex 32
     ```
   - **Save** butonuna tıklayın

**Veya terminal'de:**
```bash
openssl rand -hex 32
```
Çıkan değeri kopyalayın ve Dokploy'da Environment Variable olarak ekleyin.

### 3. SMS Durum Kontrolü Cron Job Kurulumu

1. **"Schedules"** sekmesinde **"Add Schedule"** butonuna tıklayın
2. Şu bilgileri girin:

**Temel Bilgiler:**
- **Name**: `SMS Durum Kontrolü`
- **Description**: `Gönderilen SMS'lerin durumunu CepSMS API'den kontrol eder ve günceller`

**Schedule Ayarları:**
- **Schedule**: `*/5 * * * *` (Her 5 dakikada bir)
  - Cron formatı: `dakika saat gün ay hafta-günü`
  - `*/5 * * * *` = Her 5 dakikada bir
  - Örnek çalışma zamanları: 10:00, 10:05, 10:10, 10:15, ...

**Command (Bash):**
```bash
curl -X POST -H "x-secret-key: $CRON_SECRET_KEY" -H "Content-Type: application/json" http://localhost:3000/api/sms/check-status
```

**Not:** 
- `$CRON_SECRET_KEY` - Dokploy Environment Variable'ından otomatik alınır
- Container içinden çağrıldığı için `http://localhost:3000` kullanıyoruz
- Eğer dışarıdan çağrılıyorsa `https://panel.finsms.io` kullanabilirsiniz

3. **"Save"** veya **"Create"** butonuna tıklayın

### 4. Otomatik İade Cron Job Kurulumu

1. Yine **"Add Schedule"** butonuna tıklayın
2. Şu bilgileri girin:

**Temel Bilgiler:**
- **Name**: `Otomatik İade İşleme`
- **Description**: `48 saat önce oluşturulan beklemede iadeleri işler ve kredi iade eder`

**Schedule Ayarları:**
- **Schedule**: `0 * * * *` (Her saat başı)
  - Cron formatı: `dakika saat gün ay hafta-günü`
  - `0 * * * *` = Her saat başı (00:00, 01:00, 02:00, ...)

**Command (Bash):**
```bash
curl -X POST -H "x-secret-key: $CRON_SECRET_KEY" -H "Content-Type: application/json" http://localhost:3000/api/refunds/process-auto
```

**Not:** 
- `$CRON_SECRET_KEY` - Dokploy Environment Variable'ından otomatik alınır
- Container içinden çağrıldığı için `http://localhost:3000` kullanıyoruz
- Eğer dışarıdan çağrılıyorsa `https://panel.finsms.io` kullanabilirsiniz

3. **"Save"** veya **"Create"** butonuna tıklayın

## ✅ Kurulum Sonrası Kontrol

### 1. Schedule'ları Listele

**Dokploy Dashboard** → **Schedules** sekmesinde:
- İki schedule görmelisiniz:
  - ✅ SMS Durum Kontrolü (Her 5 dakikada bir)
  - ✅ Otomatik İade İşleme (Her saat başı)

### 2. Manuel Test

Schedule'ların çalışıp çalışmadığını test etmek için:

**Terminal'de:**
```bash
# SMS durum kontrolü test
curl -X POST https://panel.finsms.io/api/sms/check-status \
  -H "x-secret-key: YOUR_CRON_SECRET_KEY" \
  -H "Content-Type: application/json"

# Otomatik iade test
curl -X POST https://panel.finsms.io/api/refunds/process-auto \
  -H "x-secret-key: YOUR_CRON_SECRET_KEY" \
  -H "Content-Type: application/json"
```

**Başarılı yanıt:**
```json
{
  "success": true,
  "message": "SMS durum kontrolü tamamlandı",
  "data": {
    "checked": 0,
    "delivered": 0,
    "failed": 0,
    "errors": 0,
    "total": 0
  }
}
```

### 3. Schedule Loglarını Kontrol Et

**Dokploy Dashboard** → **Schedules** sekmesinde:
- Her schedule'ın yanında **"Logs"** veya **"History"** butonu olabilir
- Buradan schedule'ların çalışma geçmişini görebilirsiniz

## 📊 Cron Schedule Formatı

Dokploy'da cron schedule formatı standart cron formatını kullanır:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Hafta günü (0-7, 0 ve 7 = Pazar)
│ │ │ └───── Ay (1-12)
│ │ └─────── Gün (1-31)
│ └───────── Saat (0-23)
└─────────── Dakika (0-59)
```

### Örnek Schedule'lar:

- `*/5 * * * *` - Her 5 dakikada bir
- `0 * * * *` - Her saat başı
- `0 0 * * *` - Her gün gece yarısı
- `0 0 * * 0` - Her Pazar gece yarısı
- `0 9 * * 1-5` - Hafta içi her gün saat 09:00

## 🔍 Sorun Giderme

### Schedule Çalışmıyor

1. **Environment Variable Kontrolü:**
   - Dokploy Dashboard → **Environment** sekmesinde
   - `CRON_SECRET_KEY` tanımlı mı kontrol edin

2. **URL Kontrolü:**
   - Container içindeyse `http://localhost:3000` kullanın
   - Dışarıdan erişiliyorsa `https://panel.finsms.io` kullanın

3. **Headers Kontrolü:**
   - `x-secret-key` header'ı doğru mu kontrol edin
   - `Content-Type: application/json` header'ı var mı kontrol edin

4. **Schedule Formatı:**
   - Cron formatı doğru mu kontrol edin
   - Online cron validator kullanabilirsiniz: https://crontab.guru/

### 401 Unauthorized Hatası

- `CRON_SECRET_KEY` Environment Variable'da tanımlı mı kontrol edin
- Header'da `x-secret-key` doğru gönderiliyor mu kontrol edin
- API route'unda `CRON_SECRET_KEY` kontrolü yapılıyor mu kontrol edin

### Endpoint Bulunamadı Hatası

- URL doğru mu kontrol edin
- API route'ları deploy edildi mi kontrol edin
- Health check endpoint'ini test edin: `/api/health`

### Container İçinde URL Sorunu

Eğer schedule container içinden çağrılıyorsa:
- `https://panel.finsms.io` yerine `http://localhost:3000` kullanın
- Veya container network'ünde service name kullanın

## 📝 Notlar

- Dokploy Schedules, sunucuda manuel cron job kurmanıza gerek kalmaz
- Schedule'lar Dokploy tarafından yönetilir ve loglanır
- Environment Variable'lar Dokploy Dashboard'dan yönetilir
- Schedule'ları istediğiniz zaman aktif/pasif yapabilirsiniz
- Schedule loglarını Dokploy Dashboard'dan görüntüleyebilirsiniz

## 🎉 Sonuç

Dokploy Schedules ile:
- ✅ Kolay kurulum
- ✅ Merkezi yönetim
- ✅ Log görüntüleme
- ✅ Aktif/pasif kontrolü
- ✅ Sunucuda manuel cron job kurmanıza gerek yok

**Artık cron job'larınız Dokploy üzerinden yönetiliyor!**

