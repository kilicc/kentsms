-- ============================================
-- Tüm Raporları Silme SQL Script
-- ============================================
-- Bu script tüm rapor verilerini siler:
-- - SMS mesajları (sms_messages)
-- - İade kayıtları (refunds)
-- - Ödeme kayıtları (payments)
-- - Ödeme talepleri (payment_requests)
--
-- ⚠️  DİKKAT: Bu işlem geri alınamaz!
-- Supabase SQL Editor'de çalıştırın: https://app.supabase.com/project/[PROJECT-ID]/sql

-- ============================================
-- 1. İADE KAYITLARINI SİL (sms_id foreign key var)
-- ============================================
DELETE FROM refunds;
SELECT 'İade kayıtları silindi' as status, COUNT(*) as deleted_count FROM refunds;

-- ============================================
-- 2. SMS MESAJLARINI SİL
-- ============================================
DELETE FROM sms_messages;
SELECT 'SMS mesajları silindi' as status, COUNT(*) as deleted_count FROM sms_messages;

-- ============================================
-- 3. ÖDEME KAYITLARINI SİL
-- ============================================
DELETE FROM payments;
SELECT 'Ödeme kayıtları silindi' as status, COUNT(*) as deleted_count FROM payments;

-- ============================================
-- 4. ÖDEME TALEPLERİNİ SİL
-- ============================================
DELETE FROM payment_requests;
SELECT 'Ödeme talepleri silindi' as status, COUNT(*) as deleted_count FROM payment_requests;

-- ============================================
-- 5. DOĞRULAMA (Sıfır olmalı)
-- ============================================
SELECT 
  (SELECT COUNT(*) FROM refunds) as refunds_count,
  (SELECT COUNT(*) FROM sms_messages) as sms_messages_count,
  (SELECT COUNT(*) FROM payments) as payments_count,
  (SELECT COUNT(*) FROM payment_requests) as payment_requests_count;

-- ============================================
-- NOT: Kullanıcılar, kişiler, gruplar ve şablonlar korunur
-- ============================================

