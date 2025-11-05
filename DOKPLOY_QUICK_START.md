# Dokploy Hızlı Başlangıç Rehberi

## ⚡ 5 Dakikada Deployment

### 1. VPS'e Bağlan

```bash
ssh root@YOUR_VPS_IP
```

### 2. Docker Kur

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl start docker
sudo systemctl enable docker
```

### 3. Dokploy Kur

```bash
docker run -d \
  --name dokploy \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v dokploy-data:/app/data \
  --restart unless-stopped \
  dokploy/dokploy:latest
```

### 4. Dokploy Web UI'ye Eriş

```
http://YOUR_VPS_IP:3000
```

- İlk kurulum: Admin kullanıcı adı ve şifre oluştur

### 5. DNS Ayarları (Hostinger)

**DNS Panel'de:**
```
Type: A
Name: panel
Value: YOUR_VPS_IP
TTL: 3600

Type: A
Name: platform
Value: YOUR_VPS_IP
TTL: 3600
```

### 6. Dokploy'da Proje Oluştur

**Dokploy Dashboard → Projects → New Project**

**Genel Ayarlar:**
- **Project Name:** `finsms`
- **Source:** `Git Repository`
- **Repository URL:** `https://github.com/kilicc/finsms2.git`
- **Branch:** `main`

**Build Ayarları:**
- **Build Command:** `npm install && npx prisma generate && npm run build`
- **Start Command:** `npm start`
- **Port:** `3000`
- **Dockerfile Path:** `./Dockerfile`

**Environment Variables:**
- Tüm `.env` değişkenlerini ekle (DATABASE_URL, SUPABASE_URL, vb.)

**Domains:**
- **Domain 1:** `panel.finsms.io` ✅ SSL
- **Domain 2:** `platform.finsms.io` ✅ SSL

### 7. Deploy!

**Dokploy Dashboard → Projects → finsms → Deploy**

✅ **Tamamlandı!**

## 🔄 Güncelleme

**Otomatik (Git Webhook):**
- GitHub'a push → Otomatik deploy

**Manuel:**
- Dokploy Dashboard → Projects → finsms → **Redeploy**

## 📊 Durum Kontrolü

**Dokploy Dashboard → Projects → finsms → Logs**

- Build logları
- Application logları
- Container durumu

## 🐛 Sorun Giderme

**Deployment başarısız:**
- Logs → Build Logs kontrol et
- Environment Variables kontrol et

**Subdomain çalışmıyor:**
- DNS propagation bekleyin (24-48 saat)
- DNS kontrol: `dig panel.finsms.io`

**SSL hatası:**
- Dokploy Dashboard → Domains → SSL → Renew

