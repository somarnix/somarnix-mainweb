USE gstechedukh;

-- Temporary/lifetime ban support on users
SET @has_banned_at := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'banned_at'
);
SET @sql := IF(
  @has_banned_at = 0,
  'ALTER TABLE users ADD COLUMN banned_at DATETIME NULL AFTER deleted_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_ban_until := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'ban_until'
);
SET @sql := IF(
  @has_ban_until = 0,
  'ALTER TABLE users ADD COLUMN ban_until DATETIME NULL AFTER banned_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_ban_reason := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'ban_reason'
);
SET @sql := IF(
  @has_ban_reason = 0,
  'ALTER TABLE users ADD COLUMN ban_reason VARCHAR(255) NULL AFTER ban_until',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Indexes for fast admin filtering and expiry cleanup
SET @has_idx := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'idx_users_ban_until'
);
SET @sql := IF(
  @has_idx = 0,
  'ALTER TABLE users ADD INDEX idx_users_ban_until (ban_until)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

