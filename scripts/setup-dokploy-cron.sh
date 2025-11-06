#!/bin/bash

# Dokploy için Cron Job Kurulum Script'i
# Bu script sunucuda direkt cron job kurar (Dokploy'un cron özelliği yoksa)

set -e

echo "🔄 Dokploy için Cron Job Kurulumu Başlatılıyor..."

# Proje dizini
PROJECT_DIR="/var/www/finsms"
DOMAIN="${DOMAIN:-https://panel.finsms.io}"

# .env dosyası kontrolü
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "❌ .env dosyası bulunamadı: $PROJECT_DIR/.env"
    exit 1
fi

# CRON_SECRET_KEY kontrolü ve oluşturma
if ! grep -q "CRON_SECRET_KEY" "$PROJECT_DIR/.env"; then
    CRON_SECRET_KEY=$(openssl rand -hex 32)
    echo "" >> "$PROJECT_DIR/.env"
    echo "CRON_SECRET_KEY=$CRON_SECRET_KEY" >> "$PROJECT_DIR/.env"
    echo "✅ CRON_SECRET_KEY .env dosyasına eklendi"
else
    CRON_SECRET_KEY=$(grep "CRON_SECRET_KEY" "$PROJECT_DIR/.env" | cut -d '=' -f2 | tr -d ' ' | tr -d '"')
    echo "ℹ️  CRON_SECRET_KEY zaten mevcut"
fi

# Log klasörü oluştur
mkdir -p /var/log/finsms
chmod 755 /var/log/finsms

# Mevcut cron job'ları al
CRON_FILE="/tmp/finsms_cron_$(date +%s)"
crontab -l > "$CRON_FILE" 2>/dev/null || touch "$CRON_FILE"

# SMS durum kontrolü cron job'unu ekle (eğer yoksa)
SMS_CRON_CMD="*/5 * * * * curl -X POST $DOMAIN/api/sms/check-status -H \"x-secret-key: $CRON_SECRET_KEY\" -H \"Content-Type: application/json\" -s -o /dev/null -w \"%{http_code}\" | grep -q \"200\" || echo \"[SMS Check] \$(date): HTTP Error\" >> /var/log/finsms/cron.log 2>&1"

if ! grep -q "api/sms/check-status" "$CRON_FILE"; then
    echo "$SMS_CRON_CMD" >> "$CRON_FILE"
    echo "✅ SMS durum kontrolü cron job'u eklendi (her 5 dakikada bir)"
else
    echo "ℹ️  SMS durum kontrolü cron job'u zaten mevcut"
fi

# Otomatik iade cron job'unu ekle (eğer yoksa)
REFUND_CRON_CMD="0 * * * * curl -X POST $DOMAIN/api/refunds/process-auto -H \"x-secret-key: $CRON_SECRET_KEY\" -H \"Content-Type: application/json\" -s -o /dev/null -w \"%{http_code}\" | grep -q \"200\" || echo \"[Refund Process] \$(date): HTTP Error\" >> /var/log/finsms/cron.log 2>&1"

if ! grep -q "api/refunds/process-auto" "$CRON_FILE"; then
    echo "$REFUND_CRON_CMD" >> "$CRON_FILE"
    echo "✅ Otomatik iade cron job'u eklendi (her saat başı)"
else
    echo "ℹ️  Otomatik iade cron job'u zaten mevcut"
fi

# Cron job'ları yükle
crontab "$CRON_FILE"
rm "$CRON_FILE"

echo ""
echo "✅ Cron Job Kurulumu Tamamlandı!"
echo ""
echo "📋 Kurulu Cron Job'lar:"
crontab -l | grep -E "(api/sms/check-status|api/refunds/process-auto)" || echo "  (Henüz cron job bulunamadı)"
echo ""
echo "📝 Log Dosyası: /var/log/finsms/cron.log"
echo "🔑 CRON_SECRET_KEY: $CRON_SECRET_KEY"
echo "🌐 Domain: $DOMAIN"
echo ""
echo "🔍 Cron Job'ları Kontrol Etmek İçin:"
echo "   crontab -l"
echo ""
echo "📊 Log Dosyasını İzlemek İçin:"
echo "   tail -f /var/log/finsms/cron.log"
echo ""
echo "🧪 Manuel Test:"
echo "   curl -X POST $DOMAIN/api/sms/check-status -H \"x-secret-key: $CRON_SECRET_KEY\" -H \"Content-Type: application/json\""

