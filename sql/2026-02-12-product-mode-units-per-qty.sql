USE gstechedukh;

-- 1) Product mode: license vs inventory
SET @has_products_mode := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'products'
    AND column_name = 'mode'
);
SET @sql := IF(
  @has_products_mode = 0,
  "ALTER TABLE products ADD COLUMN mode ENUM('license','inventory') NOT NULL DEFAULT 'inventory' AFTER is_unlimited_stock",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Force tools into license mode; everything else inventory.
UPDATE products p
JOIN product_categories c ON c.id = p.category_id
SET p.mode = CASE
  WHEN LOWER(c.name) = 'tools' THEN 'license'
  ELSE 'inventory'
END;

-- 2) Bundle size for inventory variants
SET @has_variant_units := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'product_variants'
    AND column_name = 'units_per_qty'
);
SET @sql := IF(
  @has_variant_units = 0,
  'ALTER TABLE product_variants ADD COLUMN units_per_qty INT UNSIGNED NOT NULL DEFAULT 1 AFTER duration_days',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE product_variants
SET units_per_qty = 1
WHERE units_per_qty IS NULL OR units_per_qty < 1;

-- 3) Snapshot units_per_qty at order time (so future variant edits do not break restock math)
SET @has_order_item_units := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'order_items'
    AND column_name = 'units_per_qty'
);
SET @sql := IF(
  @has_order_item_units = 0,
  'ALTER TABLE order_items ADD COLUMN units_per_qty INT UNSIGNED NOT NULL DEFAULT 1 AFTER qty',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE order_items oi
LEFT JOIN product_variants pv ON pv.id = oi.variant_id
SET oi.units_per_qty = GREATEST(1, COALESCE(pv.units_per_qty, 1))
WHERE oi.units_per_qty IS NULL OR oi.units_per_qty < 1;