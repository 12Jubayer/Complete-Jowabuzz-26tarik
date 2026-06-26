-- Admin player management extensions

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_uid VARCHAR(20) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL AFTER created_at,
  ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45) NULL AFTER last_login;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  admin_id BIGINT NULL,
  user_id BIGINT NULL,
  action VARCHAR(100) NOT NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_audit_user_id (user_id),
  INDEX idx_admin_audit_admin_id (admin_id),
  INDEX idx_admin_audit_action (action),
  INDEX idx_admin_audit_created_at (created_at)
);
