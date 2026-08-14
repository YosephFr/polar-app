import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { assertPatientAccess } from "./data";
import { db } from "./pool";

export type NotificationKind = "timer" | "appointment" | "glucose_low" | "glucose_high" | "system";

export type NotificationItem = {
  id: string;
  type: NotificationKind;
  title: string;
  body: string;
  href: string;
  sourceType: string;
  sourceId: string;
  readAt: string | null;
  createdAt: string;
};

export type CenterTimer = {
  id: string;
  label: string;
  dueAt: string;
  status: "active" | "paused" | "due";
  kind: string;
  remainingSeconds: number | null;
};

export type CenterAppointment = {
  id: string;
  title: string;
  scheduledAt: string;
};

export type NotificationSnapshot = {
  serverNow: number;
  notifications: NotificationItem[];
  timers: CenterTimer[];
  appointments: CenterAppointment[];
  latestRecord: { glucose: number; status: string; occurredAt: string } | null;
  preferences: {
    timersEnabled: boolean;
    appointmentsEnabled: boolean;
    glucoseAlertsEnabled: boolean;
    updatesEnabled: boolean;
  };
};

type PreferenceKind = "timers" | "appointments" | "glucose_alerts" | "updates";

const preferenceColumns: Record<PreferenceKind, string> = {
  timers: "timers_enabled",
  appointments: "appointments_enabled",
  glucose_alerts: "glucose_alerts_enabled",
  updates: "updates_enabled",
};

export async function insertMemberNotifications(
  connection: PoolConnection,
  input: {
    patientId: string;
    type: NotificationKind;
    title: string;
    body: string;
    href: string;
    sourceType: string;
    sourceId: string;
    preference: PreferenceKind;
  },
) {
  const preferenceColumn = preferenceColumns[input.preference];
  await connection.execute(
    `INSERT IGNORE INTO notifications (
      id, user_id, patient_id, type, title, body, href, source_type, source_id
    )
    SELECT UUID(), pm.user_id, ?, ?, ?, ?, ?, ?, ?
    FROM patient_members pm
    LEFT JOIN notification_preferences np
      ON np.patient_id = pm.patient_id AND np.user_id = pm.user_id
    WHERE pm.patient_id = ? AND COALESCE(np.${preferenceColumn}, 1) = 1`,
    [
      input.patientId,
      input.type,
      input.title,
      input.body,
      input.href,
      input.sourceType,
      input.sourceId,
      input.patientId,
    ],
  );
}

export async function getNotificationSnapshot(userId: string, patientId: string): Promise<NotificationSnapshot> {
  await assertPatientAccess(userId, patientId);
  const [clockResult, notificationResult, timerResult, appointmentResult, recordResult, preferenceResult] = await Promise.all([
    db().execute<(RowDataPacket & { now_ms: number })[]>(
      "SELECT UNIX_TIMESTAMP(UTC_TIMESTAMP(3)) * 1000 AS now_ms",
    ),
    db().execute<(RowDataPacket & {
      id: string;
      type: NotificationKind;
      title: string;
      body: string;
      href: string;
      source_type: string;
      source_id: string;
      read_at: Date | null;
      created_at: Date;
    })[]>(
      `SELECT id, type, title, body, href, source_type, source_id, read_at, created_at
       FROM notifications
       WHERE user_id = ? AND patient_id = ?
       ORDER BY created_at DESC
       LIMIT 40`,
      [userId, patientId],
    ),
    db().execute<(RowDataPacket & {
      id: string;
      label: string;
      due_at: Date;
      status: CenterTimer["status"];
      kind: string;
      remaining_seconds: number | null;
    })[]>(
      `SELECT id, label, due_at,
              CASE WHEN status = 'active' AND due_at <= UTC_TIMESTAMP(3) THEN 'due' ELSE status END AS status,
              kind, remaining_seconds
       FROM timers
       WHERE patient_id = ? AND status IN ('active', 'paused', 'due')
       ORDER BY CASE WHEN status = 'paused' THEN 1 ELSE 0 END, due_at ASC
       LIMIT 20`,
      [patientId],
    ),
    db().execute<(RowDataPacket & { id: string; title: string; scheduled_at: Date })[]>(
      `SELECT id, title, scheduled_at
       FROM appointments
       WHERE patient_id = ? AND status = 'active' AND scheduled_at >= UTC_TIMESTAMP(3)
       ORDER BY scheduled_at ASC
       LIMIT 8`,
      [patientId],
    ),
    db().execute<(RowDataPacket & { glucose: number; status: string; occurred_at: Date })[]>(
      `SELECT glucose, status, occurred_at
       FROM bolus_records
       WHERE patient_id = ?
       ORDER BY occurred_at DESC
       LIMIT 1`,
      [patientId],
    ),
    db().execute<(RowDataPacket & {
      timers_enabled: number;
      appointments_enabled: number;
      glucose_alerts_enabled: number;
      updates_enabled: number;
    })[]>(
      `SELECT timers_enabled, appointments_enabled, glucose_alerts_enabled, updates_enabled
       FROM notification_preferences
       WHERE user_id = ? AND patient_id = ?
       LIMIT 1`,
      [userId, patientId],
    ),
  ]);
  const [clockRows] = clockResult;
  const [notificationRows] = notificationResult;
  const [timerRows] = timerResult;
  const [appointmentRows] = appointmentResult;
  const [recordRows] = recordResult;
  const [preferenceRows] = preferenceResult;
  const preference = preferenceRows[0];
  return {
    serverNow: Number(clockRows[0]?.now_ms || Date.now()),
    notifications: notificationRows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      href: row.href,
      sourceType: row.source_type,
      sourceId: row.source_id,
      readAt: row.read_at?.toISOString() || null,
      createdAt: row.created_at.toISOString(),
    })),
    timers: timerRows.map((row) => ({
      id: row.id,
      label: row.label,
      dueAt: row.due_at.toISOString(),
      status: row.status,
      kind: row.kind,
      remainingSeconds: row.remaining_seconds,
    })),
    appointments: appointmentRows.map((row) => ({
      id: row.id,
      title: row.title,
      scheduledAt: row.scheduled_at.toISOString(),
    })),
    latestRecord: recordRows[0]
      ? {
          glucose: recordRows[0].glucose,
          status: recordRows[0].status,
          occurredAt: recordRows[0].occurred_at.toISOString(),
        }
      : null,
    preferences: {
      timersEnabled: preference ? Boolean(preference.timers_enabled) : true,
      appointmentsEnabled: preference ? Boolean(preference.appointments_enabled) : true,
      glucoseAlertsEnabled: preference ? Boolean(preference.glucose_alerts_enabled) : true,
      updatesEnabled: preference ? Boolean(preference.updates_enabled) : true,
    },
  };
}

export async function markNotificationsRead(userId: string, patientId: string, ids?: string[]) {
  await assertPatientAccess(userId, patientId);
  if (ids?.length) {
    const placeholders = ids.map(() => "?").join(", ");
    await db().execute(
      `UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP(3))
       WHERE user_id = ? AND patient_id = ? AND id IN (${placeholders})`,
      [userId, patientId, ...ids],
    );
    return;
  }
  await db().execute(
    "UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP(3)) WHERE user_id = ? AND patient_id = ?",
    [userId, patientId],
  );
}

export async function savePushSubscription(userId: string, subscription: PushSubscriptionJSON, deviceName: string | null) {
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
    throw new Error("Invalid push subscription");
  }
  const { createHash } = await import("node:crypto");
  const endpointHash = createHash("sha256").update(subscription.endpoint).digest("hex");
  await db().execute(
    `INSERT INTO push_subscriptions (
      id, user_id, endpoint_hash, endpoint, p256dh, auth, device_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth),
      device_name = VALUES(device_name), last_seen_at = UTC_TIMESTAMP(3), revoked_at = NULL`,
    [
      randomUUID(), userId, endpointHash, subscription.endpoint,
      subscription.keys.p256dh, subscription.keys.auth, deviceName,
    ],
  );
}

export async function revokePushSubscription(userId: string, endpoint: string) {
  const { createHash } = await import("node:crypto");
  const endpointHash = createHash("sha256").update(endpoint).digest("hex");
  await db().execute(
    "UPDATE push_subscriptions SET revoked_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND endpoint_hash = ?",
    [userId, endpointHash],
  );
}

export async function updateNotificationPreferences(
  userId: string,
  patientId: string,
  preferences: NotificationSnapshot["preferences"],
) {
  await assertPatientAccess(userId, patientId);
  await db().execute(
    `INSERT INTO notification_preferences (
      user_id, patient_id, timers_enabled, appointments_enabled, glucose_alerts_enabled, updates_enabled
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      timers_enabled = VALUES(timers_enabled), appointments_enabled = VALUES(appointments_enabled),
      glucose_alerts_enabled = VALUES(glucose_alerts_enabled), updates_enabled = VALUES(updates_enabled)`,
    [
      userId,
      patientId,
      preferences.timersEnabled,
      preferences.appointmentsEnabled,
      preferences.glucoseAlertsEnabled,
      preferences.updatesEnabled,
    ],
  );
}
