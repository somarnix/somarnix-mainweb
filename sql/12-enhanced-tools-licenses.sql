/* =========================================================
   STEP 12: ENHANCED TOOLS & LICENSES SYSTEM
   - Adds NEW tables only (no drops - safe for production)
   - Compatible with 04-tools-and-licenses.sql
   - Compatible with 11-tool-definitions.sql
========================================================= */

USE somarnix;

/* ---------------------------------------------------------
   1. tool_definitions comes fully from file 11
      Step 12 must not ALTER tool_definitions
   --------------------------------------------------------- */

/* ---------------------------------------------------------
   2. CREATE tool_download_tokens TABLE (NEW)
      For secure one-time download URLs
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS tool_download_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  license_id BIGINT UNSIGNED,
  tool_definition_id BIGINT UNSIGNED NOT NULL,
  
  token VARCHAR(128) NOT NULL UNIQUE,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  
  max_downloads INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  
  ip_address VARCHAR(64),
  user_agent VARCHAR(500),
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_used_at TIMESTAMP NULL,
  
  CONSTRAINT fk_download_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_download_token_license FOREIGN KEY (license_id) REFERENCES tool_license_keys(id) ON DELETE SET NULL,
  CONSTRAINT fk_download_token_tool FOREIGN KEY (tool_definition_id) REFERENCES tool_definitions(id) ON DELETE CASCADE,
  
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  INDEX idx_user_tool (user_id, tool_definition_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   3. CREATE license_rate_limits TABLE (NEW)
      Enhanced rate limiting (separate from failed_attempts)
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS license_rate_limits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  license_key_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  device_id VARCHAR(128),
  
  action_type ENUM('validate','activate','download','heartbeat') NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  last_request_at DATETIME NOT NULL,
  
  blocked_until DATETIME NULL,
  permanent_block TINYINT(1) NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uniq_rate_limit (license_key_hash, ip_address, device_id, action_type),
  INDEX idx_blocked_until (blocked_until),
  INDEX idx_last_request (last_request_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   4. CREATE device_fingerprints TABLE (NEW)
      Better device identification
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS device_fingerprints (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  
  fingerprint_hash CHAR(64) NOT NULL,
  platform ENUM('windows','macos','linux','android','ios','web') NOT NULL,
  platform_version VARCHAR(50),
  app_version VARCHAR(50),
  
  cpu_cores INT,
  total_memory_gb INT,
  screen_resolution VARCHAR(20),
  
  trust_score INT NOT NULL DEFAULT 100,
  is_suspicious TINYINT(1) NOT NULL DEFAULT 0,
  suspicion_reason VARCHAR(255),
  
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uniq_device_fingerprint (device_id, fingerprint_hash),
  INDEX idx_user_device (user_id, device_id),
  INDEX idx_trust_score (trust_score),
  
  CONSTRAINT fk_fingerprint_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   5. CREATE tool_access_stats TABLE (NEW)
      Analytics for tool usage
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS tool_access_stats (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tool_definition_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  license_id BIGINT UNSIGNED,
  
  access_date DATE NOT NULL,
  access_count INT NOT NULL DEFAULT 1,
  last_access_at DATETIME NOT NULL,
  
  UNIQUE KEY uniq_tool_access_stats (tool_definition_id, user_id, access_date),
  INDEX idx_access_date (access_date),
  INDEX idx_tool_date (tool_definition_id, access_date),
  
  CONSTRAINT fk_access_stats_tool FOREIGN KEY (tool_definition_id) REFERENCES tool_definitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_access_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_access_stats_license FOREIGN KEY (license_id) REFERENCES tool_license_keys(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   6. ENHANCE license_audit_logs TABLE (from file 04)
      Add new columns for better tracking
   --------------------------------------------------------- */

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'license_audit_logs'
      AND column_name = 'ip_address'
  ),
  'SELECT 1',
  'ALTER TABLE license_audit_logs ADD COLUMN ip_address VARCHAR(64) NULL AFTER reason'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'license_audit_logs'
      AND column_name = 'device_id'
  ),
  'SELECT 1',
  'ALTER TABLE license_audit_logs ADD COLUMN device_id VARCHAR(128) NULL AFTER ip_address'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'license_audit_logs'
      AND column_name = 'metadata'
  ),
  'SELECT 1',
  'ALTER TABLE license_audit_logs ADD COLUMN metadata JSON NULL AFTER device_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* ---------------------------------------------------------
   7. ADD INDEXES to existing tables for performance
   --------------------------------------------------------- */

-- Add to tool_license_keys (from file 04)
SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'tool_license_keys'
      AND index_name = 'idx_status_expires'
  ),
  'SELECT 1',
  'ALTER TABLE tool_license_keys ADD INDEX idx_status_expires (status, expires_at)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add to tool_license_activations (from file 04)
SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'tool_license_activations'
      AND index_name = 'idx_license_last_seen'
  ),
  'SELECT 1',
  'ALTER TABLE tool_license_activations ADD INDEX idx_license_last_seen (license_id, last_seen_at)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add to license_audit_logs (from file 04)
SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'license_audit_logs'
      AND index_name = 'idx_created_at'
  ),
  'SELECT 1',
  'ALTER TABLE license_audit_logs ADD INDEX idx_created_at (created_at)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add to license_failed_attempts (from file 04)
SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'license_failed_attempts'
      AND index_name = 'idx_try_count'
  ),
  'SELECT 1',
  'ALTER TABLE license_failed_attempts ADD INDEX idx_try_count (try_count)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* ---------------------------------------------------------
   8. CREATE VIEWS for admin dashboard
   --------------------------------------------------------- */

-- Active licenses summary view
CREATE OR REPLACE VIEW v_active_licenses_summary AS
SELECT 
  td.id AS tool_id,
  td.canonical_slug,
  td.display_name,
  COUNT(DISTINCT tlk.id) AS total_licenses,
  COUNT(DISTINCT CASE WHEN tlk.status = 'active' THEN tlk.id END) AS active_licenses,
  COUNT(DISTINCT CASE WHEN tlk.status = 'revoked' THEN tlk.id END) AS revoked_licenses,
  COUNT(DISTINCT CASE WHEN tlk.status = 'expired' THEN tlk.id END) AS expired_licenses,
  COALESCE(SUM((
    SELECT COUNT(*) FROM tool_license_activations tla 
    WHERE tla.license_id = tlk.id
  )), 0) AS total_active_devices
FROM tool_definitions td
LEFT JOIN tool_license_keys tlk ON tlk.product_id = td.product_id
WHERE td.is_active = 1
GROUP BY td.id, td.canonical_slug, td.display_name;

-- Recent activations view
CREATE OR REPLACE VIEW v_recent_activations AS
SELECT 
  tlk.id AS license_id,
  tlk.license_key,
  td.display_name AS tool_name,
  td.canonical_slug AS tool_slug,
  u.email AS user_email,
  u.username AS user_username,
  tla.device_id,
  tla.created_at AS activated_at,
  tla.last_seen_at
FROM tool_license_activations tla
JOIN tool_license_keys tlk ON tlk.id = tla.license_id
JOIN tool_definitions td ON td.product_id = tlk.product_id
JOIN users u ON u.id = tlk.user_id
ORDER BY tla.created_at DESC
LIMIT 100;

-- Download statistics view
CREATE OR REPLACE VIEW v_download_stats AS
SELECT 
  td.id AS tool_id,
  td.canonical_slug,
  td.display_name,
  COUNT(tdt.id) AS total_downloads,
  COUNT(DISTINCT tdt.user_id) AS unique_downloaders,
  MAX(tdt.first_used_at) AS last_download_at
FROM tool_definitions td
LEFT JOIN tool_download_tokens tdt ON tdt.tool_definition_id = td.id
WHERE td.delivery_model IN ('download', 'download+license')
GROUP BY td.id, td.canonical_slug, td.display_name;

/* ---------------------------------------------------------
   9. STORED PROCEDURE: Generate License Key
      Safe to create - doesn't modify existing data
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_create_tool_license //
CREATE PROCEDURE sp_create_tool_license(
  IN p_product_id BIGINT,
  IN p_user_id BIGINT,
  IN p_order_id BIGINT,
  IN p_max_devices INT,
  IN p_duration_days INT,
  OUT p_license_key VARCHAR(190),
  OUT p_license_id BIGINT
)
BEGIN
  DECLARE v_key_base VARCHAR(50);
  DECLARE v_key_full VARCHAR(190);
  DECLARE v_exists INT DEFAULT 1;
  
  -- Generate unique license key
  WHILE v_exists > 0 DO
    SET v_key_base = CONCAT(
      SUBSTRING(MD5(RAND()), 1, 4), '-',
      SUBSTRING(MD5(RAND()), 1, 4), '-',
      SUBSTRING(MD5(RAND()), 1, 4), '-',
      SUBSTRING(MD5(RAND()), 1, 4)
    );
    SET v_key_full = UPPER(CONCAT('GSTCH-', v_key_base));
    
    SELECT COUNT(*) INTO v_exists
    FROM tool_license_keys
    WHERE license_key = v_key_full;
  END WHILE;
  
  -- Insert license
  INSERT INTO tool_license_keys (
    order_id, product_id, user_id, license_key,
    max_devices, status, expires_at
  ) VALUES (
    p_order_id,
    p_product_id,
    p_user_id,
    v_key_full,
    p_max_devices,
    'active',
    CASE 
      WHEN p_duration_days IS NULL THEN NULL
      ELSE DATE_ADD(NOW(), INTERVAL p_duration_days DAY)
    END
  );
  
  SET p_license_id = LAST_INSERT_ID();
  SET p_license_key = v_key_full;
END //

DELIMITER ;

/* ---------------------------------------------------------
   10. STORED PROCEDURE: Revoke License
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_revoke_tool_license //
CREATE PROCEDURE sp_revoke_tool_license(
  IN p_license_id BIGINT,
  IN p_reason VARCHAR(255),
  IN p_admin_id BIGINT
)
BEGIN
  DECLARE v_old_status VARCHAR(20);
  
  -- Get current status
  SELECT status INTO v_old_status
  FROM tool_license_keys
  WHERE id = p_license_id;
  
  -- Update license status
  UPDATE tool_license_keys
  SET status = 'revoked'
  WHERE id = p_license_id;
  
  -- Delete all device activations
  DELETE FROM tool_license_activations
  WHERE license_id = p_license_id;
  
  -- Log the action
  INSERT INTO license_audit_logs (
    actor_admin_id, action, target_license_id,
    old_value, new_value, reason
  ) VALUES (
    p_admin_id,
    'revoke',
    p_license_id,
    JSON_OBJECT('status', v_old_status),
    JSON_OBJECT('status', 'revoked'),
    p_reason
  );
END //

DELIMITER ;

/* ---------------------------------------------------------
   11. STORED PROCEDURE: Remove Device from License
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_remove_device_from_license //
CREATE PROCEDURE sp_remove_device_from_license(
  IN p_license_id BIGINT,
  IN p_device_id VARCHAR(128),
  IN p_admin_id BIGINT
)
BEGIN
  DECLARE v_device_count INT;
  
  -- Remove the device
  DELETE FROM tool_license_activations
  WHERE license_id = p_license_id AND device_id = p_device_id;
  
  -- Get remaining device count
  SELECT COUNT(*) INTO v_device_count
  FROM tool_license_activations
  WHERE license_id = p_license_id;
  
  -- Log the action
  INSERT INTO license_audit_logs (
    actor_admin_id, action, target_license_id,
    old_value, new_value, reason, device_id
  ) VALUES (
    p_admin_id,
    'remove_device',
    p_license_id,
    NULL,
    JSON_OBJECT('remaining_devices', v_device_count),
    'Device removed by admin',
    p_device_id
  );
END //

DELIMITER ;

/* ---------------------------------------------------------
   12. STORED PROCEDURE: Cleanup Expired Tokens
       Call this periodically (e.g., hourly via cron)
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_cleanup_expired_tokens //
CREATE PROCEDURE sp_cleanup_expired_tokens()
BEGIN
  -- Delete expired download tokens
  DELETE FROM tool_download_tokens
  WHERE expires_at < NOW();
  
  -- Delete expired rate limit blocks
  DELETE FROM license_rate_limits
  WHERE blocked_until IS NOT NULL 
    AND blocked_until < NOW()
    AND permanent_block = 0;
  
  -- Return count of deleted items
  SELECT ROW_COUNT() AS deleted_count;
END //

DELIMITER ;

/* ---------------------------------------------------------
   13. SAMPLE DATA: Example tool definitions
       Only inserts if not exists
   --------------------------------------------------------- */

-- Example: Online AI Video Tool (runs in browser)
INSERT INTO tool_definitions (
  product_id, canonical_slug, display_name, short_description,
  tool_kind, tool_category, platform,
  access_model, delivery_model, requires_license,
  default_device_limit, max_device_limit,
  launch_path, embedded_entry,
  is_active, is_featured, sort_order
)
SELECT 
  p.id,
  'veo3-ai',
  'Veo3 AI Video Generator',
  'Generate videos from text prompts using AI',
  'embedded',
  'ai',
  'web',
  'license',
  'web',
  1,
  3,  -- default device limit
  10, -- max device limit
  '/tools-ai/veo3',
  'app/pages/tools-ai/veo3/Veo3.tsx',
  1,  -- is_active
  1,  -- is_featured
  1   -- sort_order
FROM products p
WHERE p.slug = 'toolveo3'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = p.id
  );

-- Example: Downloadable PC Tool
INSERT INTO tool_definitions (
  product_id, canonical_slug, display_name, short_description,
  tool_kind, tool_category, platform,
  access_model, delivery_model, requires_license,
  default_device_limit, max_device_limit,
  allow_offline_mode, offline_grace_period_hours,
  storage_provider, storage_key_prefix, file_extension,
  current_version,
  is_active, is_featured, sort_order
)
SELECT 
  p.id,
  'video-downloader-pro',
  'Video Downloader Pro',
  'Download videos from multiple platforms',
  'downloadable',
  'video',
  'pc',
  'license',
  'download+license',
  1,
  2,  -- default device limit
  5,  -- max device limit
  1,  -- allow offline mode
  72, -- 72 hour grace period
  'r2',
  'tools/pc/exe/',
  '.exe',
  '1.2.0',
  1,  -- is_active
  0,  -- is_featured
  2   -- sort_order
FROM products p
WHERE p.slug = 'tooldownloadvideo'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = p.id
  );

-- Example: Mobile APK Tool
INSERT INTO tool_definitions (
  product_id, canonical_slug, display_name, short_description,
  tool_kind, tool_category, platform,
  access_model, delivery_model, requires_license,
  default_device_limit, max_device_limit,
  storage_provider, storage_key_prefix, file_extension,
  current_version, min_client_version,
  is_active, is_beta, sort_order
)
SELECT 
  p.id,
  'mobile-video-editor',
  'Mobile Video Editor',
  'Edit videos on your phone with AI features',
  'downloadable',
  'video',
  'mobile',
  'license',
  'download+license',
  1,
  1,  -- default device limit (mobile)
  2,  -- max device limit
  'r2',
  'tools/mobile/apk/',
  '.apk',
  '2.0.1',
  '2.0.0',  -- min client version
  1,  -- is_active
  0,  -- is_beta
  3   -- sort_order
FROM products p
WHERE p.slug = 'videoeditor'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = p.id
  );

/* ---------------------------------------------------------
   14. VERIFICATION QUERIES
       Run these to verify migration succeeded
   --------------------------------------------------------- */

-- Check new tables exist
SELECT 'New tables created:' AS info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name IN (
    'tool_download_tokens',
    'license_rate_limits', 
    'device_fingerprints',
    'tool_access_stats'
  );

-- Check tool_definitions has new columns
SELECT 'tool_definitions columns:' AS info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'tool_definitions'
  AND column_name IN (
    'tool_category', 'platform', 'default_device_limit',
    'max_device_limit', 'allow_offline_mode', 'storage_provider',
    'current_version', 'is_featured', 'is_beta', 'sort_order'
  );

-- Check views exist
SELECT 'Views created:' AS info;
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = DATABASE() 
  AND table_name IN (
    'v_active_licenses_summary',
    'v_recent_activations',
    'v_download_stats'
  );

/* ---------------------------------------------------------
   MIGRATION COMPLETE
   ---------------------------------------------------------
   
   Next steps:
   1. Add TOOL_LICENSE_SECRET to .env.local
   2. Configure R2/S3 storage credentials
   3. Test API endpoints
   4. Set up cron job for sp_cleanup_expired_tokens
   
   Cron example (hourly cleanup):
   0 * * * * mysql -u root -p'password' -e "CALL somarnix.sp_cleanup_expired_tokens();"
   
   --------------------------------------------------------- */
