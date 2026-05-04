/* =========================================================
   STEP 1: CORE AUTH + COMMERCE
========================================================= */

-- DROP DATABASE IF EXISTS somarnix;
-- CREATE DATABASE somarnix
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_unicode_ci;

USE somarnix;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  first_name VARCHAR(60) NULL,
  last_name VARCHAR(60) NULL,
  username VARCHAR(60) NULL UNIQUE,
  birth_date DATE NULL,
  place VARCHAR(120) NULL,
  bio VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  avatar_url VARCHAR(2000) NULL,
  cover_url VARCHAR(2000) NULL,
  cover_position_x DECIMAL(6,2) NOT NULL DEFAULT 50.00,
  cover_position_y DECIMAL(6,2) NOT NULL DEFAULT 50.00,
  cover_scale DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  avatar_border_url VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  banned_at DATETIME NULL,
  ban_until DATETIME NULL,
  ban_reason VARCHAR(255) NULL,
  email_verified_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_ban_until (ban_until),
  INDEX idx_users_admin_status (deleted_at, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_identities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('google') NOT NULL,
  provider_user_id VARCHAR(190) NOT NULL,
  provider_email VARCHAR(190) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_provider_user (provider, provider_user_id),
  CONSTRAINT fk_identity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_resets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reset_user (user_id),
  INDEX idx_reset_token (token_hash),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_email_verifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uev_user_created (user_id, created_at),
  INDEX idx_uev_user_expires (user_id, expires_at),
  CONSTRAINT fk_uev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_login_settings (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  max_devices INT NOT NULL DEFAULT 10,
  CONSTRAINT fk_user_login_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_login_devices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  device_name VARCHAR(120) NULL,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trusted_until DATETIME NULL,
  trust_granted_at DATETIME NULL,
  device_action_locked_until DATETIME NULL,
  UNIQUE KEY uniq_user_login_device (user_id, device_id),
  INDEX idx_user_login_last_seen (user_id, last_seen_at),
  CONSTRAINT fk_user_login_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_login_verification_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ulvc_user_device_created (user_id, device_id, created_at),
  INDEX idx_ulvc_user_expires (user_id, expires_at),
  CONSTRAINT fk_ulvc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_device_logout_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_udlc_user_device_created (user_id, device_id, created_at),
  INDEX idx_udlc_user_expires (user_id, expires_at),
  CONSTRAINT fk_udlc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_attempt_limits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scope_type ENUM('email','ip') NOT NULL,
  scope_key VARCHAR(190) NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  last_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  blocked_until DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_login_attempt_scope (scope_type, scope_key),
  INDEX idx_login_attempt_blocked (scope_type, blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  description LONGTEXT NULL,
  level ENUM('beginner','advanced','pro') NOT NULL DEFAULT 'beginner',
  posted_by BIGINT UNSIGNED NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  is_unlimited_stock TINYINT(1) NOT NULL DEFAULT 0,
  mode ENUM('license','inventory') NOT NULL DEFAULT 'inventory',
  image_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  order_fields_json TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_cat (category_id),
  INDEX idx_products_posted_by (posted_by),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_products_user FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_variants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  duration_label VARCHAR(60) NULL,
  duration_note VARCHAR(80) NULL,
  duration_days INT NULL,
  device_label VARCHAR(60) NULL,
  device_type ENUM('any','pc','phone','both') NOT NULL DEFAULT 'any',
  device_limit INT NULL,
  is_unlimited_device TINYINT(1) NOT NULL DEFAULT 0,
  units_per_qty INT UNSIGNED NOT NULL DEFAULT 1,
  original_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  khqr VARCHAR(255) NOT NULL DEFAULT '/paymentQR/khmer_qr.jpg',
  usdqr VARCHAR(255) NOT NULL DEFAULT 'none',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_variant_product (product_id),
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_review (product_id, user_id),
  INDEX idx_review_product (product_id),
  INDEX idx_review_user (user_id),
  CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS carts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active','converted') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cart_user (user_id),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cart_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cart_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NULL,
  qty INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  order_info_json TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cartitem_cart (cart_id),
  INDEX idx_cartitem_product (product_id),
  CONSTRAINT fk_cartitem_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cartitem_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cartitem_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  state ENUM('pending','approved','delivering','completed','cancelled','resolution') NOT NULL DEFAULT 'pending',
  result ENUM('none','done','failed') NOT NULL DEFAULT 'none',
  payment_state ENUM('waiting','approved','declined') NOT NULL DEFAULT 'waiting',
  payment_review_note VARCHAR(255) NULL,
  payment_reviewed_by BIGINT UNSIGNED NULL,
  payment_reviewed_at DATETIME NULL,
  delivery_title VARCHAR(120) NULL,
  delivery_message TEXT NULL,
  delivered_at DATETIME NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  review_note VARCHAR(255) NULL,
  stock_reserved TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_state (state),
  INDEX idx_orders_payment_state (payment_state),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_admin FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_payment_reviewer FOREIGN KEY (payment_reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NULL,
  qty INT NOT NULL DEFAULT 1,
  units_per_qty INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  original_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  order_info_json TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orderitem_order (order_id),
  INDEX idx_orderitem_product (product_id),
  CONSTRAINT fk_orderitem_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_orderitem_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orderitem_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  account_id VARCHAR(120) NOT NULL,
  payment_id VARCHAR(120) NOT NULL DEFAULT '',
  payment_apv VARCHAR(120) NOT NULL,
  paid_at DATETIME NOT NULL,
  method ENUM('manual','ABA Bank','ACLEDA Bank','Wing Bank','Canadia Bank','Other') NOT NULL DEFAULT 'manual',
  admin_decision ENUM('waiting','approved','declined') NOT NULL DEFAULT 'waiting',
  decision_note VARCHAR(255) NULL,
  decided_by BIGINT UNSIGNED NULL,
  decided_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pay_order (order_id),
  INDEX idx_pay_user (user_id),
  INDEX idx_pay_admin_decision (admin_decision),
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pay_decided_by FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
