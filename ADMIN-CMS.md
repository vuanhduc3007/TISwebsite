# TIS Admin CMS

## Production rollout order

1. Back up the MySQL database and verify the restore procedure.
2. Review `sql/migrations/001_admin_cms.sql` and schedule a low-traffic maintenance window.
3. Deploy environment variables and Cloudinary credentials.
4. Run the read-only check: `npm run db:preflight:admin`.
5. Set `CONFIRM_ADMIN_MIGRATION` to the exact `MYSQL_DATABASE` value, then run `npm run db:migrate:admin` once. Remove the confirmation afterward.
6. Set temporary `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `CONFIRM_ADMIN_CREATE` (also exactly `MYSQL_DATABASE`); run `npm run admin:create`, then remove all three values.
7. Deploy the application and verify `/admin/login` over HTTPS.

Do not use `npm run db:init` in production. It drops and reseeds content tables.

## One-time owner password recovery

If the sole production owner loses their password and has no valid owner session, the
authenticated `/admin/users` password update cannot be used. `admin:create` is
bootstrap-only and must not be rerun. The guarded recovery command is
`npm run admin:recover-owner`; it must be run only at a separately approved
production recovery checkpoint, after verifying the backup and target database.

Set `MYSQL_DATABASE=solar_shop`, `CONFIRM_ADMIN_PASSWORD_RESET=solar_shop`,
`ADMIN_EMAIL` to the existing active owner's email, and a new 12–256 character
`ADMIN_RECOVERY_PASSWORD` in a temporary, Git-ignored environment. Never pass
the password as a CLI argument or put it in source. The command refuses a
missing/ambiguous owner, missing bootstrap audit or migration, or a second recovery for the same
owner. It hashes using the application password function, updates the existing
account, revokes its sessions, and writes `owner_password_recovery` audit in one
transaction. It prints no password or hash. Remove all three temporary recovery
variables afterward. Verify the audit, login, and session revocation before
resuming the rollout. Unit tests run with `npm run test:admin-recovery` and do
not connect to a database.

## Required production environment

- Existing `MYSQL_*` and `SMTP_*` variables.
- `MYSQL_SSL=true` for a remote database; provide `MYSQL_SSL_CA` when the provider requires its CA.
- `SESSION_SECRET`: long random secret.
- `AUDIT_HASH_SECRET`: separate long random secret.
- `TRUSTED_PROXY_IP_HEADER`: only a client-IP header that the trusted edge overwrites (normally `x-forwarded-for`).
- `MEDIA_PROVIDER=cloudinary`.
- `MEDIA_STORAGE_PREFIX`: a server-owned namespace; use different prefixes for test/staging and production.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- `ENABLE_HSTS=true` only after HTTPS is verified on the domain and every subdomain.
- Valid `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `CONTACT_EMAIL`; set `SMTP_SECURE=true` for implicit TLS when needed.

Local development may use `MEDIA_PROVIDER=local`; uploads then go to `public/images/admin-uploads`. This mode is intentionally rejected in production.

## Roles

- `owner`: content management plus account management and permanent deletion.
- `editor`: Product, Project and Category management, media upload and publish/unpublish.

Every Server Action checks the database-backed session and role again. Proxy protection is only an early redirect and is not the authorization boundary.

MySQL makes each DDL statement atomic, but not this whole multi-statement migration. The final migration-history record distinguishes a complete run. If the runner stops partway, do not blindly rerun it: keep the backup, run the preflight again, and inspect the partial schema first.

## Cloudinary staging verification and reconciliation

Use only a staging Cloudinary account and a prefix beginning with `tiscms-e2e-test`, then run `npm run media:e2e`. The test uploads JPEG/PNG/WebP assets, checks server-controlled public IDs, repeated deletion, failure handling, an ambiguous-result simulation, batch cleanup, and removes every asset it created.

`npm run media:reconcile` is dry-run by default. It compares Cloudinary assets under `MEDIA_STORAGE_PREFIX` with storage keys still referenced by Product and Project records. To delete old unreferenced assets, set `CONFIRM_MEDIA_RECONCILE` to exactly the same prefix and run `npm run media:reconcile -- --delete`. Production assets younger than 15 minutes are never selected, which avoids racing an upload that is still completing.

`001_admin_cms` is a one-time migration. After `admin_schema_migrations` records the version, another `db:migrate:admin` invocation with the required database confirmation exits successfully (`0`) and prints `Admin CMS migration was already applied; no statements executed.` It does not execute the SQL again. This is a guarded no-op, not a repeatable SQL migration.
