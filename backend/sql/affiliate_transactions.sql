CREATE TABLE IF NOT EXISTS affiliate_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  affiliate_id BIGINT NOT NULL,
  type ENUM('add', 'deduct', 'transfer', 'withdraw') NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  reason VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_affiliate_transactions_affiliate_id (affiliate_id),
  CONSTRAINT fk_affiliate_transactions_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
