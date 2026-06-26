CREATE TABLE IF NOT EXISTS withdraw_channel_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  old_channel ENUM('AGENT', 'PAYMENT') NULL,
  new_channel ENUM('AGENT', 'PAYMENT') NULL,
  deposit_type VARCHAR(30) NULL,
  deposit_id BIGINT NULL,
  change_source VARCHAR(50) NOT NULL DEFAULT 'first_deposit',
  changed_by BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wcl_user_id (user_id),
  INDEX idx_wcl_created_at (created_at)
);
