/* =========================================================
   STEP 6: USER API KEYS
========================================================= */

USE gstechedukh;

CREATE TABLE IF NOT EXISTS user_api_keys (
  user_id BIGINT UNSIGNED NOT NULL,
  groq_api_key_enc LONGTEXT NULL,
  openai_api_key_enc LONGTEXT NULL,
  google_api_key_enc LONGTEXT NULL,
  deepl_api_key_enc LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
