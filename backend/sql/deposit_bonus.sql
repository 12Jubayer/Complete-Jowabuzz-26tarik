CREATE TABLE IF NOT EXISTS deposit_bonus_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  bonus_percent DECIMAL(5, 2) NOT NULL,
  turnover_multiplier DECIMAL(8, 2) NOT NULL DEFAULT 1,
  min_deposit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  max_deposit DECIMAL(15, 2) NOT NULL,
  claim_limit INT NOT NULL DEFAULT 1,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_deposit_bonus_rules_active_dates (is_active, start_date, end_date)
);

CREATE TABLE IF NOT EXISTS user_bonus_accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  rule_id INT NOT NULL,
  deposit_transaction_id BIGINT NULL,
  deposit_amount DECIMAL(15, 2) NOT NULL,
  bonus_amount DECIMAL(15, 2) NOT NULL,
  required_turnover DECIMAL(15, 2) NOT NULL,
  completed_turnover DECIMAL(15, 2) NOT NULL DEFAULT 0,
  progress DECIMAL(5, 2) NOT NULL DEFAULT 0,
  status ENUM('in_progress', 'completed', 'expired', 'cancelled') NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_bonus_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_bonus_accounts_rule FOREIGN KEY (rule_id) REFERENCES deposit_bonus_rules(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_bonus_accounts_deposit_tx (deposit_transaction_id),
  INDEX idx_user_bonus_accounts_user_status (user_id, status),
  INDEX idx_user_bonus_accounts_rule_id (rule_id),
  INDEX idx_user_bonus_accounts_created_at (created_at)
);
