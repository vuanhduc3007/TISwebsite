import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

// Static contract checks only; NOT nginx -t, systemd-analyze or Linux acceptance.
// No environment file, production database, OS service or network is accessed.
const read = name => fs.readFileSync(new URL(`../infra/templates/${name}`, import.meta.url), "utf8");
const uncomment = text => text.split(/\r?\n/).filter(line => !line.trim().startsWith("#")).join("\n");

test("Nginx template overwrites canonical headers and never appends a client forwarding chain", () => {
  const config = uncomment(read("nginx-tiscms.conf"));
  assert.match(config, /server 127\.0\.0\.1:3000;/);
  assert.match(config, /proxy_set_header X-Real-IP \$remote_addr;/);
  assert.match(config, /proxy_set_header X-Forwarded-For \$remote_addr;/);
  assert.match(config, /proxy_set_header CF-Connecting-IP "";/);
  assert.match(config, /proxy_set_header Forwarded "";/);
  assert.ok(!config.includes("$proxy_add_x_forwarded_for"));
  assert.ok(!config.includes("$http_x_real_ip"));
});

test("Nginx requires a private secret include, restricts hosts/TLS and does not cache Admin", () => {
  const config = uncomment(read("nginx-tiscms.conf"));
  assert.match(config, /include \/etc\/tiscms\/proxy-secret-header\.conf;/);
  assert.ok(!/proxy_set_header X-TIS-Proxy-Token/.test(config), "No fake/fallback token should be embedded");
  assert.match(config, /proxy_hide_header X-TIS-Proxy-Token;/);
  assert.match(config, /ssl_reject_handshake on;/);
  assert.match(config, /ssl_protocols TLSv1\.2 TLSv1\.3;/);
  assert.match(config, /if \(\$host != example\.invalid\)/);
  assert.match(config, /proxy_cache off;/);
  assert.match(config, /proxy_buffering off;/);
  assert.ok(!config.includes("$http_cookie") && !config.includes("$request_body"));
});

test("systemd forces production mode and a non-root loopback-only Next process", () => {
  const config = uncomment(read("tiscms.service"));
  assert.match(config, /^User=tiscms$/m);
  assert.match(config, /^WorkingDirectory=\/srv\/tiscms\/current$/m);
  assert.match(config, /^EnvironmentFile=\/etc\/tiscms\/production\.env$/m);
  assert.match(config, /^ExecStartPre=\/usr\/bin\/env NODE_ENV=production .*check-production-config\.mjs$/m);
  assert.match(config, /^ExecStart=\/usr\/bin\/env NODE_ENV=production .*--hostname 127\.0\.0\.1 --port 3000$/m);
  assert.ok(!config.includes("0.0.0.0") && !config.includes(" next dev"));
});

test("systemd keeps filesystem/capability guards with bounded restart and isolated writes", () => {
  const config = uncomment(read("tiscms.service"));
  for (const directive of ["ProtectSystem=strict", "ProtectHome=true", "NoNewPrivileges=true", "CapabilityBoundingSet=", "UMask=0077", "Restart=on-failure", "KillMode=control-group"]) {
    assert.ok(config.split("\n").includes(directive));
  }
  assert.match(config, /^ReadWritePaths=\/srv\/tiscms\/current\/\.next$/m);
  assert.ok(!config.includes("MemoryDenyWriteExecute=true"));
});

test("MySQL template binds classic protocol to loopback and closes unused X protocol", () => {
  const config = uncomment(read("mysql-tiscms.cnf"));
  assert.match(config, /^bind-address=127\.0\.0\.1$/m);
  assert.match(config, /^port=3306$/m);
  assert.match(config, /^mysqlx=OFF$/m);
  assert.ok(!config.includes("0.0.0.0"));
  assert.ok(!/^(lower_case_table_names|default-time-zone)=/m.test(config));
});

test("private Nginx staging is loopback-only maintenance, not a fake authenticated proxy", () => {
  const config = uncomment(read("nginx-private-staged.conf"));
  assert.deepEqual([...config.matchAll(/\blisten\s+([^;]+);/g)].map(match => match[1]), ["127.0.0.1:8080 default_server"]);
  assert.match(config, /if \(\$host != 127\.0\.0\.1\)/);
  assert.match(config, /return 503/);
  assert.ok(!/proxy_pass|proxy_set_header|ssl_certificate|include\s+/.test(config));
  assert.ok(!config.includes("$request_body") && !config.includes("$http_cookie") && !config.includes("$request_uri"));
});
