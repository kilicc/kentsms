-- ============================================
-- KENTSMS - Supabase Database Setup Script
-- ============================================
-- Bu script tüm tabloları, indexleri, RLS policy'lerini ve admin2 kullanıcısını oluşturur
-- Supabase SQL Editor'de çalıştırın: https://app.supabase.com/project/[PROJECT-ID]/sql

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  credit INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  role VARCHAR(20) DEFAULT 'user',
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================
-- 2. CONTACT_GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contact_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#1976d2',
  icon VARCHAR(50) DEFAULT 'group',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON contact_groups(user_id);

-- ============================================
-- 3. CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES contact_groups(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  notes TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  is_blocked BOOLEAN DEFAULT false,
  last_contacted TIMESTAMPTZ,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_group_id ON contacts(group_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

-- ============================================
-- 4. SMS_MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  sender VARCHAR(50),
  status VARCHAR(20) DEFAULT 'sent',
  cost DECIMAL(10, 2) DEFAULT 0,
  service_name VARCHAR(50),
  service_code VARCHAR(20),
  service_url TEXT,
  cep_sms_message_id VARCHAR(100),
  network VARCHAR(50),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refund_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_at ON sms_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_phone ON sms_messages(phone_number);

-- ============================================
-- 5. SMS_TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'Genel',
  variables TEXT[],
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sms_templates_user_id ON sms_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);
CREATE INDEX IF NOT EXISTS idx_sms_templates_usage_count ON sms_templates(usage_count);

-- ============================================
-- 6. REFUNDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sms_id UUID REFERENCES sms_messages(id) ON DELETE CASCADE,
  original_cost DECIMAL(10, 2) NOT NULL,
  refund_amount DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  hours_waited DECIMAL(5, 1),
  remaining_hours DECIMAL(5, 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- ============================================
-- 7. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TRY',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================
-- 8. PAYMENT_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TRY',
  payment_method VARCHAR(50),
  credits INTEGER NOT NULL DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  description VARCHAR(500),
  transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at);

-- ============================================
-- 9. PAYMENT_PACKAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TRY',
  bonus INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_packages_is_active ON payment_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_packages_display_order ON payment_packages(display_order);

-- ============================================
-- 10. CRYPTO_CURRENCIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS crypto_currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 8,
  min_amount DECIMAL(20, 8) NOT NULL,
  network_fee DECIMAL(20, 8) NOT NULL,
  confirmations INTEGER NOT NULL DEFAULT 3,
  wallet_address VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_currencies_is_active ON crypto_currencies(is_active);
CREATE INDEX IF NOT EXISTS idx_crypto_currencies_display_order ON crypto_currencies(display_order);

-- ============================================
-- 11. API_KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  api_secret VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- ============================================
-- 12. SHORT_LINKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS short_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  short_code VARCHAR(20) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  click_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_short_links_user_id ON short_links(user_id);
CREATE INDEX IF NOT EXISTS idx_short_links_short_code ON short_links(short_code);
CREATE INDEX IF NOT EXISTS idx_short_links_is_active ON short_links(is_active);

-- ============================================
-- 13. SHORT_LINK_CLICKS TABLE (IP tracking için)
-- ============================================
CREATE TABLE IF NOT EXISTS short_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id UUID REFERENCES short_links(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referer TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_short_link_clicks_short_link_id ON short_link_clicks(short_link_id);
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_clicked_at ON short_link_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_ip_address ON short_link_clicks(ip_address);

-- ============================================
-- 14. INSERT DEFAULT DATA
-- ============================================

-- Payment Packages
INSERT INTO payment_packages (package_id, name, credits, price, currency, bonus, is_active, display_order)
VALUES 
  ('starter', 'Başlangıç Paketi', 1000, 1500.00, 'TRY', 100, true, 1),
  ('pro', 'Pro Paketi', 5000, 7000.00, 'TRY', 500, true, 2),
  ('premium', 'Premium Paketi', 10000, 13000.00, 'TRY', 1500, true, 3)
ON CONFLICT (package_id) DO NOTHING;

-- Crypto Currencies
INSERT INTO crypto_currencies (symbol, name, decimals, min_amount, network_fee, confirmations, wallet_address, is_active, display_order)
VALUES 
  ('BTC', 'Bitcoin', 8, 0.0001, 0.0001, 3, NULL, true, 1),
  ('ETH', 'Ethereum', 18, 0.001, 0.001, 12, NULL, true, 2),
  ('USDT', 'Tether', 6, 10, 1, 3, NULL, true, 3),
  ('USDC', 'USD Coin', 6, 10, 1, 3, NULL, true, 4),
  ('TRX', 'Tron', 6, 10, 1, 20, NULL, true, 5)
ON CONFLICT (symbol) DO NOTHING;

-- ============================================
-- 15. CREATE ADMIN2 USER
-- ============================================
-- Şifre: 123 (bcrypt hash'lenmiş olarak)
-- bcryptjs ile hash'lenmiş şifre: $2a$10$rOzJq1Z6Qx9N9f5Yx8QHxO1Z9f5Yx8QHxO1Z9f5Yx8QHxO1Z9f5Yx8QHxO
-- Doğru hash'i oluşturmak için create-admin2-user.ts scriptini çalıştırın
-- VEYA aşağıdaki gibi manuel oluşturabilirsiniz (şifre: 123)

-- NOT: Şifreyi hash'lemek için Node.js script'i kullanın:
-- npx tsx scripts/create-admin2-user.ts

-- Geçici olarak manuel ekleme (şifre hash'i script'ten alınmalı):
-- INSERT INTO users (username, email, password_hash, role, credit)
-- VALUES (
--   'admin2',
--   'admin2@kentsms.com',
--   '$2a$10$[HASH_BURAYA]',  -- create-admin2-user.ts script'inden alınacak
--   'admin',
--   999999
-- ) ON CONFLICT (username) DO UPDATE SET
--   role = 'admin',
--   credit = 999999;

-- ============================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_link_clicks ENABLE ROW LEVEL SECURITY;

-- USERS: Herkes kendi bilgilerini görebilir, adminler herkesi görebilir
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text OR (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin');

-- CONTACTS: Kullanıcılar kendi kişilerini görebilir, adminler herkesi görebilir
CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (user_id::text = auth.uid()::text OR (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin');

CREATE POLICY "Users can insert own contacts" ON contacts
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own contacts" ON contacts
  FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own contacts" ON contacts
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- SMS_MESSAGES: Kullanıcılar kendi SMS'lerini görebilir, adminler herkesi görebilir
CREATE POLICY "Users can view own sms" ON sms_messages
  FOR SELECT USING (user_id::text = auth.uid()::text OR (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin');

CREATE POLICY "Users can insert own sms" ON sms_messages
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Payment packages ve crypto currencies: Herkes görebilir
CREATE POLICY "Everyone can view payment packages" ON payment_packages
  FOR SELECT USING (true);

CREATE POLICY "Everyone can view crypto currencies" ON crypto_currencies
  FOR SELECT USING (true);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Şimdi admin2 kullanıcısını oluşturmak için:
-- npx tsx scripts/create-admin2-user.ts
-- komutunu çalıştırın

