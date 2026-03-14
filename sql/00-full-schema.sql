/* =========================================================
   FULL SCHEMA
   Generated from the clean ordered SQL files in this folder.
   Run this for a one-file setup.
========================================================= */
/* =========================================================
   STEP 1: CORE AUTH + COMMERCE
========================================================= */

-- DROP DATABASE IF EXISTS gstechedukh;
-- CREATE DATABASE gstechedukh
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_unicode_ci;

USE gstechedukh;

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
  avatar_url VARCHAR(255) NULL,
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
  UNIQUE KEY uniq_user_login_device (user_id, device_id),
  INDEX idx_user_login_last_seen (user_id, last_seen_at),
  CONSTRAINT fk_user_login_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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


/* =========================================================
   STEP 3: VIDEO LEARNING
========================================================= */

USE gstechedukh;

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

USE gstechedukh;

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

USE gstechedukh;

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

USE gstechedukh;

CREATE TABLE IF NOT EXISTS user_api_keys (
  user_id BIGINT UNSIGNED NOT NULL,
  groq_api_key_enc LONGTEXT NULL,
  openai_api_key_enc LONGTEXT NULL,
  google_api_key_enc LONGTEXT NULL,
  deepl_api_key_enc LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

