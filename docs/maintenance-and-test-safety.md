# Maintenance and test environment safety

The legacy seed/enrichment scripts are for disposable local databases only. They are not production migrations, backups, restore tools, or a way to reproduce the production baseline. Production acceptance still uses **4 categories / 157 products / 8 projects / 18 project images**, verified separately under explicit read-only approval.

## Legacy database scripts

`scripts/init-db.mjs`, `scripts/alter-db.mjs`, and `scripts/enrich-products.mjs` never load `.env.local`. They fail before reading the seed or opening a database connection unless all of these conditions hold:

- `NODE_ENV` is not `production`, and `MAINTENANCE_MODE=disposable` is explicit.
- `MYSQL_HOST` is the literal loopback address `127.0.0.1` or `::1`; DNS hostnames, sockets and remote targets are unsupported.
- `MYSQL_PORT` is explicit and valid, and differs from the production/default port `3306`. Use a separate disposable MySQL instance, not another schema reached with production credentials.
- `MYSQL_DATABASE` matches `solar_shop_disposable_[a-z0-9_]{1,32}`.
- `MYSQL_USER` matches `tiscms_disposable_[a-z0-9_]{1,14}`, and `MYSQL_PASSWORD` is explicitly nonempty. Provision this identity separately, with rights only on that disposable schema. Never reuse a production password.
- `MYSQL_SSL` is explicitly `true` or `false`. TLS always verifies the server certificate. `MYSQL_SSL_CA` is optional for TLS, and is rejected when TLS is false. Plaintext is supported only for the isolated loopback test instance.
- There is exactly one argument, `--confirm=<operation>:<exact database>`, where operation is `init`, `alter`, or `enrich`. No force option is available.

After separately provisioning an approved isolated instance and exporting its own environment, command shapes are:

```text
npm run db:init -- --confirm=init:solar_shop_disposable_<name>
node scripts/alter-db.mjs --confirm=alter:solar_shop_disposable_<name>
node scripts/enrich-products.mjs --confirm=enrich:solar_shop_disposable_<name>
```

These commands mutate the disposable database. Documentation of the command does not authorize executing it against any existing database. Do not put passwords on command lines or in shell history. No identity or database is created by the guards.

`init` reads the tracked seed only after validating the target and confirmation. It removes only the exact known legacy `CREATE DATABASE solar_shop` / `USE solar_shop` header, rejects unexpected selectors, and executes against the validated connection database, which must already exist. Its table drops are deliberately destructive within that disposable database. DDL is not transactional; a failed disposable initialization may need a fresh isolated instance.

`alter` only handles duplicate-column errors as an already-applied result. Other failures return failure. `enrich` locks and updates its fixture rows in one transaction. It no longer exports database content over tracked `sql/schema.sql`. Its generated marketing/specification claims are fixture material and require editorial verification before any real use.

The scripts print generic failure summaries without raw MySQL errors, statements, passwords or connection strings. A validated name and port are application guardrails; they do not prove MySQL grants, container isolation or network policy. Those remain separate operator responsibilities.

## Cloudinary integration tests

Every caller of `loadCloudinaryTestEnv()` requires a complete `.env.cloudinary-test.local`. This is a deliberate breaking safety change from the previous six-variable fixture. An old test file now fails before network access.

The file must own every required value:

| Variable | Requirement |
| --- | --- |
| `MYSQL_HOST` | `127.0.0.1` or `::1`; dedicated disposable loopback instance |
| `MYSQL_PORT` | Explicit valid port other than `3306` |
| `MYSQL_USER` | `tiscms_test` or `tiscms_test_[a-z0-9_]{1,20}`; independently provisioned and scoped to test schema |
| `MYSQL_PASSWORD` | Nonempty, different from known production password |
| `MYSQL_DATABASE` | Exactly `solar_shop_admin_test` |
| `MYSQL_SSL` | Explicit `true` or `false` |
| `MYSQL_SSL_CA` | Optional, owned by test file; never inherited; valid only when SSL is true |
| `MEDIA_PROVIDER` | Exactly `cloudinary` |
| `MEDIA_STORAGE_PREFIX` | `tiscms-e2e-test` plus lowercase letters, numbers, slash, underscore or hyphen; no `..` |
| `CLOUDINARY_CLOUD_NAME` | Separate test cloud, different from known production identity |
| `CLOUDINARY_API_KEY` | Dedicated test key; must differ from secret and known production key |
| `CLOUDINARY_API_SECRET` | Dedicated test secret, different from known production secret |

The loader reads `.env.local` only in memory to compare known production identities/credentials; it never imports that file. It also compares inherited process configuration, even when the parent does not label its database `solar_shop`. Reusing a known production DB user/password, endpoint, Cloudinary cloud/key/secret is rejected. An already-loaded exact test snapshot is permitted.

After validation, the loader clears inherited `MYSQL_*`, `MEDIA_*`, `CLOUDINARY_*`, `SMTP_*`, `CONTACT_*`, `SESSION_*`, `AUDIT_*` and `TRUSTED_PROXY_*` values. It applies only the allowlisted file snapshot. Unknown variables in the test file are refused, including alternate Cloudinary URLs or DB socket overrides. It does not create credentials or turn missing environment values into a passing check.

The loader cannot identify an unknown production credential that has never been provided to its comparison sources. Dedicated accounts/grants and a separately approved disposable instance are still required. Do not run `media:e2e`, `media:db-e2e`, reconciliation, migrations or fixture initialization merely because source checks pass: those commands may upload/delete assets or write database rows and need their own approval.

## Offline regression coverage

`tests/admin-env-isolation.test.mjs` creates its own temporary fixture env files and removes them afterward. It never reads the actual project env or invokes DB/Cloudinary/SMTP. Coverage includes missing file-owned values, root and endpoint refusal, credential/identity reuse, TLS ownership, inherited secrets, and unknown-variable injection.

`tests/disposable-maintenance.test.mjs` injects fake connections into all three real entry points. It proves that invalid targets/confirmations are refused before connection and seed reads, that init strips the production selector and rejects drift, and that failed enrichment rolls back without changing the tracked seed. No real init, alter, enrichment, migration or external integration is executed by these tests.

A passing offline test is not evidence of live database least privilege, successful Linux execution, or production provider isolation.
