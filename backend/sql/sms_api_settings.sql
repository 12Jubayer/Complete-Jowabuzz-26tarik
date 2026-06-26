CREATE TABLE IF NOT EXISTS sms_api_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_name VARCHAR(120) NOT NULL DEFAULT 'Bulk SMS API',
  api_mode ENUM('demo', 'production') NOT NULL DEFAULT 'demo',
  api_base_url VARCHAR(500) NOT NULL DEFAULT '',
  api_token TEXT NOT NULL,
  sender_id VARCHAR(50) NOT NULL DEFAULT '',
  default_country_code VARCHAR(10) NOT NULL DEFAULT '+880',
  otp_template TEXT NOT NULL,
  promotional_template TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_api_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sms_type VARCHAR(50) NOT NULL DEFAULT 'transactional',
  purpose VARCHAR(100) NULL,
  recipient VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sms_logs_created_at (created_at),
  INDEX idx_sms_logs_recipient (recipient),
  INDEX idx_sms_logs_purpose (purpose)
);

CREATE TABLE IF NOT EXISTS user_otps (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  identifier VARCHAR(120) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_otps_identifier (identifier),
  INDEX idx_user_otps_user_id (user_id),
  INDEX idx_user_otps_expires_at (expires_at),
  CONSTRAINT fk_user_otps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
