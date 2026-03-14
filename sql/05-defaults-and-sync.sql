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
