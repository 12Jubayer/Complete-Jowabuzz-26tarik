USE jowabuzz;

CREATE TABLE IF NOT EXISTS agents (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uid VARCHAR(20) NULL,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  commission_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
  role VARCHAR(20) NOT NULL DEFAULT 'agent',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agents_mobile (mobile),
  UNIQUE KEY uq_agents_uid (uid),
  INDEX idx_agents_status (status)
);
