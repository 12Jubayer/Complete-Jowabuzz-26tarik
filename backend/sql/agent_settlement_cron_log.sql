CREATE TABLE IF NOT EXISTS agent_settlement_cron_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_date DATE NOT NULL,
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  agents_processed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_agent_settlement_cron_period (run_date, period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
