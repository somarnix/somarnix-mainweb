USE gstechedukh;

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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promotion_combo_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  combo_id BIGINT UNSIGNED NOT NULL,
  item_type ENUM('course','tool','product') NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NULL,
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_combo_items_combo (combo_id),
  CONSTRAINT fk_combo_items_combo FOREIGN KEY (combo_id)
    REFERENCES promotion_combos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET @has_promo_khqr := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'promotion_combos'
    AND column_name = 'khqr'
);
SET @sql := IF(
  @has_promo_khqr = 0,
  'ALTER TABLE promotion_combos ADD COLUMN khqr VARCHAR(500) NULL AFTER thumbnail_url',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_promo_start_at := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'promotion_combos'
    AND column_name = 'start_at'
);
SET @sql := IF(
  @has_promo_start_at = 0,
  'ALTER TABLE promotion_combos ADD COLUMN start_at DATETIME NULL AFTER usdqr',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_promo_end_at := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'promotion_combos'
    AND column_name = 'end_at'
);
SET @sql := IF(
  @has_promo_end_at = 0,
  'ALTER TABLE promotion_combos ADD COLUMN end_at DATETIME NULL AFTER start_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_promo_usdqr := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'promotion_combos'
    AND column_name = 'usdqr'
);
SET @sql := IF(
  @has_promo_usdqr = 0,
  'ALTER TABLE promotion_combos ADD COLUMN usdqr VARCHAR(500) NULL AFTER khqr',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
