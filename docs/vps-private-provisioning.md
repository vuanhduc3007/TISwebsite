# VPS private provisioning — checkpoint chưa public

Baseline production được xác nhận: **4/157/8/18**. Không query hoặc ghi DB production
trong checkpoint này. Windows DB, backup và các restore-verification DB giữ nguyên.

Hiện chưa nhận IP/hostname, distro, SSH user/port, admin CIDR, key path hay rescue
console của VPS. Các lệnh dưới **chưa chạy trên VPS**, không phải báo cáo server PASS.
Không mua VPS, đoán host, trỏ DNS, mở ingress web hoặc tự nhận credential từ máy local.

Runbook chọn **Ubuntu Server 24.04 LTS, instance mới hoàn toàn**, systemd, Nginx,
MySQL 8.x từ repository Ubuntu đã cập nhật. Nếu distro/version/service/data hiện có
khác giả định: DỪNG để điều chỉnh. Không áp lệnh provisioning lên Windows hay VPS
đã chứa production DB. Dùng `/srv/tiscms` nhất quán với service template đã review;
`/opt/tiscms` trong prompt là ví dụ, không phải thêm một cwd thứ hai.

## 0. Checkpoint truy cập và chống tự khóa SSH

Chủ VPS phải cung cấp qua kênh an toàn: host, SSH port, username có sudo, **đường dẫn**
key trên máy (không key contents), admin IPv4/IPv6 CIDR/VPN. Xác minh host-key fingerprint
từ provider console trước chấp nhận SSH lần đầu. Không bỏ StrictHostKeyChecking.
Provider firewall trước install: chỉ SSH từ nguồn quản trị, deny các inbound khác
cả IPv4/IPv6; giữ 80/443/3000/3306/33060 đóng. Không có managed load balancer tự mở cổng.

Trên VPS, admin chạy Bash không bật `set -x`; lưu bằng chứng không chứa secrets:

```bash
set -euo pipefail
hostnamectl
cat /etc/os-release
uname -m
id
sudo -v
sudo sshd -t
sudo sshd -T | grep -E '^(port|pubkeyauthentication|passwordauthentication|permitrootlogin) '
sudo ss -lntp
sudo ufw status verbose
df -h / /srv /var
free -h
swapon --show
```

Checkpoint bắt buộc: kiểm tra key login và sudo từ **session thứ hai** trên port/CIDR
đã chọn, rescue console hoạt động, giữ session thứ nhất mở. Không đổi SSH port/user
và firewall đồng thời. Nếu chỉ có root login, provision/verify sudo admin riêng trước.
Không tự khóa root/password khi chưa có admin key login thay thế.

## 1. OS/packages/Node — sudo trên VPS mới, web ingress đóng

Update có thể yêu cầu reboot; chỉ reboot khi có console, key và session mới đã verify.
Ngăn Nginx/MySQL package auto-start với stock broad listener trước cấu hình:

```bash
sudo systemctl mask nginx.service mysql.service
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install --no-install-recommends \
  ca-certificates curl git tar xz-utils gnupg tzdata openssh-server ufw \
  nginx mysql-server mysql-client logrotate certbot unattended-upgrades
nginx -v
mysqld --version
systemctl --version
```

Mask chỉ service mới, **không stop/mask service chứa data đang hoạt động**. Fresh
package install khởi tạo datadir hệ thống MySQL mới là provisioning service, không
import/tạo `solar_shop` và không phải `npm run db:init`. Verify version là Oracle MySQL
8.x, không MariaDB; nếu không đúng thì DỪNG. Chưa issue cert/renewal cho production.

Node dùng official Linux binary, không Ubuntu default Node cũ, không nvm dưới `/root`.
Chọn patched Node 22 LTS để gần runtime local. Tại lần soạn runbook, trang official
liệt kê **22.23.3 LTS**; kiểm tra lại support/security tại ngày provision và pin version
đã review. Nếu chọn version khác, đổi variable và chạy lại toàn bộ Linux acceptance.

```bash
# Chạy download/verify bằng admin non-root; không pipe curl vào shell root.
TIS_NODE_VERSION=22.23.3
case "$(uname -m)" in
  x86_64) TIS_NODE_ARCH=x64 ;;
  aarch64) TIS_NODE_ARCH=arm64 ;;
  *) printf '%s\n' 'STOP: unsupported architecture'; exit 1 ;;
esac
TIS_NODE_WORK=$(mktemp -d)
cd "$TIS_NODE_WORK"
git clone --depth=1 https://github.com/nodejs/release-keys.git
# Operator đối chiếu release key fingerprints với nguồn official trước verify.
curl --fail --silent --show-error --proto '=https' --tlsv1.2 \
  -O "https://nodejs.org/dist/v$TIS_NODE_VERSION/SHASUMS256.txt"
curl --fail --silent --show-error --proto '=https' --tlsv1.2 \
  -O "https://nodejs.org/dist/v$TIS_NODE_VERSION/SHASUMS256.txt.sig"
curl --fail --silent --show-error --proto '=https' --tlsv1.2 \
  -O "https://nodejs.org/dist/v$TIS_NODE_VERSION/node-v$TIS_NODE_VERSION-linux-$TIS_NODE_ARCH.tar.xz"
GNUPGHOME="$TIS_NODE_WORK/release-keys/gpg" gpg --verify SHASUMS256.txt.sig SHASUMS256.txt
grep "  node-v$TIS_NODE_VERSION-linux-$TIS_NODE_ARCH.tar.xz$" SHASUMS256.txt | sha256sum --check -
test ! -e "/opt/node-v$TIS_NODE_VERSION-linux-$TIS_NODE_ARCH"
sudo tar -xJf "node-v$TIS_NODE_VERSION-linux-$TIS_NODE_ARCH.tar.xz" -C /opt --no-same-owner
# Không overwrite executable/link/package hiện có: phát hiện conflict thì DỪNG.
test ! -e /usr/bin/node && test ! -L /usr/bin/node
test ! -e /usr/bin/npm && test ! -L /usr/bin/npm
sudo ln -s "/opt/node-v$TIS_NODE_VERSION-linux-$TIS_NODE_ARCH/bin/node" /usr/bin/node
sudo ln -s "/opt/node-v$TIS_NODE_VERSION-linux-$TIS_NODE_ARCH/bin/npm" /usr/bin/npm
/usr/bin/node --version
/usr/bin/npm --version
```

Nguồn: [Node downloads/support](https://nodejs.org/en/download),
[official release signature verification](https://github.com/nodejs/release-keys#verifying-release-packages).
Giữ checksum/version evidence. Checksum/signature fail, binary incompatible hoặc đường
dẫn conflict => DỪNG, không disable verification. Chưa đặt Node auto-upgrade ngoài test gate.

## 2. Unix users và private versioned source

Dedicated non-login runtime và separate non-sudo build identity; admin giữ quyền provision.
Các lệnh này chỉ cho names chưa tồn tại. Nếu đã có, review `getent passwd` trước reuse.

```bash
getent passwd tiscms || true
getent passwd tiscms-build || true
# Sau review user names còn trống:
sudo useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin tiscms
sudo useradd --system --create-home --home-dir /var/lib/tiscms-build --shell /usr/sbin/nologin tiscms-build
sudo usermod -a -G tiscms tiscms-build
sudo install -d -o root -g tiscms -m 0750 /srv/tiscms /srv/tiscms/releases
sudo install -d -o root -g root -m 0700 /etc/tiscms
```

Chốt source artifact/revision **riêng, được review** sau các source fixes; lượt này
không commit/push. Không coi HEAD cũ là đã chứa working-tree hardening chưa commit.
Người quản trị đưa source-only archive vào VPS qua SSH/private channel, không `.env*`,
`node_modules`, `.next`, DB dumps, test media hay Windows binaries. `.env.example`
không chứa credentials có thể giữ. Không tự export cả workspace/Git ignored files.
Inspect archive paths không absolute/`..`, không symlinks thoát root; archive từ nguồn
đã review, không nhận bundle không tin cậy. Không copy datadir Windows.

```bash
# Nhập metadata/path thật đã review, KHÔNG secret. Không dùng giá trị mẫu để tiếp tục.
read -r -p 'Reviewed release ID: ' TIS_RELEASE_ID
[[ "$TIS_RELEASE_ID" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]]
read -r -p 'Reviewed source archive absolute path: ' TIS_SOURCE_ARCHIVE
[[ "$TIS_SOURCE_ARCHIVE" = /* ]] && test -s "$TIS_SOURCE_ARCHIVE"
tar -tf "$TIS_SOURCE_ARCHIVE"  # source-only inventory; chưa extract nếu bất thường
TIS_RELEASE="/srv/tiscms/releases/$TIS_RELEASE_ID"
test ! -e "$TIS_RELEASE"
sudo install -d -o tiscms-build -g tiscms -m 0750 "$TIS_RELEASE"
# Archive layout phải chứa package.json/src trực tiếp ở root, không thư mục cha.
sudo -u tiscms-build tar -xf "$TIS_SOURCE_ARCHIVE" -C "$TIS_RELEASE" --no-same-owner
cd "$TIS_RELEASE"
test -f package.json && test -f package-lock.json && test -f next.config.ts
test -f src/lib/db.ts && test -f scripts/check-production-config.mjs
find . -maxdepth 1 -name '.env*' ! -name '.env.example' -print
# Nếu lệnh trên thấy bất cứ local env nào: DỪNG; không tiếp tục build với secret.
node -e 'const p=require("./package.json");if(p.name!=="tisolar-website")process.exit(1);console.log("Next repo root verified");'
```

Repo Windows thật là `TISwebsite/TISwebsite`, không package ở outer workspace.
Trên VPS flatten đúng repo ấy vào release root; `process.cwd()` phải là release này.

## 3. Fresh Linux dependencies/build/tests — non-root, no production env

Admin chạy block trong build identity, không systemd production environment; không
shell-source `/etc/tiscms/production.env`. Nếu shell đang có production variables,
dừng và mở clean admin/build session. Dùng `env -i` để không inherit credentials:

```bash
sudo -u tiscms-build env -i \
  HOME=/var/lib/tiscms-build PATH=/usr/bin:/bin \
  TIS_RELEASE="$TIS_RELEASE" NEXT_TELEMETRY_DISABLED=1 ENABLE_HSTS=false \
  /bin/bash --noprofile --norc <<'TIS_BUILD'
set -euo pipefail
cd "$TIS_RELEASE"
node --version
npm --version
npm ci --include=dev
npm ls nodemailer sharp source-map-js --all
npm test
# Fresh next-env references .next/dev/types: generate production types FIRST.
NODE_ENV=production npm run build
npm run typecheck
node -e 'const sharp=require("sharp");sharp({create:{width:1,height:1,channels:3,background:"white"}}).png().toBuffer().then(b=>{if(!b.length)process.exit(1);console.log("Linux sharp native encode PASS");}).catch(()=>{console.error("Linux sharp FAIL");process.exit(1);});'
npm run test:hardening-smoke
TIS_BUILD
```

Build/tests fail => DỪNG. Build trước typecheck chỉ để generate Next types trên clean
clone, không bỏ typecheck; build cũng chạy TypeScript. Không copy `.next` từ Windows.
`test:hardening-smoke` là harness **đã có**, process mới chỉ loopback port ngẫu nhiên,
fixture credentials không persistent, sentinel bắt mọi DB attempt, không SMTP/Cloudinary
request; **không phải production smoke**, không dùng `solar_shop`, không bypass guard
của service. Không persist fixture values vào production env; không claim actual Nginx
hay port 3000/service acceptance từ kết quả này. Không cài package vào release đang chạy.

Linux case check phải dựa build/native/image acceptance thật. Local static scan không
thay Linux FS; DB-driven asset URLs chưa kiểm tra vì chưa import/đọc production data.
Public/browser DB acceptance và migration/import cần checkpoint riêng.

## 4. Source fixes của checkpoint này

- `projects.contract_date` trong SQL schema là `DATE`, form gửi YYYY-MM-DD. Boundary
  mysql2 chỉ `dateStrings: ['DATE']`; không đổi decoding DATETIME/TIMESTAMP/session.
- Admin edit giữ YYYY-MM-DD, không `toISOString()` giờ địa phương. Public format dùng
  UTC anchor explicit chỉ để format calendar components; `date_display` override giữ nguyên.
- Regression UTC/Asia/Ho_Chi_Minh/America/Los_Angeles, leap day, invalid date, reject
  instant strings và mocked pool (không DB). Không rewrite production fields/timezone.
- Maps source footer hiện là `https://maps.google.com/maps?...&output=embed`. CSP thêm
  **chỉ** `frame-src https://maps.google.com`; giữ frame-ancestors/object-src none,
  không wildcard, không strict nonce trong checkpoint này. Browser/redirect acceptance
  chưa chạy: nếu Google redirect sang origin khác, review đúng origin trước thêm;
  không tự mở `*.google.com`. Đây là static validation, không browser PASS.

## 5. Root-only env structure — KHÔNG tạo value giả

```bash
sudo test ! -e /etc/tiscms/production.env
sudo install -o root -g root -m 0600 /dev/null /etc/tiscms/production.env
sudo stat -c '%U:%G %a %n' /etc/tiscms /etc/tiscms/production.env
```

Nếu file đã tồn tại: chỉ `stat`, không overwrite/truncate. Empty file ở đây có chủ đích;
credential provisioning BLOCKED. Không copy `.env.local`, generate/rotate secret hoặc
lấy giá trị từ chat. Không `cat`/printenv/systemctl show Environment/`ps e`/`nginx -T`.
PID1 đọc root0600 EnvironmentFile, runtime user không cần quyền đọc file.
Danh sách required keys ở `infrastructure-readiness.md` section 5. Chưa có non-root
MySQL app user/import/SMTP/proxy real secret/HSTS acceptance: service **NOT RUN**.
Checker hiện yêu cầu production `solar_shop`, real complete config và HSTS; không
đổi flag/bypass chỉ để start private service. HSTS sẽ cần build lại sau TLS checkpoint,
không enable=true ở build private chỉ để làm checker PASS.

## 6. MySQL — instance mới không production data, loopback only

Không tạo database `solar_shop`, không production user, không credentials changes,
không import/migrate/db:init. Verify mới/fresh qua provider inventory và datadir/service
history trước restart; nếu có existing data thì DỪNG xin maintenance checkpoint riêng.

```bash
sudo test ! -e /etc/mysql/mysql.conf.d/zz-tiscms.cnf
sudo install -o root -g root -m 0644 \
  "$TIS_RELEASE/infra/templates/mysql-tiscms.cnf" /etc/mysql/mysql.conf.d/zz-tiscms.cnf
sudo mysqld --validate-config
sudo systemctl unmask mysql.service
sudo systemctl start mysql.service
sudo systemctl is-active mysql.service
sudo ss -lntp '( sport = :3306 or sport = :33060 )'
```

Kỳ vọng **127.0.0.1:3306**, không 0.0.0.0/[::], không 33060. Nếu conflict với package
configs, review directive precedence; không giả định filename zz đủ để chứng minh.
Không `lower_case_table_names` change trên datadir đã init. SQL metadata/query không
cần trong phase này. Nếu broad listener: FAIL, dừng service mới và report, không sửa
Windows production. Kiểm tra service active sau reboot ở checkpoint được duyệt riêng.

## 7. Release permissions + systemd — install/verify, CHƯA start

Chỉ sau Linux build PASS và archive/source review; đầu tiên kiểm tra release symlinks
không thoát thư mục. Owner root/read-only source, runtime chỉ được viết generated `.next`:

```bash
test -d "$TIS_RELEASE/.next" && test -s "$TIS_RELEASE/.next/BUILD_ID"
# Review any source/node_modules symlink destinations trước chmod/chown.
sudo chown -R root:tiscms "$TIS_RELEASE"
sudo chmod -R o-rwx "$TIS_RELEASE"
sudo chmod -R g+rX "$TIS_RELEASE"
sudo chown -R tiscms:tiscms "$TIS_RELEASE/.next"
sudo chmod -R u+rwX "$TIS_RELEASE/.next"
test ! -e /srv/tiscms/current && test ! -L /srv/tiscms/current
sudo ln -s "$TIS_RELEASE" /srv/tiscms/current
sudo install -o root -g root -m 0644 \
  "$TIS_RELEASE/infra/templates/tiscms.service" /etc/systemd/system/tiscms.service
sudo systemd-analyze verify /etc/systemd/system/tiscms.service
sudo systemctl daemon-reload
sudo systemctl is-enabled tiscms.service || true
```

Không overwrite current/service nếu tồn tại chưa review. Runtime `/usr/bin/node`,
cwd `/srv/tiscms/current`, `User=tiscms`, forced production, env root0600, `127.0.0.1:3000`,
restart bounded, filesystem/capability guards nguyên vẹn. **Không start/enable ở trạng
thái thiếu config/DB đã nêu**; Linux syntax PASS không phải runtime PASS.
Không thêm test credentials, sửa DB target guard hoặc source guard để start service.
Service start/restart và production config/DB checkpoint phải được xác nhận riêng.

## 8. Nginx private staged — không cert giả, không production forwarding

Production template `nginx-tiscms.conf` cần domain/cert/secret include thật, chưa đủ.
Template mới `nginx-private-staged.conf` là **full config**, listen **127.0.0.1:8080**,
Host allowlist, mọi request trả maintenance503; không proxy_pass hoặc secret/token,
không forward request tới Next, không validate authentication giả. Không include
default public sites của Ubuntu. Chỉ dùng trên VPS mới với ingress provider còn đóng.

```bash
sudo nginx -t -c "$TIS_RELEASE/infra/templates/nginx-private-staged.conf"
# Review current config first; preserve stock configuration, never nginx -T.
sudo test ! -e /etc/nginx/nginx.conf.before-tiscms-private
sudo cp -p /etc/nginx/nginx.conf /etc/nginx/nginx.conf.before-tiscms-private
sudo install -o root -g root -m 0644 \
  "$TIS_RELEASE/infra/templates/nginx-private-staged.conf" /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl unmask nginx.service
sudo systemctl start nginx.service
sudo systemctl is-active nginx.service
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:8080/
sudo ss -lntp '( sport = :80 or sport = :443 or sport = :8080 )'
```

Kỳ vọng503 và chỉ loopback8080. Unknown Host bị444/no response. Không proxy cache
vì chưa có forwarding; cache/header production contract chỉ static tests. Không mở
80/443 và không issue cert. Genuine proxy acceptance, secret injection/overwrite,
client IP real/test isolation cần checkpoint tiếp khi có real config; token luôn từ
root-only include, không `$http_x_tis_proxy_token` hay append X-Forwarded-For.
Nguồn: [Nginx proxy header semantics](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header).

## 9. SSH/firewall — trước mỗi thay đổi verify second session/console

Chỉ initial clean UFW ruleset; nếu existing policy/ruleset có rule khác thì review,
không `ufw reset`, không wipe nftables/cloud policies. CIDR/port thực do admin nhập:

```bash
read -r -p 'Verified admin CIDR (IPv4 or IPv6): ' TIS_ADMIN_CIDR
read -r -p 'Verified current SSH port: ' TIS_SSH_PORT
[[ "$TIS_SSH_PORT" =~ ^[0-9]+$ ]] && (( TIS_SSH_PORT >= 1 && TIS_SSH_PORT <= 65535 ))
test -n "$TIS_ADMIN_CIDR"
sudo ufw allow proto tcp from "$TIS_ADMIN_CIDR" to any port "$TIS_SSH_PORT"
# Nếu cần IPv4 và IPv6, repeat allow với từng CIDR thật trước enable.
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw --dry-run enable
# STOP safety checkpoint: provider console ready, exact SSH rule verified.
sudo ufw enable
sudo ufw status verbose
sudo ufw status numbered
sudo ufw show raw
sudo ss -lntp
```

Không thêm web/DB/app allow rule. Verify `/etc/default/ufw` có IPV6=yes nếu IPv6 enabled;
provider policy đồng bộ IPv4/IPv6. UFW defaults/allow SSH chưa đủ nếu có rule cũ allow
web: FAIL, review theo checkpoint, không gọi deny default là chứng minh ports đóng.
Sau enable phải mở session thứ ba chứng minh vẫn SSH+sudo được; nếu fail sử dụng
console/revert firewall change, không tiếp tục hardening SSH mù quáng.

Chỉ khi key sudo admin session đã verify và console accessible, tạo SSH drop-in bằng
editor root (không chứa secret), đúng tên đã review như `/etc/ssh/sshd_config.d/00-tiscms-key-only.conf`:

```text
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
```

Ubuntu/cloud-init có thể có config khác/Match blocks; earliest assignment/effective
configuration quyết định, không chỉ đọc drop-in. `sudo sshd -t` và `sudo sshd -T -C
user=<admin>,host=<hostname>,addr=<admin-ip>` với giá trị thật trước `sudo systemctl
reload ssh.service`. Không đổi port ở phase này. `ssh.socket` nếu dùng phải inventory
riêng; không tự disable socket. Verify session mới sau reload, giữ session trước mở.
Web ingress phải đóng cả provider và OS; admin từ ngoài kiểm tra SSH reachable còn
80/443/3000/3306/33060 unreachable (cả address families được dùng), không suy từ ss.

## 10. Logs/resources/evidence và stop point

```bash
sudo systemctl is-active mysql.service nginx.service
sudo systemctl status tiscms.service --no-pager   # expected inactive, not started
sudo ss -lntp
sudo stat -c '%U:%G %a %n' /etc/tiscms/production.env
sudo ls -ld /var/log/nginx /var/log/mysql
sudo ls -l /var/log/nginx/*log /var/log/mysql/*log  # names/modes only, no contents
journalctl --disk-usage
df -h / /srv /var
free -h
swapon --show
timedatectl status
```

Logs contents chỉ xem hạn chế trên máy quản trị, không dán raw `journalctl`, Nginx
error logs hoặc MySQL logs vào report. Không query strings/headers/bodies ở access
format; debug off. Audit code không đồng nghĩa mọi log proven no-secret: test kiểm
tra fixture log, production log review NOT RUN. Log files đề xuất root:adm0640 hoặc
tương đương; quyền traverse đúng, không chmod 777. Kiểm tra logrotate thực tế; thêm
journald Storage=auto, SystemMaxUse=200M, MaxRetentionSec=14day qua drop-in đã review
khi volume phù hợp, không tự xóa logs. Không tùy tiện restart journald/rotate dữ liệu.

Disk/RAM chưa sizing: đo build peak/OOM và scrypt login memory trước chốt. Không hứa
VPS1GB đủ; nếu RAM thấp stop cân nhắc resize. Swap là policy cần approve, không tự
tạo swap file để che build failure. Process restart test chỉ sau config gate PASS;
không cố restart production service thiếu DB/env. Backup spool/offsite/timers,
alerts, retention/restore drill và rollback vẫn theo infrastructure-readiness.md;
chưa schedule job chứa credential hoặc delete backup/restore DB hiện tại.

Expected private listeners nếu các phase thực chạy:

| Service | Listener | Gate |
|---|---|---|
| SSH | verified admin port, CIDR-limited | new session + console proof |
| Nginx staged | 127.0.0.1:8080 only | nginx -t + curl503 |
| MySQL fresh | 127.0.0.1:3306 only; X off | service active + ss |
| Next service | not started if env/import missing | NOT RUN, no bypass |
| Fixture Next smoke | temporary 127.0.0.1 random port; stopped after test | not production service acceptance |
| Public 80/443/3000/3306/33060 | inbound closed | provider + effective OS + external probes |

Không tuyên bố private runtime READY nếu Linux build/native, production-mode service
bind, proxy contract hoặc access isolation chưa chứng minh. Sau evidence dừng, không
chuyển DNS/TLS/go-live/secrets/DB provisioning. Bước tiếp theo là cung cấp VPS access
metadata, thực thi runbook đúng checkpoints và ghi kết quả thực — không secret.

## Evidence local ở checkpoint source (Windows, không phải VPS)

| Command/check | Result | Scope |
|---|---|---|
| npm test | PASS 56/56 | Offline/mock tests; 4 regression date, 1 CSP, 1 private Nginx test mới |
| npm run build | PASS exit0 | Process con empty DB/credential variables, HSTS=false; static build không dùng production DB |
| npm run typecheck | PASS exit0 | Chạy lại sau build và phục hồi next-env generated paths về trạng thái ban đầu |
| npm run test:hardening-smoke | PASS exit0 | New loopback fixture server; 0 DB attempts; no SMTP/Cloudinary calls; serverStopped=true |
| git diff --check | PASS exit0 | Không commit/push; giữ thay đổi hardening/UI có sẵn |
| Live Linux/Nginx/systemd/firewall checks | NOT RUN | Chưa nhận thông tin VPS/SSH |

Node test runner có warning MODULE_TYPELESS_PACKAGE_JSON sẵn có, không test failure;
không đổi module mode toàn project chỉ để tắt warning. Direct Maps redirect probe không
thực hiện được từ network hiện tại, không coi iframe browser đã PASS.

Files sửa/thêm riêng trong checkpoint này:

- `src/lib/calendar-date.ts` (new)
- `src/lib/db.ts`
- `src/lib/admin/repository.ts`
- `src/lib/projects-repository.ts`
- `src/app/(admin)/admin/(protected)/projects/[id]/edit/page.tsx`
- `next.config.ts` (Maps directive; giữ headers hardening có sẵn)
- `tests/calendar-date.test.mjs` (new)
- `tests/security-headers.test.mjs`
- `tests/infrastructure-templates.test.mjs`
- `scripts/hardening-smoke.mjs` (assert Maps frame directive trong built HTTP headers)
- `infra/templates/nginx-private-staged.conf` (new)
- `docs/infrastructure-readiness.md`
- `docs/vps-private-provisioning.md` (new)

Generated `next-env.d.ts` đã phục hồi, không source change mới. Dependencies không
đổi trong checkpoint này; không chạy audit lại. Không đọc/ghi production DB, không
đụng backup/restore DB/env secret, không tạo account/credential/cert, không deploy.

VPS PRIVATE RUNTIME READINESS: NOT READY
