CREATE TABLE IF NOT EXISTS movecash_app_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token VARCHAR(128) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_movecash_app_links_token (token),
  KEY idx_movecash_app_links_active (is_active, expires_at)
);
