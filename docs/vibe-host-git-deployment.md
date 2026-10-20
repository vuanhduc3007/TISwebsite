# Vibe Host Git deployment record

The customer selected Vibe Host Basic. The application is deployed from
`main`, and the acceptance evidence below was collected against Vibe Host
version 6 on 2026-10-20. The older VPS/systemd/Nginx runbooks apply only if a
VPS is chosen instead. Do not combine their `/srv/tiscms` paths or localhost
MySQL assumptions with Vibe Host settings.

## Verified production baseline — 2026-10-20

- Canonical URL: `https://tissolar.vn`; `https://www.tissolar.vn` returns a 301
  redirect to the canonical host and preserves the request path.
- DNS and TLS are active for both hosts. The canonical response sends
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` after TLS was
  verified on both names.
- Vibe Host version 6 built, passed its health gate and is online from commit
  `f5cf727` on `main`.
- Public acceptance checks passed for `/`, `/products` and `/projects`. The
  rendered product catalogue contains 157 unique product links.
- The linked MySQL database contains 4 categories, 157 products, 8 projects,
  18 project images and one admin schema migration.
- A new owner was created through a one-time guarded endpoint. A real login on
  the canonical host returned a secure production session and the authenticated
  dashboard returned 200. The endpoint was then removed and now returns 404.
- The 2026-10-20 automatic MySQL backup completed successfully. A downloaded
  copy is stored outside Git under `TIS-private-transfer` with a recorded SHA-256.
- Automatic Git deployment is enabled in Vibe Host but remains pending until
  the generated GitHub webhook is added to the repository.

Remaining launch work: provision the validated production Cloudinary variables,
complete SMTP configuration, remove temporary bootstrap environment names,
then delete the temporary Adminer website and the redundant `tissolar-mysql`
database after the external backup is retained.

## Source and build

- Git repository: `https://github.com/vuanhduc3007/TISwebsite.git`.
- Branch: `main`, after reviewing the intended commit. The Git repository root
  is already the Next.js application root. The extra `TISwebsite` directory is
  only the local workspace parent; set the platform's application/root directory
  to `.` if it asks for one.
- Runtime: Node.js `22.23.3` (see `.nvmrc` and `package.json` engines). Confirm
  the host can select a compatible Node 22 runtime.
- Install: `npm ci --include=dev` in an isolated Linux build. Build:
  `npm run build`. Start: `npm run start` as a persistent Node.js process; the
  platform must provide its listening `PORT`. Do not use `next dev` or upload
  Windows `node_modules`/`.next`.
- Build must have no production DB/provider credentials and must not run seed,
  migration or owner creation scripts. Runtime configuration is separate.
- Confirm the chosen Git connection supports automatic deployment from `main`.
  A Git URL alone may create only one deployment. Inspect build logs, runtime
  status and rollback behavior on the actual account before relying on push.

## Runtime configuration and service contracts

Keep real secrets in the host's protected environment settings, never in Git,
build logs, screenshots or chat. Vibe Host linked the website to the MySQL 8.0
database `cong_ty_co_phan_thuong_mai_va_dich_vu_ti` on the private service
`vays-db-190f951b-mysql-3306:3306`. On 2026-10-19 the schema and selected content
were imported through a temporary IP-restricted Adminer service, then verified
as 4 categories, 157 products, 8 projects, 18 project images and one applied
admin migration. Admin users, sessions, audit logs and rate-limit rows were
intentionally not copied. Create a new owner after runtime connectivity works.

For this exact managed private service set `MYSQL_SSL=false` and
`MYSQL_TRUSTED_PRIVATE_NETWORK=true`. The runtime accepts plaintext only for an
exact `vays-db-*-mysql-3306` internal hostname with this explicit opt-in; public
or other remote targets still require `MYSQL_SSL=true` and certificate
verification. Keep the database's external connection disabled. The separately
created `tissolar_mysql` database remains a temporary rollback resource until
the linked database, website and first backup have been verified; remove it
after that checkpoint.

Vibe Host now contains protected `SESSION_SECRET` and `AUDIT_HASH_SECRET`
variables. The local production Cloudinary identity and namespace are distinct
from the test account and passed a read-only authenticated API check, but its
three credentials have not yet been transmitted to Vibe Host. Real SMTP host,
authentication and a verified sender (`SMTP_FROM`) are also pending. No
temporary or fake value may satisfy either service gate.

The app validates the client address used for admin/contact rate limits. Vibe
Host support confirmed that its managed ingress forwards the visitor address
in `X-Real-IP` but cannot add `X-TIS-Proxy-Token`. Set
`TRUSTED_PROXY_MODE=vibe-host`, `TRUSTED_PROXY_IP_HEADER=x-real-ip`, and remove
`TRUSTED_PROXY_SECRET` for this deployment. This mode rejects missing, chained,
malformed and alternate IP headers and is valid only while the container has no
direct public-origin path. Validate header overwrite behavior with a staging
rate-limit test before attaching the production domain. Other deployments keep
`TRUSTED_PROXY_MODE=token` and a distinct 32-256 character proxy secret.
Review TLS, canonical domain, cache bypass for admin/API/auth, resource limits,
logs, alerts and backups on this platform. Enable HSTS only after HTTPS and
subdomain behavior are accepted.

`npm run production:config-check` is an offline configuration gate, not a
service test. Its current **BLOCKED** result is expected until Cloudinary and
SMTP are provisioned. Do not run production DB migrations, media cleanup,
upload or email tests without the separate approvals in the readiness audit.
The accepted production data baseline is **4 categories / 157 products / 8
projects / 18 project images**.

## What a later Git push does

After the generated webhook is installed and its first delivery is accepted, a
push to `main` should trigger a new build and release. Confirm this in Vibe Host
deployment history after each push; a successful push alone proves only that
GitHub received the commit. Review and test each source change first. Schema
changes, new environment variables, dependency failures and data migrations
need their own steps. Keep a known-good release and a schema-compatible
rollback plan.
