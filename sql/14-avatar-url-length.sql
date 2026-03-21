/* =========================================================
   STEP 14: LEGACY AVATAR URL LENGTH UPGRADE
   - Only for databases where users.avatar_url is still shorter than 2000
   - Fresh databases created from 01-core-auth-commerce.sql already have this
========================================================= */

USE gstechedukh;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'avatar_url'
      AND IFNULL(character_maximum_length, 0) < 2000
  ),
  'ALTER TABLE users MODIFY COLUMN avatar_url VARCHAR(2000) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
