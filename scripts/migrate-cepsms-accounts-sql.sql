-- CepSMS Hesaplarını Kullanıcılarla Eşleştirme SQL Script'i
-- Supabase Dashboard > SQL Editor'de çalıştırın

-- Kullanıcı adına göre CepSMS hesaplarını eşleştir
UPDATE users
SET cepsms_username = CASE username
  WHEN 'bahi1' THEN 'bahi1'
  WHEN 'dede1' THEN 'dede1'
  WHEN 'grand1' THEN 'grand1'
  WHEN 'venom1' THEN 'venom1'
  WHEN 'asus1' THEN 'asus1'
  WHEN 'ramada1' THEN 'ramada1'
  WHEN 'super1' THEN 'super1'
  WHEN 'maxwin1' THEN 'maxwin1'
  WHEN 'royal1' THEN 'royal1'
  WHEN 'pasha1' THEN 'pasha1'
  ELSE NULL
END
WHERE username IN ('bahi1', 'dede1', 'grand1', 'venom1', 'asus1', 'ramada1', 'super1', 'maxwin1', 'royal1', 'pasha1');

-- Eşleştirme sonuçlarını kontrol et
SELECT 
  username,
  cepsms_username,
  credit,
  role
FROM users
WHERE cepsms_username IS NOT NULL
ORDER BY username;
