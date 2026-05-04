/* =========================================================
   FULL SCHEMA
   Generated from the clean ordered SQL files in this folder.
   Run this for a one-file setup.
========================================================= */
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


/* =========================================================
   STEP 2: CHAT + SOCIAL
========================================================= */

USE somarnix;

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


/* =========================================================
   STEP 3: VIDEO LEARNING
========================================================= */

USE somarnix;

CREATE TABLE IF NOT EXISTS video_courses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  category VARCHAR(80) NULL,
  tags VARCHAR(500) NULL,
  description LONGTEXT NULL,
  level ENUM('beginner','advanced','pro') NOT NULL DEFAULT 'beginner',
  posted_by BIGINT UNSIGNED NULL,
  author_name VARCHAR(120) NULL,
  author_avatar_url VARCHAR(500) NULL,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_count INT NOT NULL DEFAULT 0,
  students_count INT NOT NULL DEFAULT 0,
  upload_date DATETIME NULL,
  thumbnail_url VARCHAR(500) NULL,
  hero_url VARCHAR(500) NULL,
  preview_mode ENUM('count','manual') NOT NULL DEFAULT 'count',
  preview_count INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_video_courses_posted_by (posted_by),
  CONSTRAINT fk_video_courses_posted_by FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_course_sections (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_video_section_course (course_id),
  CONSTRAINT fk_video_section_course FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_course_lessons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  section_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  video_url VARCHAR(500) NOT NULL,
  duration_label VARCHAR(20) NULL,
  position INT NOT NULL DEFAULT 0,
  is_free_preview TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_video_lesson_course (course_id),
  INDEX idx_video_lesson_section (section_id),
  CONSTRAINT fk_video_lesson_course FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_lesson_section FOREIGN KEY (section_id) REFERENCES video_course_sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_course_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  access_type ENUM('lifetime','months') NOT NULL DEFAULT 'lifetime',
  duration_days INT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_devices INT NOT NULL DEFAULT 10,
  is_unlimited_device TINYINT(1) NOT NULL DEFAULT 0,
  khqr VARCHAR(255) NOT NULL DEFAULT '/paymentQR/khmer_qr.jpg',
  usdqr VARCHAR(255) NOT NULL DEFAULT 'none',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_video_plan_course (course_id),
  CONSTRAINT fk_video_plan_course FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_subscription_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  duration_days INT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  description TEXT NULL,
  features TEXT NULL,
  access_courses TINYINT(1) NOT NULL DEFAULT 1,
  access_ai_tools TINYINT(1) NOT NULL DEFAULT 0,
  access_downloads TINYINT(1) NOT NULL DEFAULT 0,
  khqr VARCHAR(255) NOT NULL DEFAULT '/paymentQR/khmer_qr.jpg',
  usdqr VARCHAR(255) NOT NULL DEFAULT 'none',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_course_purchases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  access_start DATETIME NOT NULL,
  access_end DATETIME NULL,
  status ENUM('pending','active','expired','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_video_purchase (order_id, course_id),
  INDEX idx_video_purchase_user (user_id),
  INDEX idx_video_purchase_course (course_id),
  CONSTRAINT fk_video_purchase_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_purchase_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_purchase_course FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_purchase_plan FOREIGN KEY (plan_id) REFERENCES video_course_plans(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_subscriptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  access_start DATETIME NOT NULL,
  access_end DATETIME NOT NULL,
  status ENUM('pending','active','expired','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_video_subscription_order (order_id, plan_id),
  INDEX idx_video_subscription_user (user_id),
  CONSTRAINT fk_video_sub_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_sub_plan FOREIGN KEY (plan_id) REFERENCES video_subscription_plans(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_course_favorites (
  user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, course_id),
  CONSTRAINT fk_video_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_fav_course FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_course_device_access (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  device_name VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_video_course_device (user_id, course_id, device_id),
  INDEX idx_video_course_user_course (user_id, course_id),
  CONSTRAINT fk_video_course_device_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_course_device_course FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_course_cart_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_video_course_cart_user_course_plan (user_id, course_id, plan_id),
  INDEX idx_video_course_cart_user (user_id),
  INDEX idx_video_course_cart_course (course_id),
  INDEX idx_video_course_cart_plan (plan_id),
  CONSTRAINT fk_video_course_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_course_cart_course FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_course_cart_plan FOREIGN KEY (plan_id) REFERENCES video_course_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


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


/* =========================================================
   STEP 5: DEFAULTS + SAFE BACKFILL
========================================================= */

USE somarnix;

INSERT IGNORE INTO product_categories (name) VALUES
  ('course'),
  ('program'),
  ('game'),
  ('tools');

INSERT INTO user_login_settings (user_id, max_devices)
SELECT u.id, 10
FROM users u
LEFT JOIN user_login_settings s ON s.user_id = u.id
WHERE s.user_id IS NULL;

UPDATE users
SET email_verified_at = COALESCE(email_verified_at, updated_at, created_at, NOW())
WHERE is_active = 1
  AND deleted_at IS NULL;

UPDATE products p
JOIN product_categories c ON c.id = p.category_id
SET p.mode = CASE
  WHEN LOWER(c.name) = 'tools' THEN 'license'
  ELSE 'inventory'
END;

UPDATE product_variants
SET units_per_qty = 1
WHERE units_per_qty IS NULL OR units_per_qty < 1;

UPDATE order_items
SET units_per_qty = 1
WHERE units_per_qty IS NULL OR units_per_qty < 1;

UPDATE video_course_plans
SET max_devices = 10
WHERE COALESCE(is_unlimited_device, 0) = 0
  AND (max_devices IS NULL OR max_devices < 1);

UPDATE video_course_plans
SET max_devices = 9999, is_unlimited_device = 1
WHERE access_type = 'lifetime';

UPDATE tool_variants
SET device_limit = 10
WHERE COALESCE(is_unlimited_device, 0) = 0
  AND (device_limit IS NULL OR device_limit < 1 OR device_limit > 10);

UPDATE tool_variants
SET device_limit = 10
WHERE COALESCE(is_unlimited_device, 0) = 1
  AND (device_limit IS NULL OR device_limit <> 10);

UPDATE orders
SET payment_state = CASE
  WHEN state = 'cancelled' OR result = 'failed' THEN 'declined'
  WHEN state IN ('approved','delivering','completed') OR result = 'done' THEN 'approved'
  ELSE 'waiting'
END;

UPDATE payments p
JOIN orders o ON o.id = p.order_id
SET p.admin_decision = o.payment_state
WHERE p.admin_decision IS NULL
   OR p.admin_decision NOT IN ('waiting','approved','declined');

UPDATE video_course_purchases p
JOIN orders o ON o.id = p.order_id
SET p.status = 'cancelled'
WHERE o.state IN ('cancelled', 'resolution')
   OR o.payment_state = 'declined';

UPDATE video_course_purchases p
JOIN orders o ON o.id = p.order_id
JOIN video_course_plans pl ON pl.id = p.plan_id
SET
  p.status = 'active',
  p.access_start = COALESCE(p.access_start, NOW()),
  p.access_end = CASE
    WHEN pl.access_type = 'lifetime' THEN NULL
    WHEN pl.duration_days IS NOT NULL THEN DATE_ADD(COALESCE(p.access_start, NOW()), INTERVAL pl.duration_days DAY)
    ELSE p.access_end
  END
WHERE p.status = 'pending'
  AND o.state = 'completed';

UPDATE video_course_purchases
SET status = 'expired'
WHERE status = 'active'
  AND access_end IS NOT NULL
  AND access_end < NOW();

UPDATE video_subscriptions s
JOIN orders o ON o.id = s.order_id
SET s.status = 'cancelled'
WHERE o.state IN ('cancelled', 'resolution')
   OR o.payment_state = 'declined';

UPDATE video_subscriptions s
JOIN orders o ON o.id = s.order_id
JOIN video_subscription_plans sp ON sp.id = s.plan_id
SET
  s.status = 'active',
  s.access_start = COALESCE(s.access_start, NOW()),
  s.access_end = DATE_ADD(COALESCE(s.access_start, NOW()), INTERVAL sp.duration_days DAY)
WHERE s.status = 'pending'
  AND o.state = 'completed';

UPDATE video_subscriptions
SET status = 'expired'
WHERE status = 'active'
  AND access_end < NOW();

CREATE TABLE IF NOT EXISTS promotion_combos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NULL,
  thumbnail_url VARCHAR(500) NULL,
  khqr VARCHAR(500) NULL,
  usdqr VARCHAR(500) NULL,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promotion_combo_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  combo_id BIGINT UNSIGNED NOT NULL,
  item_type ENUM('course','tool','product') NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NULL,
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_combo_items_combo (combo_id),
  CONSTRAINT fk_combo_items_combo FOREIGN KEY (combo_id) REFERENCES promotion_combos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


/* =========================================================
   STEP 6: USER API KEYS
========================================================= */

USE somarnix;

CREATE TABLE IF NOT EXISTS user_api_keys (
  user_id BIGINT UNSIGNED NOT NULL,
  groq_api_key_enc LONGTEXT NULL,
  openai_api_key_enc LONGTEXT NULL,
  google_api_key_enc LONGTEXT NULL,
  deepl_api_key_enc LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;/* =========================================================
   STEP 7: SYSTEM NOTIFICATIONS
========================================================= */
USE somarnix;
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

/* =========================================================
   STEP 8: ORDER NOTIFICATION READS
========================================================= */
USE somarnix;
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

/* =========================================================
   STEP 9: PAYWAY WEBHOOK LOGS
========================================================= */
USE somarnix;
CREATE TABLE IF NOT EXISTS payway_webhook_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  trx_id VARCHAR(120) NOT NULL,
  order_number VARCHAR(120) NULL,
  order_id BIGINT UNSIGNED NULL,
  amount DECIMAL(12,2) NULL,
  currency VARCHAR(10) NULL,
  apv VARCHAR(120) NULL,
  buyer_name VARCHAR(190) NULL,
  sender_account VARCHAR(190) NULL,
  processing_status VARCHAR(50) NOT NULL,
  response_message VARCHAR(255) NULL,
  raw_text TEXT NOT NULL,
  payload_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payway_log_trx (trx_id),
  INDEX idx_payway_log_order_number (order_number),
  INDEX idx_payway_log_status (processing_status),
  INDEX idx_payway_log_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================================================
   STEP 10: USER AVATAR BORDERS
========================================================= */
USE somarnix;
-- No action needed in full schema.
-- The base users table created in Step 1 already includes avatar_border_url.

/* =========================================================
   STEP 11: TOOL DEFINITIONS + ROUTE ALIASES
========================================================= */

USE somarnix;

CREATE TABLE IF NOT EXISTS tool_definitions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  canonical_slug VARCHAR(120) NOT NULL,
  display_name VARCHAR(255) NULL,
  handler_key VARCHAR(80) NOT NULL,
  tool_kind ENUM('online','downloadable','offline_licensed','embedded') NOT NULL,
  access_model ENUM('none','purchase','license') NOT NULL DEFAULT 'purchase',
  delivery_model ENUM('web','download','license','download+license') NOT NULL DEFAULT 'web',
  launch_path VARCHAR(255) NULL,
  embedded_entry VARCHAR(255) NULL,
  config_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tool_definition_product (product_id),
  UNIQUE KEY uniq_tool_definition_slug (canonical_slug),
  INDEX idx_tool_definition_handler (handler_key),
  INDEX idx_tool_definition_kind (tool_kind),
  INDEX idx_tool_definition_active (is_active),
  CONSTRAINT fk_tool_definition_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tool_route_aliases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tool_definition_id BIGINT UNSIGNED NOT NULL,
  alias_slug VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tool_route_alias (alias_slug),
  INDEX idx_tool_route_alias_tool (tool_definition_id),
  CONSTRAINT fk_tool_route_alias_tool FOREIGN KEY (tool_definition_id) REFERENCES tool_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   OPTIONAL BACKFILL EXAMPLES
   Run only after the matching products already exist.
--------------------------------------------------------- */

/*
INSERT INTO tool_definitions
  (product_id, canonical_slug, handler_key, tool_kind, access_model, delivery_model, launch_path, embedded_entry, config_json)
SELECT
  id,
  slug,
  'veo3',
  'online',
  'license',
  'web',
  '/tools-ai/toolveo3',
  'app/pages/tools-ai/veo3/Veo3.tsx',
  JSON_OBJECT('buy_slug', slug, 'legacy_component', 'Veo3')
FROM products
WHERE slug = 'toolveo3'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = products.id
  );

INSERT INTO tool_definitions
  (product_id, canonical_slug, handler_key, tool_kind, access_model, delivery_model, launch_path, embedded_entry, config_json)
SELECT
  id,
  slug,
  'download-tool',
  'downloadable',
  'license',
  'download+license',
  '/tools-ai/tooldownloadvideo',
  'app/pages/tools-ai/tooldownloadvideo/ToolDownload.tsx',
  JSON_OBJECT('buy_slug', slug, 'legacy_component', 'ToolDownload')
FROM products
WHERE slug = 'tooldownloadvideo'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = products.id
  );

INSERT INTO tool_definitions
  (product_id, canonical_slug, handler_key, tool_kind, access_model, delivery_model, launch_path, embedded_entry, config_json)
SELECT
  id,
  slug,
  'video-editor',
  'embedded',
  'license',
  'web',
  '/tools-ai/videoeditor',
  'app/pages/tools-ai/video-editor/Videoeditor.tsx',
  JSON_OBJECT('buy_slug', slug, 'legacy_component', 'VideoEditorPage')
FROM products
WHERE slug = 'videoeditor'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = products.id
  );

INSERT INTO tool_definitions
  (product_id, canonical_slug, handler_key, tool_kind, access_model, delivery_model, launch_path, embedded_entry, config_json)
SELECT
  id,
  slug,
  'prompt-ai-studio',
  'embedded',
  'license',
  'web',
  '/tools-ai/promt-ai',
  'app/pages/tools-ai/promt-ai/PromtAi.tsx',
  JSON_OBJECT('buy_slug', slug, 'legacy_component', 'PromtAi')
FROM products
WHERE slug = 'promt-ai'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = products.id
  );

INSERT INTO tool_definitions
  (product_id, canonical_slug, handler_key, tool_kind, access_model, delivery_model, launch_path, embedded_entry, config_json)
SELECT
  id,
  slug,
  'translate-video',
  'embedded',
  'none',
  'web',
  '/tools-ai/translatevideo',
  'app/pages/tools-ai/translatevideo/TranslateVideoAI.tsx',
  JSON_OBJECT('buy_slug', slug, 'legacy_component', 'TranslateVideoAI')
FROM products
WHERE slug = 'translatevideo'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = products.id
  );

INSERT INTO tool_route_aliases (tool_definition_id, alias_slug)
SELECT td.id, 'veo3'
FROM tool_definitions td
WHERE td.canonical_slug = 'toolveo3'
  AND NOT EXISTS (
    SELECT 1 FROM tool_route_aliases tra WHERE tra.alias_slug = 'veo3'
  );

INSERT INTO tool_route_aliases (tool_definition_id, alias_slug)
SELECT td.id, 'video-editor'
FROM tool_definitions td
WHERE td.canonical_slug = 'videoeditor'
  AND NOT EXISTS (
    SELECT 1 FROM tool_route_aliases tra WHERE tra.alias_slug = 'video-editor'
  );

INSERT INTO tool_route_aliases (tool_definition_id, alias_slug)
SELECT td.id, 'prompt-ai'
FROM tool_definitions td
WHERE td.canonical_slug = 'promt-ai'
  AND NOT EXISTS (
    SELECT 1 FROM tool_route_aliases tra WHERE tra.alias_slug = 'prompt-ai'
  );

INSERT INTO tool_route_aliases (tool_definition_id, alias_slug)
SELECT td.id, 'translatevideo-ai'
FROM tool_definitions td
WHERE td.canonical_slug = 'translatevideo'
  AND NOT EXISTS (
    SELECT 1 FROM tool_route_aliases tra WHERE tra.alias_slug = 'translatevideo-ai'
  );
*/

/* =========================================================
   STEP 12: ENHANCED TOOLS & LICENSES SYSTEM
   - Adds NEW tables only (no drops - safe for production)
   - Enhances existing tables with new columns
   - Compatible with 04-tools-and-licenses.sql
   - Compatible with 11-tool-definitions.sql
========================================================= */

USE somarnix;

/* ---------------------------------------------------------
   1. tool_definitions comes fully from Step 11
      Step 12 must not ALTER tool_definitions
   --------------------------------------------------------- */

/* ---------------------------------------------------------
   2. CREATE tool_download_tokens TABLE (NEW)
      For secure one-time download URLs
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS tool_download_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  license_id BIGINT UNSIGNED,
  tool_definition_id BIGINT UNSIGNED NOT NULL,
  
  token VARCHAR(128) NOT NULL UNIQUE,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  
  max_downloads INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  
  ip_address VARCHAR(64),
  user_agent VARCHAR(500),
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_used_at TIMESTAMP NULL,
  
  CONSTRAINT fk_download_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_download_token_license FOREIGN KEY (license_id) REFERENCES tool_license_keys(id) ON DELETE SET NULL,
  CONSTRAINT fk_download_token_tool FOREIGN KEY (tool_definition_id) REFERENCES tool_definitions(id) ON DELETE CASCADE,
  
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  INDEX idx_user_tool (user_id, tool_definition_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   3. CREATE license_rate_limits TABLE (NEW)
      Enhanced rate limiting (separate from failed_attempts)
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS license_rate_limits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  license_key_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  device_id VARCHAR(128),
  
  action_type ENUM('validate','activate','download','heartbeat') NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  last_request_at DATETIME NOT NULL,
  
  blocked_until DATETIME NULL,
  permanent_block TINYINT(1) NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uniq_rate_limit (license_key_hash, ip_address, device_id, action_type),
  INDEX idx_blocked_until (blocked_until),
  INDEX idx_last_request (last_request_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   4. CREATE device_fingerprints TABLE (NEW)
      Better device identification
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS device_fingerprints (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  
  fingerprint_hash CHAR(64) NOT NULL,
  platform ENUM('windows','macos','linux','android','ios','web') NOT NULL,
  platform_version VARCHAR(50),
  app_version VARCHAR(50),
  
  cpu_cores INT,
  total_memory_gb INT,
  screen_resolution VARCHAR(20),
  
  trust_score INT NOT NULL DEFAULT 100,
  is_suspicious TINYINT(1) NOT NULL DEFAULT 0,
  suspicion_reason VARCHAR(255),
  
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uniq_device_fingerprint (device_id, fingerprint_hash),
  INDEX idx_user_device (user_id, device_id),
  INDEX idx_trust_score (trust_score),
  
  CONSTRAINT fk_fingerprint_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   5. CREATE tool_access_stats TABLE (NEW)
      Analytics for tool usage
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS tool_access_stats (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tool_definition_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  license_id BIGINT UNSIGNED,
  
  access_date DATE NOT NULL,
  access_count INT NOT NULL DEFAULT 1,
  last_access_at DATETIME NOT NULL,
  
  UNIQUE KEY uniq_tool_access_stats (tool_definition_id, user_id, access_date),
  INDEX idx_access_date (access_date),
  INDEX idx_tool_date (tool_definition_id, access_date),
  
  CONSTRAINT fk_access_stats_tool FOREIGN KEY (tool_definition_id) REFERENCES tool_definitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_access_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_access_stats_license FOREIGN KEY (license_id) REFERENCES tool_license_keys(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   6. ENHANCE license_audit_logs TABLE (from file 04)
      Add new columns for better tracking
   --------------------------------------------------------- */

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'license_audit_logs'
      AND column_name = 'ip_address'
  ),
  'SELECT 1',
  'ALTER TABLE license_audit_logs ADD COLUMN ip_address VARCHAR(64) NULL AFTER reason'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'license_audit_logs'
      AND column_name = 'device_id'
  ),
  'SELECT 1',
  'ALTER TABLE license_audit_logs ADD COLUMN device_id VARCHAR(128) NULL AFTER ip_address'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'license_audit_logs'
      AND column_name = 'metadata'
  ),
  'SELECT 1',
  'ALTER TABLE license_audit_logs ADD COLUMN metadata JSON NULL AFTER device_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* ---------------------------------------------------------
   7. ADD INDEXES to existing tables for performance
   --------------------------------------------------------- */

-- Add to tool_license_keys (from file 04)
SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'tool_license_keys'
      AND index_name = 'idx_status_expires'
  ),
  'SELECT 1',
  'ALTER TABLE tool_license_keys ADD INDEX idx_status_expires (status, expires_at)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add to tool_license_activations (from file 04)
SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'tool_license_activations'
      AND index_name = 'idx_license_last_seen'
  ),
  'SELECT 1',
  'ALTER TABLE tool_license_activations ADD INDEX idx_license_last_seen (license_id, last_seen_at)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add to license_audit_logs (from file 04)
SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'license_audit_logs'
      AND index_name = 'idx_created_at'
  ),
  'SELECT 1',
  'ALTER TABLE license_audit_logs ADD INDEX idx_created_at (created_at)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add to license_failed_attempts (from file 04)
SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'license_failed_attempts'
      AND index_name = 'idx_try_count'
  ),
  'SELECT 1',
  'ALTER TABLE license_failed_attempts ADD INDEX idx_try_count (try_count)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* ---------------------------------------------------------
   8. CREATE VIEWS for admin dashboard
   --------------------------------------------------------- */

-- Active licenses summary view
CREATE OR REPLACE VIEW v_active_licenses_summary AS
SELECT 
  td.id AS tool_id,
  td.canonical_slug,
  td.display_name,
  COUNT(DISTINCT tlk.id) AS total_licenses,
  COUNT(DISTINCT CASE WHEN tlk.status = 'active' THEN tlk.id END) AS active_licenses,
  COUNT(DISTINCT CASE WHEN tlk.status = 'revoked' THEN tlk.id END) AS revoked_licenses,
  COUNT(DISTINCT CASE WHEN tlk.status = 'expired' THEN tlk.id END) AS expired_licenses,
  COALESCE(SUM((
    SELECT COUNT(*) FROM tool_license_activations tla 
    WHERE tla.license_id = tlk.id
  )), 0) AS total_active_devices
FROM tool_definitions td
LEFT JOIN tool_license_keys tlk ON tlk.product_id = td.product_id
WHERE td.is_active = 1
GROUP BY td.id, td.canonical_slug, td.display_name;

-- Recent activations view
CREATE OR REPLACE VIEW v_recent_activations AS
SELECT 
  tlk.id AS license_id,
  tlk.license_key,
  td.display_name AS tool_name,
  td.canonical_slug AS tool_slug,
  u.email AS user_email,
  u.username AS user_username,
  tla.device_id,
  tla.created_at AS activated_at,
  tla.last_seen_at
FROM tool_license_activations tla
JOIN tool_license_keys tlk ON tlk.id = tla.license_id
JOIN tool_definitions td ON td.product_id = tlk.product_id
JOIN users u ON u.id = tlk.user_id
ORDER BY tla.created_at DESC
LIMIT 100;

-- Download statistics view
CREATE OR REPLACE VIEW v_download_stats AS
SELECT 
  td.id AS tool_id,
  td.canonical_slug,
  td.display_name,
  COUNT(tdt.id) AS total_downloads,
  COUNT(DISTINCT tdt.user_id) AS unique_downloaders,
  MAX(tdt.first_used_at) AS last_download_at
FROM tool_definitions td
LEFT JOIN tool_download_tokens tdt ON tdt.tool_definition_id = td.id
WHERE td.delivery_model IN ('download', 'download+license')
GROUP BY td.id, td.canonical_slug, td.display_name;

/* ---------------------------------------------------------
   9. STORED PROCEDURE: Generate License Key
      Safe to create - doesn't modify existing data
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_create_tool_license //
CREATE PROCEDURE sp_create_tool_license(
  IN p_product_id BIGINT,
  IN p_user_id BIGINT,
  IN p_order_id BIGINT,
  IN p_max_devices INT,
  IN p_duration_days INT,
  OUT p_license_key VARCHAR(190),
  OUT p_license_id BIGINT
)
BEGIN
  DECLARE v_key_base VARCHAR(50);
  DECLARE v_key_full VARCHAR(190);
  DECLARE v_exists INT DEFAULT 1;
  
  -- Generate unique license key
  WHILE v_exists > 0 DO
    SET v_key_base = CONCAT(
      SUBSTRING(MD5(RAND()), 1, 4), '-',
      SUBSTRING(MD5(RAND()), 1, 4), '-',
      SUBSTRING(MD5(RAND()), 1, 4), '-',
      SUBSTRING(MD5(RAND()), 1, 4)
    );
    SET v_key_full = UPPER(CONCAT('GSTCH-', v_key_base));
    
    SELECT COUNT(*) INTO v_exists
    FROM tool_license_keys
    WHERE license_key = v_key_full;
  END WHILE;
  
  -- Insert license
  INSERT INTO tool_license_keys (
    order_id, product_id, user_id, license_key,
    max_devices, status, expires_at
  ) VALUES (
    p_order_id,
    p_product_id,
    p_user_id,
    v_key_full,
    p_max_devices,
    'active',
    CASE 
      WHEN p_duration_days IS NULL THEN NULL
      ELSE DATE_ADD(NOW(), INTERVAL p_duration_days DAY)
    END
  );
  
  SET p_license_id = LAST_INSERT_ID();
  SET p_license_key = v_key_full;
END //

DELIMITER ;

/* ---------------------------------------------------------
   10. STORED PROCEDURE: Revoke License
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_revoke_tool_license //
CREATE PROCEDURE sp_revoke_tool_license(
  IN p_license_id BIGINT,
  IN p_reason VARCHAR(255),
  IN p_admin_id BIGINT
)
BEGIN
  DECLARE v_old_status VARCHAR(20);
  
  -- Get current status
  SELECT status INTO v_old_status
  FROM tool_license_keys
  WHERE id = p_license_id;
  
  -- Update license status
  UPDATE tool_license_keys
  SET status = 'revoked'
  WHERE id = p_license_id;
  
  -- Delete all device activations
  DELETE FROM tool_license_activations
  WHERE license_id = p_license_id;
  
  -- Log the action
  INSERT INTO license_audit_logs (
    actor_admin_id, action, target_license_id,
    old_value, new_value, reason
  ) VALUES (
    p_admin_id,
    'revoke',
    p_license_id,
    JSON_OBJECT('status', v_old_status),
    JSON_OBJECT('status', 'revoked'),
    p_reason
  );
END //

DELIMITER ;

/* ---------------------------------------------------------
   11. STORED PROCEDURE: Remove Device from License
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_remove_device_from_license //
CREATE PROCEDURE sp_remove_device_from_license(
  IN p_license_id BIGINT,
  IN p_device_id VARCHAR(128),
  IN p_admin_id BIGINT
)
BEGIN
  DECLARE v_device_count INT;
  
  -- Remove the device
  DELETE FROM tool_license_activations
  WHERE license_id = p_license_id AND device_id = p_device_id;
  
  -- Get remaining device count
  SELECT COUNT(*) INTO v_device_count
  FROM tool_license_activations
  WHERE license_id = p_license_id;
  
  -- Log the action
  INSERT INTO license_audit_logs (
    actor_admin_id, action, target_license_id,
    old_value, new_value, reason, device_id
  ) VALUES (
    p_admin_id,
    'remove_device',
    p_license_id,
    NULL,
    JSON_OBJECT('remaining_devices', v_device_count),
    'Device removed by admin',
    p_device_id
  );
END //

DELIMITER ;

/* ---------------------------------------------------------
   12. STORED PROCEDURE: Cleanup Expired Tokens
       Call this periodically (e.g., hourly via cron)
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_cleanup_expired_tokens //
CREATE PROCEDURE sp_cleanup_expired_tokens()
BEGIN
  -- Delete expired download tokens
  DELETE FROM tool_download_tokens
  WHERE expires_at < NOW();
  
  -- Delete expired rate limit blocks
  DELETE FROM license_rate_limits
  WHERE blocked_until IS NOT NULL 
    AND blocked_until < NOW()
    AND permanent_block = 0;
  
  -- Return count of deleted items
  SELECT ROW_COUNT() AS deleted_count;
END //

DELIMITER ;

/* ---------------------------------------------------------
   13. SAMPLE DATA: Example tool definitions
       Only inserts if not exists
   --------------------------------------------------------- */

-- Example: Online AI Video Tool (runs in browser)
INSERT INTO tool_definitions (
  product_id, canonical_slug, display_name, short_description,
  tool_kind, tool_category, platform,
  access_model, delivery_model, requires_license,
  default_device_limit, max_device_limit,
  launch_path, embedded_entry,
  is_active, is_featured, sort_order
)
SELECT 
  p.id,
  'veo3-ai',
  'Veo3 AI Video Generator',
  'Generate videos from text prompts using AI',
  'embedded',
  'ai',
  'web',
  'license',
  'web',
  1,
  3,  -- default device limit
  10, -- max device limit
  '/tools-ai/veo3',
  'app/pages/tools-ai/veo3/Veo3.tsx',
  1,  -- is_active
  1,  -- is_featured
  1   -- sort_order
FROM products p
WHERE p.slug = 'toolveo3'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = p.id
  );

-- Example: Downloadable PC Tool
INSERT INTO tool_definitions (
  product_id, canonical_slug, display_name, short_description,
  tool_kind, tool_category, platform,
  access_model, delivery_model, requires_license,
  default_device_limit, max_device_limit,
  allow_offline_mode, offline_grace_period_hours,
  storage_provider, storage_key_prefix, file_extension,
  current_version,
  is_active, is_featured, sort_order
)
SELECT 
  p.id,
  'video-downloader-pro',
  'Video Downloader Pro',
  'Download videos from multiple platforms',
  'downloadable',
  'video',
  'pc',
  'license',
  'download+license',
  1,
  2,  -- default device limit
  5,  -- max device limit
  1,  -- allow offline mode
  72, -- 72 hour grace period
  'r2',
  'tools/pc/exe/',
  '.exe',
  '1.2.0',
  1,  -- is_active
  0,  -- is_featured
  2   -- sort_order
FROM products p
WHERE p.slug = 'tooldownloadvideo'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = p.id
  );

-- Example: Mobile APK Tool
INSERT INTO tool_definitions (
  product_id, canonical_slug, display_name, short_description,
  tool_kind, tool_category, platform,
  access_model, delivery_model, requires_license,
  default_device_limit, max_device_limit,
  storage_provider, storage_key_prefix, file_extension,
  current_version, min_client_version,
  is_active, is_beta, sort_order
)
SELECT 
  p.id,
  'mobile-video-editor',
  'Mobile Video Editor',
  'Edit videos on your phone with AI features',
  'downloadable',
  'video',
  'mobile',
  'license',
  'download+license',
  1,
  1,  -- default device limit (mobile)
  2,  -- max device limit
  'r2',
  'tools/mobile/apk/',
  '.apk',
  '2.0.1',
  '2.0.0',  -- min client version
  1,  -- is_active
  0,  -- is_beta
  3   -- sort_order
FROM products p
WHERE p.slug = 'videoeditor'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = p.id
  );

/* ---------------------------------------------------------
   14. VERIFICATION QUERIES
       Run these to verify migration succeeded
   --------------------------------------------------------- */

-- Check new tables exist
SELECT 'New tables created:' AS info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name IN (
    'tool_download_tokens',
    'license_rate_limits', 
    'device_fingerprints',
    'tool_access_stats'
  );

-- Check tool_definitions has new columns
SELECT 'tool_definitions columns:' AS info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'tool_definitions'
  AND column_name IN (
    'tool_category', 'platform', 'default_device_limit',
    'max_device_limit', 'allow_offline_mode', 'storage_provider',
    'current_version', 'is_featured', 'is_beta', 'sort_order'
  );

-- Check views exist
SELECT 'Views created:' AS info;
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = DATABASE() 
  AND table_name IN (
    'v_active_licenses_summary',
    'v_recent_activations',
    'v_download_stats'
  );

/* ---------------------------------------------------------
   MIGRATION COMPLETE
   ---------------------------------------------------------
   
   Next steps:
   1. Add TOOL_LICENSE_SECRET to .env.local
   2. Configure R2/S3 storage credentials
   3. Test API endpoints
   4. Set up cron job for sp_cleanup_expired_tokens
   
   Cron example (hourly cleanup):
   0 * * * * mysql -u root -p'password' -e "CALL somarnix.sp_cleanup_expired_tokens();"
   
   --------------------------------------------------------- */

/* =========================================================
   STEP 13: MARKETPLACE LEVEL PROGRESSION SYSTEM
   - 100% FREE - Uses only MySQL features (no external services)
   - One unified level (1-1000) for buyers and sellers
   - Money-based progression (not XP)
   - Automatic level updates via database triggers
   - Anti-abuse system built-in
========================================================= */

USE somarnix;

/* ---------------------------------------------------------
   1. ADD LEVEL COLUMNS TO users TABLE
   --------------------------------------------------------- */

-- Add level system columns to existing users table
SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'level'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN level INT UNSIGNED NOT NULL DEFAULT 1 AFTER role'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'progression_score'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN progression_score DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER level'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'buying_score'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN buying_score DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER progression_score'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'selling_score'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN selling_score DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER buying_score'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'quality_bonus'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN quality_bonus DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER selling_score'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'penalties'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN penalties DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER quality_bonus'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'level_last_calculated_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN level_last_calculated_at TIMESTAMP NULL AFTER penalties'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'level_last_changed_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN level_last_changed_at TIMESTAMP NULL AFTER level_last_calculated_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'previous_level'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN previous_level INT UNSIGNED NULL AFTER level_last_changed_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'first_transaction_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN first_transaction_at TIMESTAMP NULL AFTER level_last_changed_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'last_transaction_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN last_transaction_at TIMESTAMP NULL AFTER first_transaction_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND index_name = 'idx_user_level'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD INDEX idx_user_level (level)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND index_name = 'idx_user_progression'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD INDEX idx_user_progression (progression_score)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* ---------------------------------------------------------
   2. CREATE user_level_history TABLE
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS user_level_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  
  -- Level Change
  old_level INT UNSIGNED NOT NULL,
  new_level INT UNSIGNED NOT NULL,
  level_change INT NOT NULL,
  
  -- Score Change
  old_score DECIMAL(12, 2) NOT NULL,
  new_score DECIMAL(12, 2) NOT NULL,
  score_change DECIMAL(12, 2) NOT NULL,
  
  -- Reason
  reason ENUM('purchase', 'sale', 'refund', 'bonus', 'penalty', 'manual_adjustment', 'order_completed') NOT NULL,
  related_order_id BIGINT UNSIGNED NULL,
  related_admin_id BIGINT UNSIGNED NULL,
  
  -- Metadata
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_level_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_level_history_order FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_user_level_history (user_id, created_at),
  INDEX idx_level_change_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   3. CREATE user_level_relationships TABLE
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS user_level_relationships (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  buyer_id BIGINT UNSIGNED NOT NULL,
  seller_id BIGINT UNSIGNED NOT NULL,
  
  -- Trade Stats
  trade_count INT UNSIGNED NOT NULL DEFAULT 0,
  total_volume DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  
  -- Diminishing Return Multiplier (calculated)
  multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  
  -- Last Activity
  last_trade_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Unique Constraint
  UNIQUE KEY uniq_buyer_seller (buyer_id, seller_id),
  
  -- Foreign Keys
  CONSTRAINT fk_relationship_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_relationship_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_buyer (buyer_id),
  INDEX idx_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   4. CREATE user_level_flags TABLE
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS user_level_flags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  
  -- Flag Info
  flag_type ENUM('self_trade', 'velocity', 'refund_abuse', 'pattern', 'manual') NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  description TEXT NOT NULL,
  
  -- Related Data
  related_order_id BIGINT UNSIGNED NULL,
  related_user_id BIGINT UNSIGNED NULL,
  
  -- Status
  status ENUM('open', 'reviewing', 'resolved', 'false_positive') NOT NULL DEFAULT 'open',
  reviewed_by_admin_id BIGINT UNSIGNED NULL,
  review_notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  
  -- Foreign Keys
  CONSTRAINT fk_flags_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_flags_order FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_flags_reviewer FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_user_flags (user_id, status),
  INDEX idx_flag_type (flag_type, severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   5. CREATE level_benefits TABLE (Benefit Definitions)
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS level_benefits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  benefit_key VARCHAR(100) NOT NULL UNIQUE,
  benefit_name VARCHAR(255) NOT NULL,
  benefit_description TEXT,
  benefit_category ENUM('visibility', 'fee', 'trust', 'exclusive', 'analytics') NOT NULL,
  unlock_level INT UNSIGNED NOT NULL,
  benefit_value JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_unlock_level (unlock_level),
  INDEX idx_category (benefit_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   6. CREATE user_level_benefits TABLE (User's Unlocked Benefits)
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS user_level_benefits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  
  -- Benefit Info
  benefit_key VARCHAR(100) NOT NULL,
  benefit_name VARCHAR(255) NOT NULL,
  unlocked_at_level INT UNSIGNED NOT NULL,
  
  -- Status
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique Constraint
  UNIQUE KEY uniq_user_benefit (user_id, benefit_key),
  
  -- Foreign Keys
  CONSTRAINT fk_benefits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_benefits (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   7. CREATE VIEWS for Analytics
   --------------------------------------------------------- */

-- User level stats view
CREATE OR REPLACE VIEW v_user_level_stats AS
SELECT 
  u.id,
  u.email,
  u.username,
  u.level,
  u.progression_score,
  u.buying_score,
  u.selling_score,
  (
    SELECT COUNT(DISTINCT o.id)
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.state IN ('completed', 'approved')
      AND (o.user_id = u.id OR p.posted_by = u.id)
  ) AS total_transactions,
  (
    SELECT COALESCE(SUM(o.total_amount), 0)
    FROM orders o
    WHERE o.user_id = u.id
      AND o.state IN ('completed', 'approved')
  ) AS total_bought,
  (
    SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE p.posted_by = u.id
      AND o.state IN ('completed', 'approved')
  ) AS total_sold,
  (
    SELECT COUNT(DISTINCT o.id)
    FROM orders o
    WHERE o.user_id = u.id
      AND o.state IN ('completed', 'approved')
  ) AS times_bought,
  (
    SELECT COUNT(DISTINCT oi.order_id)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE p.posted_by = u.id
      AND o.state IN ('completed', 'approved')
  ) AS times_sold,
  u.level_last_calculated_at,
  u.level_last_changed_at
FROM users u;

-- Top users by level view
CREATE OR REPLACE VIEW v_top_users_by_level AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.level,
  u.progression_score,
  ulh.created_at AS last_level_up_at
FROM users u
LEFT JOIN user_level_history ulh ON ulh.user_id = u.id 
  AND ulh.new_level = u.level
WHERE u.level >= 10
ORDER BY u.level DESC, u.progression_score DESC
LIMIT 100;

-- Level distribution view
CREATE OR REPLACE VIEW v_level_distribution AS
SELECT 
  CASE 
    WHEN level BETWEEN 1 AND 10 THEN '1-10 (Beginner)'
    WHEN level BETWEEN 11 AND 25 THEN '11-25 (Intermediate)'
    WHEN level BETWEEN 26 AND 50 THEN '26-50 (Advanced)'
    WHEN level BETWEEN 51 AND 100 THEN '51-100 (Expert)'
    WHEN level BETWEEN 101 AND 250 THEN '101-250 (Master)'
    WHEN level BETWEEN 251 AND 500 THEN '251-500 (Grand Master)'
    WHEN level BETWEEN 501 AND 1000 THEN '501-1000 (Legend)'
    ELSE 'Unknown'
  END AS level_tier,
  COUNT(*) AS user_count,
  AVG(level) AS avg_level,
  AVG(progression_score) AS avg_score
FROM users
GROUP BY 
  CASE 
    WHEN level BETWEEN 1 AND 10 THEN '1-10 (Beginner)'
    WHEN level BETWEEN 11 AND 25 THEN '11-25 (Intermediate)'
    WHEN level BETWEEN 26 AND 50 THEN '26-50 (Advanced)'
    WHEN level BETWEEN 51 AND 100 THEN '51-100 (Expert)'
    WHEN level BETWEEN 101 AND 250 THEN '101-250 (Master)'
    WHEN level BETWEEN 251 AND 500 THEN '251-500 (Grand Master)'
    WHEN level BETWEEN 501 AND 1000 THEN '501-1000 (Legend)'
    ELSE 'Unknown'
  END
ORDER BY MIN(level);

/* ---------------------------------------------------------
   8. STORED PROCEDURE: Calculate User Level
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_calculate_user_level //
CREATE PROCEDURE sp_calculate_user_level(
  IN p_user_id BIGINT,
  IN p_reason VARCHAR(50),
  IN p_related_order_id BIGINT
)
BEGIN
  DECLARE v_buying_score DECIMAL(12,2);
  DECLARE v_selling_score DECIMAL(12,2);
  DECLARE v_quality_bonus DECIMAL(12,2);
  DECLARE v_penalties DECIMAL(12,2);
  DECLARE v_total_score DECIMAL(12,2);
  DECLARE v_new_level INT;
  DECLARE v_old_level INT;
  DECLARE v_old_score DECIMAL(12,2);
  DECLARE v_level_change INT;
  DECLARE v_score_change DECIMAL(12,2);
  
  -- Get current level and score
  SELECT level, progression_score INTO v_old_level, v_old_score
  FROM users WHERE id = p_user_id;
  
  -- Calculate buying score (completed orders only)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_buying_score
  FROM orders
  WHERE user_id = p_user_id 
    AND state IN ('completed', 'approved');
  
  -- Calculate selling score (completed orders only)
  SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0) INTO v_selling_score
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN products p ON p.id = oi.product_id
  WHERE p.posted_by = p_user_id
    AND o.state IN ('completed', 'approved');
  
  -- Ratings are not in the current schema yet
  SET v_quality_bonus = 0;
  
  -- Refund penalties are not in the current schema yet
  SET v_penalties = 0;
  
  -- Total score
  SET v_total_score = v_buying_score + v_selling_score + v_quality_bonus - v_penalties;
  
  -- Ensure score doesn't go below 0
  IF v_total_score < 0 THEN
    SET v_total_score = 0;
  END IF;
  
  -- ============================================
  -- TIERED LEVEL FORMULA
  -- ============================================
  -- Level 1-10:   $2 = 1 level (max $20 for level 10)
  -- Level 11-100: $5 = 1 level (max $450 + $20 = $470 for level 100)
  -- Level 101-500: $10 = 1 level (max $4000 + $470 = $4470 for level 500)
  -- Level 501-1000: $20 = 1 level (max $10000 + $4470 = $14470 for level 1000)
  -- ============================================
  
  -- Calculate level based on tiered formula
  IF v_total_score < 20 THEN
    -- Level 1-10: $2 per level
    SET v_new_level = 1 + FLOOR(v_total_score / 2);
  ELSEIF v_total_score < 470 THEN
    -- Level 11-100: $5 per level (after first $20)
    SET v_new_level = 10 + FLOOR((v_total_score - 20) / 5);
  ELSEIF v_total_score < 4470 THEN
    -- Level 101-500: $10 per level (after first $470)
    SET v_new_level = 100 + FLOOR((v_total_score - 470) / 10);
  ELSE
    -- Level 501-1000: $20 per level (after first $4470)
    SET v_new_level = 500 + FLOOR((v_total_score - 4470) / 20);
  END IF;
  
  -- Cap at 1000
  IF v_new_level > 1000 THEN
    SET v_new_level = 1000;
  END IF;
  
  -- Ensure minimum level is 1
  IF v_new_level < 1 THEN
    SET v_new_level = 1;
  END IF;
  
  -- Calculate changes
  SET v_level_change = v_new_level - v_old_level;
  SET v_score_change = v_total_score - v_old_score;
  
  -- Update user
  UPDATE users
  SET progression_score = v_total_score,
      buying_score = v_buying_score,
      selling_score = v_selling_score,
      quality_bonus = v_quality_bonus,
      penalties = v_penalties,
      level = v_new_level,
      previous_level = v_old_level,
      level_last_calculated_at = NOW(),
      level_last_changed_at = CASE 
        WHEN v_new_level != v_old_level THEN NOW() 
        ELSE level_last_changed_at 
      END
  WHERE id = p_user_id;
  
  -- Log to history if level or score changed
  IF v_level_change != 0 OR ABS(v_score_change) > 0.01 THEN
    INSERT INTO user_level_history (
      user_id, old_level, new_level, level_change,
      old_score, new_score, score_change,
      reason, related_order_id, metadata
    ) VALUES (
      p_user_id, v_old_level, v_new_level, v_level_change,
      v_old_score, v_total_score, v_score_change,
      p_reason, p_related_order_id,
      JSON_OBJECT(
        'buying_score', v_buying_score,
        'selling_score', v_selling_score,
        'quality_bonus', v_quality_bonus,
        'penalties', v_penalties
      )
    );
  END IF;
  
  -- Update first/last transaction dates
  UPDATE users u
  SET first_transaction_at = (
    SELECT MIN(t.created_at)
    FROM (
      SELECT o.created_at
      FROM orders o
      WHERE o.user_id = u.id
        AND o.state IN ('completed', 'approved')
      UNION ALL
      SELECT o.created_at
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.posted_by = u.id
        AND o.state IN ('completed', 'approved')
    ) AS t
  ),
  last_transaction_at = (
    SELECT MAX(t.created_at)
    FROM (
      SELECT o.created_at
      FROM orders o
      WHERE o.user_id = u.id
        AND o.state IN ('completed', 'approved')
      UNION ALL
      SELECT o.created_at
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.posted_by = u.id
        AND o.state IN ('completed', 'approved')
    ) AS t
  )
  WHERE u.id = p_user_id;
  
END //

DELIMITER ;

/* ---------------------------------------------------------
   9. STORED PROCEDURE: Check Self-Trade
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_check_self_trade //
CREATE PROCEDURE sp_check_self_trade(
  IN p_buyer_id BIGINT,
  IN p_seller_id BIGINT,
  IN p_order_id BIGINT
)
BEGIN
  DECLARE v_match_count INT DEFAULT 0;
  DECLARE v_flag_description TEXT;
  
  -- Check for self-trade signals
  -- Signal 1: Same user ID
  IF p_buyer_id = p_seller_id THEN
    SET v_match_count = v_match_count + 10; -- Critical
  END IF;
  
  -- Signal 2: Same device (if you track devices)
  -- Add your device check here if you have device tracking
  
  -- Signal 3: Check if they share shipping address (you may need to join order_addresses)
  -- Add your address check here
  
  -- If suspicious, create flag
  IF v_match_count >= 10 THEN
    SET v_flag_description = CONCAT('Potential self-trade detected. Match score: ', v_match_count);
    
    INSERT INTO user_level_flags (
      user_id, flag_type, severity, description,
      related_order_id, related_user_id, status
    ) VALUES (
      p_buyer_id, 'self_trade', 
      CASE WHEN v_match_count >= 10 THEN 'critical' ELSE 'high' END,
      v_flag_description,
      p_order_id,
      p_seller_id,
      'open'
    );
  END IF;
  
  -- Return match count for application-level handling
  SELECT v_match_count AS self_trade_score;
  
END //

DELIMITER ;

/* ---------------------------------------------------------
   10. STORED PROCEDURE: Update Relationship (Diminishing Returns)
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_update_relationship //
CREATE PROCEDURE sp_update_relationship(
  IN p_buyer_id BIGINT,
  IN p_seller_id BIGINT,
  IN p_amount DECIMAL(12,2)
)
BEGIN
  DECLARE v_trade_count INT;
  DECLARE v_multiplier DECIMAL(3,2);
  
  -- Insert or update relationship
  INSERT INTO user_level_relationships (
    buyer_id, seller_id, trade_count, total_volume, multiplier
  ) VALUES (
    p_buyer_id, p_seller_id, 1, p_amount, 1.00
  )
  ON DUPLICATE KEY UPDATE
    trade_count = trade_count + 1,
    total_volume = total_volume + p_amount,
    last_trade_at = NOW();
  
  -- Get updated trade count
  SELECT trade_count INTO v_trade_count
  FROM user_level_relationships
  WHERE buyer_id = p_buyer_id AND seller_id = p_seller_id;
  
  -- Calculate diminishing return multiplier
  -- 1st trade: 100%, 2nd: 80%, 3rd: 60%, 4th+: 50%
  SET v_multiplier = CASE
    WHEN v_trade_count = 1 THEN 1.00
    WHEN v_trade_count = 2 THEN 0.80
    WHEN v_trade_count = 3 THEN 0.60
    ELSE 0.50
  END;
  
  -- Update multiplier
  UPDATE user_level_relationships
  SET multiplier = v_multiplier
  WHERE buyer_id = p_buyer_id AND seller_id = p_seller_id;
  
  -- Return multiplier for use in level calculation
  SELECT v_multiplier AS relationship_multiplier;
  
END //

DELIMITER ;

/* ---------------------------------------------------------
   11. STORED PROCEDURE: Apply Refund Clawback
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_apply_refund_clawback //
CREATE PROCEDURE sp_apply_refund_clawback(
  IN p_order_id BIGINT,
  IN p_refund_amount DECIMAL(12,2),
  IN p_buyer_id BIGINT,
  IN p_seller_id BIGINT
)
BEGIN
  DECLARE v_original_points DECIMAL(12,2);
  DECLARE v_penalty DECIMAL(12,2);
  
  -- Calculate original points from this transaction
  SET v_original_points = p_refund_amount;
  
  -- Calculate penalty (20% of refund amount)
  SET v_penalty = p_refund_amount * 0.2;
  
  -- Remove points from buyer
  UPDATE users
  SET progression_score = progression_score - v_original_points,
      buying_score = buying_score - v_original_points,
      penalties = penalties + v_penalty,
      level = GREATEST(1, FLOOR(1 + POW((progression_score - v_original_points) / 10, 0.6))),
      level_last_changed_at = NOW()
  WHERE id = p_buyer_id;
  
  -- Remove points from seller
  UPDATE users
  SET progression_score = progression_score - v_original_points,
      selling_score = selling_score - v_original_points,
      penalties = penalties + v_penalty,
      level = GREATEST(1, FLOOR(1 + POW((progression_score - v_original_points) / 10, 0.6))),
      level_last_changed_at = NOW()
  WHERE id = p_seller_id;
  
  -- Log the clawback for buyer
  INSERT INTO user_level_history (
    user_id, old_level, new_level, level_change,
    old_score, new_score, score_change,
    reason, related_order_id
  )
  SELECT 
    p_buyer_id, level, 
    GREATEST(1, FLOOR(1 + POW((progression_score - v_original_points) / 10, 0.6))),
    GREATEST(1, FLOOR(1 + POW((progression_score - v_original_points) / 10, 0.6))) - level,
    progression_score, progression_score - v_original_points, -v_original_points,
    'refund', p_order_id
  FROM users WHERE id = p_buyer_id;
  
  -- Recalculate levels properly
  CALL sp_calculate_user_level(p_buyer_id, 'refund', p_order_id);
  CALL sp_calculate_user_level(p_seller_id, 'refund', p_order_id);
  
END //

DELIMITER ;

/* ---------------------------------------------------------
   12. STORED PROCEDURE: Cleanup Expired Data
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_level_system_cleanup //
CREATE PROCEDURE sp_level_system_cleanup()
BEGIN
  DECLARE v_deleted_flags INT DEFAULT 0;
  
  -- Delete old resolved flags (older than 90 days)
  DELETE FROM user_level_flags
  WHERE status IN ('resolved', 'false_positive')
    AND reviewed_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
  
  SET v_deleted_flags = ROW_COUNT();
  
  -- Recalculate all user levels (reconciliation - run weekly)
  -- This ensures data consistency
  UPDATE users u
  SET buying_score = (
    SELECT COALESCE(SUM(o.total_amount), 0)
    FROM orders o
    WHERE o.user_id = u.id
      AND o.state IN ('completed', 'approved')
  ),
  selling_score = (
    SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE p.posted_by = u.id
      AND o.state IN ('completed', 'approved')
  ),
  quality_bonus = 0.00,
  penalties = 0.00,
  progression_score = (
    SELECT COALESCE(SUM(o.total_amount), 0)
    FROM orders o
    WHERE o.user_id = u.id
      AND o.state IN ('completed', 'approved')
  ) + (
    SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE p.posted_by = u.id
      AND o.state IN ('completed', 'approved')
  ),
  level = CASE
    WHEN (
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) < 20 THEN 1 + FLOOR((
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) / 2)
    WHEN (
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) < 470 THEN 10 + FLOOR(((
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) - 20) / 5)
    WHEN (
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) < 4470 THEN 100 + FLOOR(((
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) - 470) / 10)
    ELSE LEAST(1000, 500 + FLOOR(((
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) - 4470) / 20))
  END,
  level_last_calculated_at = NOW()
  WHERE id > 0;
  
  -- Return cleanup stats
  SELECT 
    v_deleted_flags AS flags_cleaned,
    ROW_COUNT() AS users_recalculated;
  
END //

DELIMITER ;

/* ---------------------------------------------------------
   13. INSERT DEFAULT BENEFITS (LEVEL BADGES ONLY - NO DISCOUNTS)
        With English and Khmer Translations
   --------------------------------------------------------- */

-- Insert default level benefits - BADGES ONLY (no discounts yet)
-- These are visual badges to show user's level tier
-- Includes both English (en) and Khmer (km) translations

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_10' AS benefit_key, 
         'Level 10 Badge' AS benefit_name, 
         'Reached Level 10 - Active User' AS benefit_description,
         'visibility' AS benefit_category, 
         10 AS unlock_level, 
         JSON_OBJECT(
           'badge_icon', 'level_10.png', 
           'color', 'gray',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 10 Badge', 'description', 'Reached Level 10 - Active User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ១០', 'description', 'ឈានដល់លេខ ១០ - អ្នកជួញដូរសកម្ម')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_10'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_25', 
         'Level 25 Badge', 
         'Reached Level 25 - Experienced User' AS benefit_description,
         'visibility', 
         25, 
         JSON_OBJECT(
           'badge_icon', 'level_25.png', 
           'color', 'bronze',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 25 Badge', 'description', 'Reached Level 25 - Experienced User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ២៥', 'description', 'ឈានដល់លេខ ២៥ - អ្នកជួញដូរមានបទពិសោធន៍')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_25'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_50', 
         'Level 50 Badge', 
         'Reached Level 50 - Trusted User' AS benefit_description,
         'visibility', 
         50, 
         JSON_OBJECT(
           'badge_icon', 'level_50.png', 
           'color', 'silver',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 50 Badge', 'description', 'Reached Level 50 - Trusted User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ៥០', 'description', 'ឈានដល់លេខ ៥០ - អ្នកជួញដូរទុកចិត្តបាន')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_50'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_100', 
         'Level 100 Badge', 
         'Reached Level 100 - Expert User' AS benefit_description,
         'visibility', 
         100, 
         JSON_OBJECT(
           'badge_icon', 'level_100.png', 
           'color', 'gold',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 100 Badge', 'description', 'Reached Level 100 - Expert User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ១០០', 'description', 'ឈានដល់លេខ ១០០ - អ្នកជួញដូរជំនាញ')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_100'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_250', 
         'Level 250 Badge', 
         'Reached Level 250 - Master User' AS benefit_description,
         'visibility', 
         250, 
         JSON_OBJECT(
           'badge_icon', 'level_250.png', 
           'color', 'platinum',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 250 Badge', 'description', 'Reached Level 250 - Master User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ២៥០', 'description', 'ឈានដល់លេខ ២៥០ - អ្នកជួញដូរកម្រិតខ្ពស់')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_250'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_500', 
         'Level 500 Badge', 
         'Reached Level 500 - Grand Master User' AS benefit_description,
         'visibility', 
         500, 
         JSON_OBJECT(
           'badge_icon', 'level_500.png', 
           'color', 'diamond',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 500 Badge', 'description', 'Reached Level 500 - Grand Master User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ៥០០', 'description', 'ឈានដល់លេខ ៥០០ - អ្នកជួញដូរកម្រិតធំ')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_500'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_1000',
         'Level 1000 Badge',
         'Reached Level 1000 - LEGEND - Highest honor' AS benefit_description,
         'visibility',
         1000,
         JSON_OBJECT(
           'badge_icon', 'level_1000.svg',
           'color', 'legendary',
           'verify_badge', 'blue_verify.svg',
           'borders', JSON_ARRAY('border_1.svg', 'border_2.svg', 'border_3.svg', 'border_4.svg', 'border_5.svg', 'border_6.svg', 'border_7.svg', 'border_8.svg', 'border_9.svg', 'border_10.svg', 'border_11.svg', 'border_12.svg', 'border_13.svg', 'border_14.svg', 'border_15.svg'),
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 1000 Badge', 'description', 'Reached Level 1000 - LEGEND - Highest honor'),
             'km', JSON_OBJECT('name', 'Level ១០០០', 'description', 'ឈានដល់លេខ ១០០០ - កិរ្តិយស - កិត្តិយសខ្ពស់បំផុត')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_1000'
);

-- Level 2+ Blue Verify Badge (unlocks at level 2)
INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'verify_badge_blue',
         'Blue Verify Badge',
         'Verified User - Level 2 or higher' AS benefit_description,
         'visibility',
         2,
         JSON_OBJECT(
           'badge_icon', 'blue_verify.svg',
           'color', 'blue',
           'verify_type', 'blue',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Blue Verify Badge', 'description', 'Verified User - Level 2 or higher'),
             'km', JSON_OBJECT('name', 'ផ្លាកផ្ទៀងផ្ទាត់ពណ៌ខៀវ', 'description', 'អ្នកជួញដូរដែលបានផ្ទៀងផ្ទាត់ - លេខ ២ ឡើង')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'verify_badge_blue'
);

-- Border Collection (15 borders, unlock at level 2)
INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'border_collection_1_15',
         'Border Collection (1-15)',
         '15 exclusive borders for Level 2+ users' AS benefit_description,
         'visibility',
         2,
         JSON_OBJECT(
           'borders', JSON_ARRAY(
             'border_1.svg', 'border_2.svg', 'border_3.svg', 'border_4.svg', 'border_5.svg',
             'border_6.svg', 'border_7.svg', 'border_8.svg', 'border_9.svg', 'border_10.svg',
             'border_11.svg', 'border_12.svg', 'border_13.svg', 'border_14.svg', 'border_15.svg'
           ),
           'color', 'various',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Border Collection (1-15)', 'description', '15 exclusive borders for Level 2+ users'),
             'km', JSON_OBJECT('name', 'ស៊ុមចំនួន ១៥', 'description', 'ស៊ុមពិសេសចំនួន ១៥ សម្រាប់អ្នកប្រើលេខ ២ ឡើង')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'border_collection_1_15'
);

-- NOTE: No fee discounts or other benefits yet
-- This is a PURE LEVEL system only
-- Includes English (en) and Khmer (km) translations
-- Badge files should be in: public/Budget SOMARNIX SVG/
-- You can add discounts/benefits later by inserting more records into level_benefits table

/* ---------------------------------------------------------
   14. ENABLE MySQL Event Scheduler
   --------------------------------------------------------- */

-- Optional manual step:
-- Run SET GLOBAL event_scheduler = ON; as MySQL root if your server allows it.
-- Do not execute that command from this import file because many shared/VPS
-- database users do not have SUPER or SYSTEM_VARIABLES_ADMIN privileges.

/* ---------------------------------------------------------
   15. CREATE SCHEDULED EVENTS
   --------------------------------------------------------- */

-- Daily cleanup event
DROP EVENT IF EXISTS daily_level_cleanup;

DELIMITER //

CREATE EVENT daily_level_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 2 HOUR
DO
BEGIN
  -- Call cleanup procedure
  CALL sp_level_system_cleanup();
END //

DELIMITER ;

-- Weekly reconciliation event (recalculate all levels)
DROP EVENT IF EXISTS weekly_level_reconciliation;

DELIMITER //

CREATE EVENT weekly_level_reconciliation
ON SCHEDULE EVERY 1 WEEK
STARTS CURRENT_DATE + INTERVAL 1 WEEK + INTERVAL 3 HOUR
DO
BEGIN
  -- Recalculate all user levels for consistency using tiered formula
  UPDATE users u
  SET level = CASE
    WHEN progression_score < 20 THEN 1 + FLOOR(progression_score / 2)
    WHEN progression_score < 470 THEN 10 + FLOOR((progression_score - 20) / 5)
    WHEN progression_score < 4470 THEN 100 + FLOOR((progression_score - 470) / 10)
    ELSE 500 + FLOOR((progression_score - 4470) / 20)
  END,
  level_last_calculated_at = NOW()
  WHERE id > 0;
END //

DELIMITER ;

/* ---------------------------------------------------------
   16. VERIFICATION QUERIES
   --------------------------------------------------------- */

-- Check tables created
SELECT 'New tables created:' AS info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name IN (
    'user_level_history',
    'user_level_relationships', 
    'user_level_flags',
    'level_benefits',
    'user_level_benefits'
  );

-- Check users table has new columns
SELECT 'users table columns:' AS info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'users'
  AND column_name IN (
    'level', 'progression_score', 'buying_score',
    'selling_score', 'quality_bonus', 'penalties'
  );

-- Check stored procedures exist
SELECT 'Stored procedures created:' AS info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = DATABASE() 
  AND routine_type = 'PROCEDURE'
  AND routine_name LIKE 'sp_%level%';

-- Check events exist
SELECT 'Scheduled events created:' AS info;
SELECT event_name 
FROM information_schema.events 
WHERE event_schema = DATABASE();

/* ---------------------------------------------------------
   MIGRATION COMPLETE
   ---------------------------------------------------------
   
   Next steps:
   1. Test stored procedures with sample data
   2. Add API endpoints for level display
   3. Add frontend components to show user level
   4. Monitor level updates in production
   
   Manual level calculation (if needed):
   CALL sp_calculate_user_level(user_id, 'manual_adjustment', NULL);
   
   Cleanup (runs automatically daily):
   CALL sp_level_system_cleanup();
   
   --------------------------------------------------------- */

/* =========================================================
   STEP 14: AVATAR URL LENGTH
========================================================= */
USE somarnix;
-- No action needed in full schema.
-- The base users table created in Step 1 already uses avatar_url VARCHAR(2000).

/* =========================================================
   STEP 17: SUPPORT FAQS
========================================================= */

CREATE TABLE IF NOT EXISTS support_faqs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_en VARCHAR(500) NOT NULL,
  question_km VARCHAR(500) NOT NULL,
  answer_en TEXT NOT NULL,
  answer_km TEXT NOT NULL,
  video_url VARCHAR(2000) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_support_faqs_active_sort (is_active, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
