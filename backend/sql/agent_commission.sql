CREATE TABLE IF NOT EXISTS agent_commission_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deposit_percent DECIMAL(5, 2) NOT NULL DEFAULT 5,
  withdraw_percent DECIMAL(5, 2) NOT NULL DEFAULT 2,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_commissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  agent_id BIGINT NOT NULL,
  player_id BIGINT NULL,
  transaction_id BIGINT NOT NULL,
  type ENUM('deposit', 'withdraw') NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  rate DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'credited',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_agent_commissions_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_commissions_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_agent_commissions_transaction FOREIGN KEY (transaction_id) REFERENCES agent_transactions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_agent_commissions_transaction (transaction_id),
  INDEX idx_agent_commissions_agent_id (agent_id),
  INDEX idx_agent_commissions_type (type),
  INDEX idx_agent_commissions_created_at (created_at)
);
