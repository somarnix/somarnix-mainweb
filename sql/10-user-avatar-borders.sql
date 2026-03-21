/* =========================================================
   STEP 10: LEGACY USER AVATAR BORDER UPGRADE
   - Only for databases created before Step 1 included avatar_border_url
   - Fresh databases created from 01-core-auth-commerce.sql can skip this
========================================================= */

USE gstechedukh;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'avatar_border_url'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN avatar_border_url VARCHAR(255) NULL AFTER avatar_url'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
