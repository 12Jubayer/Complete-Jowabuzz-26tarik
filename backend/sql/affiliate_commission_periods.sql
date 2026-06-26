CREATE TABLE IF NOT EXISTS affiliate_commission_periods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  commission_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_affiliate_commission_periods_dates (start_date, end_date),
  KEY idx_affiliate_commission_periods_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
