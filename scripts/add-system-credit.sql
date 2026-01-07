-- ============================================
-- KENTSMS - Sistem Kredisi Ekleme Script
-- ============================================
-- Bu script system_settings tablosunu oluşturur ve sistem kredisini ekler
-- Supabase SQL Editor'de çalıştırın: https://app.supabase.com/project/[PROJECT-ID]/sql

-- ============================================
-- 1. SYSTEM_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- ============================================
-- 2. INITIAL SYSTEM CREDIT
-- ============================================
-- Sistem kredisini başlangıç değeri olarak ekle (örnek: 10000)
INSERT INTO system_settings (key, value)
VALUES ('system_credit', '10000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Sadece admin'ler okuyabilir ve güncelleyebilir
CREATE POLICY "Allow admins to manage system settings" ON system_settings FOR ALL USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Policy: Tüm authenticated kullanıcılar okuyabilir (sistem kredisini görmek için)
CREATE POLICY "Allow authenticated users to read system settings" ON system_settings FOR SELECT TO authenticated USING (true);

