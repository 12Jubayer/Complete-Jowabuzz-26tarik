ALTER TABLE affiliate_settings
  ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(10) NOT NULL DEFAULT 'weekly' AFTER settlement_day;

ALTER TABLE affiliate_settlement_periods
  ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(10) NOT NULL DEFAULT 'weekly' AFTER name;
