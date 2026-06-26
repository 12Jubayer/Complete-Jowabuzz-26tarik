CREATE TABLE IF NOT EXISTS agent_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  country VARCHAR(120) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  telegram VARCHAR(120) NULL,
  message TEXT NULL,
  status ENUM('new', 'contacted', 'approved', 'rejected') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_agent_applications_status (status),
  KEY idx_agent_applications_created (created_at)
);
