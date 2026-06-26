CREATE TABLE IF NOT EXISTS vip_levels (
  id INT PRIMARY KEY AUTO_INCREMENT,
  level INT NOT NULL,
  exp_required BIGINT NOT NULL DEFAULT 0,
  level_up_reward DECIMAL(15, 2) NOT NULL DEFAULT 0,
  monthly_reward DECIMAL(15, 2) NOT NULL DEFAULT 0,
  safe_percent DECIMAL(8, 4) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vip_levels_level (level)
);

CREATE TABLE IF NOT EXISTS vip_reward_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  reward_type ENUM('level_up', 'monthly', 'safe_cashback') NOT NULL,
  vip_level INT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  reward_month VARCHAR(7) NULL,
  transaction_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vip_reward_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_vip_reward_logs_user_id (user_id),
  INDEX idx_vip_reward_logs_level_up (user_id, reward_type, vip_level),
  INDEX idx_vip_reward_logs_monthly (user_id, reward_type, reward_month)
);
