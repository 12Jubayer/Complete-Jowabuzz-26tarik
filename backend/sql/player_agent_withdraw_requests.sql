CREATE TABLE IF NOT EXISTS player_agent_withdraw_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  agent_id BIGINT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NULL,
  status ENUM('pending', 'completed', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pawr_user_status (user_id, status),
  KEY idx_pawr_agent_status (agent_id, status),
  KEY idx_pawr_expires_at (expires_at),
  CONSTRAINT fk_pawr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pawr_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
