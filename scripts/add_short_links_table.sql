-- Kısa link tablosu oluşturma
CREATE TABLE IF NOT EXISTS short_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  title VARCHAR(255),
  description TEXT,
  click_count INTEGER DEFAULT 0,
  unique_click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Kısa link tıklama istatistikleri tablosu
CREATE TABLE IF NOT EXISTS short_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id UUID REFERENCES short_links(id) ON DELETE CASCADE,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  referer TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_short_links_user_id ON short_links(user_id);
CREATE INDEX IF NOT EXISTS idx_short_links_short_code ON short_links(short_code);
CREATE INDEX IF NOT EXISTS idx_short_links_is_active ON short_links(is_active);
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_short_link_id ON short_link_clicks(short_link_id);
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_ip_address ON short_link_clicks(ip_address);
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_clicked_at ON short_link_clicks(clicked_at);

-- Açıklamalar
COMMENT ON TABLE short_links IS 'Kısa linkler ve istatistikleri';
COMMENT ON TABLE short_link_clicks IS 'Kısa link tıklama istatistikleri (IP tabanlı)';
COMMENT ON COLUMN short_links.short_code IS 'Kısa link kodu (örn: abc123)';
COMMENT ON COLUMN short_links.click_count IS 'Toplam tıklama sayısı';
COMMENT ON COLUMN short_links.unique_click_count IS 'Benzersiz IP adresinden tıklama sayısı';

