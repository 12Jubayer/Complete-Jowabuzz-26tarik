CREATE TABLE IF NOT EXISTS winner_boards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  title VARCHAR(120) NOT NULL,
  banner_url VARCHAR(500) NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_winner_boards_slug (slug)
);

CREATE TABLE IF NOT EXISTS winner_board_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  board_id INT NOT NULL,
  period ENUM('daily', 'weekly') NOT NULL DEFAULT 'daily',
  rank_position INT NOT NULL,
  username_mask VARCHAR(40) NOT NULL,
  game_name VARCHAR(120) NOT NULL,
  game_image VARCHAR(500) NULL,
  win_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  reward_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_winner_board_entries_board FOREIGN KEY (board_id) REFERENCES winner_boards(id) ON DELETE CASCADE,
  UNIQUE KEY uq_winner_board_entry (board_id, period, rank_position),
  INDEX idx_winner_board_entries_board_period (board_id, period, rank_position)
);

CREATE TABLE IF NOT EXISTS first_to_reach_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  board_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  username_mask VARCHAR(40) NULL,
  game_name VARCHAR(120) NULL,
  game_image VARCHAR(500) NULL,
  reached_at DATETIME NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_first_to_reach_board FOREIGN KEY (board_id) REFERENCES winner_boards(id) ON DELETE CASCADE,
  INDEX idx_first_to_reach_board (board_id, sort_order)
);
