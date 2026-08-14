import mysql, { type Pool } from "mysql2/promise";

declare global {
  var polarDatabasePool: Pool | undefined;
}

function createPool() {
  const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) throw new Error(`Missing database configuration: ${missing.join(", ")}`);
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: "utf8mb4",
    timezone: "Z",
    connectionLimit: 8,
    enableKeepAlive: true,
    decimalNumbers: true,
  });
}

export function db() {
  if (!globalThis.polarDatabasePool) globalThis.polarDatabasePool = createPool();
  return globalThis.polarDatabasePool;
}

