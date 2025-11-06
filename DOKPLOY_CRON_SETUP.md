# 🔄 Dokploy için Cron Job Kurulum Rehberi

Dokploy'da cron job özelliği olmadığı için, sunucuda direkt cron job kurulumu yapacağız.

## 🚀 Hızlı Kurulum

### Yöntem 1: Otomatik Kurulum Script'i (Önerilen)

Sunucuya SSH ile bağlanın ve şu komutu çalıştırın:

```bash
# Proje dizinine git
cd /var/www/finsms

# Cron job kurulum script'ini çalıştır
bash scripts/setup-dokploy-cron.sh
```

Bu script:
- ✅ `CRON_SECRET_KEY` oluşturur ve `.env` dosyasına ekler
- ✅ SMS durum kontrolü cron job'unu kurar (her 5 dakikada bir)
- ✅ Otomatik iade cron job'unu kurar (her saat başı)
- ✅ Log klasörü oluşturur

### Yöntem 2: Manuel Kurulum

Sunucuya SSH ile bağlanın:

```bash
# Proje dizinine git
cd /var/www/finsms

# .env dosyasına CRON_SECRET_KEY ekle (yoksa)
if ! grep -q "CRON_SECRET_KEY" .env; then
    echo "CRON_SECRET_KEY=$(openssl rand -hex 32)" >> .env
fi

# CRON_SECRET_KEY'i oku
CRON_SECRET_KEY=$(grep "CRON_SECRET_KEY" .env | cut -d '=' -f2 | tr -d ' ' | tr -d '"')

# Log klasörü oluştur
sudo mkdir -p /var/log/finsms
sudo chown -R $USER:$USER /var/log/finsms

# Cron job'ları ekle
crontab -e
```

Aşağıdaki satırları ekleyin:

```cron
# SMS Durum Kontrolü (Her 5 dakikada bir)
*/5 * * * * curl -X POST https://panel.finsms.io/api/sms/check-status -H "x-secret-key: YOUR_CRON_SECRET_KEY" -H "Content-Type: application/json" -s -o /dev/null

# Otomatik İade İşleme (Her saat başı)
0 * * * * curl -X POST https://panel.finsms.io/api/refunds/process-auto -H "x-secret-key: YOUR_CRON_SECRET_KEY" -H "Content-Type: application/json" -s -o /dev/null
```

**Not:** `YOUR_CRON_SECRET_KEY` yerine `.env` dosyasındaki `CRON_SECRET_KEY` değerini kullanın.

### Yöntem 3: Harici Cron Servisi (Alternatif)

Dokploy'da cron job özelliği yoksa, harici bir cron servisi kullanabilirsiniz:

#### cron-job.org (Ücretsiz)

1. https://cron-job.org adresine gidin
2. Ücretsiz hesap oluşturun
3. Yeni cron job ekleyin:

**SMS Durum Kontrolü:**
- **Title**: SMS Durum Kontrolü
- **Address**: `https://panel.finsms.io/api/sms/check-status`
- **Schedule**: Her 5 dakikada bir
- **Request Method**: POST
- **Request Headers**:
  ```
  x-secret-key: YOUR_CRON_SECRET_KEY
  Content-Type: application/json
  ```

**Otomatik İade:**
- **Title**: Otomatik İade İşleme
- **Address**: `https://panel.finsms.io/api/refunds/process-auto`
- **Schedule**: Her saat başı
- **Request Method**: POST
- **Request Headers**:
  ```
  x-secret-key: YOUR_CRON_SECRET_KEY
  Content-Type: application/json
  ```

## 🔑 CRON_SECRET_KEY Oluşturma

`.env` dosyasına `CRON_SECRET_KEY` ekleyin:

```bash
# .env dosyasına ekleyin
CRON_SECRET_KEY=your-secret-key-here-minimum-32-characters
```

Güvenli bir secret key oluşturmak için:

```bash
openssl rand -hex 32
```

**Dokploy Dashboard'da:**
1. Projenizi seçin
2. **Settings → Environment Variables** bölümüne gidin
3. **Yeni Environment Variable** ekleyin:
   - **Key**: `CRON_SECRET_KEY`
   - **Value**: `your-secret-key-here` (openssl rand -hex 32 ile oluşturun)

## ✅ Kurulum Kontrolü

### 1. Cron Job'ları Listele

```bash
crontab -l
```

Çıktı şöyle olmalı:

```
*/5 * * * * curl -X POST https://panel.finsms.io/api/sms/check-status -H "x-secret-key: ..." ...
0 * * * * curl -X POST https://panel.finsms.io/api/refunds/process-auto -H "x-secret-key: ..." ...
```

### 2. Manuel Test

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

Başarılı yanıt:

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

### 3. Log Dosyasını Kontrol Et

```bash
# Log dosyasını izle
tail -f /var/log/finsms/cron.log

# Son 50 satırı göster
tail -n 50 /var/log/finsms/cron.log
```

## 📊 Cron Job Çalışma Zamanları

### SMS Durum Kontrolü
- **Sıklık**: Her 5 dakikada bir
- **Örnek**: 10:00, 10:05, 10:10, 10:15, ...
- **Endpoint**: `/api/sms/check-status`
- **Ne yapar**: 5 dakikadan eski "gönderildi" durumundaki mesajları kontrol eder

### Otomatik İade İşleme
- **Sıklık**: Her saat başı
- **Örnek**: 10:00, 11:00, 12:00, 13:00, ...
- **Endpoint**: `/api/refunds/process-auto`
- **Ne yapar**: 48 saat önce oluşturulan beklemede iadeleri işler

## 🔍 Sorun Giderme

### Cron Job Çalışmıyor

1. **Cron servisi çalışıyor mu kontrol edin:**
   ```bash
   sudo systemctl status cron
   # veya
   sudo systemctl status crond
   ```

2. **Cron job'ları listele:**
   ```bash
   crontab -l
   ```

3. **Log dosyasını kontrol edin:**
   ```bash
   tail -f /var/log/finsms/cron.log
   ```

4. **Manuel test yapın:**
   ```bash
   curl -X POST https://panel.finsms.io/api/sms/check-status \
     -H "x-secret-key: YOUR_CRON_SECRET_KEY" \
     -H "Content-Type: application/json"
   ```

### 401 Unauthorized Hatası

- `.env` dosyasında `CRON_SECRET_KEY` tanımlı mı kontrol edin
- Header'da `x-secret-key` doğru gönderiliyor mu kontrol edin
- Dokploy Dashboard'da Environment Variables'da `CRON_SECRET_KEY` tanımlı mı kontrol edin

### Endpoint Bulunamadı Hatası

- Domain doğru mu kontrol edin (`https://panel.finsms.io`)
- API route'ları deploy edildi mi kontrol edin
- Health check endpoint'ini test edin: `/api/health`

### curl Komutu Bulunamadı

Sunucuda `curl` yüklü değilse:

```bash
# Ubuntu/Debian
sudo apt-get install curl

# CentOS/RHEL
sudo yum install curl
```

## 📝 Notlar

- Cron job'lar opsiyonel olarak `CRON_SECRET_KEY` ile korunabilir
- Eğer `CRON_SECRET_KEY` tanımlı değilse, cron job'lar çalışmaya devam eder (güvenlik riski)
- Production'da mutlaka `CRON_SECRET_KEY` kullanın
- Log dosyaları `/var/log/finsms/cron.log` konumunda saklanır
- Cron job'lar Docker container içinde çalışmıyorsa, host sunucuda kurulmalıdır

## 🐳 Docker Container İçinde Cron Job

Eğer uygulama Docker container içinde çalışıyorsa, cron job'ları container dışında (host sunucuda) kurmanız gerekir. Veya container içinde cron servisi çalıştırabilirsiniz:

```dockerfile
# Dockerfile'a ekleyin
RUN apk add --no-cache dcron

# Container başlatıldığında cron'u başlat
CMD ["sh", "-c", "crond -f -d 8 & node server.js"]
```

Ancak en iyi çözüm, cron job'ları host sunucuda kurmak ve container'a HTTP isteği göndermektir.

