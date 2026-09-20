import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

async function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
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

async function alterDatabase() {
  await loadEnvLocal();

  const host = process.env.MYSQL_HOST || "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT || "3306");
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE || "solar_shop";

  let connection;
  try {
    connection = await mysql.createConnection({ host, port, user, password, database });
    await connection.query("ALTER TABLE products ADD COLUMN specifications JSON NULL;");
    console.log("✅ Đã thêm cột specifications vào bảng products thành công!");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("ℹ️ Cột specifications đã tồn tại.");
    } else {
      console.error("❌ Lỗi:", error.message);
    }
  } finally {
    if (connection) await connection.end();
  }
}

alterDatabase();
