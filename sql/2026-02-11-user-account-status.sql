USE gstechedukh;

/*
Account status model (no new enum column needed):
- active  = is_active = 1 AND deleted_at IS NULL
- banned  = is_active = 0 AND deleted_at IS NULL
- deleted = deleted_at IS NOT NULL
*/

-- Ensure deleted_at exists (safe add-if-missing)
SET @has_deleted_at := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'deleted_at'
);
SET @sql := IF(
  @has_deleted_at = 0,
  'ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL AFTER is_active',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add index used by admin users page status filters (safe add-if-missing)
SET @has_idx := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'idx_users_admin_status'
);
SET @sql := IF(
  @has_idx = 0,
  'ALTER TABLE users ADD INDEX idx_users_admin_status (deleted_at, is_active)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

