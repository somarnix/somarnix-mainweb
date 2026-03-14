/* =========================================================
   STEP 2: CHAT + SOCIAL
========================================================= */

USE gstechedukh;

CREATE TABLE IF NOT EXISTS order_conversations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  topic VARCHAR(150) NOT NULL DEFAULT 'Order chat',
  last_message_at DATETIME NULL,
  buyer_last_read_at DATETIME NULL,
  seller_last_read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_chat_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  message_type ENUM('text','emoji','sticker') NOT NULL DEFAULT 'text',
  sticker_path VARCHAR(500) NULL,
  attachment_url VARCHAR(500) NULL,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  buyer_seen_at DATETIME NULL,
  seller_seen_at DATETIME NULL,
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  edited_at DATETIME NULL,
  edited_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chatmsg_conversation (conversation_id),
  INDEX idx_chatmsg_sender (sender_id),
  CONSTRAINT fk_chatmsg_conversation FOREIGN KEY (conversation_id) REFERENCES order_conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_chatmsg_user FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_chat_reactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  emoji VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_message_user_emoji (message_id, user_id, emoji),
  CONSTRAINT fk_reaction_message FOREIGN KEY (message_id) REFERENCES order_chat_messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_reaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_presence (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  status ENUM('online','offline') NOT NULL DEFAULT 'offline',
  last_active_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_presence_status_last_active (status, last_active_at),
  CONSTRAINT fk_presence_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_followers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  follower_id BIGINT UNSIGNED NOT NULL,
  following_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_follower_following (follower_id, following_id),
  INDEX idx_following_id (following_id),
  CONSTRAINT fk_user_followers_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_followers_following FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
