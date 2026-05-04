/* =========================================================
   STEP 4: TOOLS + LICENSES
========================================================= */

USE somarnix;

CREATE TABLE IF NOT EXISTS tool_variants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  duration_label VARCHAR(60) NULL,
  duration_note VARCHAR(80) NULL,
  duration_days INT NULL,
  device_label VARCHAR(60) NULL,
  device_type ENUM('any','pc','phone','both') NOT NULL DEFAULT 'any',
  device_limit INT NOT NULL DEFAULT 10,
  is_unlimited_device TINYINT(1) NOT NULL DEFAULT 0,
  original_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  khqr VARCHAR(255) NOT NULL DEFAULT '/paymentQR/khmer_qr.jpg',
  usdqr VARCHAR(255) NOT NULL DEFAULT 'none',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tool_variant_product (product_id),
  CONSTRAINT fk_tool_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tool_device_access (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  device_type ENUM('pc','phone') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tool_device (user_id, product_id, device_id),
  INDEX idx_tool_device_user (user_id),
  CONSTRAINT fk_tool_device_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tool_device_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tool_license_keys (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  license_key VARCHAR(190) NOT NULL,
  max_devices INT NOT NULL DEFAULT 1,
  status ENUM('active','revoked','expired') NOT NULL DEFAULT 'active',
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tool_license_key (license_key),
  INDEX idx_tool_license_status (status),
  INDEX idx_tool_license_expires (expires_at),
  INDEX idx_tool_license_user_product (user_id, product_id),
  CONSTRAINT fk_tool_license_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_tool_license_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_tool_license_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tool_license_activations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  license_id BIGINT UNSIGNED NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tool_license_activation (license_id, device_id),
  INDEX idx_tool_activation_license (license_id),
  INDEX idx_tool_activation_device (device_id),
  CONSTRAINT fk_tool_activation_license FOREIGN KEY (license_id) REFERENCES tool_license_keys(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
