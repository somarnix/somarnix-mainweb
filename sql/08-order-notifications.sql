CREATE TABLE IF NOT EXISTS order_notification_reads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  scope_key VARCHAR(32) NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_order_notification_reads (user_id, order_id, scope_key),
  KEY idx_order_notification_reads_user_scope (user_id, scope_key, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
