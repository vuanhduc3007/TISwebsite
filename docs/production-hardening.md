# Production hardening and release gates

This is a preparation runbook, NOT authorization to change production. Do not
run `db:init`, rerun the applied migration, create another owner, restore over
`solar_shop`, publish DNS, or modify production credentials without approval.

Latest Linux VPS provisioning plan: [infrastructure-readiness.md](infrastructure-readiness.md).
The confirmed active baseline is **4/157/8/18**; historical image-count expectations
must not be reused for future acceptance checks.

## 1. Verified source changes

- Nodemailer pinned to 10.0.16; requires Node >=20. The project runtime gate is
  Node >=22.20.0. Choose a currently security-patched, supported Node LTS on the
  deployment host rather than treating this minimum as the recommended latest.
- Transitive overrides pin sharp 0.35.5 and source-map-js 1.2.2. Revisit these
  pins during dependency updates; do not let them prevent future security fixes.
- Production login/contact and every Product/Project/Category/user mutation
  validate an authenticated proxy before trusting client IP headers. Logout
  also requires the trusted proxy. Existing roles/session checks remain intact.
  The Next proxy rejects untrusted POSTs on /admin* and /api/contact early;
  individual handler/action guards remain as independent defense-in-depth.
- IP addresses are validated and canonicalized, including IPv4-mapped IPv6.
  Forwarded address chains are rejected. DB-backed fixed-window counters still
  use HMAC keys; there is no in-memory production limiter or schema change.
- SMTP requires verified implicit TLS or STARTTLS, with bounded transport
  timeouts. Sender, recipient and reply-to come from validated configuration.
- Admin/contact responses are no-store; X-Frame-Options DENY supplements CSP.
- Session/audit hashing was extracted for tests WITHOUT changing HMAC inputs,
  defaults or persisted format. No environment secret has been changed.

## 2. Secret rotation — NEEDS APPROVAL

SESSION_SECRET and AUDIT_HASH_SECRET appeared in the earlier conversation.
Treat them as exposed unless replacement since that exposure is confirmed.
Cloudinary rotation was separately confirmed; do not automatically rotate it.

Use separate cryptographically random values (at least 32 characters, preferably
32+ random bytes encoded as hex/base64url), injected from the deployment secret
store. Never use password CLI arguments, echo values, paste them in chat, commit
them, or place them in NEXT_PUBLIC_* variables. No generation/rotation is done
by this runbook or the configuration checker.

### Exact usage and effects

| Secret | Consumers | Rotation effect |
| --- | --- | --- |
| SESSION_SECRET | `secret-hash.ts` -> session create/lookup/logout | All old cookies stop matching persisted token hashes; users must log in again. Password hashes are unaffected. |
| AUDIT_HASH_SECRET | `secret-hash.ts` -> login audit IP hashes and rate-limit account/IP keys | New pseudonyms differ from old logs; old rate-limit rows cannot match new keys. Sessions/passwords are unaffected. |
| TRUSTED_PROXY_SECRET | `client-ip.ts`, matched against proxy-injected `x-tis-proxy-token` | Gateway and app must be updated together or production mutations fail closed. This is a NEW deployment secret, not a reuse of either secret above. |

Approved rotation checkpoint:

1. Secure the verified backup and record the current release/configuration
   identifiers WITHOUT recording plaintext secret values.
2. Enter maintenance mode, stop new login/contact requests, and drain old app
   instances. Do not run old/new session or audit secrets across mixed replicas.
3. With explicit DB-write approval, revoke all pre-rotation sessions. This also
   prevents accidental reactivation if an old secret is reintroduced. Do not
   rewrite historical audit rows or reset user passwords.
4. Inject fresh independent session/audit secrets, configure the proxy secret,
   restart ALL instances, then verify login/cookie/logout and replay rejection.
5. AUDIT rotation resets effective rate-limit buckets: keep maintenance/edge
   throttling during the transition. Existing expired limiter rows can age out
   via normal bounded cleanup; no manual deletion is required.
6. Record the rotation date; never roll back to exposed secrets. Retain old audit
   hashes as historical pseudonyms, not as values expected to equal new hashes.

## 3. MySQL application user — PLAN ONLY

Do not change `.env.local`, create an account, or execute these grants until the
deployment topology and a credentials-change checkpoint are approved.

Create a dedicated `tiscms_app` account using the DBA's secure account-provisioning
flow. Password must be entered via a secure channel, not saved in this document
or a shell argument. Restrict host to the actual local/private app host; do NOT
use `%`. `localhost` below is ONLY an example for a same-host app/database.

Reviewed runtime privileges (execute only after the account exists and approval):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.categories TO 'tiscms_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.products TO 'tiscms_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.projects TO 'tiscms_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.project_images TO 'tiscms_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON solar_shop.admin_users TO 'tiscms_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.admin_sessions TO 'tiscms_app'@'localhost';
GRANT SELECT, INSERT ON solar_shop.admin_audit_logs TO 'tiscms_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.rate_limits TO 'tiscms_app'@'localhost';
```

No CREATE/ALTER/DROP/GRANT/FILE/PROCESS/global privileges; no direct UPDATE/DELETE
permission on audit logs. No migration-history privilege is needed by ordinary
app routes. Use separate tightly controlled DBA/migration/backup identities.
Audit logs are append-only for the app, NOT tamper-proof against a DBA.

After approval: review SHOW GRANTS, test allowed operations/denied DDL in an
isolated clone, inject the app credentials, restart, then perform an approved
test-record-only smoke and integrity check. Keep root credentials out of the
application environment; do not reset the existing root password blindly.

DB must bind to loopback/private network, not public 3306. Remote connections
require MYSQL_SSL=true and a verified CA when needed. No production grant or
database exposure has been inspected/changed by the offline config check.

## 4. Trusted proxy contract — REQUIRED before release

Next.js App Router does not expose a trustworthy socket peer to these handlers.
A user-supplied X-Forwarded-For header alone cannot authenticate the sender.

- App: TRUSTED_PROXY_IP_HEADER=x-real-ip and a NEW random TRUSTED_PROXY_SECRET.
- Proxy: OVERWRITE x-real-ip with one independently established client address,
  and OVERWRITE x-tis-proxy-token with the same secret. Never pass/append client
  values, expose the token in a response, or log it.
- Bind Next to loopback/private interface and firewall its port. The gateway
  token is defense-in-depth, not a substitute for network isolation or TLS.
- Without correct configuration production Admin/contact POSTs return 503
  (login GET remains accessible), and Admin mutations cannot proceed. Wrong/missing token
  or malformed IP returns a refusal before DB rate-limit processing.
- Development with no proxy secret ignores forwarded headers and uses one
  development bucket. There is intentionally NO production bypass switch.

Illustrative Nginx location, NOT an installed configuration:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header CF-Connecting-IP "";
    # Private root-readable file containing ONLY this header directive with
    # the real shared token; never committed or included in support logs:
    include /etc/tiscms/proxy-secret-header.conf;
    proxy_buffering off;
    proxy_read_timeout 180s;
    client_max_body_size 20m;
}
```

The private include must use `proxy_set_header X-TIS-Proxy-Token ...;` with the
actual securely provisioned value. Also configure the real domain, valid TLS,
Host allowlist, edge request/body limits and a separate global abuse limiter.
Reject unknown hosts. Do not wildcard Server Actions allowedOrigins: preserve
the real Host/X-Forwarded-Host/Origin; add only exact approved origins if needed.

If Cloudflare proxies the site, enable Nginx real-IP handling ONLY for current
official Cloudflare source CIDRs. Only then can verified CF-Connecting-IP set
$remote_addr. Block unexpected direct origin traffic or treat it by its actual
socket IP, never its claimed Cloudflare header. Do not trust 0.0.0.0/0 or ::/0.
Disable caching on /admin*, /api/contact and authenticated/action requests.

Acceptance tests on the real proxy: two clients have distinct quotas; forged
client X-Real-IP/X-Forwarded-For/token headers are overwritten; direct requests
to the app fail; IPv6 normalization holds; legitimate Server Actions work.

## 5. SMTP checklist — NEEDS YOUR PROVIDER CREDENTIALS

Required: SMTP_HOST, SMTP_USER, SMTP_PASS. Never generate fake values.
SMTP_PORT defaults to 587; use SMTP_SECURE=false for verified STARTTLS, or port
465/SMTP_SECURE=true for implicit TLS. No insecure plaintext fallback.

- SMTP_FROM: verified sender address; required explicitly in production. In
  development it defaults to SMTP_USER if that is an email address.
- CONTACT_EMAIL: real customer recipient; required explicitly in production.
  In development it defaults to the sender address.
- SMTP_REPLY_TO: optional valid address; defaults to the sender address.
- Configure provider/domain SPF, DKIM and DMARC. Verify SMTP authentication and
  delivery to the customer's mailbox in a separately approved email test.
- Current production SMTP credentials are absent; only in-memory composition
  and configuration validation were tested. This is NOT delivery verification.
- Contact rate limit remains 5 requests/IP/15 minutes. Add edge anti-abuse
  protection for distributed spam; do not send email during automated unit tests.

## 6. CSP, HTTPS and HSTS

Existing CSP still permits script/style unsafe-inline to avoid breaking Next
hydration/static rendering. DENY framing, no objects, self-only form action,
nosniff and no-store protections are tested. This is NOT strict nonce-based CSP.

Recommended next checkpoint: per-request nonce CSP, initially report-only,
then browser tests of public/Admin forms, hydration, preview/image rendering,
and any analytics before enforcing. Do not remove unsafe-inline blindly or
allow * to accommodate analytics. Narrow Cloudinary image paths after inventory.

TLS must work end-to-end; use Cloudflare Full (strict) when applicable. Redirect
HTTP to HTTPS. Only THEN set ENABLE_HSTS=true before the release build. Because
headers are built from next.config.ts, changing HSTS requires rebuilding and
restarting. It currently includes subdomains: verify every subdomain first;
do not enable preload or includeSubDomains blindly for mixed-service domains.

## 7. Operational acceptance gates — NOT YET VERIFIED

- Domain/account ownership and client access confirmed; DNS/HTTPS tested.
- Supported patched Node LTS, pinned lockfile install (`npm ci`), non-root OS
  app user, production build; do not copy Windows .next binaries to Linux.
- Firewall: app port private; MySQL 3306 private; SSH restricted; HTTPS exposed.
- Supervisor such as systemd with Restart=on-failure, protected environment
  file/secret store, restart/backoff tested. No production service installed yet.
- Daily consistent full DB backups stored encrypted OFF the app server with
  retention/access controls. Restore drills into isolated databases; protect
  backups/clones because they contain production data and password hashes.
- Scheduled media reconciliation DRY-RUN and alerting. Do not enable destructive
  cleanup of unknown assets automatically. Cloudinary assets need their own
  recovery/retention policy; SQL backup alone does not restore deleted media.
- Monitoring: uptime, 5xx, DB connections/disk, login abuse, mail failures, media
  cleanup failures, backup failures. No raw tokens/passwords/full request headers
  in logs. Retention and access reviewed.
- Versioned releases and a known-good compatible hardened code rollback. NEVER
  roll back to exposed secrets, root app credentials, vulnerable dependencies,
  or weaker proxy guards. Do not auto-restore DB to roll back a code release.
- Browser/mobile/performance and real-domain owner/editor/CSRF/session tests.
  Backup and restore-verification databases must be preserved unless separately
  approved for removal. Existing migration is already applied: never db:init.

## 8. Safe verification commands

```text
npm ls nodemailer sharp source-map-js --all
npm audit
npm audit --omit=dev
npm test
npm run typecheck
npm run build
npm run test:hardening-smoke
npm run production:config-check
git diff --check
```

`npm test` uses fixtures/mocks: no production DB or external email/media calls.
`test:hardening-smoke` starts/stops a fresh LOOPBACK production-build server with
ephemeral fixture secrets and a DB connection sentinel (zero attempts required).
It tests actual login form transport, direct/forged proxy rejection and headers,
NOT successful authenticated CRUD or live email delivery.
`production:config-check` is offline/presence-only, prints no secret values and
does not certify firewall, privileges, credential rotation history or TLS.

Real `media:e2e` / `media:db-e2e` require valid TEST credentials, prefix starting
tiscms-e2e-test, and MYSQL_DATABASE=solar_shop_admin_test. No fallback to
production credentials. DB E2E intentionally emits an orphan key for recovery
testing: run the scoped reconciliation/cleanup checkpoint and verify no fixtures
or assets remain. Do not run it unattended without the cleanup plan.

References:

- https://nextjs.org/docs/app/guides/self-hosting
- https://nextjs.org/docs/app/guides/data-security
- https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header
- https://nginx.org/en/docs/http/ngx_http_realip_module.html
- https://nodemailer.com/smtp
- https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/

## 9. Checkpoint 2026-10-07 — STOP before production changes

The new request permits coordinated rotation/provisioning only when the full
environment can be operated and verified. That prerequisite is NOT established
on this workstation. No production secret, DB grant, session, infrastructure,
owner password or legacy row was changed during this checkpoint.

### Verified again

- Branch `main`; pending changes are the existing hardening/testing changes.
  Both local env files are Git ignored. No commit or push was performed.
- `npm ls nodemailer sharp source-map-js --all`: 10.0.16 / 0.35.5 / 1.2.2.
- `npm audit --json` and `npm audit --omit=dev --json`: zero vulnerabilities.
  The first sandboxed registry request failed; the network-approved rerun passed.
- `npm test`: initially 38/38; after the TEST isolation fix, 45/45.
  `npm run typecheck` and `npm run build`: passed again after the source change.
- `npm run test:hardening-smoke`: passed; fresh loopback child stopped, zero DB
  connection attempts, no SMTP/Cloudinary requests. This does NOT certify a
  restart of the actual app, owner login, mail delivery or the deployed gateway.
- `npm run production:config-check`: exit 1 / BLOCKED. Failing checks are
  `mysqlNonRootUser`, `trustedProxy`, `smtpConfiguration`, `hstsConfigured`.
- Target `solar_shop`, MySQL 8.0.43, migration history count 1, owner count 1,
  active owner count 1, currently valid session count 0. Queries were read-only.
  Current DB account has global privileges and GRANT OPTION; it is NOT an
  acceptable application runtime identity.
- Local TCP inventory shows app port 3000 and MySQL port 3306 listening on
  `0.0.0.0`. This proves all-interface binding, NOT Internet reachability.
  Firewall/router rules and the eventual hosting server remain unverified.
  No running user process was stopped or restarted.

### Accepted data/backup baseline (do NOT use the stale 20-image expectation)

The intentionally updated coworker baseline is 4 categories, 157 products,
8 projects and **18** project images. Image IDs 2 and 4 are absent by design;
remaining IDs span 1–20. All IDs and all four legacy/all-field checksums match
the verified manifest in this checkpoint.

Backup, preserved outside Git:
`C:\Users\Book 3\AppData\Local\TISwebsite\backups\solar_shop_20261007T141824_942Z.sql`

- Size: 395,429 bytes.
- SHA-256: `36fe95f14161cacd2c194f60af6b438910c758e1dad3bcd1d6851acf76159bcf`.
- Companion `.verification.json` records the earlier successful isolated
  restore. Restore was NOT repeated in this checkpoint, and neither backup nor
  either restore-verification database was removed.
- Before a future production mutation, obtain/reverify the fresh backup gate
  required by that checkpoint. A verified file alone does not prove scheduled,
  encrypted offsite backup or current server recoverability.

Fingerprint format matters: mysql2 `dateStrings: true`, rows sorted by `id`,
recursive object-key sorting, `JSON.stringify`, SHA-256. All-field fingerprints
hash the object rows. Legacy fingerprints hash **arrays of values in the exact
`legacyColumns[table]` order**, not projected object rows. NULL remains JSON
null and tuple order is preserved. An initial object-projection comparison in
this checkpoint was the wrong legacy serialization; ordered tuples match all
four stored hashes. Never modify data to accommodate a fingerprint-format bug.

### Inputs required to resume Phase B (do NOT send secrets in chat)

1. Identify the actual hosting server/OS, domain, gateway and database topology.
   Confirm whether this Windows instance is only development or an intended
   production origin. Provide the actual process manager/service name and ALL
   instances that must drain/restart. Do not kill unrelated Node processes.
2. Establish a private app bind and gateway: app on loopback/private port,
   trusted header overwrite contract, shared proxy secret supplied through the
   protected secret store, TLS and edge throttling/maintenance capability.
3. Provide temporary owner smoke credentials through an ignored env/secret
   store, never chat. They are currently absent. Rotation cannot be declared
   complete without new login, authenticated routes, logout, old-cookie replay
   and tampered-cookie rejection on the actual runtime.
4. Confirm the accepted 18-image baseline in any subsequent checkpoint prompt.
5. Obtain a fresh verified backup before the approved production-write window.
   Generate independent secrets directly into the protected deployment store
   using `crypto.randomBytes(32)` or stronger; do not output their values.
   Stop/drain all old instances, revoke pre-rotation sessions, replace the
   session/audit secrets, restart all instances together, and run section 2's
   acceptance checks. Preserve audit history and never roll back to old secrets.

Do not rotate only `.env.local` while unknown instances keep old secrets, or
provision a DB account and claim the rollout passed before the app can restart
and exercise its required flows. Existing fixture tests verify HMAC behavior,
not actual production rotation. Secret length alone is not evidence of rotation.

### Exact DB provisioning template — NOT executed

Substitute placeholders only in the DBA's protected provisioning mechanism.
Do not paste a real password into shell arguments, Git, tickets or support logs.
`<APP_HOST>` is the actual restricted local/private app host, NEVER `%`.

```sql
CREATE USER '<APP_DB_USER>'@'<APP_HOST>' IDENTIFIED BY '<GENERATED_PASSWORD>';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.categories TO '<APP_DB_USER>'@'<APP_HOST>';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.products TO '<APP_DB_USER>'@'<APP_HOST>';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.projects TO '<APP_DB_USER>'@'<APP_HOST>';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.project_images TO '<APP_DB_USER>'@'<APP_HOST>';
GRANT SELECT, INSERT, UPDATE ON solar_shop.admin_users TO '<APP_DB_USER>'@'<APP_HOST>';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.admin_sessions TO '<APP_DB_USER>'@'<APP_HOST>';
GRANT SELECT, INSERT ON solar_shop.admin_audit_logs TO '<APP_DB_USER>'@'<APP_HOST>';
GRANT SELECT, INSERT, UPDATE, DELETE ON solar_shop.rate_limits TO '<APP_DB_USER>'@'<APP_HOST>';
SHOW GRANTS FOR '<APP_DB_USER>'@'<APP_HOST>';
```

Query mapping: public/repository reads require SELECT; Product/Project/Category
actions require INSERT/UPDATE/DELETE (project image references included); user
actions require SELECT/INSERT/UPDATE, never DELETE; session create/lookup/revoke
and bounded expiry cleanup require all four operations; audit requires only
SELECT/INSERT; rate-limit upsert/read/prune requires all four operations.
Ordinary runtime does not need migration-history or DBA privileges.

Review direct grants AND role-derived grants. Verify negative privileges on an
isolated clone using harmless disposable objects/accounts, never by attempting
DROP on a production table. Switch the protected runtime env to this account,
restart all app instances, then run approved test-record-only CRUD/login/audit
and integrity checks. Do not use `db:init` or rerun the migration.

### Deferred phases

Source fix in this checkpoint: `loadCloudinaryTestEnv` now requires all six
safety-critical values explicitly in the TEST file, refuses production API
key/secret reuse and identical key/secret, and applies only the validated TEST
snapshot. Previously a missing TEST credential could inherit production values
from `.env.local`. Seven fixture-only tests cover these guards, missing file,
wrong database/namespace and a valid isolated configuration. No live API or DB
is called by these tests; normal `loadEnvFile` precedence is preserved.

Cloudinary TEST auth/E2E, live SMTP, deployment-host TLS/firewall/supervisor,
monitoring, rollback rehearsal and production smoke are NOT RUN in this
checkpoint: Phase B and mandatory config gates have not passed. The last known
TEST auth result was HTTP 401; it is not a new authentication result. No upload,
delete, reconciliation, email or production CRUD was attempted here.

After the infrastructure/credentials are supplied, follow sections 2–8 in order.
Only use TEST Cloudinary credentials with the guarded TEST DB and namespace.
SMTP needs real provider credentials and sender/recipient configuration. Enable
HSTS before the release build only after real-domain HTTPS/subdomain verification.
Strict CSP remains a separate report-only/browser/enforcement checkpoint, not a
reason to weaken current guards or block this rollout by itself.
