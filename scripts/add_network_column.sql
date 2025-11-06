-- Add network column to sms_messages table
-- This column stores the operator/network information from CepSMS API

ALTER TABLE sms_messages 
ADD COLUMN IF NOT EXISTS network VARCHAR(50);

-- Add comment to the column
COMMENT ON COLUMN sms_messages.network IS 'CepSMS API''den gelen operatör bilgisi (Turkcell, Vodafone, TTMobile, KKTCell, Telsim, Şebeke Dışı)';

