# 📝 Dokploy Schedule Alanlarını Doldurma Rehberi

Dokploy'daki "Create Schedule" modalını nasıl dolduracağınızı adım adım gösterir.

## 🎯 1. SMS Durum Kontrolü Schedule'ı

### Adım Adım Doldurma:

1. **Task Name:**
   ```
   SMS Durum Kontrolü
   ```

2. **Schedule:**
   - Dropdown'da **"Custom"** seçili bırakın
   - Altındaki input alanına şunu yazın:
   ```
   */5 * * * *
   ```
   *(Her 5 dakikada bir çalışır)*

3. **Shell Type:**
   - Dropdown'dan **"Bash"** seçin

4. **Command:**
   Aşağıdaki komutu tam olarak kopyalayıp yapıştırın:
   ```bash
   curl -X POST -H "x-secret-key: $CRON_SECRET_KEY" -H "Content-Type: application/json" http://localhost:3000/api/sms/check-status
   ```
   
   **Önemli Notlar:**
   - `$CRON_SECRET_KEY` - Dokploy Environment Variable'ından otomatik alınır
   - Container içinden çağrıldığı için `http://localhost:3000` kullanıyoruz
   - Eğer dışarıdan çağrılıyorsa `https://panel.finsms.io` kullanabilirsiniz

5. **Enabled:**
   - Toggle'ı **Açık (ON)** konumuna getirin

6. **"Create Schedule"** butonuna tıklayın

---

## 🎯 2. Otomatik İade İşleme Schedule'ı

### Adım Adım Doldurma:

1. **Task Name:**
   ```
   Otomatik İade İşleme
   ```

2. **Schedule:**
   - Dropdown'da **"Custom"** seçili bırakın
   - Altındaki input alanına şunu yazın:
   ```
   0 * * * *
   ```
   *(Her saat başı çalışır - 10:00, 11:00, 12:00, ...)*

3. **Shell Type:**
   - Dropdown'dan **"Bash"** seçin

4. **Command:**
   Aşağıdaki komutu tam olarak kopyalayıp yapıştırın:
   ```bash
   curl -X POST -H "x-secret-key: $CRON_SECRET_KEY" -H "Content-Type: application/json" http://localhost:3000/api/refunds/process-auto
   ```
   
   **Önemli Notlar:**
   - `$CRON_SECRET_KEY` - Dokploy Environment Variable'ından otomatik alınır
   - Container içinden çağrıldığı için `http://localhost:3000` kullanıyoruz
   - Eğer dışarıdan çağrılıyorsa `https://panel.finsms.io` kullanabilirsiniz

5. **Enabled:**
   - Toggle'ı **Açık (ON)** konumuna getirin

6. **"Create Schedule"** butonuna tıklayın

---

## ⚙️ Önce Yapılması Gerekenler

### CRON_SECRET_KEY Environment Variable Ekleme

Schedule'ları oluşturmadan önce, `CRON_SECRET_KEY` Environment Variable'ını eklemeniz gerekiyor:

1. **Dokploy Dashboard** → Projeniz → **"Environment"** sekmesi
2. **"Add Environment Variable"** butonuna tıklayın
3. Şu bilgileri girin:
   - **Key**: `CRON_SECRET_KEY`
   - **Value**: Güvenli bir key oluşturun:
     ```bash
     openssl rand -hex 32
     ```
   - **Save** butonuna tıklayın

**Not:** Terminal'de `openssl rand -hex 32` komutunu çalıştırarak güvenli bir key oluşturabilirsiniz.

---

## 📊 Cron Schedule Formatı Açıklaması

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Hafta günü (0-7, 0 ve 7 = Pazar)
│ │ │ └───── Ay (1-12)
│ │ └─────── Gün (1-31)
│ └───────── Saat (0-23)
└─────────── Dakika (0-59)
```

### Örnekler:

- `*/5 * * * *` - Her 5 dakikada bir
- `0 * * * *` - Her saat başı
- `0 0 * * *` - Her gün gece yarısı
- `0 9 * * 1-5` - Hafta içi her gün saat 09:00

---

## 🔍 Sorun Giderme

### Command Çalışmıyor

1. **Environment Variable Kontrolü:**
   - Dokploy Dashboard → **Environment** sekmesinde
   - `CRON_SECRET_KEY` tanımlı mı kontrol edin
   - `$CRON_SECRET_KEY` şeklinde kullanıldığından emin olun

2. **URL Kontrolü:**
   - Container içindeyse `http://localhost:3000` kullanın
   - Dışarıdan erişiliyorsa `https://panel.finsms.io` kullanın
   - Port numarasını kontrol edin (varsayılan: 3000)

3. **curl Komutu Kontrolü:**
   - Container içinde `curl` yüklü mü kontrol edin
   - Alternatif olarak `wget` kullanabilirsiniz:
     ```bash
     wget --post-data="" --header="x-secret-key: $CRON_SECRET_KEY" --header="Content-Type: application/json" -O- http://localhost:3000/api/sms/check-status
     ```

### 401 Unauthorized Hatası

- `CRON_SECRET_KEY` Environment Variable'da tanımlı mı kontrol edin
- Command'da `$CRON_SECRET_KEY` doğru yazılmış mı kontrol edin
- Environment Variable'ın container'a deploy edildiğinden emin olun

### Connection Refused Hatası

- Container'ın çalıştığından emin olun
- Port 3000'in açık olduğundan emin olun
- `http://localhost:3000` yerine container network'ünde service name kullanmayı deneyin

---

## ✅ Kurulum Sonrası Kontrol

### 1. Schedule'ları Listele

**Dokploy Dashboard** → **Schedules** sekmesinde:
- İki schedule görmelisiniz:
  - ✅ SMS Durum Kontrolü (Her 5 dakikada bir)
  - ✅ Otomatik İade İşleme (Her saat başı)

### 2. Manuel Test

Schedule'ların çalışıp çalışmadığını test etmek için, container içinde manuel olarak komutu çalıştırabilirsiniz:

```bash
# Container'a bağlan
docker exec -it CONTAINER_NAME bash

# Manuel test
curl -X POST -H "x-secret-key: $CRON_SECRET_KEY" -H "Content-Type: application/json" http://localhost:3000/api/sms/check-status
```

### 3. Schedule Loglarını Kontrol Et

**Dokploy Dashboard** → **Schedules** sekmesinde:
- Her schedule'ın yanında **"Logs"** veya **"History"** butonu olabilir
- Buradan schedule'ların çalışma geçmişini görebilirsiniz

---

## 📝 Özet

**SMS Durum Kontrolü:**
- Task Name: `SMS Durum Kontrolü`
- Schedule: `*/5 * * * *`
- Shell Type: `Bash`
- Command: `curl -X POST -H "x-secret-key: $CRON_SECRET_KEY" -H "Content-Type: application/json" http://localhost:3000/api/sms/check-status`
- Enabled: `ON`

**Otomatik İade İşleme:**
- Task Name: `Otomatik İade İşleme`
- Schedule: `0 * * * *`
- Shell Type: `Bash`
- Command: `curl -X POST -H "x-secret-key: $CRON_SECRET_KEY" -H "Content-Type: application/json" http://localhost:3000/api/refunds/process-auto`
- Enabled: `ON`

**Önemli:** Her iki schedule için de `$CRON_SECRET_KEY` Environment Variable'ı eklenmiş olmalı!

