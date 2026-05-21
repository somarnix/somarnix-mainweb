/* ---------------------------------------------------------
   18. NEWS CMS / WORDPRESS-STYLE CONTENT
   Admin-managed pages, news posts, 9:16 shorts, comments,
   reactions, media references, and settings.
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS cms_entries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  content_type ENUM('page','post','short') NOT NULL DEFAULT 'page',
  slug VARCHAR(191) NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  content LONGTEXT NOT NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  featured_image_url VARCHAR(2000) NULL,
  video_url VARCHAR(2000) NULL,
  seo_title VARCHAR(255) NULL,
  seo_description VARCHAR(500) NULL,
  menu_label VARCHAR(120) NULL,
  show_in_menu TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  author_id BIGINT UNSIGNED NULL,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_cms_entries_type_slug (content_type, slug),
  KEY idx_cms_entries_public (content_type, status, published_at, id),
  KEY idx_cms_entries_menu (show_in_menu, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_media (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  file_url VARCHAR(2000) NOT NULL,
  title VARCHAR(255) NULL,
  alt_text VARCHAR(255) NULL,
  mime_type VARCHAR(120) NULL,
  uploaded_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cms_media_uploaded_by (uploaded_by, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_settings (
  setting_key VARCHAR(120) NOT NULL,
  setting_value LONGTEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entry_id INT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  author_name VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('approved','hidden') NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cms_comments_entry_status (entry_id, parent_id, status, created_at, id),
  KEY idx_cms_comments_user (user_id, id),
  CONSTRAINT fk_cms_comments_entry
    FOREIGN KEY (entry_id) REFERENCES cms_entries(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cms_comments_parent
    FOREIGN KEY (parent_id) REFERENCES cms_comments(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_comment_reactions (
  comment_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  reaction ENUM('like','dislike') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id, user_id),
  KEY idx_cms_comment_reactions_user (user_id, created_at),
  KEY idx_cms_comment_reactions_comment_reaction (comment_id, reaction),
  CONSTRAINT fk_cms_comment_reactions_comment
    FOREIGN KEY (comment_id) REFERENCES cms_comments(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_entry_likes (
  entry_id INT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entry_id, user_id),
  KEY idx_cms_entry_likes_user (user_id, created_at),
  CONSTRAINT fk_cms_entry_likes_entry
    FOREIGN KEY (entry_id) REFERENCES cms_entries(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_entry_favorites (
  entry_id INT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entry_id, user_id),
  KEY idx_cms_entry_favorites_user (user_id, created_at),
  CONSTRAINT fk_cms_entry_favorites_entry
    FOREIGN KEY (entry_id) REFERENCES cms_entries(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
