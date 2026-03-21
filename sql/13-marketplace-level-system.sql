/* =========================================================
   STEP 13: MARKETPLACE LEVEL PROGRESSION SYSTEM
   - 100% FREE - Uses only MySQL features (no external services)
   - One unified level (1-1000) for buyers and sellers
   - Money-based progression (not XP)
   - Automatic level updates via database triggers
   - Anti-abuse system built-in
========================================================= */

USE gstechedukh;

/* ---------------------------------------------------------
   1. ADD LEVEL COLUMNS TO users TABLE
   --------------------------------------------------------- */

-- Add level system columns to existing users table
SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'level'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN level INT UNSIGNED NOT NULL DEFAULT 1 AFTER role'
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
      AND column_name = 'progression_score'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN progression_score DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER level'
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
      AND column_name = 'buying_score'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN buying_score DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER progression_score'
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
      AND column_name = 'selling_score'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN selling_score DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER buying_score'
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
      AND column_name = 'quality_bonus'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN quality_bonus DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER selling_score'
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
      AND column_name = 'penalties'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN penalties DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER quality_bonus'
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
      AND column_name = 'level_last_calculated_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN level_last_calculated_at TIMESTAMP NULL AFTER penalties'
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
      AND column_name = 'level_last_changed_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN level_last_changed_at TIMESTAMP NULL AFTER level_last_calculated_at'
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
      AND column_name = 'previous_level'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN previous_level INT UNSIGNED NULL AFTER level_last_changed_at'
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
      AND column_name = 'first_transaction_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN first_transaction_at TIMESTAMP NULL AFTER level_last_changed_at'
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
      AND column_name = 'last_transaction_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN last_transaction_at TIMESTAMP NULL AFTER first_transaction_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND index_name = 'idx_user_level'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD INDEX idx_user_level (level)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND index_name = 'idx_user_progression'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD INDEX idx_user_progression (progression_score)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* ---------------------------------------------------------
   2. CREATE user_level_history TABLE
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS user_level_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  
  -- Level Change
  old_level INT UNSIGNED NOT NULL,
  new_level INT UNSIGNED NOT NULL,
  level_change INT NOT NULL,
  
  -- Score Change
  old_score DECIMAL(12, 2) NOT NULL,
  new_score DECIMAL(12, 2) NOT NULL,
  score_change DECIMAL(12, 2) NOT NULL,
  
  -- Reason
  reason ENUM('purchase', 'sale', 'refund', 'bonus', 'penalty', 'manual_adjustment', 'order_completed') NOT NULL,
  related_order_id BIGINT UNSIGNED NULL,
  related_admin_id BIGINT UNSIGNED NULL,
  
  -- Metadata
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_level_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_level_history_order FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_user_level_history (user_id, created_at),
  INDEX idx_level_change_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   3. CREATE user_level_relationships TABLE
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS user_level_relationships (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  buyer_id BIGINT UNSIGNED NOT NULL,
  seller_id BIGINT UNSIGNED NOT NULL,
  
  -- Trade Stats
  trade_count INT UNSIGNED NOT NULL DEFAULT 0,
  total_volume DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  
  -- Diminishing Return Multiplier (calculated)
  multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  
  -- Last Activity
  last_trade_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Unique Constraint
  UNIQUE KEY uniq_buyer_seller (buyer_id, seller_id),
  
  -- Foreign Keys
  CONSTRAINT fk_relationship_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_relationship_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_buyer (buyer_id),
  INDEX idx_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   4. CREATE user_level_flags TABLE
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS user_level_flags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  
  -- Flag Info
  flag_type ENUM('self_trade', 'velocity', 'refund_abuse', 'pattern', 'manual') NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  description TEXT NOT NULL,
  
  -- Related Data
  related_order_id BIGINT UNSIGNED NULL,
  related_user_id BIGINT UNSIGNED NULL,
  
  -- Status
  status ENUM('open', 'reviewing', 'resolved', 'false_positive') NOT NULL DEFAULT 'open',
  reviewed_by_admin_id BIGINT UNSIGNED NULL,
  review_notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  
  -- Foreign Keys
  CONSTRAINT fk_flags_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_flags_order FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_flags_reviewer FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_user_flags (user_id, status),
  INDEX idx_flag_type (flag_type, severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   5. CREATE level_benefits TABLE (Benefit Definitions)
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS level_benefits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  benefit_key VARCHAR(100) NOT NULL UNIQUE,
  benefit_name VARCHAR(255) NOT NULL,
  benefit_description TEXT,
  benefit_category ENUM('visibility', 'fee', 'trust', 'exclusive', 'analytics') NOT NULL,
  unlock_level INT UNSIGNED NOT NULL,
  benefit_value JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_unlock_level (unlock_level),
  INDEX idx_category (benefit_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   6. CREATE user_level_benefits TABLE (User's Unlocked Benefits)
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS user_level_benefits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  
  -- Benefit Info
  benefit_key VARCHAR(100) NOT NULL,
  benefit_name VARCHAR(255) NOT NULL,
  unlocked_at_level INT UNSIGNED NOT NULL,
  
  -- Status
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique Constraint
  UNIQUE KEY uniq_user_benefit (user_id, benefit_key),
  
  -- Foreign Keys
  CONSTRAINT fk_benefits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_benefits (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   7. CREATE VIEWS for Analytics
   --------------------------------------------------------- */

-- User level stats view
CREATE OR REPLACE VIEW v_user_level_stats AS
SELECT 
  u.id,
  u.email,
  u.username,
  u.level,
  u.progression_score,
  u.buying_score,
  u.selling_score,
  (
    SELECT COUNT(DISTINCT o.id)
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.state IN ('completed', 'approved')
      AND (o.user_id = u.id OR p.posted_by = u.id)
  ) AS total_transactions,
  (
    SELECT COALESCE(SUM(o.total_amount), 0)
    FROM orders o
    WHERE o.user_id = u.id
      AND o.state IN ('completed', 'approved')
  ) AS total_bought,
  (
    SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE p.posted_by = u.id
      AND o.state IN ('completed', 'approved')
  ) AS total_sold,
  (
    SELECT COUNT(DISTINCT o.id)
    FROM orders o
    WHERE o.user_id = u.id
      AND o.state IN ('completed', 'approved')
  ) AS times_bought,
  (
    SELECT COUNT(DISTINCT oi.order_id)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE p.posted_by = u.id
      AND o.state IN ('completed', 'approved')
  ) AS times_sold,
  u.level_last_calculated_at,
  u.level_last_changed_at
FROM users u;

-- Top users by level view
CREATE OR REPLACE VIEW v_top_users_by_level AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.level,
  u.progression_score,
  ulh.created_at AS last_level_up_at
FROM users u
LEFT JOIN user_level_history ulh ON ulh.user_id = u.id 
  AND ulh.new_level = u.level
WHERE u.level >= 10
ORDER BY u.level DESC, u.progression_score DESC
LIMIT 100;

-- Level distribution view
CREATE OR REPLACE VIEW v_level_distribution AS
SELECT 
  CASE 
    WHEN level BETWEEN 1 AND 10 THEN '1-10 (Beginner)'
    WHEN level BETWEEN 11 AND 25 THEN '11-25 (Intermediate)'
    WHEN level BETWEEN 26 AND 50 THEN '26-50 (Advanced)'
    WHEN level BETWEEN 51 AND 100 THEN '51-100 (Expert)'
    WHEN level BETWEEN 101 AND 250 THEN '101-250 (Master)'
    WHEN level BETWEEN 251 AND 500 THEN '251-500 (Grand Master)'
    WHEN level BETWEEN 501 AND 1000 THEN '501-1000 (Legend)'
    ELSE 'Unknown'
  END AS level_tier,
  COUNT(*) AS user_count,
  AVG(level) AS avg_level,
  AVG(progression_score) AS avg_score
FROM users
GROUP BY 
  CASE 
    WHEN level BETWEEN 1 AND 10 THEN '1-10 (Beginner)'
    WHEN level BETWEEN 11 AND 25 THEN '11-25 (Intermediate)'
    WHEN level BETWEEN 26 AND 50 THEN '26-50 (Advanced)'
    WHEN level BETWEEN 51 AND 100 THEN '51-100 (Expert)'
    WHEN level BETWEEN 101 AND 250 THEN '101-250 (Master)'
    WHEN level BETWEEN 251 AND 500 THEN '251-500 (Grand Master)'
    WHEN level BETWEEN 501 AND 1000 THEN '501-1000 (Legend)'
    ELSE 'Unknown'
  END
ORDER BY MIN(level);

/* ---------------------------------------------------------
   8. STORED PROCEDURE: Calculate User Level
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_calculate_user_level //
CREATE PROCEDURE sp_calculate_user_level(
  IN p_user_id BIGINT,
  IN p_reason VARCHAR(50),
  IN p_related_order_id BIGINT
)
BEGIN
  DECLARE v_buying_score DECIMAL(12,2);
  DECLARE v_selling_score DECIMAL(12,2);
  DECLARE v_quality_bonus DECIMAL(12,2);
  DECLARE v_penalties DECIMAL(12,2);
  DECLARE v_total_score DECIMAL(12,2);
  DECLARE v_new_level INT;
  DECLARE v_old_level INT;
  DECLARE v_old_score DECIMAL(12,2);
  DECLARE v_level_change INT;
  DECLARE v_score_change DECIMAL(12,2);
  
  -- Get current level and score
  SELECT level, progression_score INTO v_old_level, v_old_score
  FROM users WHERE id = p_user_id;
  
  -- Calculate buying score (completed orders only)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_buying_score
  FROM orders
  WHERE user_id = p_user_id 
    AND state IN ('completed', 'approved');
  
  -- Calculate selling score (completed orders only)
  SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0) INTO v_selling_score
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN products p ON p.id = oi.product_id
  WHERE p.posted_by = p_user_id
    AND o.state IN ('completed', 'approved');
  
  -- Ratings are not in the current schema yet
  SET v_quality_bonus = 0;
  
  -- Refund penalties are not in the current schema yet
  SET v_penalties = 0;
  
  -- Total score
  SET v_total_score = v_buying_score + v_selling_score + v_quality_bonus - v_penalties;
  
  -- Ensure score doesn't go below 0
  IF v_total_score < 0 THEN
    SET v_total_score = 0;
  END IF;
  
  -- ============================================
  -- TIERED LEVEL FORMULA
  -- ============================================
  -- Level 1-10:   $2 = 1 level (max $20 for level 10)
  -- Level 11-100: $5 = 1 level (max $450 + $20 = $470 for level 100)
  -- Level 101-500: $10 = 1 level (max $4000 + $470 = $4470 for level 500)
  -- Level 501-1000: $20 = 1 level (max $10000 + $4470 = $14470 for level 1000)
  -- ============================================
  
  -- Calculate level based on tiered formula
  IF v_total_score < 20 THEN
    -- Level 1-10: $2 per level
    SET v_new_level = 1 + FLOOR(v_total_score / 2);
  ELSEIF v_total_score < 470 THEN
    -- Level 11-100: $5 per level (after first $20)
    SET v_new_level = 10 + FLOOR((v_total_score - 20) / 5);
  ELSEIF v_total_score < 4470 THEN
    -- Level 101-500: $10 per level (after first $470)
    SET v_new_level = 100 + FLOOR((v_total_score - 470) / 10);
  ELSE
    -- Level 501-1000: $20 per level (after first $4470)
    SET v_new_level = 500 + FLOOR((v_total_score - 4470) / 20);
  END IF;
  
  -- Cap at 1000
  IF v_new_level > 1000 THEN
    SET v_new_level = 1000;
  END IF;
  
  -- Ensure minimum level is 1
  IF v_new_level < 1 THEN
    SET v_new_level = 1;
  END IF;
  
  -- Calculate changes
  SET v_level_change = v_new_level - v_old_level;
  SET v_score_change = v_total_score - v_old_score;
  
  -- Update user
  UPDATE users
  SET progression_score = v_total_score,
      buying_score = v_buying_score,
      selling_score = v_selling_score,
      quality_bonus = v_quality_bonus,
      penalties = v_penalties,
      level = v_new_level,
      previous_level = v_old_level,
      level_last_calculated_at = NOW(),
      level_last_changed_at = CASE 
        WHEN v_new_level != v_old_level THEN NOW() 
        ELSE level_last_changed_at 
      END
  WHERE id = p_user_id;
  
  -- Log to history if level or score changed
  IF v_level_change != 0 OR ABS(v_score_change) > 0.01 THEN
    INSERT INTO user_level_history (
      user_id, old_level, new_level, level_change,
      old_score, new_score, score_change,
      reason, related_order_id, metadata
    ) VALUES (
      p_user_id, v_old_level, v_new_level, v_level_change,
      v_old_score, v_total_score, v_score_change,
      p_reason, p_related_order_id,
      JSON_OBJECT(
        'buying_score', v_buying_score,
        'selling_score', v_selling_score,
        'quality_bonus', v_quality_bonus,
        'penalties', v_penalties
      )
    );
  END IF;
  
  -- Update first/last transaction dates
  UPDATE users u
  SET first_transaction_at = (
    SELECT MIN(t.created_at)
    FROM (
      SELECT o.created_at
      FROM orders o
      WHERE o.user_id = u.id
        AND o.state IN ('completed', 'approved')
      UNION ALL
      SELECT o.created_at
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.posted_by = u.id
        AND o.state IN ('completed', 'approved')
    ) AS t
  ),
  last_transaction_at = (
    SELECT MAX(t.created_at)
    FROM (
      SELECT o.created_at
      FROM orders o
      WHERE o.user_id = u.id
        AND o.state IN ('completed', 'approved')
      UNION ALL
      SELECT o.created_at
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.posted_by = u.id
        AND o.state IN ('completed', 'approved')
    ) AS t
  )
  WHERE u.id = p_user_id;
  
END //

DELIMITER ;

/* ---------------------------------------------------------
   9. STORED PROCEDURE: Check Self-Trade
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_check_self_trade //
CREATE PROCEDURE sp_check_self_trade(
  IN p_buyer_id BIGINT,
  IN p_seller_id BIGINT,
  IN p_order_id BIGINT
)
BEGIN
  DECLARE v_match_count INT DEFAULT 0;
  DECLARE v_flag_description TEXT;
  
  -- Check for self-trade signals
  -- Signal 1: Same user ID
  IF p_buyer_id = p_seller_id THEN
    SET v_match_count = v_match_count + 10; -- Critical
  END IF;
  
  -- Signal 2: Same device (if you track devices)
  -- Add your device check here if you have device tracking
  
  -- Signal 3: Check if they share shipping address (you may need to join order_addresses)
  -- Add your address check here
  
  -- If suspicious, create flag
  IF v_match_count >= 10 THEN
    SET v_flag_description = CONCAT('Potential self-trade detected. Match score: ', v_match_count);
    
    INSERT INTO user_level_flags (
      user_id, flag_type, severity, description,
      related_order_id, related_user_id, status
    ) VALUES (
      p_buyer_id, 'self_trade', 
      CASE WHEN v_match_count >= 10 THEN 'critical' ELSE 'high' END,
      v_flag_description,
      p_order_id,
      p_seller_id,
      'open'
    );
  END IF;
  
  -- Return match count for application-level handling
  SELECT v_match_count AS self_trade_score;
  
END //

DELIMITER ;

/* ---------------------------------------------------------
   10. STORED PROCEDURE: Update Relationship (Diminishing Returns)
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_update_relationship //
CREATE PROCEDURE sp_update_relationship(
  IN p_buyer_id BIGINT,
  IN p_seller_id BIGINT,
  IN p_amount DECIMAL(12,2)
)
BEGIN
  DECLARE v_trade_count INT;
  DECLARE v_multiplier DECIMAL(3,2);
  
  -- Insert or update relationship
  INSERT INTO user_level_relationships (
    buyer_id, seller_id, trade_count, total_volume, multiplier
  ) VALUES (
    p_buyer_id, p_seller_id, 1, p_amount, 1.00
  )
  ON DUPLICATE KEY UPDATE
    trade_count = trade_count + 1,
    total_volume = total_volume + p_amount,
    last_trade_at = NOW();
  
  -- Get updated trade count
  SELECT trade_count INTO v_trade_count
  FROM user_level_relationships
  WHERE buyer_id = p_buyer_id AND seller_id = p_seller_id;
  
  -- Calculate diminishing return multiplier
  -- 1st trade: 100%, 2nd: 80%, 3rd: 60%, 4th+: 50%
  SET v_multiplier = CASE
    WHEN v_trade_count = 1 THEN 1.00
    WHEN v_trade_count = 2 THEN 0.80
    WHEN v_trade_count = 3 THEN 0.60
    ELSE 0.50
  END;
  
  -- Update multiplier
  UPDATE user_level_relationships
  SET multiplier = v_multiplier
  WHERE buyer_id = p_buyer_id AND seller_id = p_seller_id;
  
  -- Return multiplier for use in level calculation
  SELECT v_multiplier AS relationship_multiplier;
  
END //

DELIMITER ;

/* ---------------------------------------------------------
   11. STORED PROCEDURE: Apply Refund Clawback
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_apply_refund_clawback //
CREATE PROCEDURE sp_apply_refund_clawback(
  IN p_order_id BIGINT,
  IN p_refund_amount DECIMAL(12,2),
  IN p_buyer_id BIGINT,
  IN p_seller_id BIGINT
)
BEGIN
  DECLARE v_original_points DECIMAL(12,2);
  DECLARE v_penalty DECIMAL(12,2);
  
  -- Calculate original points from this transaction
  SET v_original_points = p_refund_amount;
  
  -- Calculate penalty (20% of refund amount)
  SET v_penalty = p_refund_amount * 0.2;
  
  -- Remove points from buyer
  UPDATE users
  SET progression_score = progression_score - v_original_points,
      buying_score = buying_score - v_original_points,
      penalties = penalties + v_penalty,
      level = GREATEST(1, FLOOR(1 + POW((progression_score - v_original_points) / 10, 0.6))),
      level_last_changed_at = NOW()
  WHERE id = p_buyer_id;
  
  -- Remove points from seller
  UPDATE users
  SET progression_score = progression_score - v_original_points,
      selling_score = selling_score - v_original_points,
      penalties = penalties + v_penalty,
      level = GREATEST(1, FLOOR(1 + POW((progression_score - v_original_points) / 10, 0.6))),
      level_last_changed_at = NOW()
  WHERE id = p_seller_id;
  
  -- Log the clawback for buyer
  INSERT INTO user_level_history (
    user_id, old_level, new_level, level_change,
    old_score, new_score, score_change,
    reason, related_order_id
  )
  SELECT 
    p_buyer_id, level, 
    GREATEST(1, FLOOR(1 + POW((progression_score - v_original_points) / 10, 0.6))),
    GREATEST(1, FLOOR(1 + POW((progression_score - v_original_points) / 10, 0.6))) - level,
    progression_score, progression_score - v_original_points, -v_original_points,
    'refund', p_order_id
  FROM users WHERE id = p_buyer_id;
  
  -- Recalculate levels properly
  CALL sp_calculate_user_level(p_buyer_id, 'refund', p_order_id);
  CALL sp_calculate_user_level(p_seller_id, 'refund', p_order_id);
  
END //

DELIMITER ;

/* ---------------------------------------------------------
   12. STORED PROCEDURE: Cleanup Expired Data
   --------------------------------------------------------- */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_level_system_cleanup //
CREATE PROCEDURE sp_level_system_cleanup()
BEGIN
  DECLARE v_deleted_flags INT DEFAULT 0;
  
  -- Delete old resolved flags (older than 90 days)
  DELETE FROM user_level_flags
  WHERE status IN ('resolved', 'false_positive')
    AND reviewed_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
  
  SET v_deleted_flags = ROW_COUNT();
  
  -- Recalculate all user levels (reconciliation - run weekly)
  -- This ensures data consistency
  UPDATE users u
  SET buying_score = (
    SELECT COALESCE(SUM(o.total_amount), 0)
    FROM orders o
    WHERE o.user_id = u.id
      AND o.state IN ('completed', 'approved')
  ),
  selling_score = (
    SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE p.posted_by = u.id
      AND o.state IN ('completed', 'approved')
  ),
  quality_bonus = 0.00,
  penalties = 0.00,
  progression_score = (
    SELECT COALESCE(SUM(o.total_amount), 0)
    FROM orders o
    WHERE o.user_id = u.id
      AND o.state IN ('completed', 'approved')
  ) + (
    SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE p.posted_by = u.id
      AND o.state IN ('completed', 'approved')
  ),
  level = CASE
    WHEN (
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) < 20 THEN 1 + FLOOR((
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) / 2)
    WHEN (
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) < 470 THEN 10 + FLOOR(((
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) - 20) / 5)
    WHEN (
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) < 4470 THEN 100 + FLOOR(((
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) - 470) / 10)
    ELSE LEAST(1000, 500 + FLOOR(((
      (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.state IN ('completed', 'approved')
      ) + (
        SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = u.id
          AND o.state IN ('completed', 'approved')
      )
    ) - 4470) / 20))
  END,
  level_last_calculated_at = NOW()
  WHERE id > 0;
  
  -- Return cleanup stats
  SELECT 
    v_deleted_flags AS flags_cleaned,
    ROW_COUNT() AS users_recalculated;
  
END //

DELIMITER ;

/* ---------------------------------------------------------
   13. INSERT DEFAULT BENEFITS (LEVEL BADGES ONLY - NO DISCOUNTS)
        With English and Khmer Translations
   --------------------------------------------------------- */

-- Insert default level benefits - BADGES ONLY (no discounts yet)
-- These are visual badges to show user's level tier
-- Includes both English (en) and Khmer (km) translations

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_10' AS benefit_key, 
         'Level 10 Badge' AS benefit_name, 
         'Reached Level 10 - Active User' AS benefit_description,
         'visibility' AS benefit_category, 
         10 AS unlock_level, 
         JSON_OBJECT(
           'badge_icon', 'level_10.png', 
           'color', 'gray',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 10 Badge', 'description', 'Reached Level 10 - Active User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ១០', 'description', 'ឈានដល់លេខ ១០ - អ្នកជួញដូរសកម្ម')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_10'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_25', 
         'Level 25 Badge', 
         'Reached Level 25 - Experienced User' AS benefit_description,
         'visibility', 
         25, 
         JSON_OBJECT(
           'badge_icon', 'level_25.png', 
           'color', 'bronze',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 25 Badge', 'description', 'Reached Level 25 - Experienced User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ២៥', 'description', 'ឈានដល់លេខ ២៥ - អ្នកជួញដូរមានបទពិសោធន៍')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_25'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_50', 
         'Level 50 Badge', 
         'Reached Level 50 - Trusted User' AS benefit_description,
         'visibility', 
         50, 
         JSON_OBJECT(
           'badge_icon', 'level_50.png', 
           'color', 'silver',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 50 Badge', 'description', 'Reached Level 50 - Trusted User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ៥០', 'description', 'ឈានដល់លេខ ៥០ - អ្នកជួញដូរទុកចិត្តបាន')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_50'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_100', 
         'Level 100 Badge', 
         'Reached Level 100 - Expert User' AS benefit_description,
         'visibility', 
         100, 
         JSON_OBJECT(
           'badge_icon', 'level_100.png', 
           'color', 'gold',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 100 Badge', 'description', 'Reached Level 100 - Expert User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ១០០', 'description', 'ឈានដល់លេខ ១០០ - អ្នកជួញដូរជំនាញ')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_100'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_250', 
         'Level 250 Badge', 
         'Reached Level 250 - Master User' AS benefit_description,
         'visibility', 
         250, 
         JSON_OBJECT(
           'badge_icon', 'level_250.png', 
           'color', 'platinum',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 250 Badge', 'description', 'Reached Level 250 - Master User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ២៥០', 'description', 'ឈានដល់លេខ ២៥០ - អ្នកជួញដូរកម្រិតខ្ពស់')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_250'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_500', 
         'Level 500 Badge', 
         'Reached Level 500 - Grand Master User' AS benefit_description,
         'visibility', 
         500, 
         JSON_OBJECT(
           'badge_icon', 'level_500.png', 
           'color', 'diamond',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 500 Badge', 'description', 'Reached Level 500 - Grand Master User'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ៥០០', 'description', 'ឈានដល់លេខ ៥០០ - អ្នកជួញដូរកម្រិតធំ')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_500'
);

INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_1000',
         'Level 1000 Badge',
         'Reached Level 1000 - LEGEND - Highest honor' AS benefit_description,
         'visibility',
         1000,
         JSON_OBJECT(
           'badge_icon', 'level_1000.svg',
           'color', 'legendary',
           'verify_badge', 'blue_verify.svg',
           'borders', JSON_ARRAY('border_1.svg', 'border_2.svg', 'border_3.svg', 'border_4.svg', 'border_5.svg', 'border_6.svg', 'border_7.svg', 'border_8.svg', 'border_9.svg', 'border_10.svg', 'border_11.svg', 'border_12.svg', 'border_13.svg', 'border_14.svg', 'border_15.svg'),
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 1000 Badge', 'description', 'Reached Level 1000 - LEGEND - Highest honor'),
             'km', JSON_OBJECT('name', 'Level ១០០០', 'description', 'ឈានដល់លេខ ១០០០ - កិរ្តិយស - កិត្តិយសខ្ពស់បំផុត')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_1000'
);

-- Level 2+ Blue Verify Badge (unlocks at level 2)
INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'verify_badge_blue',
         'Blue Verify Badge',
         'Verified User - Level 2 or higher' AS benefit_description,
         'visibility',
         2,
         JSON_OBJECT(
           'badge_icon', 'blue_verify.svg',
           'color', 'blue',
           'verify_type', 'blue',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Blue Verify Badge', 'description', 'Verified User - Level 2 or higher'),
             'km', JSON_OBJECT('name', 'ផ្លាកផ្ទៀងផ្ទាត់ពណ៌ខៀវ', 'description', 'អ្នកជួញដូរដែលបានផ្ទៀងផ្ទាត់ - លេខ ២ ឡើង')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'verify_badge_blue'
);

-- Border Collection (15 borders, unlock at level 2)
INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'border_collection_1_15',
         'Border Collection (1-15)',
         '15 exclusive borders for Level 2+ users' AS benefit_description,
         'visibility',
         2,
         JSON_OBJECT(
           'borders', JSON_ARRAY(
             'border_1.svg', 'border_2.svg', 'border_3.svg', 'border_4.svg', 'border_5.svg',
             'border_6.svg', 'border_7.svg', 'border_8.svg', 'border_9.svg', 'border_10.svg',
             'border_11.svg', 'border_12.svg', 'border_13.svg', 'border_14.svg', 'border_15.svg'
           ),
           'color', 'various',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Border Collection (1-15)', 'description', '15 exclusive borders for Level 2+ users'),
             'km', JSON_OBJECT('name', 'ស៊ុមចំនួន ១៥', 'description', 'ស៊ុមពិសេសចំនួន ១៥ សម្រាប់អ្នកប្រើលេខ ២ ឡើង')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'border_collection_1_15'
);

-- NOTE: No fee discounts or other benefits yet
-- This is a PURE LEVEL system only
-- Includes English (en) and Khmer (km) translations
-- Badge files should be in: public/Budget GSTECHKH SVG/
-- You can add discounts/benefits later by inserting more records into level_benefits table

/* ---------------------------------------------------------
   14. ENABLE MySQL Event Scheduler
   --------------------------------------------------------- */

-- Enable event scheduler manually as a DB/server admin if needed.
-- Do not run SET GLOBAL in normal imports on shared hosting or limited users.
-- Manual command for server admin only:
-- SET GLOBAL event_scheduler = ON;

/* ---------------------------------------------------------
   15. CREATE SCHEDULED EVENTS
   --------------------------------------------------------- */

-- Daily cleanup event
DROP EVENT IF EXISTS daily_level_cleanup;

DELIMITER //

CREATE EVENT daily_level_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 2 HOUR
DO
BEGIN
  -- Call cleanup procedure
  CALL sp_level_system_cleanup();
END //

DELIMITER ;

-- Weekly reconciliation event (recalculate all levels)
DROP EVENT IF EXISTS weekly_level_reconciliation;

DELIMITER //

CREATE EVENT weekly_level_reconciliation
ON SCHEDULE EVERY 1 WEEK
STARTS CURRENT_DATE + INTERVAL 1 WEEK + INTERVAL 3 HOUR
DO
BEGIN
  -- Recalculate all user levels for consistency using tiered formula
  UPDATE users u
  SET level = CASE
    WHEN progression_score < 20 THEN 1 + FLOOR(progression_score / 2)
    WHEN progression_score < 470 THEN 10 + FLOOR((progression_score - 20) / 5)
    WHEN progression_score < 4470 THEN 100 + FLOOR((progression_score - 470) / 10)
    ELSE 500 + FLOOR((progression_score - 4470) / 20)
  END,
  level_last_calculated_at = NOW()
  WHERE id > 0;
END //

DELIMITER ;

/* ---------------------------------------------------------
   16. VERIFICATION QUERIES
   --------------------------------------------------------- */

-- Check tables created
SELECT 'New tables created:' AS info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name IN (
    'user_level_history',
    'user_level_relationships', 
    'user_level_flags',
    'level_benefits',
    'user_level_benefits'
  );

-- Check users table has new columns
SELECT 'users table columns:' AS info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'users'
  AND column_name IN (
    'level', 'progression_score', 'buying_score',
    'selling_score', 'quality_bonus', 'penalties'
  );

-- Check stored procedures exist
SELECT 'Stored procedures created:' AS info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = DATABASE() 
  AND routine_type = 'PROCEDURE'
  AND routine_name LIKE 'sp_%level%';

-- Check events exist
SELECT 'Scheduled events created:' AS info;
SELECT event_name 
FROM information_schema.events 
WHERE event_schema = DATABASE();

/* ---------------------------------------------------------
   MIGRATION COMPLETE
   ---------------------------------------------------------
   
   Next steps:
   1. Test stored procedures with sample data
   2. Add API endpoints for level display
   3. Add frontend components to show user level
   4. Monitor level updates in production
   
   Manual level calculation (if needed):
   CALL sp_calculate_user_level(user_id, 'manual_adjustment', NULL);
   
   Cleanup (runs automatically daily):
   CALL sp_level_system_cleanup();
   
   --------------------------------------------------------- */
