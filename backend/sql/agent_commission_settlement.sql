CREATE TABLE IF NOT EXISTS agent_commission_settlements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  agent_id BIGINT NOT NULL,
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  deposit_commission DECIMAL(15, 2) NOT NULL DEFAULT 0,
  withdraw_commission DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_commission DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  approved_by BIGINT NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  rejected_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_agent_commission_settlements_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE KEY uq_agent_commission_settlement_period (agent_id, period_start, period_end),
  INDEX idx_agent_commission_settlements_status (status),
  INDEX idx_agent_commission_settlements_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS agent_wallet_ledger (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  agent_id BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id BIGINT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_agent_wallet_ledger_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  INDEX idx_agent_wallet_ledger_agent_id (agent_id),
  INDEX idx_agent_wallet_ledger_reference (reference_type, reference_id),
  INDEX idx_agent_wallet_ledger_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS agent_notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  agent_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id BIGINT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_agent_notifications_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  INDEX idx_agent_notifications_agent_id (agent_id),
  INDEX idx_agent_notifications_is_read (is_read),
  INDEX idx_agent_notifications_created_at (created_at)
);
