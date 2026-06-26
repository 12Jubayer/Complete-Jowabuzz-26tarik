CREATE TABLE IF NOT EXISTS weekly_cashback_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  cashback_percent DECIMAL(5, 2) NOT NULL DEFAULT 2,
  min_net_loss DECIMAL(15, 2) NOT NULL DEFAULT 0,
  day_of_week TINYINT NOT NULL DEFAULT 3,
  hour_utc TINYINT NOT NULL DEFAULT 3,
  last_run_at TIMESTAMP NULL DEFAULT NULL,
  last_run_credited INT NOT NULL DEFAULT 0,
  last_run_skipped INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_cashback_payouts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  week_start DATETIME NOT NULL,
  week_end DATETIME NOT NULL,
  total_bet DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_win DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_loss DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cashback_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  cashback_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'credited',
  transaction_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_cashback_payout_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_weekly_cashback_user_week (user_id, week_start, week_end),
  INDEX idx_weekly_cashback_payouts_user_id (user_id),
  INDEX idx_weekly_cashback_payouts_created_at (created_at)
);
