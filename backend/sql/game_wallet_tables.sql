CREATE TABLE IF NOT EXISTS wallets (
  user_id BIGINT PRIMARY KEY,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS providers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  adapter_key VARCHAR(50) NOT NULL DEFAULT 'demo',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  config JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_providers_code (code)
);

CREATE TABLE IF NOT EXISTS games (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  provider_id BIGINT NOT NULL,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NULL,
  image_url VARCHAR(255) NULL,
  min_bet DECIMAL(15, 2) NOT NULL DEFAULT 10.00,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_games_provider_code (provider_id, code),
  CONSTRAINT fk_games_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
  INDEX idx_games_category (category),
  INDEX idx_games_status (status)
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  game_id BIGINT NOT NULL,
  provider_id BIGINT NOT NULL,
  status ENUM('active', 'closed', 'expired') NOT NULL DEFAULT 'active',
  session_token VARCHAR(100) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  UNIQUE KEY uq_game_sessions_token (session_token),
  CONSTRAINT fk_game_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_sessions_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_sessions_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
  INDEX idx_game_sessions_user_id (user_id),
  INDEX idx_game_sessions_status (status)
);

CREATE TABLE IF NOT EXISTS game_rounds (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  game_id BIGINT NOT NULL,
  provider_id BIGINT NOT NULL,
  round_id VARCHAR(100) NOT NULL,
  bet_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  win_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status ENUM('pending', 'settled', 'failed') NOT NULL DEFAULT 'settled',
  provider_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_game_rounds_session_round (session_id, round_id),
  CONSTRAINT fk_game_rounds_session FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_rounds_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_game_rounds_user_id (user_id),
  INDEX idx_game_rounds_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS api_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL,
  provider_id BIGINT NULL,
  endpoint VARCHAR(150) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  status_code INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_api_logs_user_id (user_id),
  INDEX idx_api_logs_endpoint (endpoint),
  INDEX idx_api_logs_created_at (created_at)
);
