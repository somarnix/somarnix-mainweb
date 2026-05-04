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
