const { randomBytes, randomUUID, scryptSync } = require("node:crypto");
const mysql = require("mysql2/promise");
const { databaseConfig } = require("./migrate.cjs");

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

async function seedTestUsers() {
  const password = process.env.TEST_ACCOUNT_PASSWORD;
  if (!password) throw new Error("TEST_ACCOUNT_PASSWORD is required when test seeding is enabled");
  const connection = await mysql.createConnection(databaseConfig());
  const identities = [
    ["mama", "Mamá", "caregiver"],
    ["papa", "Papá", "caregiver"],
    ["hija", "Hija", "patient"],
    ["doctora", "Doctora", "clinician"],
  ];
  try {
    const userIds = new Map();
    for (const [username, displayName] of identities) {
      const [rows] = await connection.query("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
      let id = rows[0]?.id;
      if (!id) {
        id = randomUUID();
        await connection.query(
          "INSERT INTO users (id, username, email, display_name, password_hash) VALUES (?, ?, ?, ?, ?)",
          [id, username, `${username}@polar.test`, displayName, hashPassword(password)],
        );
      }
      userIds.set(username, id);
    }
    const ownerId = userIds.get("papa");
    const [patientRows] = await connection.query(
      "SELECT p.id FROM patients p JOIN patient_members pm ON pm.patient_id = p.id WHERE p.name = 'Polar Demo' AND pm.user_id = ? LIMIT 1",
      [ownerId],
    );
    let patientId = patientRows[0]?.id;
    if (!patientId) {
      patientId = randomUUID();
      await connection.query(
        "INSERT INTO patients (id, created_by, name, diabetes_type) VALUES (?, ?, 'Polar Demo', 'type1')",
        [patientId, ownerId],
      );
    }
    for (const [username, , role] of identities) {
      await connection.query(
        "INSERT INTO patient_members (patient_id, user_id, role, is_default) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE role = VALUES(role), is_default = 1",
        [patientId, userIds.get(username), role],
      );
    }
    const [planRows] = await connection.query(
      "SELECT id FROM care_plan_versions WHERE patient_id = ? LIMIT 1",
      [patientId],
    );
    if (!planRows[0]) {
      await connection.query(
        `INSERT INTO care_plan_versions (
          id, patient_id, version, basal_insulin_name, basal_dose, rapid_insulin_name,
          correction_factor, premeal_target, correction_target, low_threshold,
          rounding_increment, max_bolus, ratio_breakfast, ratio_morning_snack,
          ratio_lunch, ratio_afternoon_snack, ratio_dinner, hypo_treatment_note, created_by
        ) VALUES (?, ?, 1, 'Basal', 0, 'Rápida', 50, 100, 150, 70, 1, 20, 10, 10, 10, 10, 10, 'Seguí el plan personal para tratar una baja y volvé a medir antes de calcular.', ?)`,
        [randomUUID(), patientId, ownerId],
      );
    }
    process.stdout.write("Test identities are ready\n");
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seedTestUsers().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = { seedTestUsers };

