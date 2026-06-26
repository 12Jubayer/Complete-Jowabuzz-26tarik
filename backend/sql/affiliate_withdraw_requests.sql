CREATE TABLE IF NOT EXISTS affiliate_withdraw_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  affiliate_id BIGINT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  method VARCHAR(50) NOT NULL DEFAULT 'bank',
  account_number VARCHAR(100) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_affiliate_withdraw_affiliate_id (affiliate_id),
  INDEX idx_affiliate_withdraw_status (status),
  CONSTRAINT fk_affiliate_withdraw_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE
);
