CREATE TABLE IF NOT EXISTS bonus_turnover_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  bonus_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  min_deposit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  max_deposit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  user_claim_limit INT NOT NULL DEFAULT 1,
  turnover_multiplier DECIMAL(8, 2) NOT NULL DEFAULT 1,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bonus_turnover_rules_active_dates (is_active, start_at, end_at)
);

CREATE TABLE IF NOT EXISTS user_bonus_claims (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  rule_id BIGINT NOT NULL,
  deposit_id BIGINT NOT NULL,
  deposit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  bonus_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  required_turnover DECIMAL(15, 2) NOT NULL DEFAULT 0,
  completed_turnover DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expired_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_user_bonus_claims_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_bonus_claims_rule FOREIGN KEY (rule_id) REFERENCES bonus_turnover_rules(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_bonus_claim_deposit (user_id, rule_id, deposit_id),
  INDEX idx_user_bonus_claims_user_status (user_id, status),
  INDEX idx_user_bonus_claims_rule_id (rule_id)
);
