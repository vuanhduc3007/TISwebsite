# Infrastructure readiness — Linux VPS, Nginx, Next.js, MySQL

Checkpoint private provisioning tiếp theo: [vps-private-provisioning.md](vps-private-provisioning.md).
Source date/CSP fixes đã được cho phép và test local; chưa có VPS access để verify Linux.

Đây là **plan và template**, không phải lệnh deploy đã được phép chạy.
Baseline duy nhất từ checkpoint này: **4 Categories / 157 Products / 8 Projects / 18 Project Images**.
Không khởi tạo lại DB, không rerun migration/owner bootstrap, không rotate secret,
không tạo application DB user, không import/ghi production DB hay chạy smoke production trong lượt này.

## 1. Kiến trúc và package/service

Chọn một Linux VPS Ubuntu Server 24.04 LTS, Nginx + systemd, một Next.js instance,
MySQL cùng máy. Nginx được chọn cho runbook này; không cài thêm Caddy/PM2 song song.
Nếu đổi proxy về Caddy, cần template/acceptance checkpoint riêng cho trusted-header contract.
Domain, VPS IP, admin CIDR, email provider và offsite backup storage do chủ dự án xác nhận.
Các template dùng `example.invalid` (domain dành cho ví dụ), không phải domain triển khai.

| Package/service | Vai trò / điều kiện |
|---|---|
| Supported patched Node 22 LTS + npm | Gần runtime đã test; project minimum 22.20.0 không phải bản patch khuyến nghị. Pin version đã kiểm thử ở provisioning |
| Nginx >=1.19.4 | TLS, Host allowlist, header overwrite, request/body limits, private upstream |
| MySQL server/client 8.x, mysqldump | Chọn nhánh còn security support. MySQL 8.4 LTS cần restore/compatibility clone trước chọn; không thay bằng MariaDB |
| systemd / journald | Một service `tiscms.service`, restart/backoff, reboot startup và logs |
| OpenSSH, UFW/nftables | SSH key; deny-by-default IPv4/IPv6; firewall ở cả VPS provider và OS |
| ca-certificates, curl, git, tar, gzip, tzdata | TLS trust, source/release tooling, timezone |
| Certbot + DNS provider plugin nếu dùng DNS-01 | Certificate/renewal; DNS API credential riêng ngoài Git; không tạo token giả |
| logrotate, time synchronization, unattended security updates | Logs bounded, clock đúng để session/expiry/backup chính xác |
| restic hoặc backup client tương đương | Encrypted offsite repository, retention và restore drills; credential riêng |

Không chạy npm bằng root; không dùng user app để provision DB hoặc lấy root DB password.
Sizing phải kiểm tra trên VPS: build, image optimization và scrypt login tốn RAM;
`password.ts` dùng scrypt N=131072/r=8, không thiết kế VPS sát giới hạn bộ nhớ.
Theo dõi OOM và concurrent login, không tăng UV thread pool một cách mù quáng.

Nguồn: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting),
[Node release/support](https://nodejs.org/en/about/previous-releases).

## 2. Port / bind / firewall matrix

| Service | Bind đề xuất | Inbound được phép | Trạng thái |
|---|---|---|---|
| Nginx HTTP | public IPv4/IPv6 :80 | Internet, redirect HTTPS; chỉ mở sau public checkpoint | NEEDS MY ACTION |
| Nginx HTTPS | public IPv4/IPv6 :443 | Internet; chỉ mở sau public checkpoint | NEEDS MY ACTION |
| Next.js | **127.0.0.1:3000** | Nginx cùng máy; không rule public | PASS trong template / NOT RUN trên VPS |
| MySQL classic | **127.0.0.1:3306** | App/DBA/backup local; không rule public | PASS trong template / NOT RUN trên VPS |
| MySQL X protocol | disabled | Không cần 33060 | NEEDS MY ACTION |
| SSH | port quản trị đã chọn, thường 22 | Chỉ admin CIDR/VPN; không mở world-wide | NEEDS MY ACTION |
| Khác | không listener không cần thiết | deny inbound mặc định | NEEDS MY ACTION |

Chỉ 80/443 dành cho truy cập Internet chung; SSH là ngoại lệ giới hạn nguồn theo policy.
Ở provisioning ban đầu giữ 80/443 đóng tại provider firewall; chưa trỏ DNS/public app.
Cho phép loopback, established/related traffic và ICMP cần thiết; đừng làm hỏng IPv6/PMTU.
Outbound cần DNS, time sync, HTTPS package/Cloudinary, SMTP 465/587 theo provider,
và offsite backup. Nếu giới hạn egress, whitelist có kiểm thử thay vì chặn bừa.
Không mở 3000/3306/33060, kể cả tạm thời để Workbench kết nối.
DBA dùng SSH tunnel nếu được duyệt, không expose MySQL public.

Trên development đã đọc `netstat`: **0.0.0.0:3000 và 0.0.0.0:3306**.
Đây là all-interface binding, chưa chứng minh Internet reachable; không đổi Windows
firewall/MySQL/service hoặc dừng process hiện tại. Không copy cấu hình bind này sang VPS.

## 3. Nginx config đề xuất

Template: [`../infra/templates/nginx-tiscms.conf`](../infra/templates/nginx-tiscms.conf).
Đặt ở http context, ví dụ `/etc/nginx/conf.d/tiscms.conf`, sau khi disable default
site có xung đột một cách có kiểm tra. Replace domain/certificate paths; validate IPv6 support.
Template có default host reject, HTTP redirect, TLS1.2/1.3, POST edge limiter,
20 MB request cap, streaming, no proxy cache và upstream loopback.

Secret thật chỉ nằm trong `/etc/tiscms/proxy-secret-header.conf`, `root:root 0600`,
chứa duy nhất directive `proxy_set_header X-TIS-Proxy-Token` với cùng secret của app.
File đó chưa được tạo; thiếu nó thì `nginx -t` phải FAIL, không có token fallback.
Không đưa include secret vào repo; không chạy/share `nginx -T` vì nó dump secret.
Chỉ `nginx -t`, rồi reload ở checkpoint được duyệt. Không log header/token/body.
Renewal phải `nginx -t` trước reload, có alert nếu renew thất bại.

Trong giai đoạn private dùng DNS-01 hoặc phương án certificate đã duyệt; không mở
web public chỉ để xin cert trong checkpoint chưa cho public. HTTP-01 cần checkpoint
riêng mở challenge; template hiện chỉ redirect HTTP, không giả định đã có challenge route.
HSTS do app cung cấp sau HTTPS/subdomains acceptance; không duplicate/conflict ở Nginx.
Nếu có www thì cấu hình vhost/cert redirect canonical riêng, không wildcard allowedOrigins.

Nguồn: [Nginx proxy headers](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header),
[TLS unknown-SNI rejection](https://nginx.org/en/docs/http/ngx_http_ssl_module.html#ssl_reject_handshake).

## 4. systemd và directory ownership

Template: [`../infra/templates/tiscms.service`](../infra/templates/tiscms.service).
User hệ thống `tiscms` không login, không sudo; deployment/build identity riêng.
Service chạy Node trực tiếp, không npm/PM2 layer phụ; bind loopback explicit,
config checker trước start, SIGTERM/drain 45s, restart-on-failure/backoff.
Exec ép NODE_ENV=production cả ở checker và app, tránh EnvironmentFile vô tình
override sang development (cookie/proxy behavior không được rơi về dev).
Kiểm tra executable Node `/usr/bin/node`; không dùng nvm ở home trong service.

```text
/srv/tiscms/releases/<release-id>/  source + Linux node_modules + Linux .next
/srv/tiscms/current                symlink đến release được phê duyệt
/etc/tiscms/production.env         runtime env, root:root 0600
/etc/tiscms/proxy-secret-header.conf root:root 0600
/var/backups/tiscms/mysql/          local backup spool, root 0700
/var/log/nginx/                    bounded/restricted proxy logs
```

Source/scripts/node_modules root hoặc deployment-owned; app chỉ đọc/traverse.
`.next` cần quyền ghi cho runtime cache/ISR/revalidation/image optimization.
Template mở ghi **chỉ `.next`**; đây là generated-output write access, không phải
cam kết artifact compiled hoàn toàn immutable. Nếu cần narrow hơn, inventory write
paths/cache handler riêng và test revalidation trước; không chmod 777 cả release.
Giữ `ProtectSystem=strict`, `ProtectHome`, `NoNewPrivileges`, empty capabilities.
Không bật MemoryDenyWriteExecute vì V8 JIT; không PrivateNetwork vì cần DB/media/mail.
Kiểm tra resource limits dựa theo VPS, đừng đặt MemoryMax sát build/login requirements.

## 5. Production env ngoài Git

Thư mục `/etc/tiscms` root-owned 0700; `production.env` root-owned 0600.
PID1 đọc `EnvironmentFile` và inject vào child service, app không cần đọc file root trực tiếp.
Không copy `.env.local` từ Windows vào release. Runtime không chứa test env,
ADMIN bootstrap/recovery credentials, CONFIRM variables hoặc SMOKE credentials dài hạn.

| Scope | Keys cần provision ở checkpoint riêng |
|---|---|
| Runtime | NODE_ENV=production; MYSQL_HOST=127.0.0.1; MYSQL_PORT=3306; MYSQL_DATABASE=solar_shop; MYSQL_USER riêng và MYSQL_PASSWORD thật |
| Session/audit | SESSION_SECRET, AUDIT_HASH_SECRET mới và độc lập sau rotation checkpoint |
| Proxy | TRUSTED_PROXY_IP_HEADER=x-real-ip; TRUSTED_PROXY_SECRET mới, giống private proxy include |
| Media | MEDIA_PROVIDER=cloudinary; MEDIA_STORAGE_PREFIX=tiscms-production; 3 CLOUDINARY variables production đã được duyệt |
| SMTP | SMTP_HOST/PORT/SECURE/USER/PASS/FROM, CONTACT_EMAIL; SMTP_REPLY_TO optional |
| Time/TLS | TZ đã xác minh; MYSQL_SSL=false chỉ cho loopback cùng máy; ENABLE_HSTS=true chỉ sau HTTPS/subdomain proof |

Giữ file UTF-8 không BOM, assignment literal; không shell `source` secret file,
không `printenv`, `ps e`, debug shell `set -x` hay dump systemd Environment.
Build dùng non-secret config riêng; dependency install/test không nhận production secret.
Environment vẫn đọc được bởi root và process cùng identity: user service riêng,
không chạy job/untrusted tool cùng user. EnvironmentFile là compatibility baseline,
không phải secret vault tuyệt đối. systemd khuyến nghị LoadCredential cho secrets;
chuyển sang credential-file adapter cần checkpoint source riêng, không giả định code hiện hỗ trợ.
Git ignore chỉ bảo vệ repo, không thay permission/backup access controls.

Nguồn: [systemd execution documentation](https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.exec.xml).

## 6. MySQL bind và least privilege — PLAN ONLY

Template: [`../infra/templates/mysql-tiscms.cnf`](../infra/templates/mysql-tiscms.cnf).
MySQL8 classic loopback, X Plugin off vì app không dùng. Kiểm tra config collision
và `mysqld --validate-config` nếu phiên bản hỗ trợ trước approved restart.
Không copy Windows datadir sang Linux, không change lower_case_table_names trên datadir
đã init. Restore logical dump vào database/instance riêng ở checkpoint import được duyệt.
Không chạy `db:init`, không seed, không chạy lại `001_admin_cms` vì dump đã có migration.

VPS app connection `MYSQL_HOST=127.0.0.1`, account host đề xuất `127.0.0.1` (không `%`).
DBA phải verify `CURRENT_USER()`/SHOW GRANTS bằng account thật trước runtime switch.
Permission map và SQL grant template đã có ở `production-hardening.md` section 9:

| Tables | Runtime grants |
|---|---|
| categories/products/projects/project_images | SELECT, INSERT, UPDATE, DELETE |
| admin_users | SELECT, INSERT, UPDATE; không DELETE |
| admin_sessions/rate_limits | SELECT, INSERT, UPDATE, DELETE |
| admin_audit_logs | SELECT, INSERT ONLY |
| admin_schema_migrations | không cần quyền ordinary app |

Không global grants, roles mang quyền dư, SUPER, FILE, PROCESS, CREATE USER,
CREATE/ALTER/DROP, GRANT OPTION hoặc UPDATE/DELETE audit. DBA/migration/backup identity riêng.
Password chỉ provision qua secure mechanism ở checkpoint sau, không CLI argument/Git.
Negative privilege tests dùng object disposable trong clone, không thử DROP bảng production.
Restore giữ charset/collation definitions trong dump; review utf8mb4/MySQL8 JSON/FKs,
schema names lowercase, no orphan, baseline IDs/checksums `4/157/8/18` trước cutover.

Nguồn: [MySQL bind address](https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_bind_address),
[X Plugin binding](https://dev.mysql.com/doc/refman/8.0/en/x-plugin-options-system-variables.html#sysvar_mysqlx_bind_address).

## 7. Trusted header flow và acceptance

```text
Internet (untrusted headers)
  -> Nginx TLS + Host validation + socket peer IP
  -> overwrite X-Real-IP / X-Forwarded-For = one $remote_addr
  -> overwrite X-TIS-Proxy-Token from root-only include
  -> loopback 127.0.0.1:3000
  -> Next proxy + action/handler guard
  -> canonical IP -> HMAC/DB rate limit -> server-side session/role authorization
```

Không `$proxy_add_x_forwarded_for`; không tin raw X-Real-IP, X-Forwarded-For,
CF-Connecting-IP hay Forwarded từ client. Host/X-Forwarded-Host canonical, proto=https.
Secret chỉ nằm trên hop private; không response/header/body/client JS/log output.
Không disable source guard để curl trực tiếp login/contact.
Loopback ngăn remote bypass, không ngăn local process: OS user isolation/token
guard là defense-in-depth; root/compromised app vẫn thuộc trusted computing base.

Nếu sau này Cloudflare proxy: current template chưa cấu hình Cloudflare real-IP.
Trước bật phải trust ONLY official source CIDRs, configure real_ip recursion đúng,
firewall origin và test riêng; không trust 0.0.0.0/0 hoặc ::/0. Nếu chưa làm,
app nhận IP Cloudflare edge thay vì visitor, quotas có thể bị gộp; không gọi đó PASS.

Private acceptance (NOT RUN): valid proxied GET/POST, two real clients distinct IP,
spoofed header/token bị proxy overwrite, chain/malformed/direct POST bị app reject,
remote 3000/3306/33060 không reachable cả IPv4/IPv6, cookie Secure/HttpOnly/Strict,
owner/editor/direct Actions, origin/CSRF checks; login/audit/mail/CRUD cần write approval riêng.
Anonymous Admin redirect phải giữ canonical HTTPS domain, không leak/redirect về
127.0.0.1:3000; test Location qua proxy thật, không suy từ loopback-only smoke.
Loopback hardening smoke chỉ kiểm chứng fixtures, không thay real Nginx acceptance.

## 8. Fresh install / build / restart procedure — future checkpoint

1. Chốt source commit/release-id (không deploy dirty working tree); artifact/release
   luôn từ repo Next.js thực, không package.json ở thư mục cha Windows.
2. Lấy release mới vào thư mục releases riêng, không overwrite release đang chạy.
   Không chuyển Windows node_modules, .next, tsbuildinfo hoặc env sang Linux.
3. Pin supported patched Node, install từ lockfile bằng non-root build identity.
   Không npm audit fix --force; native sharp/@next SWC phải được install trên Linux.
4. Build/test trong environment sạch, không production credentials; server test là loopback sentinel.
   Release không chứa bất kỳ .env local nào. HSTS build flag chỉ được set sau TLS acceptance.

```bash
# Chỉ chạy trên release Linux riêng ở checkpoint được duyệt; không chạy ở VPS root.
node --version
npm --version
npm ci --include=dev
npm ls nodemailer sharp source-map-js --all
npm audit
npm audit --omit=dev
npm test
# Fresh repo next-env points to .next/dev/types; build first regenerates prod types.
NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 ENABLE_HSTS=true npm run build
npm run typecheck
npm run test:hardening-smoke
git diff --check
```

ENABLE_HSTS=true ở ví dụ trên chỉ dùng khi HTTPS và subdomain policy đã PASS;
chưa PASS thì chưa build release public với flag đó. Generated next-env thay đổi
không được nhầm với source change trái phép; không commit generated paths từ Windows.
Để tooling/config-check hoạt động, phiên bản đầu giữ dev dependencies ở release
(network access/install chỉ trong build stage). Tối ưu standalone/prune là checkpoint khác.
Không `npm ci`/build trong release hiện tại, không expose `next dev` trên server.

5. Kiểm tra Node/sharp binary, exact-case assets, generated headers và DB-independent
   loopback smoke trên Linux. File root/release permissions phải đúng trước service start.
6. Owner của checkpoint mới cung cấp env thật ngoài Git. Runtime config check chạy qua
   systemd ExecStartPre, không đọc file bằng app user/shell source. Gate fail => không start.
7. Ở approved private-runtime checkpoint: drain/stop instance, verify current symlink
   nằm trong `/srv/tiscms/releases/`, switch bằng atomic symlink replacement,
   start/restart service mới. Không restart Windows Node process liên quan khác.
8. Check `systemctl is-active`, listener `ss -ltnp`, HTTP private headers/cache/image,
   no unexpected write errors. DB flows chỉ chạy khi write checkpoint đã được duyệt.
9. Public DNS/80/443/open ingress và production smoke là checkpoint riêng sau tất cả gates.

## 9. Backup/restore location và retention đề xuất

Full schema+data dump ngoài repo/webroot: `/var/backups/tiscms/mysql/` root 0700,
files 0600, timestamp UTC rõ ràng, SHA-256 + baseline manifest. Không log credentials.
Backup identity riêng, option file `/etc/tiscms/backup.cnf` root 0600; privileges
cho routines/events/triggers và MySQL-version specifics do DBA review, không dùng app root.
`--defaults-extra-file` là option đầu, password không nằm trên CLI.
Dump dùng single-transaction/skip-lock-tables cho InnoDB, routines/events/triggers,
no-tablespaces, hex-blob, utf8mb4, set-gtid-purged=OFF; không --databases/USE production
để restore target được kiểm soát. Không DDL đồng thời khi snapshot dump.

Đề xuất daily 02:00 theo timezone đã duyệt; local 7 daily, offsite encrypted
7 daily + 4 weekly + 6 monthly; versioned/immutable nếu provider hỗ trợ.
Retention deletion phải có approval/policy riêng, không áp vào backup/restore DB hiện có.
Checksum/parse/count/ID/fingerprint validation mỗi backup, alert khi thiếu/mất integrity.
Monthly và trước cutover: restore vào `solar_shop_restore_verify_<unique-suffix>`
trên isolated instance/DB; guard target khác solar_shop; no automatic production restore.
Clone chứa production data/hash: restricted access, không reuse app runtime creds,
cleanup chỉ sau verification PASS và approval riêng.
RPO mục tiêu 24h, RTO mục tiêu 4h — cần đo restore drill, không phải SLA đã chứng minh.
Nếu business cần RPO nhỏ hơn, binlog/PITR là checkpoint riêng. SQL dump không backup
Cloudinary binary; cần provider retention/recovery plan riêng. Restic repository key
và access credential escrow an toàn để server mất vẫn restore được.

Backup Windows và cả restore-verification DB hiện có được giữ nguyên;
trước production mutation/cutover sau này phải có fresh backup checkpoint riêng.
Nguồn: [MySQL dump/privileges/options](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html).

## 10. Monitoring/logging minimum

- External HTTPS uptime mỗi 1–5 phút sau public; private process check trước đó.
- Alert service down/restart loop/OOM, 5xx, disk >80%, backup age >26h, TLS expiry/renew failure,
  DB connection errors, auth failure spikes, contact SMTP failure, Cloudinary failure/orphan.
- `journalctl -u tiscms` access restricted; no request bodies/password/session tokens/raw headers.
  Không share logs chưa redact. Nginx minimal format bỏ query string và request headers;
  không debug log. Error log có thể chứa URL/context: không đặt credentials trong URL.
- Journald/logrotate cap dung lượng (ví dụ 200MB) và retention đề xuất 14 ngày,
  audit DB theo policy riêng, không xoá audit để đạt log retention.
- Schedule media reconciliation dry-run + alert sau config/API gates; không auto-delete unknown assets.
- Chưa có DB health route tổng hợp: HTTP `/` chỉ chứng minh app/static response,
  không chứng minh DB/SMTP/Cloudinary khỏe. Tách probes có authentication/mức quyền phù hợp.
- Cần người nhận alert, kênh cảnh báo và runbook xử lý; chưa có tức là NOT RUN/BLOCKED cho public.

## 11. Rollback plan

Giữ ít nhất current + 2 approved Linux releases, lockfile/hash và env revision metadata
không plaintext secret. Source rollback target phải là hardened compatible release;
working tree hiện còn dirty nên chưa có rollback target mới được chốt.
Trigger: startup/health fail, login/authorization/security regression, sustained5xx,
legacy integrity drift, secrets leak hoặc cleanup/data-consistency failure.
Đóng ingress/maintenance trước; stop/drain service, giữ logs redact, xác định phạm vi.
Nếu code-only và schema compatible: atomic current symlink về known-good release,
restart + private checks với **secrets mới, non-root DB user và guard nguyên vẹn**.
Không rollback về credentials đã lộ/root user/vulnerable deps/weak proxy.
Không auto-restore DB khi rollback code, không rerun migration để chữa partial state.
Nếu corruption: STOP, DBA đánh giá backup/PITR và xin checkpoint recovery riêng.
Certificate/proxy rollback chỉ sang config đã nginx -t/acceptance PASS, không Full->Flexible TLS.
First deployment chưa có known-good Linux release => rollback về maintenance, không giả vờ HA.
VPS đơn là single point of failure; recovery offsite/restore drill bắt buộc trước public.

## 12. Root/sudo checklist — cần người dùng thực hiện sau approval

Các lệnh dưới là runbook tương lai; **không lệnh sudo nào đã chạy trong lượt này**.

1. Provision VPS, admin SSH key, provider rescue console và security group chỉ admin SSH.
   Verify SSH key bằng session thứ hai trước tắt password/root login hoặc bật firewall.
   Có IPv6 thì policy cũng phải áp dụng cho IPv6; không xoá SSH rule đang dùng mù quáng.
2. Update packages/security patches; cài Nginx, MySQL8 đã chọn, Node pinned, UFW,
   certificate/backup tooling. Package install có thể auto-start service: giữ provider ingress
   closed trước install, không để Nginx default page/MySQL auto-start mở public.
3. Tạo OS service/build identities và directory/permissions, không tạo DB application user
   ở provisioning checkpoint chưa cho DB mutation. Đặt Node ở system path đã kiểm chứng.

```bash
# Future sudo checkpoint only. Kiểm tra user/path chưa tồn tại trước khi chạy.
sudo useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin tiscms
sudo install -d -o root -g tiscms -m 0750 /srv/tiscms /srv/tiscms/releases
sudo install -d -o root -g root -m 0700 /etc/tiscms /var/backups/tiscms/mysql
# Build/deployment user được provision riêng; không cấp sudo cho tiscms runtime.
```

4. Preview firewall rules, cho phép admin CIDR/SSH trước rồi deny default inbound;
   không mở 3000/3306/33060. Chỉ mở public80/443 ở checkpoint public sau này.
5. Review/install MySQL bind template và restart theo approval; verify socket listeners.
   Nếu MySQL đã có data: fresh backup/DB maintenance checkpoint trước restart/config đổi.
6. Provision private env/proxy include/certificate **sau secret/config checkpoint**;
   không tự generate/rotate ở lượt hiện tại. Root-owned 0600, không gửi secrets vào chat.
7. Install service/template ở trạng thái chưa start/public. Validate trên Linux:

```bash
sudo systemd-analyze verify /etc/systemd/system/tiscms.service
sudo nginx -t
sudo ss -ltnp
sudo ufw status verbose
sudo sshd -t
# daemon-reload khi unit được phê duyệt; start/enable chỉ ở runtime checkpoint riêng.
```

`nginx -t` cần certificate/include thật; không tạo fake secret để khiến check PASS.
Không `nginx -T`, dump env hoặc command chứa password.
8. DBA provision/import/least privilege + baseline verify trong checkpoint được duyệt riêng.
9. Configure backup timer/offsite/monitoring/alerts, restore drill/rollback rehearsal riêng.
10. Sau config/LINUX/private acceptance PASS mới xin public DNS/firewall/deploy checkpoint.

## Source portability review và trạng thái thực tế

| Check | Status | Evidence / giới hạn |
|---|---|---|
| Baseline policy | PASS | User xác nhận 4/157/8/18; lượt này không query DB |
| Local tests/checks | PASS | npm test 56/56, typecheck, production build và isolated hardening smoke; template tests chỉ static contract, không certify Linux syntax |
| Runtime Windows absolute paths | PASS trong scope inspect | Không tìm thấy C:/AppData/OneDrive/.exe bắt buộc trong src runtime |
| Import/asset exact-case static scan | PASS | 304 files inventory; 136 local imports, 40 literal asset URLs; không mismatch/collision |
| DB-driven image URLs / Linux case-sensitive FS | NOT RUN | Cần read-only clone inventory + Linux browser smoke, không suy từ Windows |
| cwd/nested repo | NEEDS MY ACTION | Repo thực ở TISwebsite/TISwebsite; script/env/public paths dùng process.cwd(); systemd WorkingDirectory explicit |
| next start bind | PASS trong template | Script npm start chưa pin host; systemd dùng --hostname 127.0.0.1; actual VPS NOT RUN |
| MySQL bind | PASS trong template | loopback + mysqlx OFF; không áp dụng lên Windows/MySQL hiện tại |
| Native deps | NOT RUN trên Linux | sharp/SWC không portable binary; npm ci/build Linux, không copy Windows artifacts |
| Fresh type generation | NEEDS MY ACTION | next-env hiện trỏ .next/dev/types; fresh build trước typecheck trên clean Linux release |
| Timezone/date-only semantics | PASS source/regression | DATE strings tại driver boundary; shared calendar-date helper cho Admin/Public, UTC/UTC+7/UTC-7 test PASS. Không đổi DATETIME/TIMESTAMP hoặc production values |
| Legacy time compatibility | NOT RUN | Đối chiếu MySQL global/session timezone, OS TZ và driver trước import; date-only fix không thay timestamp semantics, không tự đổi UTC hay rewrite timestamps |
| Media persistence | PASS thiết kế | production Cloudinary; local upload bị source từ chối ở production. Legacy public/images phải nằm trong release |
| Footer Google Maps / CSP | PASS static / NOT RUN browser | Thêm frame-src chỉ https://maps.google.com đúng source iframe, test origin/ancestors PASS; actual Google redirects/browser render vẫn cần acceptance |
| Trusted proxy | PASS source/template / NOT RUN live | Overwrite single IP/token, no fallback; cần Nginx acceptance thật |
| Runtime config checkpoint trước | BLOCKED | production:config-check trước đó exit1: root DB user, missing proxy, SMTP, HSTS; chưa chạy lại hoặc sửa production env trong lượt này |
| Linux config syntax/service/firewall | NOT RUN | Chưa có VPS/credentials/cert; không gọi static review là nginx -t/systemd acceptance |
| Production build local | PASS | npm run build trên Windows, DB/credential variables empty trong process con và HSTS=false; fresh Linux build vẫn NOT RUN |
| DB/media/public mutation | NOT RUN | Không connect DB, không upload/delete, không deploy, không rotate secret ở lượt này |

Kết luận này là readiness của **plan để provision**, không phải server đã sẵn sàng public.
Infrastructure templates chưa cài; mọi provisioning/runtime/data/public checkpoint
vẫn cần xác nhận riêng. Strict CSP nonce là checkpoint sau, không bị ép bật ở đây.

INFRASTRUCTURE READINESS: READY FOR PROVISIONING
