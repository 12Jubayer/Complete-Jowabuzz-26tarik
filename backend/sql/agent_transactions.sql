USE jowabuzz;

CREATE TABLE IF NOT EXISTS agent_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  agent_id BIGINT NOT NULL,
  user_id BIGINT NULL,
  type ENUM('deposit', 'topup_player', 'withdraw') NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  CONSTRAINT fk_agent_transactions_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_agent_transactions_agent_id (agent_id),
  INDEX idx_agent_transactions_type_status (type, status),
  INDEX idx_agent_transactions_created_at (created_at)
);
