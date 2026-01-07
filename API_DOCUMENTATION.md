# KENTSMS API Dokümantasyonu v1.0

## Genel Bilgiler

KENTSMS API, müşterilerinize SMS gönderme ve raporlama hizmeti sunan RESTful bir API'dir. CepSMS API formatına benzer yapıda tasarlanmıştır.

**Base URL:** `https://platform.kentsms.com/api/v1/sms`

**Authentication:** API Key ve API Secret kullanılır (User ve Pass parametreleri)

---

## Authentication

Tüm API isteklerinde `User` (API Key) ve `Pass` (API Secret) parametreleri gönderilmelidir.

**API Key ve Secret Nasıl Alınır:**
1. KENTSMS platformuna giriş yapın
2. Profil sayfasından API Key oluşturun
3. API Key ve Secret'ı güvenli bir yerde saklayın

---

## Endpoint'ler

### 1. Send SMS Simple (Basit SMS Gönderimi)

**Endpoint:** `POST /api/v1/sms/send`

**Request:**
```json
{
  "User": "API_KEY",
  "Pass": "API_SECRET",
  "Message": "selam test",
  "Numbers": ["905321234567"]
}
```

**Response (Başarılı):**
```json
{
  "MessageId": "uuid",
  "Status": "OK"
}
```

**Response (Hata):**
```json
{
  "MessageId": 0,
  "Status": "Error",
  "Error": "Hata mesajı"
}
```

**Örnek cURL:**
```bash
curl -X POST https://platform.kentsms.com/api/v1/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "User": "your_api_key",
    "Pass": "your_api_secret",
    "Message": "Test mesajı",
    "Numbers": ["905321234567"]
  }'
```

---

### 2. Send SMS Advanced (Gelişmiş SMS Gönderimi)

**Endpoint:** `POST /api/v1/sms/send-advanced`

**Request:**
```json
{
  "From": "Baslik",
  "User": "API_KEY",
  "Pass": "API_SECRET",
  "Message": "selam test",
  "Coding": "default",
  "StartDate": null,
  "ValidityPeriod": 1140,
  "Numbers": ["905321234567"]
}
```

**Parametreler:**
- `From`: Gönderen başlığı (opsiyonel)
- `Coding`: "default" veya "turkish" (opsiyonel, varsayılan: "default")
- `StartDate`: Gönderim tarihi (ISO format, opsiyonel, null ise hemen gönderilir)
- `ValidityPeriod`: Geçerlilik süresi (dakika, opsiyonel)

**Response:**
```json
{
  "MessageId": "uuid",
  "Status": "OK"
}
```

**Örnek cURL:**
```bash
curl -X POST https://platform.kentsms.com/api/v1/sms/send-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "From": "KENTSMS",
    "User": "your_api_key",
    "Pass": "your_api_secret",
    "Message": "Test mesajı",
    "Coding": "turkish",
    "Numbers": ["905321234567"]
  }'
```

---

### 3. Send SMS Multi (Çoklu SMS Gönderimi)

**Endpoint:** `POST /api/v1/sms/send-multi`

**Request:**
```json
{
  "From": "Baslik",
  "User": "API_KEY",
  "Pass": "API_SECRET",
  "Coding": "default",
  "StartDate": null,
  "ValidityPeriod": 1440,
  "Messages": [
    {
      "Message": "test mesaj 1",
      "GSM": "905321234567"
    },
    {
      "Message": "test mesaj 2",
      "GSM": "905441234567"
    }
  ]
}
```

**Response:**
```json
{
  "MessageIds": ["uuid1", "uuid2"],
  "Status": "OK",
  "SuccessCount": 2,
  "FailedCount": 0
}
```

**Örnek cURL:**
```bash
curl -X POST https://platform.kentsms.com/api/v1/sms/send-multi \
  -H "Content-Type: application/json" \
  -d '{
    "User": "your_api_key",
    "Pass": "your_api_secret",
    "Messages": [
      {
        "Message": "Mesaj 1",
        "GSM": "905321234567"
      },
      {
        "Message": "Mesaj 2",
        "GSM": "905441234567"
      }
    ]
  }'
```

---

### 4. SMS Report (SMS Raporu)

**Endpoint:** `POST /api/v1/sms/report`

**Request:**
```json
{
  "User": "API_KEY",
  "Pass": "API_SECRET",
  "MessageId": "uuid"
}
```

**Response:**
```json
{
  "Status": "OK",
  "Report": [
    {
      "GSM": "905321234567",
      "State": "İletildi",
      "Network": "Turkcell"
    }
  ]
}
```

**Durumlar (State):**
- `Rapor Bekliyor`: SMS gönderildi, rapor bekleniyor
- `İletildi`: SMS başarıyla iletildi
- `İletilmedi`: SMS iletilmedi
- `Zaman Aşımı`: SMS zaman aşımına uğradı

**Operatörler (Network):**
- `TTMobile`
- `Turkcell`
- `Vodafone`
- `KKTCell`
- `Telsim`
- `Şebeke Dışı`

**Örnek cURL:**
```bash
curl -X POST https://platform.kentsms.com/api/v1/sms/report \
  -H "Content-Type: application/json" \
  -d '{
    "User": "your_api_key",
    "Pass": "your_api_secret",
    "MessageId": "message-uuid"
  }'
```

---

## Hata Kodları

| HTTP Status | Açıklama |
|------------|----------|
| 200 | Başarılı |
| 400 | Geçersiz istek (eksik parametre, yetersiz kredi, vb.) |
| 401 | Yetkisiz erişim (geçersiz API Key/Secret) |
| 404 | Kayıt bulunamadı |
| 500 | Sunucu hatası |

---

## Kredi Sistemi

- **180 karakter = 1 kredi**
- Her SMS için mesaj uzunluğuna göre kredi hesaplanır
- Yetersiz kredi durumunda `400` hatası döner
- Başarısız SMS'ler için kredi 48 saat sonra otomatik iade edilir

---

## Telefon Numarası Formatları

Kabul edilen formatlar:
- `905321234567` (12 haneli, 90 ile başlar)
- `05321234567` (11 haneli, 0 ile başlar)
- `5321234567` (10 haneli, 5 ile başlar)

---

## Örnek Kullanım Senaryoları

### Senaryo 1: Basit SMS Gönderimi
```javascript
const response = await fetch('https://platform.kentsms.com/api/v1/sms/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    User: 'your_api_key',
    Pass: 'your_api_secret',
    Message: 'Merhaba, bu bir test mesajıdır.',
    Numbers: ['905321234567']
  })
});

const result = await response.json();
if (result.Status === 'OK') {
  console.log('SMS gönderildi:', result.MessageId);
} else {
  console.error('Hata:', result.Error);
}
```

### Senaryo 2: SMS Durumu Kontrolü
```javascript
const response = await fetch('https://platform.kentsms.com/api/v1/sms/report', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    User: 'your_api_key',
    Pass: 'your_api_secret',
    MessageId: 'message-uuid'
  })
});

const result = await response.json();
if (result.Status === 'OK') {
  result.Report.forEach(report => {
    console.log(`GSM: ${report.GSM}, Durum: ${report.State}, Operatör: ${report.Network}`);
  });
}
```

---

## Güvenlik

1. **API Key ve Secret'ı güvenli tutun**
   - API Key ve Secret'ı asla public kodlarda veya client-side'da kullanmayın
   - Secret'ı sadece server-side'da saklayın

2. **HTTPS kullanın**
   - Tüm API istekleri HTTPS üzerinden yapılmalıdır

3. **Rate Limiting**
   - API istekleri için rate limiting uygulanmaktadır
   - Aşırı istek durumunda `429 Too Many Requests` hatası döner

---

## Destek

Sorularınız için:
- Email: support@kentsms.com
- Dokümantasyon: https://docs.kentsms.com

---

**Son Güncelleme:** 2025-01-XX
**API Versiyonu:** v1.0

