ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_border_url VARCHAR(255) NULL
  AFTER avatar_url;
