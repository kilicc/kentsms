# Dokploy Deployment Rehberi

## 📋 Genel Bakış

Bu rehber, Next.js projesini VPS üzerinde **Dokploy** kullanarak deploy etmek için adım adım talimatlar içerir:
- **panel.finsms.io** - Admin paneli için
- **platform.finsms.io** - Kullanıcı platformu için

## 🎯 Dokploy Nedir?

**Dokploy** bir Docker tabanlı deployment platformudur:
- ✅ Docker container yönetimi
- ✅ Subdomain yönetimi (otomatik)
- ✅ SSL sertifikası (otomatik Let's Encrypt)
- ✅ Reverse proxy (otomatik Nginx/Traefik)
- ✅ Environment variables yönetimi
- ✅ Git repository entegrasyonu
- ✅ Log yönetimi
- ✅ Monitoring

## 🚀 VPS Gereksinimleri

### Minimum Sistem Gereksinimleri:
- **CPU:** 2 core
- **RAM:** 4GB
- **Disk:** 20GB SSD
- **OS:** Ubuntu 20.04/22.04 LTS (önerilen)

### Gerekli Yazılımlar:
- Docker
- Docker Compose
- Git (opsiyonel, Dokploy içinde var)

## 📦 Adım 1: Dokploy Kurulumu

### 1.1 VPS'e Bağlanma

```bash
ssh root@your-vps-ip
# veya
ssh username@your-vps-ip
```

### 1.2 Docker Kurulumu

```bash
# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose kurulumu
sudo apt install docker-compose -y

# Docker servisini başlat
sudo systemctl start docker
sudo systemctl enable docker

# Docker versiyon kontrolü
docker --version
docker-compose --version
```

### 1.3 Dokploy Kurulumu

```bash
# Dokploy'u Docker ile çalıştır
docker run -d \
  --name dokploy \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v dokploy-data:/app/data \
  --restart unless-stopped \
  dokploy/dokploy:latest
```

**Veya Docker Compose ile:**

```bash
# Dokploy docker-compose.yml oluştur
mkdir -p ~/dokploy
cd ~/dokploy
nano docker-compose.yml
```

**docker-compose.yml içeriği:**
```yaml
version: '3.8'

services:
  dokploy:
    image: dokploy/dokploy:latest
    container_name: dokploy
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - dokploy-data:/app/data
    restart: unless-stopped

volumes:
  dokploy-data:
```

```bash
# Dokploy'u başlat
docker-compose up -d
```

### 1.4 Dokploy Web UI'ye Erişim

```bash
# Dokploy web arayüzüne eriş
http://YOUR_VPS_IP:3000
```

**İlk kurulum:**
1. Admin kullanıcı adı ve şifre oluşturun
2. Dokploy dashboard'a giriş yapın

## 🌐 Adım 2: DNS Ayarları

### 2.1 DNS Kayıtları (Hostinger)

**Hostinger DNS Panel'de şu kayıtları ekleyin:**

```
Type: A
Name: panel
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600

Type: A
Name: platform
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600
```

**Not:** `YOUR_VPS_IP_ADDRESS` yerine VPS'inizin IP adresini yazın.

### 2.2 DNS Propagation Kontrolü

```bash
# DNS propagation kontrolü
dig panel.finsms.io
dig platform.finsms.io

# veya
nslookup panel.finsms.io
nslookup platform.finsms.io
```

## 📁 Adım 3: Dokploy'da Proje Oluşturma

### 3.1 Dokploy Dashboard'a Giriş

1. `http://YOUR_VPS_IP:3000` adresine gidin
2. Admin kullanıcı adı ve şifre ile giriş yapın

### 3.2 Yeni Proje Oluşturma

**Dokploy Dashboard → Projects → New Project**

1. **Project Name:** `finsms`
2. **Source:** `Git Repository`
3. **Repository URL:** `https://github.com/kilicc/finsms2.git`
4. **Branch:** `main`
5. **Build Command:** `npm install && npx prisma generate && npm run build`
6. **Start Command:** `npm start`
7. **Port:** `3000`
8. **Health Check Path:** `/api/health`

### 3.3 Environment Variables Ayarlama

**Dokploy Dashboard → Projects → finsms → Environment Variables**

Aşağıdaki tüm değişkenleri ekleyin:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# SMS Provider
SMS_PROVIDER=cepsms
CEPSMS_USERNAME=your-username
CEPSMS_PASSWORD=your-password
CEPSMS_FROM=CepSMS

# Next.js
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
PORT=3000
```

### 3.4 Subdomain Yapılandırması

**Dokploy Dashboard → Projects → finsms → Domains**

**Domain 1:**
- **Domain:** `panel.finsms.io`
- **SSL:** ✅ Enable (Let's Encrypt)
- **Redirect HTTP to HTTPS:** ✅ Enable

**Domain 2:**
- **Domain:** `platform.finsms.io`
- **SSL:** ✅ Enable (Let's Encrypt)
- **Redirect HTTP to HTTPS:** ✅ Enable

### 3.5 Dockerfile Yapılandırması

**Dokploy Dashboard → Projects → finsms → Settings**

**Build Settings:**
- **Dockerfile Path:** `./Dockerfile`
- **Docker Context:** `.`
- **Build Args:** (Boş bırakabilirsiniz)

## 🚀 Adım 4: Deployment

### 4.1 İlk Deployment

**Dokploy Dashboard → Projects → finsms → Deploy**

1. **Deploy** butonuna tıklayın
2. Dokploy otomatik olarak:
   - Git repository'den kod çeker
   - Docker image oluşturur
   - Container'ı başlatır
   - SSL sertifikası oluşturur
   - Subdomain'leri yapılandırır

### 4.2 Deployment Durumu

**Dokploy Dashboard → Projects → finsms → Logs**

Deployment loglarını kontrol edin:
- Build logları
- Container logları
- Deployment durumu

### 4.3 Test Etme

```bash
# Health check
curl https://panel.finsms.io/api/health
curl https://platform.finsms.io/api/health

# Subdomain test
curl https://panel.finsms.io
curl https://platform.finsms.io
```

## 🔄 Adım 5: Güncelleme ve Bakım

### 5.1 Otomatik Güncelleme (Git Hook)

**Dokploy Dashboard → Projects → finsms → Settings → Webhooks**

1. **Enable Webhook** ✅
2. **Webhook URL:** Dokploy'un otomatik oluşturduğu URL'i kopyalayın
3. **GitHub Repository → Settings → Webhooks → Add webhook**
4. Webhook URL'ini ekleyin
5. **Content type:** `application/json`
6. **Events:** `Push events` ✅

Artık her `git push` sonrası otomatik deploy başlar!

### 5.2 Manuel Güncelleme

**Dokploy Dashboard → Projects → finsms → Deploy**

1. **Redeploy** butonuna tıklayın
2. Veya **Pull Latest** butonuna tıklayıp sonra **Deploy**

### 5.3 Log Kontrolü

**Dokploy Dashboard → Projects → finsms → Logs**

- **Build Logs:** Build sürecini gösterir
- **Application Logs:** Uygulama loglarını gösterir
- **Container Logs:** Docker container loglarını gösterir

## 📊 Adım 6: Monitoring ve Performance

### 6.1 Dokploy Monitoring

**Dokploy Dashboard → Projects → finsms → Monitoring**

- CPU kullanımı
- RAM kullanımı
- Network trafiği
- Container durumu

### 6.2 Health Checks

**Dokploy Dashboard → Projects → finsms → Settings → Health Checks**

- **Health Check Path:** `/api/health`
- **Interval:** `30` seconds
- **Timeout:** `5` seconds
- **Retries:** `3`

## 🔒 Adım 7: Güvenlik Ayarları

### 7.1 Firewall Yapılandırması

```bash
# UFW firewall kurulumu
sudo apt install ufw -y

# Gerekli portları aç
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (Dokploy otomatik yönetir)
sudo ufw allow 443/tcp  # HTTPS (Dokploy otomatik yönetir)
sudo ufw allow 3000/tcp # Dokploy Web UI (opsiyonel, sadece admin erişimi için)

# Firewall'u aktif et
sudo ufw enable
sudo ufw status
```

### 7.2 Dokploy Admin Güvenliği

**Dokploy Dashboard → Settings → Security**

- **Change Admin Password:** Güçlü bir şifre kullanın
- **Enable 2FA:** ✅ (önerilen)
- **IP Whitelist:** (Opsiyonel) Sadece belirli IP'lerden erişim

### 7.3 Environment Variables Güvenliği

- **Sensitive Data:** Environment variables'ları Dokploy'da güvenli şekilde saklayın
- **Never Commit:** `.env` dosyasını Git'e commit etmeyin

## 🐛 Sorun Giderme

### Deployment Başarısız

**Dokploy Dashboard → Projects → finsms → Logs**

1. **Build Logs** kontrol edin
2. **Application Logs** kontrol edin
3. Hata mesajlarını okuyun

**Yaygın Hatalar:**

**Prisma Client Hatası:**
```
Error: Prisma Client has not been generated yet
```
**Çözüm:** Build command'da `npx prisma generate` ekleyin

**Database Bağlantı Hatası:**
```
Error: Can't reach database server
```
**Çözüm:** `DATABASE_URL` environment variable'ını kontrol edin

**Port Hatası:**
```
Error: Port 3000 is already in use
```
**Çözüm:** Port'u değiştirin veya mevcut container'ı durdurun

### Subdomain Çalışmıyor

1. **DNS Propagation:** 24-48 saat bekleyin
2. **DNS Kontrolü:**
   ```bash
   dig panel.finsms.io
   dig platform.finsms.io
   ```
3. **Dokploy Domain Settings:** Domain'lerin doğru yapılandırıldığını kontrol edin

### SSL Sertifikası Hatası

**Dokploy Dashboard → Projects → finsms → Domains → SSL**

1. **Renew SSL** butonuna tıklayın
2. **Let's Encrypt** otomatik yenileme yapıyor
3. Manuel yenileme gerekirse:
   ```bash
   # Dokploy container içinde
   docker exec -it dokploy certbot renew
   ```

### Container Çöküyor

**Dokploy Dashboard → Projects → finsms → Logs → Container Logs**

1. **Container Logs** kontrol edin
2. **Restart Policy:** `unless-stopped` olmalı
3. **Memory Limit:** Container'a yeterli RAM verildiğinden emin olun

## 📚 Dokploy Özellikleri

### ✅ Otomatik Özellikler:
- **Git Integration:** GitHub/GitLab/Bitbucket entegrasyonu
- **Auto Deploy:** Git push sonrası otomatik deploy
- **SSL Management:** Let's Encrypt otomatik SSL
- **Subdomain Routing:** Otomatik subdomain yönetimi
- **Container Management:** Docker container yönetimi
- **Log Management:** Merkezi log yönetimi
- **Health Checks:** Otomatik health check
- **Monitoring:** CPU, RAM, Network monitoring

### 🎯 Dokploy Avantajları:
1. **Kolay Kurulum:** 5 dakikada kurulur
2. **Otomatik SSL:** Let's Encrypt entegrasyonu
3. **Subdomain Yönetimi:** Otomatik routing
4. **Git Integration:** GitHub webhook desteği
5. **Container Management:** Docker tabanlı
6. **Monitoring:** Built-in monitoring
7. **Log Management:** Merkezi log yönetimi

## 🔗 Hızlı Komut Referansı

```bash
# Dokploy container durumu
docker ps | grep dokploy

# Dokploy logları
docker logs dokploy -f

# Dokploy restart
docker restart dokploy

# Container logları (Dokploy üzerinden)
# Dashboard → Projects → finsms → Logs
```

## 📖 Ek Kaynaklar

- [Dokploy Documentation](https://docs.dokploy.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Let's Encrypt](https://letsencrypt.org/)

## 🎉 Sonuç

Dokploy ile deployment:
- ✅ Daha kolay
- ✅ Daha otomatik
- ✅ Daha güvenli
- ✅ Daha yönetilebilir

**Artık projeniz Dokploy üzerinde çalışıyor!**
- `https://panel.finsms.io` → Admin paneli
- `https://platform.finsms.io` → Kullanıcı platformu

