const fs = require("node:fs/promises");
const path = require("node:path");
const mysql = require("mysql2/promise");

function databaseConfig() {
  const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) throw new Error(`Missing database configuration: ${missing.join(", ")}`);
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: "utf8mb4",
    timezone: "Z",
    multipleStatements: true,
  };
}

async function migrate() {
  const connection = await mysql.createConnection(databaseConfig());
  const lockName = `polar_migrations_${process.env.DB_NAME}`;
  try {
    const [lockRows] = await connection.query("SELECT GET_LOCK(?, 30) AS acquired", [lockName]);
    if (lockRows[0]?.acquired !== 1) throw new Error("Could not acquire the migration lock");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS _polar_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const migrationDirectory = path.join(__dirname, "..", "db", "migrations");
    const files = (await fs.readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();
    const [appliedRows] = await connection.query("SELECT filename FROM _polar_migrations");
    const applied = new Set(appliedRows.map((row) => row.filename));
    for (const filename of files) {
      if (applied.has(filename)) continue;
      const sql = await fs.readFile(path.join(migrationDirectory, filename), "utf8");
      await connection.query(sql);
      await connection.query("INSERT INTO _polar_migrations (filename) VALUES (?)", [filename]);
      process.stdout.write(`Applied migration ${filename}\n`);
    }
  } finally {
    await connection.query("SELECT RELEASE_LOCK(?)", [lockName]).catch(() => undefined);
    await connection.end();
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = { databaseConfig, migrate };

