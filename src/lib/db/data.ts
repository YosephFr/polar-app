import { randomUUID } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { db } from "./pool";
import type { CarePlan, MealType } from "@/lib/domain/calculator";

type PatientRow = RowDataPacket & {
  id: string;
  name: string;
  birth_date: string | null;
  sex: string | null;
  diabetes_type: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_service_phone: string | null;
  role: string;
  is_default: number;
  active_mascot: string;
};

type PlanRow = RowDataPacket & {
  id: string;
  version: number;
  basal_insulin_name: string | null;
  basal_dose: number | null;
  rapid_insulin_name: string | null;
  correction_factor: number;
  premeal_target: number;
  correction_target: number;
  low_threshold: number;
  high_threshold: number;
  auto_follow_up_enabled: number;
  standard_follow_up_minutes: number;
  low_follow_up_minutes: number;
  high_follow_up_minutes: number;
  rounding_increment: number;
  max_bolus: number | null;
  ratio_breakfast: number;
  ratio_morning_snack: number;
  ratio_lunch: number;
  ratio_afternoon_snack: number;
  ratio_dinner: number;
  hypo_treatment_note: string | null;
};

export type PatientSummary = {
  id: string;
  name: string;
  birthDate: string | null;
  sex: string | null;
  diabetesType: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyServicePhone: string | null;
  role: string;
  isDefault: boolean;
  activeMascot: string;
};

export type PatientCarePlan = CarePlan & {
  id: string;
  basalInsulinName: string | null;
  basalDose: number | null;
  rapidInsulinName: string | null;
  hypoTreatmentNote: string | null;
  highThreshold: number;
  autoFollowUpEnabled: boolean;
  standardFollowUpMinutes: number;
  lowFollowUpMinutes: number;
  highFollowUpMinutes: number;
};

export type UserPreferences = {
  theme: "polar" | "night" | "contrast";
};

export type AppContext = {
  patients: PatientSummary[];
  patient: PatientSummary;
  carePlan: PatientCarePlan;
  preferences: UserPreferences;
};

function mapPatient(row: PatientRow): PatientSummary {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
    sex: row.sex,
    diabetesType: row.diabetes_type,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    emergencyServicePhone: row.emergency_service_phone,
    role: row.role,
    isDefault: Boolean(row.is_default),
    activeMascot: row.active_mascot,
  };
}

function mapPlan(row: PlanRow): PatientCarePlan {
  return {
    id: row.id,
    version: row.version,
    basalInsulinName: row.basal_insulin_name,
    basalDose: row.basal_dose,
    rapidInsulinName: row.rapid_insulin_name,
    correctionFactor: row.correction_factor,
    premealTarget: row.premeal_target,
    correctionTarget: row.correction_target,
    lowThreshold: row.low_threshold,
    highThreshold: row.high_threshold,
    autoFollowUpEnabled: Boolean(row.auto_follow_up_enabled),
    standardFollowUpMinutes: row.standard_follow_up_minutes,
    lowFollowUpMinutes: row.low_follow_up_minutes,
    highFollowUpMinutes: row.high_follow_up_minutes,
    roundingIncrement: row.rounding_increment,
    maxBolus: row.max_bolus,
    ratios: {
      breakfast: row.ratio_breakfast,
      morning_snack: row.ratio_morning_snack,
      lunch: row.ratio_lunch,
      afternoon_snack: row.ratio_afternoon_snack,
      dinner: row.ratio_dinner,
    },
    hypoTreatmentNote: row.hypo_treatment_note,
  };
}

export async function listPatients(userId: string) {
  const [rows] = await db().execute<PatientRow[]>(
    `SELECT p.id, p.name, DATE_FORMAT(p.birth_date, '%Y-%m-%d') AS birth_date,
            p.sex, p.diabetes_type, p.emergency_contact_name, p.emergency_contact_phone,
            p.emergency_service_phone, pm.role, pm.is_default, pm.active_mascot
     FROM patient_members pm
     JOIN patients p ON p.id = pm.patient_id
     WHERE pm.user_id = ?
     ORDER BY pm.is_default DESC, pm.joined_at ASC`,
    [userId],
  );
  return rows.map(mapPatient);
}

const readAppContext = cache(async (userId: string): Promise<AppContext | null> => {
  const patients = await listPatients(userId);
  if (patients.length === 0) return null;
  const store = await cookies();
  const requestedId = store.get("polar_patient")?.value;
  const patient = patients.find((item) => item.id === requestedId) || patients[0];
  const [planResult, preferenceResult] = await Promise.all([
    db().execute<PlanRow[]>(
      `SELECT * FROM care_plan_versions
       WHERE patient_id = ?
       ORDER BY version DESC
       LIMIT 1`,
      [patient.id],
    ),
    db().execute<(RowDataPacket & { theme: UserPreferences["theme"] })[]>(
      "SELECT theme FROM user_preferences WHERE user_id = ? LIMIT 1",
      [userId],
    ),
  ]);
  const [planRows] = planResult;
  const [preferenceRows] = preferenceResult;
  if (!planRows[0]) throw new Error("The monitored person does not have a care plan");
  return {
    patients,
    patient,
    carePlan: mapPlan(planRows[0]),
    preferences: { theme: preferenceRows[0]?.theme || "polar" },
  };
});

export const getAppContext = readAppContext;

export async function assertPatientAccess(userId: string, patientId: string) {
  const [rows] = await db().execute<(RowDataPacket & { role: string })[]>(
    "SELECT role FROM patient_members WHERE user_id = ? AND patient_id = ? LIMIT 1",
    [userId, patientId],
  );
  if (!rows[0]) throw new Error("Patient access denied");
  return rows[0].role;
}

export async function getPatientCarePlan(userId: string, patientId: string) {
  await assertPatientAccess(userId, patientId);
  const [rows] = await db().execute<PlanRow[]>(
    "SELECT * FROM care_plan_versions WHERE patient_id = ? ORDER BY version DESC LIMIT 1",
    [patientId],
  );
  if (!rows[0]) throw new Error("The monitored person does not have a care plan");
  return mapPlan(rows[0]);
}

export type BolusRecord = {
  id: string;
  mealType: MealType;
  glucose: number;
  carbs: number;
  recommendedDose: number | null;
  administeredDose: number | null;
  status: string;
  notes: string | null;
  occurredAt: string;
  actorName: string;
};

export async function listBolusRecords(userId: string, patientId: string, limit = 50) {
  await assertPatientAccess(userId, patientId);
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const [rows] = await db().execute<(RowDataPacket & {
    id: string;
    meal_type: MealType;
    glucose: number;
    carbs: number;
    recommended_dose: number | null;
    administered_dose: number | null;
    status: string;
    notes: string | null;
    occurred_at: Date;
    display_name: string;
  })[]>(
    `SELECT br.id, br.meal_type, br.glucose, br.carbs, br.recommended_dose,
            br.administered_dose, br.status, br.notes, br.occurred_at, u.display_name
     FROM bolus_records br
     JOIN users u ON u.id = br.user_id
     WHERE br.patient_id = ?
     ORDER BY br.occurred_at DESC
     LIMIT ${safeLimit}`,
    [patientId],
  );
  return rows.map<BolusRecord>((row) => ({
    id: row.id,
    mealType: row.meal_type,
    glucose: row.glucose,
    carbs: row.carbs,
    recommendedDose: row.recommended_dose,
    administeredDose: row.administered_dose,
    status: row.status,
    notes: row.notes,
    occurredAt: row.occurred_at.toISOString(),
    actorName: row.display_name,
  }));
}

export type Appointment = {
  id: string;
  title: string;
  scheduledAt: string;
  notes: string | null;
  reminderMinutes: number;
};

export type PatientTimer = {
  id: string;
  label: string;
  dueAt: string;
  status: "active" | "paused" | "due";
  kind: string;
  remainingSeconds: number | null;
};

export async function listAgenda(userId: string, patientId: string) {
  await assertPatientAccess(userId, patientId);
  const [clockResult, appointmentResult, timerResult] = await Promise.all([
    db().execute<(RowDataPacket & { now_ms: number })[]>(
      "SELECT UNIX_TIMESTAMP(UTC_TIMESTAMP(3)) * 1000 AS now_ms",
    ),
    db().execute<(RowDataPacket & {
      id: string;
      title: string;
      scheduled_at: Date;
      notes: string | null;
      reminder_minutes: number;
    })[]>(
      "SELECT id, title, scheduled_at, notes, reminder_minutes FROM appointments WHERE patient_id = ? AND status = 'active' AND scheduled_at >= UTC_TIMESTAMP(3) ORDER BY scheduled_at ASC LIMIT 50",
      [patientId],
    ),
    db().execute<(RowDataPacket & {
      id: string;
      label: string;
      due_at: Date;
      status: PatientTimer["status"];
      kind: string;
      remaining_seconds: number | null;
    })[]>(
      `SELECT id, label, due_at,
              CASE WHEN status = 'active' AND due_at <= UTC_TIMESTAMP(3) THEN 'due' ELSE status END AS status,
              kind, remaining_seconds
       FROM timers
       WHERE patient_id = ? AND status IN ('active', 'paused', 'due')
       ORDER BY CASE WHEN status = 'paused' THEN 1 ELSE 0 END, due_at ASC
       LIMIT 50`,
      [patientId],
    ),
  ]);
  const [clockRows] = clockResult;
  const [appointmentRows] = appointmentResult;
  const [timerRows] = timerResult;
  return {
    initialNow: Number(clockRows[0]?.now_ms || 0),
    appointments: appointmentRows.map<Appointment>((row) => ({
      id: row.id,
      title: row.title,
      scheduledAt: row.scheduled_at.toISOString(),
      notes: row.notes,
      reminderMinutes: row.reminder_minutes,
    })),
    timers: timerRows.map<PatientTimer>((row) => ({
      id: row.id,
      label: row.label,
      dueAt: row.due_at.toISOString(),
      status: row.status,
      kind: row.kind,
      remainingSeconds: row.remaining_seconds,
    })),
  };
}

export type CalendarPayload = {
  month: string;
  appointments: Array<{ id: string; title: string; scheduledAt: string }>;
  records: Array<{ id: string; glucose: number; status: string; occurredAt: string }>;
};

export async function listCalendarMonth(userId: string, patientId: string, month: string): Promise<CalendarPayload> {
  await assertPatientAccess(userId, patientId);
  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid calendar month");
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const queryStart = new Date(start.getTime() - 48 * 60 * 60 * 1000);
  const queryEnd = new Date(end.getTime() + 48 * 60 * 60 * 1000);
  const [appointmentResult, recordResult] = await Promise.all([
    db().execute<(RowDataPacket & { id: string; title: string; scheduled_at: Date })[]>(
      `SELECT id, title, scheduled_at
       FROM appointments
       WHERE patient_id = ? AND status = 'active' AND scheduled_at >= ? AND scheduled_at < ?
       ORDER BY scheduled_at ASC`,
      [patientId, queryStart, queryEnd],
    ),
    db().execute<(RowDataPacket & { id: string; glucose: number; status: string; occurred_at: Date })[]>(
      `SELECT id, glucose, status, occurred_at
       FROM bolus_records
       WHERE patient_id = ? AND occurred_at >= ? AND occurred_at < ?
       ORDER BY occurred_at ASC
       LIMIT 500`,
      [patientId, queryStart, queryEnd],
    ),
  ]);
  const [appointmentRows] = appointmentResult;
  const [recordRows] = recordResult;
  return {
    month,
    appointments: appointmentRows.map((row) => ({
      id: row.id,
      title: row.title,
      scheduledAt: row.scheduled_at.toISOString(),
    })),
    records: recordRows.map((row) => ({
      id: row.id,
      glucose: row.glucose,
      status: row.status,
      occurredAt: row.occurred_at.toISOString(),
    })),
  };
}

export async function listPatientMembers(userId: string, patientId: string) {
  await assertPatientAccess(userId, patientId);
  const [rows] = await db().execute<(RowDataPacket & {
    id: string;
    username: string;
    display_name: string;
    role: string;
  })[]>(
    `SELECT u.id, u.username, u.display_name, pm.role
     FROM patient_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.patient_id = ? ORDER BY pm.joined_at ASC`,
    [patientId],
  );
  return rows.map((row) => ({ id: row.id, username: row.username, displayName: row.display_name, role: row.role }));
}

export type NewPatientInput = {
  name: string;
  birthDate: string | null;
  sex: string | null;
  basalInsulinName: string | null;
  basalDose: number | null;
  rapidInsulinName: string | null;
  correctionFactor: number;
  premealTarget: number;
  correctionTarget: number;
  lowThreshold: number;
  roundingIncrement: number;
  maxBolus: number | null;
  ratios: Record<Exclude<MealType, "correction">, number>;
  hypoTreatmentNote: string | null;
  highThreshold: number;
  autoFollowUpEnabled: boolean;
  standardFollowUpMinutes: number;
  lowFollowUpMinutes: number;
  highFollowUpMinutes: number;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyServicePhone: string | null;
};

export async function createPatient(userId: string, input: NewPatientInput) {
  const connection = await db().getConnection();
  const patientId = randomUUID();
  try {
    await connection.beginTransaction();
    const [memberships] = await connection.execute<(RowDataPacket & { total: number })[]>(
      "SELECT COUNT(*) AS total FROM patient_members WHERE user_id = ? FOR UPDATE",
      [userId],
    );
    const makeDefault = Number(memberships[0]?.total || 0) === 0;
    await connection.execute(
      `INSERT INTO patients (
        id, created_by, name, birth_date, sex, diabetes_type,
        emergency_contact_name, emergency_contact_phone, emergency_service_phone
      ) VALUES (?, ?, ?, ?, ?, 'type1', ?, ?, ?)`,
      [
        patientId, userId, input.name, input.birthDate, input.sex,
        input.emergencyContactName, input.emergencyContactPhone, input.emergencyServicePhone,
      ],
    );
    await connection.execute(
      "INSERT INTO patient_members (patient_id, user_id, role, is_default) VALUES (?, ?, 'owner', ?)",
      [patientId, userId, makeDefault ? 1 : 0],
    );
    await insertCarePlan(connection, userId, patientId, 1, input);
    await connection.execute(
      "INSERT INTO audit_logs (id, patient_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, 'create', 'patient', ?)",
      [randomUUID(), patientId, userId, patientId],
    );
    await connection.commit();
    return patientId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function insertCarePlan(
  connection: PoolConnection,
  userId: string,
  patientId: string,
  version: number,
  input: NewPatientInput,
) {
  await connection.execute(
    `INSERT INTO care_plan_versions (
      id, patient_id, version, basal_insulin_name, basal_dose, rapid_insulin_name,
      correction_factor, premeal_target, correction_target, low_threshold, high_threshold,
      auto_follow_up_enabled, standard_follow_up_minutes, low_follow_up_minutes,
      high_follow_up_minutes, rounding_increment, max_bolus, ratio_breakfast, ratio_morning_snack,
      ratio_lunch, ratio_afternoon_snack, ratio_dinner, hypo_treatment_note, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(), patientId, version, input.basalInsulinName, input.basalDose,
      input.rapidInsulinName, input.correctionFactor, input.premealTarget,
      input.correctionTarget, input.lowThreshold, input.highThreshold,
      input.autoFollowUpEnabled, input.standardFollowUpMinutes,
      input.lowFollowUpMinutes, input.highFollowUpMinutes, input.roundingIncrement,
      input.maxBolus, input.ratios.breakfast, input.ratios.morning_snack,
      input.ratios.lunch, input.ratios.afternoon_snack, input.ratios.dinner,
      input.hypoTreatmentNote, userId,
    ],
  );
}

export async function updatePatientCarePlan(userId: string, patientId: string, input: NewPatientInput) {
  const connection = await db().getConnection();
  try {
    await connection.beginTransaction();
    const [membershipRows] = await connection.execute<(RowDataPacket & { role: string })[]>(
      "SELECT role FROM patient_members WHERE user_id = ? AND patient_id = ? FOR UPDATE",
      [userId, patientId],
    );
    if (!membershipRows[0]) throw new Error("Patient access denied");
    if (!["owner", "caregiver"].includes(membershipRows[0].role)) throw new Error("Care plan edit denied");
    const [versionRows] = await connection.execute<(RowDataPacket & { version: number })[]>(
      "SELECT version FROM care_plan_versions WHERE patient_id = ? ORDER BY version DESC LIMIT 1 FOR UPDATE",
      [patientId],
    );
    const nextVersion = Number(versionRows[0]?.version || 0) + 1;
    await connection.execute(
      "UPDATE patients SET name = ?, birth_date = ?, sex = ? WHERE id = ?",
      [input.name, input.birthDate, input.sex, patientId],
    );
    await insertCarePlan(connection, userId, patientId, nextVersion, input);
    await connection.execute(
      "INSERT INTO audit_logs (id, patient_id, user_id, action, entity_type, entity_id, details_json) VALUES (?, ?, ?, 'update', 'care_plan', ?, ?)",
      [randomUUID(), patientId, userId, patientId, JSON.stringify({ version: nextVersion })],
    );
    await connection.commit();
    return nextVersion;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setActivePatient(userId: string, patientId: string) {
  await assertPatientAccess(userId, patientId);
  const store = await cookies();
  store.set("polar_patient", patientId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
