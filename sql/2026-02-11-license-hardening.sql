USE gstechedukh;

-- Audit log table for admin license actions
CREATE TABLE IF NOT EXISTS license_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_admin_id BIGINT UNSIGNED NULL,
  action ENUM('create','edit','revoke','remove_device','extend','expire_sync') NOT NULL,
  target_license_id BIGINT UNSIGNED NOT NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_license_audit_target (target_license_id),
  INDEX idx_license_audit_actor (actor_admin_id),
  INDEX idx_license_audit_action (action),
  CONSTRAINT fk_license_audit_actor FOREIGN KEY (actor_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Failed activation attempts table (brute-force protection)
CREATE TABLE IF NOT EXISTS license_failed_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(64) NOT NULL,
  license_key_hash CHAR(64) NOT NULL,
  try_count INT NOT NULL DEFAULT 1,
  last_try_at DATETIME NOT NULL,
  blocked_until DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_license_failed_ip_hash (ip, license_key_hash),
  INDEX idx_license_failed_blocked_until (blocked_until),
  INDEX idx_license_failed_last_try (last_try_at)
) ENGINE=InnoDB;

-- Recommended indexes for existing license tables (safe add-if-missing)
SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'tool_license_keys' AND index_name = 'uniq_tool_license_key'
);
SET @sql := IF(@has_idx = 0, 'ALTER TABLE tool_license_keys ADD UNIQUE KEY uniq_tool_license_key (license_key)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'tool_license_keys' AND index_name = 'idx_tool_license_status'
);
SET @sql := IF(@has_idx = 0, 'ALTER TABLE tool_license_keys ADD INDEX idx_tool_license_status (status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'tool_license_keys' AND index_name = 'idx_tool_license_expires'
);
SET @sql := IF(@has_idx = 0, 'ALTER TABLE tool_license_keys ADD INDEX idx_tool_license_expires (expires_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'tool_license_keys' AND index_name = 'idx_tool_license_user_product'
);
SET @sql := IF(@has_idx = 0, 'ALTER TABLE tool_license_keys ADD INDEX idx_tool_license_user_product (user_id, product_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'tool_license_activations' AND index_name = 'idx_tool_activation_license'
);
SET @sql := IF(@has_idx = 0, 'ALTER TABLE tool_license_activations ADD INDEX idx_tool_activation_license (license_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'tool_license_activations' AND index_name = 'idx_tool_activation_device'
);
SET @sql := IF(@has_idx = 0, 'ALTER TABLE tool_license_activations ADD INDEX idx_tool_activation_device (device_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
