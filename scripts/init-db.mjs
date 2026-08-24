import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

async function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("⚠️ không tìm thấy file .env.local, dùng giá trị mặc định.");
    return;
  }
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (key && !process.env[key.trim()]) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  }
}

async function initDatabase() {
  await loadEnvLocal();

  const host = process.env.MYSQL_HOST || "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT || "3306");
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE || "solar_shop";

  console.log(`🔌 Đang kết nối tới MySQL tại ${host}:${port} với user '${user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });
    console.log("✅ Kết nối MySQL thành công!");

    const schemaPath = path.resolve(process.cwd(), "sql", "schema.sql");
    const sqlContent = fs.readFileSync(schemaPath, "utf-8");

    console.log(`🚀 Đang khởi tạo Database '${database}' & thêm dữ liệu mẫu...`);
    await connection.query(sqlContent);

    console.log("🎉 KHỞI TẠO DATABASE THÀNH CÔNG! HỆ THỐNG ĐÃ SẴN SÀNG.");
  } catch (error) {
    console.error("❌ Lỗi khởi tạo database:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
