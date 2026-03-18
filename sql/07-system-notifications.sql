CREATE TABLE IF NOT EXISTS system_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'general',
  icon_key VARCHAR(32) NOT NULL DEFAULT 'security',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  link_url VARCHAR(255) NULL,
  dedupe_key VARCHAR(191) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_system_notifications_dedupe_key (dedupe_key),
  KEY idx_system_notifications_user_created (user_id, created_at),
  KEY idx_system_notifications_category_created (category, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_notification_reads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  notification_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_system_notification_reads (notification_id, user_id),
  KEY idx_system_notification_reads_user (user_id, read_at),
  CONSTRAINT fk_system_notification_reads_notification
    FOREIGN KEY (notification_id) REFERENCES system_notifications(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_notifications (
  user_id,
  category,
  icon_key,
  title,
  description,
  link_url,
  dedupe_key
)
VALUES
  (
    NULL,
    'app_update',
    'update',
    'App version update',
    'A newer app version is available with UI improvements and stability updates.',
    NULL,
    'global:app-version-2026-03'
  ),
  (
    NULL,
    'security_notice',
    'security',
    'Password and security',
    'Keep your password updated and review account security settings regularly.',
    NULL,
    'global:security-guidance'
  )
ON DUPLICATE KEY UPDATE
  dedupe_key = VALUES(dedupe_key);
