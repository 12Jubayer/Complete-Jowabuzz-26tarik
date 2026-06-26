CREATE TABLE IF NOT EXISTS affiliate_settlements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  affiliate_id BIGINT NOT NULL,
  period_id BIGINT UNSIGNED NOT NULL,
  total_referrals INT NOT NULL DEFAULT 0,
  total_commission DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status ENUM('pending', 'settled', 'rejected') NOT NULL DEFAULT 'pending',
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_affiliate_settlements_affiliate_period (affiliate_id, period_id),
  KEY idx_affiliate_settlements_status (status),
  KEY idx_affiliate_settlements_period_id (period_id),
  CONSTRAINT fk_affiliate_settlements_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliate_settlements_period
    FOREIGN KEY (period_id) REFERENCES affiliate_settlement_periods(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
