CREATE TABLE IF NOT EXISTS chat_conversations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL,
  guest_id VARCHAR(64) NULL,
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  last_message TEXT NULL,
  last_message_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_chat_user (user_id),
  UNIQUE KEY uq_chat_guest (guest_id),
  CONSTRAINT fk_chat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_chat_last_message_at (last_message_at),
  INDEX idx_chat_status (status)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  conversation_id BIGINT NOT NULL,
  sender_type ENUM('user', 'admin') NOT NULL,
  sender_id BIGINT NULL,
  message TEXT NULL,
  attachment_url VARCHAR(500) NULL,
  attachment_type VARCHAR(50) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_msg_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
  INDEX idx_chat_messages_conversation (conversation_id, created_at),
  INDEX idx_chat_messages_unread (conversation_id, sender_type, is_read)
);
