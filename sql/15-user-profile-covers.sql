/* =========================================================
   STEP 15: LEGACY USER PROFILE COVER UPGRADE
   - Only for databases created before Step 1 included cover columns
   - Fresh databases created from 01-core-auth-commerce.sql can skip this
========================================================= */

USE gstechedukh;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'cover_url'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN cover_url VARCHAR(2000) NULL AFTER avatar_url'
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
      AND column_name = 'cover_position_x'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN cover_position_x DECIMAL(6,2) NOT NULL DEFAULT 50.00 AFTER cover_url'
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
      AND column_name = 'cover_position_y'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN cover_position_y DECIMAL(6,2) NOT NULL DEFAULT 50.00 AFTER cover_position_x'
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
      AND column_name = 'cover_scale'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN cover_scale DECIMAL(6,2) NOT NULL DEFAULT 1.00 AFTER cover_position_y'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
