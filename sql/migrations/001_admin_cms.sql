-- TIS Admin CMS - additive migration for MySQL 8+
-- Review and back up the database before running in production.
-- This migration never drops existing tables or existing columns.

-- Do not wait indefinitely for a production metadata lock.
SET SESSION lock_wait_timeout = 30;
SET SESSION innodb_lock_wait_timeout = 30;

ALTER TABLE categories
  ADD COLUMN slug VARCHAR(191) NULL AFTER name,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER slug,
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER sort_order,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

UPDATE categories
SET slug = CONCAT('danh-muc-', id), sort_order = id * 10
WHERE slug IS NULL OR slug = '';

ALTER TABLE categories
  MODIFY slug VARCHAR(191) NOT NULL,
  ADD UNIQUE INDEX uq_categories_slug (slug),
  ADD INDEX idx_categories_admin (is_active, sort_order, id);

ALTER TABLE products
  ADD COLUMN slug VARCHAR(191) NULL AFTER id,
  ADD COLUMN status ENUM('draft', 'published') NOT NULL DEFAULT 'published' AFTER brand,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN description TEXT NULL AFTER sort_order,
  ADD COLUMN image_alt VARCHAR(255) NULL AFTER image_url,
  ADD COLUMN image_storage_key VARCHAR(512) NULL AFTER image_alt,
  ADD COLUMN price_amount BIGINT UNSIGNED NULL AFTER price,
  ADD COLUMN price_label VARCHAR(100) NULL AFTER price_amount,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;

-- Existing legacy URLs remain resolvable by product ID after the code deployment.
UPDATE products
SET
  slug = CONCAT('san-pham-', id),
  price_amount = CASE
    WHEN price REGEXP '^[0-9]+$' THEN CAST(price AS UNSIGNED)
    ELSE NULL
  END,
  price_label = CASE
    WHEN price REGEXP '^[0-9]+$' THEN NULL
    ELSE NULLIF(TRIM(price), '')
  END,
  sort_order = id * 10
WHERE slug IS NULL OR slug = '';

ALTER TABLE products
  MODIFY slug VARCHAR(191) NOT NULL,
  ADD UNIQUE INDEX uq_products_slug (slug),
  ADD INDEX idx_products_public (status, deleted_at, sort_order, id),
  ADD INDEX idx_products_admin (deleted_at, status, category_id, brand);

ALTER TABLE projects
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
  ADD INDEX idx_projects_admin (deleted_at, status, pillar, sort_order, id);

ALTER TABLE project_images
  ADD COLUMN alt_text VARCHAR(255) NULL AFTER caption,
  ADD COLUMN storage_key VARCHAR(512) NULL AFTER image_url,
  ADD COLUMN mime_type VARCHAR(100) NULL AFTER storage_key,
  ADD COLUMN file_size INT UNSIGNED NULL AFTER mime_type,
  ADD COLUMN width INT UNSIGNED NULL AFTER file_size,
  ADD COLUMN height INT UNSIGNED NULL AFTER width;

CREATE TABLE admin_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(512) NOT NULL,
  role ENUM('owner', 'editor') NOT NULL DEFAULT 'editor',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_admin_users_email (email),
  INDEX idx_admin_users_active (is_active, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_admin_sessions_user
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  UNIQUE INDEX uq_admin_sessions_token (token_hash),
  INDEX idx_admin_sessions_user (user_id, revoked_at, expires_at),
  INDEX idx_admin_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_email VARCHAR(191) NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100) NULL,
  ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_audit_actor
    FOREIGN KEY (actor_user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_admin_audit_created (created_at, id),
  INDEX idx_admin_audit_resource (resource_type, resource_id, created_at),
  INDEX idx_admin_audit_actor (actor_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rate_limits (
  scope VARCHAR(64) NOT NULL,
  key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  window_start DATETIME NOT NULL,
  request_count INT UNSIGNED NOT NULL DEFAULT 1,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (scope, key_hash, window_start),
  INDEX idx_rate_limits_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Written last so the runner can distinguish a completed migration from a
-- partial MySQL DDL run. MySQL DDL is atomic per statement, not as one file.
CREATE TABLE admin_schema_migrations (
  version VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_schema_migrations (version) VALUES ('001_admin_cms');
