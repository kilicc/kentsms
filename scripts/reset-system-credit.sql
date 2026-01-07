-- ============================================
-- Sistem Kredisi Sıfırlama SQL
-- ============================================
-- Bu script sistem kredisini 0'a ayarlar
-- Supabase SQL Editor'de çalıştırın

-- Sistem kredisini 0'a ayarla
UPDATE system_settings
SET value = '0',
    updated_at = NOW()
WHERE key = 'system_credit';

-- Doğrulama
SELECT 
    key,
    value as system_credit,
    updated_at
FROM system_settings
WHERE key = 'system_credit';

