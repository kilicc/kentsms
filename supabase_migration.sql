-- Payment Packages Table
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

-- Crypto Currencies Table
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

-- Insert default packages
INSERT INTO payment_packages (package_id, name, credits, price, currency, bonus, is_active, display_order)
VALUES 
  ('starter', 'Başlangıç Paketi', 1000, 1500.00, 'TRY', 100, true, 1),
  ('pro', 'Pro Paketi', 5000, 7000.00, 'TRY', 500, true, 2),
  ('premium', 'Premium Paketi', 10000, 13000.00, 'TRY', 1500, true, 3)
ON CONFLICT (package_id) DO NOTHING;

-- Insert default crypto currencies
INSERT INTO crypto_currencies (symbol, name, decimals, min_amount, network_fee, confirmations, wallet_address, is_active, display_order)
VALUES 
  ('BTC', 'Bitcoin', 8, 0.0001, 0.0001, 3, NULL, true, 1),
  ('ETH', 'Ethereum', 18, 0.001, 0.005, 12, NULL, true, 2),
  ('USDT', 'Tether', 6, 1.0, 1.0, 3, NULL, true, 3),
  ('USDC', 'USD Coin', 6, 1.0, 1.0, 3, NULL, true, 4),
  ('TRX', 'TRON', 6, 10.0, 1.0, 20, NULL, true, 5)
ON CONFLICT (symbol) DO NOTHING;

