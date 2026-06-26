ALTER TABLE agent_commission_settings
  ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(10) NOT NULL DEFAULT 'weekly' AFTER withdraw_percent;

ALTER TABLE agent_commission_settings
  ADD COLUMN IF NOT EXISTS settlement_day TINYINT NOT NULL DEFAULT 0 AFTER settlement_type;

ALTER TABLE agent_commission_settings
  ADD COLUMN IF NOT EXISTS auto_settlement TINYINT(1) NOT NULL DEFAULT 1 AFTER settlement_day;

ALTER TABLE agent_commission_settlements
  ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(10) NOT NULL DEFAULT 'weekly' AFTER period_end;
