/* =========================================================
   STEP 16: SCHEMA NORMALIZATION FOUNDATION
   - Optional advanced cleanup
   - Non-destructive: adds normalized structures without breaking the current app
   - Safe to run after Steps 01-15
========================================================= */

USE gstechedukh;

/* ---------------------------------------------------------
   1. NORMALIZE video_courses category and tags
      Current schema keeps category and tags as free text on video_courses.
      These tables let you migrate to proper relations gradually.
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS video_course_category_definitions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_video_course_category_slug (slug),
  UNIQUE KEY uniq_video_course_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_course_category_links (
  course_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id, category_id),
  INDEX idx_video_course_category_links_category (category_id),
  CONSTRAINT fk_video_course_category_links_course
    FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_course_category_links_category
    FOREIGN KEY (category_id) REFERENCES video_course_category_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_course_tag_definitions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_video_course_tag_slug (slug),
  UNIQUE KEY uniq_video_course_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_course_tag_links (
  course_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id, tag_id),
  INDEX idx_video_course_tag_links_tag (tag_id),
  CONSTRAINT fk_video_course_tag_links_course
    FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_course_tag_links_tag
    FOREIGN KEY (tag_id) REFERENCES video_course_tag_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   2. NORMALIZE promotion combo item references
      promotion_combo_items uses item_type + item_id with no foreign key.
      These replacement tables preserve referential integrity.
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS promotion_combo_product_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  combo_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NULL,
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_combo_product_item (combo_id, product_id, variant_id),
  INDEX idx_combo_product_items_product (product_id),
  CONSTRAINT fk_combo_product_items_combo
    FOREIGN KEY (combo_id) REFERENCES promotion_combos(id) ON DELETE CASCADE,
  CONSTRAINT fk_combo_product_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_combo_product_items_variant
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promotion_combo_course_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  combo_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NULL,
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_combo_course_item (combo_id, course_id, plan_id),
  INDEX idx_combo_course_items_course (course_id),
  CONSTRAINT fk_combo_course_items_combo
    FOREIGN KEY (combo_id) REFERENCES promotion_combos(id) ON DELETE CASCADE,
  CONSTRAINT fk_combo_course_items_course
    FOREIGN KEY (course_id) REFERENCES video_courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_combo_course_items_plan
    FOREIGN KEY (plan_id) REFERENCES video_course_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promotion_combo_tool_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  combo_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  tool_definition_id BIGINT UNSIGNED NULL,
  variant_id BIGINT UNSIGNED NULL,
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_combo_tool_item (combo_id, product_id, tool_definition_id, variant_id),
  INDEX idx_combo_tool_items_product (product_id),
  CONSTRAINT fk_combo_tool_items_combo
    FOREIGN KEY (combo_id) REFERENCES promotion_combos(id) ON DELETE CASCADE,
  CONSTRAINT fk_combo_tool_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_combo_tool_items_definition
    FOREIGN KEY (tool_definition_id) REFERENCES tool_definitions(id) ON DELETE SET NULL,
  CONSTRAINT fk_combo_tool_items_variant
    FOREIGN KEY (variant_id) REFERENCES tool_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   3. DROP CLEARLY REDUNDANT INDEXES
      These are covered by stronger composite or unique indexes.
   --------------------------------------------------------- */

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'product_reviews'
      AND index_name = 'idx_review_product'
  ),
  'ALTER TABLE product_reviews DROP INDEX idx_review_product',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'tool_license_keys'
      AND index_name = 'idx_tool_license_status'
  ),
  'ALTER TABLE tool_license_keys DROP INDEX idx_tool_license_status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'tool_license_activations'
      AND index_name = 'idx_tool_activation_license'
  ),
  'ALTER TABLE tool_license_activations DROP INDEX idx_tool_activation_license',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'video_course_cart_items'
      AND index_name = 'idx_video_course_cart_user'
  ),
  'ALTER TABLE video_course_cart_items DROP INDEX idx_video_course_cart_user',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* ---------------------------------------------------------
   4. VALIDATION QUERIES
   --------------------------------------------------------- */

SELECT 'Normalization foundation tables:' AS info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'video_course_category_definitions',
    'video_course_category_links',
    'video_course_tag_definitions',
    'video_course_tag_links',
    'promotion_combo_product_items',
    'promotion_combo_course_items',
    'promotion_combo_tool_items'
  );

SELECT 'Legacy polymorphic combo table still present for app compatibility:' AS info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name = 'promotion_combo_items';

/* ---------------------------------------------------------
   ROLLOUT NOTES
   ---------------------------------------------------------

   Phase 1:
   - Run this file.
   - Keep current app code working.

   Phase 2:
   - Move video course category/tag reads and writes to the new link tables.
   - Move promotion combo writes to the new typed combo tables.

   Phase 3:
   - Backfill old free-text and polymorphic data into the normalized tables.
   - Update app code fully.

   Phase 4:
   - Drop old columns/tables only after the app no longer uses them:
     * video_courses.category
     * video_courses.tags
     * promotion_combo_items

   Not changed yet on purpose:
   - orders.total vs orders.total_amount
   - product_variants vs tool_variants
   - carts/cart_items vs video_course_cart_items

   Those require application refactors first.
========================================================= */
