/* =========================================================
   STEP 11: TOOL DEFINITIONS + ROUTE ALIASES
========================================================= */

USE somarnix;

CREATE TABLE IF NOT EXISTS tool_definitions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  canonical_slug VARCHAR(120) NOT NULL,
  display_name VARCHAR(255) NULL,
  handler_key VARCHAR(80) NOT NULL,
  short_description VARCHAR(500) NULL,
  long_description TEXT NULL,
  tool_kind ENUM('online','downloadable','offline_licensed','embedded') NOT NULL,
  tool_category ENUM('ai','video','image','productivity','utility','other') NOT NULL DEFAULT 'utility',
  platform ENUM('any','web','pc','mobile','pc+mobile') NOT NULL DEFAULT 'any',
  access_model ENUM('none','purchase','license') NOT NULL DEFAULT 'purchase',
  delivery_model ENUM('web','download','license','download+license') NOT NULL DEFAULT 'web',
  requires_license TINYINT(1) NOT NULL DEFAULT 1,
  default_device_limit INT NOT NULL DEFAULT 3,
  max_device_limit INT NOT NULL DEFAULT 10,
  default_license_duration_days INT NULL,
  allow_offline_mode TINYINT(1) NOT NULL DEFAULT 0,
  offline_grace_period_hours INT NOT NULL DEFAULT 72,
  storage_provider ENUM('local','r2','s3','gcs') DEFAULT 'r2',
  storage_bucket VARCHAR(100) NULL,
  storage_key_prefix VARCHAR(255) NULL,
  file_extension VARCHAR(20) NULL,
  launch_path VARCHAR(255) NULL,
  embedded_entry VARCHAR(255) NULL,
  api_endpoint VARCHAR(255) NULL,
  config_json JSON NULL,
  current_version VARCHAR(50) NULL,
  version_changelog TEXT NULL,
  min_client_version VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_beta TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tool_definition_product (product_id),
  UNIQUE KEY uniq_tool_definition_slug (canonical_slug),
  INDEX idx_tool_definition_handler (handler_key),
  INDEX idx_tool_definition_kind (tool_kind),
  INDEX idx_tool_definition_active (is_active),
  INDEX idx_tool_category (tool_category),
  INDEX idx_platform (platform),
  INDEX idx_is_featured (is_featured),
  INDEX idx_sort_order (sort_order, is_active),
  CONSTRAINT fk_tool_definition_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tool_route_aliases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tool_definition_id BIGINT UNSIGNED NOT NULL,
  alias_slug VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tool_route_alias (alias_slug),
  INDEX idx_tool_route_alias_tool (tool_definition_id),
  CONSTRAINT fk_tool_route_alias_tool FOREIGN KEY (tool_definition_id) REFERENCES tool_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------------------------------------------------------
   OPTIONAL BACKFILL EXAMPLES
   Run only after the matching products already exist.
--------------------------------------------------------- */

/*
INSERT INTO tool_definitions
  (product_id, canonical_slug, handler_key, tool_kind, access_model, delivery_model, launch_path, embedded_entry, config_json)
SELECT
  id,
  slug,
  'veo3',
  'online',
  'license',
  'web',
  '/tools-ai/toolveo3',
  'app/pages/tools-ai/veo3/Veo3.tsx',
  JSON_OBJECT('buy_slug', slug, 'legacy_component', 'Veo3')
FROM products
WHERE slug = 'toolveo3'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = products.id
  );

INSERT INTO tool_definitions
  (product_id, canonical_slug, handler_key, tool_kind, access_model, delivery_model, launch_path, embedded_entry, config_json)
SELECT
  id,
  slug,
  'download-tool',
  'downloadable',
  'license',
  'download+license',
  '/tools-ai/tooldownloadvideo',
  'app/pages/tools-ai/tooldownloadvideo/ToolDownload.tsx',
  JSON_OBJECT('buy_slug', slug, 'legacy_component', 'ToolDownload')
FROM products
WHERE slug = 'tooldownloadvideo'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = products.id
  );

INSERT INTO tool_definitions
  (product_id, canonical_slug, handler_key, tool_kind, access_model, delivery_model, launch_path, embedded_entry, config_json)
SELECT
  id,
  slug,
  'video-editor',
  'embedded',
  'license',
  'web',
  '/tools-ai/videoeditor',
  'app/pages/tools-ai/video-editor/Videoeditor.tsx',
  JSON_OBJECT('buy_slug', slug, 'legacy_component', 'VideoEditorPage')
FROM products
WHERE slug = 'videoeditor'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = products.id
  );

INSERT INTO tool_definitions
  (product_id, canonical_slug, handler_key, tool_kind, access_model, delivery_model, launch_path, embedded_entry, config_json)
SELECT
  id,
  slug,
  'prompt-ai-studio',
  'embedded',
  'license',
  'web',
  '/tools-ai/promt-ai',
  'app/pages/tools-ai/promt-ai/PromtAi.tsx',
  JSON_OBJECT('buy_slug', slug, 'legacy_component', 'PromtAi')
FROM products
WHERE slug = 'promt-ai'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = products.id
  );

INSERT INTO tool_definitions
  (product_id, canonical_slug, handler_key, tool_kind, access_model, delivery_model, launch_path, embedded_entry, config_json)
SELECT
  id,
  slug,
  'translate-video',
  'embedded',
  'none',
  'web',
  '/tools-ai/translatevideo',
  'app/pages/tools-ai/translatevideo/TranslateVideoAI.tsx',
  JSON_OBJECT('buy_slug', slug, 'legacy_component', 'TranslateVideoAI')
FROM products
WHERE slug = 'translatevideo'
  AND NOT EXISTS (
    SELECT 1 FROM tool_definitions td WHERE td.product_id = products.id
  );

INSERT INTO tool_route_aliases (tool_definition_id, alias_slug)
SELECT td.id, 'veo3'
FROM tool_definitions td
WHERE td.canonical_slug = 'toolveo3'
  AND NOT EXISTS (
    SELECT 1 FROM tool_route_aliases tra WHERE tra.alias_slug = 'veo3'
  );

INSERT INTO tool_route_aliases (tool_definition_id, alias_slug)
SELECT td.id, 'video-editor'
FROM tool_definitions td
WHERE td.canonical_slug = 'videoeditor'
  AND NOT EXISTS (
    SELECT 1 FROM tool_route_aliases tra WHERE tra.alias_slug = 'video-editor'
  );

INSERT INTO tool_route_aliases (tool_definition_id, alias_slug)
SELECT td.id, 'prompt-ai'
FROM tool_definitions td
WHERE td.canonical_slug = 'promt-ai'
  AND NOT EXISTS (
    SELECT 1 FROM tool_route_aliases tra WHERE tra.alias_slug = 'prompt-ai'
  );

INSERT INTO tool_route_aliases (tool_definition_id, alias_slug)
SELECT td.id, 'translatevideo-ai'
FROM tool_definitions td
WHERE td.canonical_slug = 'translatevideo'
  AND NOT EXISTS (
    SELECT 1 FROM tool_route_aliases tra WHERE tra.alias_slug = 'translatevideo-ai'
  );
*/
