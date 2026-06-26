CREATE TABLE IF NOT EXISTS e_wallets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  wallet_uid VARCHAR(20) NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(190) NULL,
  password_hash VARCHAR(255) NOT NULL,
  balance DECIMAL(14, 2) NOT NULL DEFAULT 0,
  status ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_e_wallets_wallet_uid (wallet_uid),
  UNIQUE KEY uq_e_wallets_phone (phone),
  KEY idx_e_wallets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS e_wallet_transactions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  wallet_id INT UNSIGNED NOT NULL,
  type ENUM('add', 'deduct', 'transfer', 'withdraw') NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  reason VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_e_wallet_transactions_wallet_id (wallet_id),
  CONSTRAINT fk_e_wallet_transactions_wallet
    FOREIGN KEY (wallet_id) REFERENCES e_wallets (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
