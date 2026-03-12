USE gstechedukh;

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
  INDEX idx_video_course_cart_plan (plan_id)
) ENGINE=InnoDB;

