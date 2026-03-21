/* ---------------------------------------------------------
   17. SUPPORT FAQS
   Admin-managed support questions and answers
   Supports English, Khmer, and optional video URL
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS support_faqs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_en VARCHAR(500) NOT NULL,
  question_km VARCHAR(500) NOT NULL,
  answer_en TEXT NOT NULL,
  answer_km TEXT NOT NULL,
  video_url VARCHAR(2000) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_support_faqs_active_sort (is_active, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
