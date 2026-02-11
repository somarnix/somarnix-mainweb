USE gstechedukh;

/* =========================================================
   CLEAN SYNC MIGRATION
   - Safe to run multiple times
   - Fixes device/login/email-verification schema
   - Syncs course/subscription access with order state
========================================================= */

/* =========================================================
   1) USERS: ban + email verification columns
========================================================= */
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'banned_at') = 0,
  "ALTER TABLE users ADD COLUMN banned_at DATETIME NULL AFTER deleted_at",
  "SELECT 1"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'ban_until') = 0,
  "ALTER TABLE users ADD COLUMN ban_until DATETIME NULL AFTER banned_at",
  "SELECT 1"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'email_verified_at') = 0,
  "ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL",
  "SELECT 1"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE INDEX idx_users_ban_until ON users (ban_until);
CREATE INDEX idx_users_admin_status ON users (deleted_at, is_active);

/* Backfill existing active users as verified so old accounts still login */
UPDATE users
SET email_verified_at = COALESCE(updated_at, created_at, NOW())
WHERE email_verified_at IS NULL
  AND is_active = 1
  AND deleted_at IS NULL;

/* =========================================================
   2) PRESENCE INDEX
========================================================= */
CREATE INDEX idx_user_presence_status_last_active ON user_presence (status, last_active_at);

/* =========================================================
   3) ORDER/PAYMENT STATE COLUMNS
========================================================= */
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'payment_state') = 0,
  "ALTER TABLE orders
     ADD COLUMN payment_state ENUM('waiting','approved','declined') NOT NULL DEFAULT 'waiting' AFTER result,
     ADD COLUMN payment_review_note VARCHAR(255) NULL AFTER payment_state,
     ADD COLUMN payment_reviewed_by BIGINT UNSIGNED NULL AFTER payment_review_note,
     ADD COLUMN payment_reviewed_at DATETIME NULL AFTER payment_reviewed_by,
     ADD INDEX idx_orders_payment_state (payment_state),
     ADD CONSTRAINT fk_orders_payment_reviewer
       FOREIGN KEY (payment_reviewed_by) REFERENCES users(id) ON DELETE SET NULL",
  "SELECT 1"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'payments' AND column_name = 'admin_decision') = 0,
  "ALTER TABLE payments
     ADD COLUMN admin_decision ENUM('waiting','approved','declined') NOT NULL DEFAULT 'waiting' AFTER method,
     ADD COLUMN decision_note VARCHAR(255) NULL AFTER admin_decision,
     ADD COLUMN decided_by BIGINT UNSIGNED NULL AFTER decision_note,
     ADD COLUMN decided_at DATETIME NULL AFTER decided_by,
     ADD INDEX idx_pay_admin_decision (admin_decision),
     ADD CONSTRAINT fk_pay_decided_by
       FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL",
  "SELECT 1"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Backfill orders.payment_state from state/result */
UPDATE orders
SET payment_state = CASE
  WHEN state = 'cancelled' OR result = 'failed' THEN 'declined'
  WHEN state IN ('approved','delivering','completed') OR result = 'done' THEN 'approved'
  ELSE 'waiting'
END
WHERE payment_state IS NULL OR payment_state NOT IN ('waiting','approved','declined');

/* Sync orders.payment_state from latest payment decision (if exists) */
UPDATE orders o
LEFT JOIN (
  SELECT p1.order_id, p1.admin_decision
  FROM payments p1
  JOIN (
    SELECT order_id, MAX(id) AS max_id
    FROM payments
    GROUP BY order_id
  ) px ON px.max_id = p1.id
) lp ON lp.order_id = o.id
SET o.payment_state = CASE
  WHEN lp.admin_decision IN ('approved','declined','waiting') THEN lp.admin_decision
  WHEN o.payment_state IN ('approved','declined','waiting') THEN o.payment_state
  ELSE 'waiting'
END;

/* Make orders.state/result consistent with payment_state */
UPDATE orders
SET
  state = CASE
    WHEN payment_state = 'approved' AND state = 'pending' THEN 'approved'
    WHEN payment_state = 'declined' THEN 'cancelled'
    ELSE state
  END,
  result = CASE
    WHEN payment_state = 'declined' THEN 'failed'
    WHEN payment_state = 'approved' AND result = 'failed' THEN 'none'
    ELSE result
  END;

/* Backfill latest payment decision */
UPDATE payments p
JOIN orders o ON o.id = p.order_id
SET p.admin_decision = o.payment_state
WHERE p.admin_decision IS NULL;

/* =========================================================
   4) VIDEO COURSE PLAN DEVICE COLUMNS
========================================================= */
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'video_course_plans' AND column_name = 'max_devices') = 0,
  "ALTER TABLE video_course_plans ADD COLUMN max_devices INT NOT NULL DEFAULT 10 AFTER price",
  "SELECT 1"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'video_course_plans' AND column_name = 'is_unlimited_device') = 0,
  "ALTER TABLE video_course_plans ADD COLUMN is_unlimited_device TINYINT(1) NOT NULL DEFAULT 0 AFTER max_devices",
  "SELECT 1"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE video_course_plans
SET max_devices = 10
WHERE COALESCE(is_unlimited_device, 0) = 0;

UPDATE video_course_plans
SET max_devices = 9999, is_unlimited_device = 1
WHERE access_type = 'lifetime';

/* =========================================================
   5) LOGIN DEVICE LIMIT TABLES (GLOBAL)
========================================================= */
CREATE TABLE IF NOT EXISTS user_login_settings (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  max_devices INT NOT NULL DEFAULT 10,
  CONSTRAINT fk_user_login_settings_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_login_devices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  device_name VARCHAR(120) NULL,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_login_device (user_id, device_id),
  INDEX idx_user_login_last_seen (user_id, last_seen_at),
  CONSTRAINT fk_user_login_devices_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO user_login_settings (user_id, max_devices)
SELECT u.id, 10
FROM users u
LEFT JOIN user_login_settings s ON s.user_id = u.id
WHERE s.user_id IS NULL;

/* =========================================================
   6) PER-COURSE DEVICE ACCESS TABLE
========================================================= */
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
  CONSTRAINT fk_video_course_device_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_course_device_course
    FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

/* =========================================================
   7) PROFILE "LOGOUT OTHER DEVICE" OTP TABLE
========================================================= */
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
  CONSTRAINT fk_udlc_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

/* =========================================================
   8) EMAIL VERIFICATION TABLE
========================================================= */
CREATE TABLE IF NOT EXISTS user_email_verifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uev_user_created (user_id, created_at),
  INDEX idx_uev_user_expires (user_id, expires_at),
  CONSTRAINT fk_uev_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

/* =========================================================
   9) ACCESS STATUS SYNC FOR VIDEO PURCHASES/SUBSCRIPTIONS
========================================================= */
UPDATE video_course_purchases p
JOIN orders o ON o.id = p.order_id
SET p.status = 'cancelled'
WHERE p.status <> 'cancelled'
  AND (
    o.state IN ('cancelled', 'resolution')
    OR COALESCE(o.payment_state, 'waiting') = 'declined'
  );

/* keep approved/delivering as pending (do not unlock before complete) */
UPDATE video_course_purchases p
JOIN orders o ON o.id = p.order_id
SET p.status = 'pending'
WHERE p.status = 'active'
  AND o.state IN ('approved', 'delivering');

UPDATE video_course_purchases p
JOIN orders o ON o.id = p.order_id
JOIN video_course_plans pl ON pl.id = p.plan_id
SET
  p.status = 'active',
  p.access_start = COALESCE(p.access_start, NOW()),
  p.access_end = CASE
    WHEN pl.access_type = 'lifetime' THEN NULL
    WHEN pl.duration_days IS NOT NULL
      THEN DATE_ADD(COALESCE(p.access_start, NOW()), INTERVAL pl.duration_days DAY)
    ELSE p.access_end
  END
WHERE p.status = 'pending'
  AND o.state IN ('completed', 'complete');

UPDATE video_course_purchases
SET status = 'expired'
WHERE status = 'active'
  AND access_end IS NOT NULL
  AND access_end < NOW();

UPDATE video_subscriptions s
JOIN orders o ON o.id = s.order_id
SET s.status = 'cancelled'
WHERE s.status <> 'cancelled'
  AND (
    o.state IN ('cancelled', 'resolution')
    OR COALESCE(o.payment_state, 'waiting') = 'declined'
  );

UPDATE video_subscriptions s
JOIN orders o ON o.id = s.order_id
SET s.status = 'pending'
WHERE s.status = 'active'
  AND o.state IN ('approved', 'delivering');

UPDATE video_subscriptions s
JOIN orders o ON o.id = s.order_id
JOIN video_subscription_plans sp ON sp.id = s.plan_id
SET
  s.status = 'active',
  s.access_start = COALESCE(s.access_start, NOW()),
  s.access_end = DATE_ADD(COALESCE(s.access_start, NOW()), INTERVAL sp.duration_days DAY)
WHERE s.status = 'pending'
  AND o.state IN ('completed', 'complete');

UPDATE video_subscriptions
SET status = 'expired'
WHERE status = 'active'
  AND access_end < NOW();

/* =========================================================
   10) TOOL DEVICE LIMIT FIX (support both schemas)
========================================================= */
UPDATE product_variants pv
JOIN products p ON p.id = pv.product_id
JOIN product_categories pc ON pc.id = p.category_id
SET pv.device_limit = 10
WHERE LOWER(pc.name) = 'tools'
  AND COALESCE(pv.is_unlimited_device, 0) = 0
  AND (pv.device_limit IS NULL OR pv.device_limit < 1);

SET @has_tool_variants := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'tool_variants'
);

SET @sql := IF(
  @has_tool_variants > 0,
  "UPDATE tool_variants
   SET device_limit = 10
   WHERE COALESCE(is_unlimited_device, 0) = 0
     AND (device_limit IS NULL OR device_limit < 1)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
