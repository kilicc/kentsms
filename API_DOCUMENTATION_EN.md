# FinSMS API Documentation v1.0

## Overview

FinSMS API provides SMS sending and reporting services via RESTful endpoints. The API follows a similar structure to CepSMS API for easy integration.

**Base URL:** `https://platform.finsms.io/api/v1/sms`

**Authentication:** API Key (User) and API Secret (Pass) parameters required in all requests.

---

## Authentication

All API requests require `User` (API Key) and `Pass` (API Secret) parameters.

**How to get API credentials:**
Contact your FinSMS administrator to obtain your API Key and API Secret.

---

## Endpoints

### 1. Send SMS Simple

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

**Response (Success):**
```json
{
  "MessageId": "42367313232",
  "Status": "OK"
}
```

**Response (Error):**
```json
{
  "MessageId": 0,
  "Status": "Error"
}
```

**Example cURL:**
```bash
curl -X POST https://platform.finsms.io/api/v1/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "User": "your_api_key",
    "Pass": "your_api_secret",
    "Message": "Test message",
    "Numbers": ["905321234567"]
  }'
```

---

### 2. Send SMS

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

**Parameters:**
- `From`: Sender name (optional)
- `Coding`: "default" or "turkish" (optional, default: "default")
- `StartDate`: Send date in ISO format (optional, null = send immediately)
- `ValidityPeriod`: Validity period in minutes (optional)

**Response:**
```json
{
  "MessageId": "42367313232",
  "Status": "OK"
}
```

**Example cURL:**
```bash
curl -X POST https://platform.finsms.io/api/v1/sms/send-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "From": "FinSMS",
    "User": "your_api_key",
    "Pass": "your_api_secret",
    "Message": "Test message",
    "Coding": "turkish",
    "Numbers": ["905321234567"]
  }'
```

---

### 3. Send SMS MULTI

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
  "MessageIds": ["42367313232", "42367313233"],
  "Status": "OK",
  "SuccessCount": 2,
  "FailedCount": 0
}
```

**Example cURL:**
```bash
curl -X POST https://platform.finsms.io/api/v1/sms/send-multi \
  -H "Content-Type: application/json" \
  -d '{
    "User": "your_api_key",
    "Pass": "your_api_secret",
    "Messages": [
      {
        "Message": "Message 1",
        "GSM": "905321234567"
      },
      {
        "Message": "Message 2",
        "GSM": "905441234567"
      }
    ]
  }'
```

---

### 4. SMS Report

**Endpoint:** `POST /api/v1/sms/report`

**Request:**
```json
{
  "User": "API_KEY",
  "Pass": "API_SECRET",
  "MessageId": "42367313232"
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
    },
    {
      "GSM": "905323214567",
      "State": "İletildi",
      "Network": "Turkcell"
    }
  ]
}
```

**States:**
- `Rapor Bekliyor`: SMS sent, waiting for report
- `İletildi`: SMS delivered successfully
- `İletilmedi`: SMS not delivered
- `Zaman Aşımı`: SMS timeout

**Networks:**
- `TTMobile`
- `Turkcell`
- `Vodafone`
- `KKTCell`
- `Telsim`
- `Şebeke Dışı`

**Example cURL:**
```bash
curl -X POST https://platform.finsms.io/api/v1/sms/report \
  -H "Content-Type: application/json" \
  -d '{
    "User": "your_api_key",
    "Pass": "your_api_secret",
    "MessageId": "42367313232"
  }'
```

---

## Error Codes

| HTTP Status | Description |
|------------|-------------|
| 200 | Success |
| 400 | Bad Request (missing parameters, insufficient credit, etc.) |
| 401 | Unauthorized (invalid API Key/Secret) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Credit System

- **180 characters = 1 credit**
- Credit is calculated based on message length for each SMS
- Returns `400` error if insufficient credit
- Failed SMS credits are automatically refunded after 48 hours

---

## Phone Number Formats

Accepted formats:
- `905321234567` (12 digits, starts with 90)
- `05321234567` (11 digits, starts with 0)
- `5321234567` (10 digits, starts with 5)

---

## Example Usage

### Example 1: Simple SMS
```javascript
const response = await fetch('https://platform.finsms.io/api/v1/sms/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    User: 'your_api_key',
    Pass: 'your_api_secret',
    Message: 'Hello, this is a test message.',
    Numbers: ['905321234567']
  })
});

const result = await response.json();
if (result.Status === 'OK') {
  console.log('SMS sent:', result.MessageId);
} else {
  console.error('Error:', result.Status);
}
```

### Example 2: Check SMS Status
```javascript
const response = await fetch('https://platform.finsms.io/api/v1/sms/report', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    User: 'your_api_key',
    Pass: 'your_api_secret',
    MessageId: '42367313232'
  })
});

const result = await response.json();
if (result.Status === 'OK') {
  result.Report.forEach(report => {
    console.log(`GSM: ${report.GSM}, State: ${report.State}, Network: ${report.Network}`);
  });
}
```

---

## Security

1. **Keep API credentials secure**
   - Never use API Key and Secret in public code or client-side
   - Store Secret only on server-side

2. **Use HTTPS**
   - All API requests must be made over HTTPS

3. **Rate Limiting**
   - Rate limiting is applied to API requests
   - Returns `429 Too Many Requests` error for excessive requests

---

## Support

For questions:
- Email: support@finsms.io
- Documentation: https://docs.finsms.io

---

**Last Updated:** 2025-01-XX
**API Version:** v1.0

