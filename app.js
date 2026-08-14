process.env.NODE_ENV = process.env.NODE_ENV || "production";

const { migrate } = require("./scripts/migrate.cjs");
const { seedTestUsers } = require("./scripts/seed-test.cjs");

async function start() {
  await migrate();
  if (process.env.SEED_TEST_USERS === "true") await seedTestUsers();
  require("./.next/standalone/server.js");
}

start().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
