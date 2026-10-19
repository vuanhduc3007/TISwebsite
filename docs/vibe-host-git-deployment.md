# Vibe Host Git deployment checkpoint

The customer selected Vibe Host Basic as the intended host. This document is a
setup and acceptance checklist, not evidence that the service is deployed or
production ready. The older VPS/systemd/Nginx runbooks apply only if a VPS is
chosen instead. Do not combine their `/srv/tiscms` paths or localhost MySQL
assumptions with Vibe Host settings.

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
build logs, screenshots or chat. Use an independently provisioned non-root MySQL
identity and separate deployment/migration identity. The database name in the
current production config gate is `solar_shop`; if the host assigns a different
name, review schema and gate changes before deployment. If MySQL is reached
across a network, `MYSQL_SSL=true` with verified certificate is required.
Confirm the provider's MySQL connectivity, grants, storage and backup/restore
process; the dashboard showing zero databases does not establish any of them.

Production also requires new distinct `SESSION_SECRET` and
`AUDIT_HASH_SECRET` values with documented rotation after the earlier exposure,
the correct production Cloudinary account/namespace, and real SMTP host,
authentication, verified sender (`SMTP_FROM`) and recipient (`CONTACT_EMAIL`).
The user's last checkpoint reported that the DB identity, SMTP details and
rotation evidence are absent: these remain **BLOCKED**. No temporary or fake
value may satisfy the config gate.

The app validates `TRUSTED_PROXY_IP_HEADER` and `TRUSTED_PROXY_SECRET` for
admin/contact rate limits. Get a written provider contract for the inbound
proxy: it must overwrite the client IP and private token headers, prevent
direct-origin bypass, and supply the real visitor IP. Validate spoofed and
chained headers in an approved staging environment. A managed proxy with no
custom header support needs an application/proxy design change before go-live.
Review TLS, canonical domain, cache bypass for admin/API/auth, resource limits,
logs, alerts and backups on this platform. Enable HSTS only after HTTPS and
subdomain behavior are accepted.

`npm run production:config-check` is an offline configuration gate, not a
service test. Its current **BLOCKED** result is expected while real values are
missing. Do not run production DB migrations, media cleanup, upload or email
tests without the separate approvals in the readiness audit. The accepted
production data baseline is **4 categories / 157 products / 8 projects / 18
project images**, to be verified only with explicitly approved read-only DB
access.

## What a later Git push does

Once the provider's Git integration, deploy branch and automatic deployment
have been configured and tested, a push to `main` should trigger a new build
and release. Confirm this in Vibe Host deployment history after each push; a
successful push alone proves only that GitHub received the commit. Review and
test each source change first. Schema changes, new environment variables,
dependency failures and data migrations need their own steps. Keep a known-good
release and a schema-compatible rollback plan. Public launch is a separate
checkpoint after the production readiness blockers have been resolved.
