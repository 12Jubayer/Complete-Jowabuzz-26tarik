CREATE TABLE IF NOT EXISTS settlement_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  affiliate_id BIGINT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_profit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  commission_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected', 'released') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_settlement_history_affiliate_id (affiliate_id),
  INDEX idx_settlement_history_status (status),
  INDEX idx_settlement_history_week (week_start, week_end),
  CONSTRAINT fk_settlement_history_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE
);
