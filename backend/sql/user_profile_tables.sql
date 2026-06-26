CREATE TABLE IF NOT EXISTS user_wallets (
  user_id BIGINT PRIMARY KEY,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  required_turnover DECIMAL(15, 2) NOT NULL DEFAULT 0,
  completed_turnover DECIMAL(15, 2) NOT NULL DEFAULT 0,
  vip_level INT NOT NULL DEFAULT 0,
  vip_exp INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deposit_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  method VARCHAR(50) NOT NULL,
  channel VARCHAR(100) NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  transaction_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deposit_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_deposit_requests_user_id (user_id),
  INDEX idx_deposit_requests_status (status)
);

CREATE TABLE IF NOT EXISTS withdraw_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  method VARCHAR(50) NOT NULL DEFAULT 'bank',
  account_number VARCHAR(100) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  transaction_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_withdraw_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_withdraw_requests_user_id (user_id),
  INDEX idx_withdraw_requests_status (status)
);

CREATE TABLE IF NOT EXISTS bet_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  game_name VARCHAR(150) NOT NULL,
  bet_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  win_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  profit_loss DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'settled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bet_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_bet_records_user_id (user_id),
  INDEX idx_bet_records_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS turnover_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  turnover_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_turnover_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_turnover_records_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS bonus_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
  transaction_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bonus_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_bonus_records_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS user_bank_details (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  method VARCHAR(50) NOT NULL DEFAULT 'bank',
  account_name VARCHAR(100) NULL,
  account_number VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_bank_details_user (user_id),
  CONSTRAINT fk_user_bank_details_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_update_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  field_name VARCHAR(50) NOT NULL,
  old_value VARCHAR(255) NULL,
  new_value VARCHAR(255) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_update_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_update_requests_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS user_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_messages_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS referral_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  referrer_user_id BIGINT NOT NULL,
  referred_user_id BIGINT NOT NULL,
  bonus_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_referral_records_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_records_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_referral_records_referrer (referrer_user_id)
);
