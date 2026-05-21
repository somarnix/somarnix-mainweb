import { db } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export type CmsContentType = "page" | "post" | "short";
export type CmsStatus = "draft" | "published";

export type CmsEntry = {
  id: number;
  contentType: CmsContentType;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  status: CmsStatus;
  featuredImageUrl: string | null;
  videoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  menuLabel: string | null;
  showInMenu: boolean;
  sortOrder: number;
  authorId: number | null;
  authorUsername: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CmsComment = {
  id: number;
  entryId: number;
  parentId: number | null;
  userId: number | null;
  authorName: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  body: string;
  status: "approved" | "hidden";
  likeCount: number;
  dislikeCount: number;
  viewerReaction: "like" | "dislike" | null;
  createdAt: string | null;
};

export type CmsReactionSummary = {
  likeCount: number;
  favoriteCount: number;
  liked: boolean;
  favorited: boolean;
};

export type CmsInput = {
  contentType: CmsContentType;
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  status: CmsStatus;
  featuredImageUrl?: string | null;
  videoUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  menuLabel?: string | null;
  showInMenu?: boolean;
  sortOrder?: number;
  authorId?: number | null;
};

type CmsRow = RowDataPacket & {
  id: number;
  content_type: CmsContentType;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  status: CmsStatus;
  featured_image_url: string | null;
  video_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  menu_label: string | null;
  show_in_menu: number | null;
  sort_order: number | null;
  author_id: number | null;
  author_username: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  published_at: string | Date | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

type CmsCommentRow = RowDataPacket & {
  id: number;
  entry_id: number;
  parent_id: number | null;
  user_id: number | null;
  author_name: string;
  author_username: string | null;
  author_avatar_url: string | null;
  body: string;
  status: "approved" | "hidden";
  like_count: number | string | null;
  dislike_count: number | string | null;
  viewer_reaction: "like" | "dislike" | null;
  created_at: string | Date | null;
};

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

async function hasColumn(table: string, column: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [table, column]
  );
  return rows.length > 0;
}

async function getColumnType(table: string, column: string): Promise<string | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT column_type
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [table, column]
  );
  return typeof rows[0]?.column_type === "string" ? rows[0].column_type : null;
}

const CMS_ENTRY_SELECT = `
  e.*,
  u.username AS author_username,
  NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS author_name,
  u.avatar_url AS author_avatar_url
`;

export function normalizeCmsSlug(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191);
}

export function normalizeCmsContentType(value: unknown): CmsContentType {
  if (value === "short") return "short";
  return value === "post" ? "post" : "page";
}

export function normalizeCmsStatus(value: unknown): CmsStatus {
  return value === "published" ? "published" : "draft";
}

export function normalizeCmsEntry(row: CmsRow): CmsEntry {
  return {
    id: Number(row.id),
    contentType: normalizeCmsContentType(row.content_type),
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    status: row.status === "published" ? "published" : "draft",
    featuredImageUrl: row.featured_image_url,
    videoUrl: row.video_url ?? null,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    menuLabel: row.menu_label,
    showInMenu: Number(row.show_in_menu ?? 0) === 1,
    sortOrder: Number(row.sort_order ?? 0),
    authorId: row.author_id === null ? null : Number(row.author_id),
    authorUsername: row.author_username ?? null,
    authorName: row.author_name ?? null,
    authorAvatarUrl: row.author_avatar_url ?? null,
    publishedAt: toIso(row.published_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function normalizeCmsComment(row: CmsCommentRow): CmsComment {
  return {
    id: Number(row.id),
    entryId: Number(row.entry_id),
    parentId: row.parent_id === null ? null : Number(row.parent_id),
    userId: row.user_id === null ? null : Number(row.user_id),
    authorName: row.author_name,
    authorUsername: row.author_username ?? null,
    authorAvatarUrl: row.author_avatar_url ?? null,
    body: row.body,
    status: row.status === "hidden" ? "hidden" : "approved",
    likeCount: Number(row.like_count ?? 0),
    dislikeCount: Number(row.dislike_count ?? 0),
    viewerReaction: row.viewer_reaction === "like" || row.viewer_reaction === "dislike" ? row.viewer_reaction : null,
    createdAt: toIso(row.created_at),
  };
}

export async function ensureCmsTables() {
  await db.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const contentTypeColumn = await getColumnType("cms_entries", "content_type");
  if (contentTypeColumn && !contentTypeColumn.includes("'short'")) {
    await db.query(`
      ALTER TABLE cms_entries
      MODIFY COLUMN content_type ENUM('page','post','short') NOT NULL DEFAULT 'page'
    `);
  }

  if (!(await hasColumn("cms_entries", "video_url"))) {
    await db.query(`
      ALTER TABLE cms_entries
      ADD COLUMN video_url VARCHAR(2000) NULL AFTER featured_image_url
    `);
  }

  const authorIdColumn = await getColumnType("cms_entries", "author_id");
  if (authorIdColumn && authorIdColumn.toLowerCase() !== "bigint unsigned") {
    await db.query(`
      ALTER TABLE cms_entries
      MODIFY COLUMN author_id BIGINT UNSIGNED NULL
    `);
  }

  await db.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cms_settings (
      setting_key VARCHAR(120) NOT NULL,
      setting_value LONGTEXT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
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
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  if (!(await hasColumn("cms_comments", "parent_id"))) {
    await db.query(`
      ALTER TABLE cms_comments
      ADD COLUMN parent_id BIGINT UNSIGNED NULL AFTER entry_id
    `);
  }

  if (!(await hasColumn("cms_comments", "updated_at"))) {
    await db.query(`
      ALTER TABLE cms_comments
      ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at
    `);
  }

  await db.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cms_entry_likes (
      entry_id INT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (entry_id, user_id),
      KEY idx_cms_entry_likes_user (user_id, created_at),
      CONSTRAINT fk_cms_entry_likes_entry
        FOREIGN KEY (entry_id) REFERENCES cms_entries(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cms_entry_favorites (
      entry_id INT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (entry_id, user_id),
      KEY idx_cms_entry_favorites_user (user_id, created_at),
      CONSTRAINT fk_cms_entry_favorites_entry
        FOREIGN KEY (entry_id) REFERENCES cms_entries(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function listCmsEntries(type?: CmsContentType): Promise<CmsEntry[]> {
  await ensureCmsTables();
  const params: unknown[] = [];
  const where = type ? "WHERE e.content_type = ?" : "";
  if (type) params.push(type);

  const [rows] = await db.query<CmsRow[]>(
    `
    SELECT ${CMS_ENTRY_SELECT}
    FROM cms_entries e
    LEFT JOIN users u ON u.id = e.author_id
    ${where}
    ORDER BY e.updated_at DESC, e.id DESC
    `,
    params
  );

  return rows.map(normalizeCmsEntry);
}

export async function listPublishedCmsPosts(limit = 24): Promise<CmsEntry[]> {
  await ensureCmsTables();
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const [rows] = await db.query<CmsRow[]>(
    `
    SELECT ${CMS_ENTRY_SELECT}
    FROM cms_entries e
    LEFT JOIN users u ON u.id = e.author_id
    WHERE e.status = 'published'
    ORDER BY e.published_at DESC, e.id DESC
    LIMIT ${safeLimit}
    `
  );

  return rows.map(normalizeCmsEntry);
}

export async function getPublishedCmsEntry(
  type: CmsContentType,
  slug: string
): Promise<CmsEntry | null> {
  await ensureCmsTables();
  const [rows] = await db.query<CmsRow[]>(
    `
    SELECT ${CMS_ENTRY_SELECT}
    FROM cms_entries e
    LEFT JOIN users u ON u.id = e.author_id
    WHERE e.content_type = ?
      AND e.slug = ?
      AND e.status = 'published'
    LIMIT 1
    `,
    [type, slug]
  );

  return rows[0] ? normalizeCmsEntry(rows[0]) : null;
}

export async function getPublishedCmsEntryById(id: number): Promise<CmsEntry | null> {
  await ensureCmsTables();
  const [rows] = await db.query<CmsRow[]>(
    `
    SELECT ${CMS_ENTRY_SELECT}
    FROM cms_entries e
    LEFT JOIN users u ON u.id = e.author_id
    WHERE e.id = ?
      AND e.status = 'published'
    LIMIT 1
    `,
    [id]
  );

  return rows[0] ? normalizeCmsEntry(rows[0]) : null;
}

export async function listCmsComments(entryId: number, viewerUserId?: number | null): Promise<CmsComment[]> {
  await ensureCmsTables();
  const [rows] = await db.query<CmsCommentRow[]>(
    `
    SELECT
      c.*,
      u.username AS author_username,
      u.avatar_url AS author_avatar_url,
      (SELECT COUNT(*) FROM cms_comment_reactions cr WHERE cr.comment_id = c.id AND cr.reaction = 'like') AS like_count,
      (SELECT COUNT(*) FROM cms_comment_reactions cr WHERE cr.comment_id = c.id AND cr.reaction = 'dislike') AS dislike_count,
      viewer.reaction AS viewer_reaction
    FROM cms_comments c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN cms_comment_reactions viewer ON viewer.comment_id = c.id AND viewer.user_id = ?
    WHERE c.entry_id = ?
      AND c.status = 'approved'
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT 200
    `,
    [viewerUserId ?? 0, entryId]
  );

  return rows.map(normalizeCmsComment);
}

export async function createCmsComment(input: {
  entryId: number;
  parentId?: number | null;
  userId?: number | null;
  authorName: string;
  body: string;
}): Promise<number> {
  await ensureCmsTables();
  const [result] = await db.query<ResultSetHeader>(
    `
    INSERT INTO cms_comments (entry_id, parent_id, user_id, author_name, body, status)
    VALUES (?, ?, ?, ?, ?, 'approved')
    `,
    [input.entryId, input.parentId ?? null, input.userId ?? null, input.authorName, input.body]
  );

  return result.insertId;
}

export async function getCmsComment(commentId: number): Promise<CmsComment | null> {
  await ensureCmsTables();
  const [rows] = await db.query<CmsCommentRow[]>(
    `
    SELECT
      c.*,
      u.username AS author_username,
      u.avatar_url AS author_avatar_url,
      0 AS like_count,
      0 AS dislike_count,
      NULL AS viewer_reaction
    FROM cms_comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
      AND c.status = 'approved'
    LIMIT 1
    `,
    [commentId]
  );

  return rows[0] ? normalizeCmsComment(rows[0]) : null;
}

export async function setCmsCommentReaction(input: {
  commentId: number;
  userId: number;
  reaction: "like" | "dislike" | null;
}) {
  await ensureCmsTables();
  if (input.reaction) {
    await db.query(
      `
      INSERT INTO cms_comment_reactions (comment_id, user_id, reaction)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE reaction = VALUES(reaction), updated_at = NOW()
      `,
      [input.commentId, input.userId, input.reaction]
    );
  } else {
    await db.query(
      "DELETE FROM cms_comment_reactions WHERE comment_id = ? AND user_id = ?",
      [input.commentId, input.userId]
    );
  }
}

export async function getCmsReactionSummary(
  entryId: number,
  userId?: number | null
): Promise<CmsReactionSummary> {
  await ensureCmsTables();
  const [likeRows] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM cms_entry_likes WHERE entry_id = ?",
    [entryId]
  );
  const [favoriteRows] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM cms_entry_favorites WHERE entry_id = ?",
    [entryId]
  );

  let liked = false;
  let favorited = false;
  if (userId) {
    const [viewerRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        EXISTS(SELECT 1 FROM cms_entry_likes WHERE entry_id = ? AND user_id = ?) AS liked,
        EXISTS(SELECT 1 FROM cms_entry_favorites WHERE entry_id = ? AND user_id = ?) AS favorited
      `,
      [entryId, userId, entryId, userId]
    );
    liked = Number(viewerRows[0]?.liked ?? 0) === 1;
    favorited = Number(viewerRows[0]?.favorited ?? 0) === 1;
  }

  return {
    likeCount: Number(likeRows[0]?.total ?? 0),
    favoriteCount: Number(favoriteRows[0]?.total ?? 0),
    liked,
    favorited,
  };
}

export async function setCmsEntryLike(input: {
  entryId: number;
  userId: number;
  liked: boolean;
}) {
  await ensureCmsTables();
  if (input.liked) {
    await db.query(
      `
      INSERT IGNORE INTO cms_entry_likes (entry_id, user_id)
      VALUES (?, ?)
      `,
      [input.entryId, input.userId]
    );
  } else {
    await db.query(
      "DELETE FROM cms_entry_likes WHERE entry_id = ? AND user_id = ?",
      [input.entryId, input.userId]
    );
  }
}

export async function setCmsEntryFavorite(input: {
  entryId: number;
  userId: number;
  favorited: boolean;
}) {
  await ensureCmsTables();
  if (input.favorited) {
    await db.query(
      `
      INSERT IGNORE INTO cms_entry_favorites (entry_id, user_id)
      VALUES (?, ?)
      `,
      [input.entryId, input.userId]
    );
  } else {
    await db.query(
      "DELETE FROM cms_entry_favorites WHERE entry_id = ? AND user_id = ?",
      [input.entryId, input.userId]
    );
  }
}

export async function listCmsFavoriteEntriesForUser(userId: number): Promise<CmsEntry[]> {
  await ensureCmsTables();
  const [rows] = await db.query<CmsRow[]>(
    `
    SELECT ${CMS_ENTRY_SELECT}
    FROM cms_entry_favorites f
    JOIN cms_entries e ON e.id = f.entry_id
    LEFT JOIN users u ON u.id = e.author_id
    WHERE f.user_id = ?
      AND e.status = 'published'
    ORDER BY f.created_at DESC, e.id DESC
    `,
    [userId]
  );

  return rows.map(normalizeCmsEntry);
}

export async function listCmsMenuEntries(): Promise<CmsEntry[]> {
  await ensureCmsTables();
  const [rows] = await db.query<CmsRow[]>(
    `
    SELECT ${CMS_ENTRY_SELECT}
    FROM cms_entries e
    LEFT JOIN users u ON u.id = e.author_id
    WHERE e.content_type = 'page'
      AND e.status = 'published'
      AND e.show_in_menu = 1
    ORDER BY e.sort_order ASC, e.title ASC, e.id ASC
    `
  );

  return rows.map(normalizeCmsEntry);
}

export async function createCmsEntry(input: CmsInput): Promise<number> {
  await ensureCmsTables();
  const [result] = await db.query<ResultSetHeader>(
    `
    INSERT INTO cms_entries (
      content_type,
      slug,
      title,
      excerpt,
      content,
      status,
      featured_image_url,
      video_url,
      seo_title,
      seo_description,
      menu_label,
      show_in_menu,
      sort_order,
      author_id,
      published_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, IF(? = 'published', NOW(), NULL))
    `,
    [
      input.contentType,
      input.slug,
      input.title,
      input.excerpt ?? null,
      input.content,
      input.status,
      input.featuredImageUrl ?? null,
      input.videoUrl ?? null,
      input.seoTitle ?? null,
      input.seoDescription ?? null,
      input.menuLabel ?? null,
      input.showInMenu ? 1 : 0,
      input.sortOrder ?? 0,
      input.authorId ?? null,
      input.status,
    ]
  );

  return result.insertId;
}

export async function updateCmsEntry(id: number, input: CmsInput) {
  await ensureCmsTables();
  await db.query(
    `
    UPDATE cms_entries
    SET
      content_type = ?,
      slug = ?,
      title = ?,
      excerpt = ?,
      content = ?,
      status = ?,
      featured_image_url = ?,
      video_url = ?,
      seo_title = ?,
      seo_description = ?,
      menu_label = ?,
      show_in_menu = ?,
      sort_order = ?,
      author_id = COALESCE(author_id, ?),
      published_at = CASE
        WHEN ? = 'published' AND published_at IS NULL THEN NOW()
        WHEN ? = 'draft' THEN NULL
        ELSE published_at
      END
    WHERE id = ?
    `,
    [
      input.contentType,
      input.slug,
      input.title,
      input.excerpt ?? null,
      input.content,
      input.status,
      input.featuredImageUrl ?? null,
      input.videoUrl ?? null,
      input.seoTitle ?? null,
      input.seoDescription ?? null,
      input.menuLabel ?? null,
      input.showInMenu ? 1 : 0,
      input.sortOrder ?? 0,
      input.authorId ?? null,
      input.status,
      input.status,
      id,
    ]
  );
}

export async function deleteCmsEntry(id: number) {
  await ensureCmsTables();
  await db.query(`DELETE FROM cms_entries WHERE id = ?`, [id]);
}
