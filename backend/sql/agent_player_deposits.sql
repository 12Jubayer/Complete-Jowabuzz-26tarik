USE jowabuzz;

CREATE TABLE IF NOT EXISTS agent_player_deposits (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  agent_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_agent_player_deposits_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_player_deposits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_agent_player_deposits_agent_id (agent_id),
  INDEX idx_agent_player_deposits_user_id (user_id)
);
