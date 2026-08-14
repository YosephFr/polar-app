import "server-only";

import webpush from "web-push";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db/pool";
import { insertMemberNotifications } from "@/lib/db/notifications";

type DeliveryRow = RowDataPacket & {
  notification_id: string;
  push_subscription_id: string;
  type: string;
  href: string;
  source_type: string;
  source_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  attempts: number;
};

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function pushBody(type: string) {
  if (type === "timer") return "Un temporizador necesita atención.";
  if (type === "appointment") return "Hay una cita próxima.";
  if (type === "glucose_low" || type === "glucose_high") return "Hay una alerta nueva en el perfil compartido.";
  return "Hay una notificación nueva.";
}

async function createScheduledNotifications() {
  const connection = await db().getConnection();
  let timers = 0;
  let appointments = 0;
  try {
    await connection.beginTransaction();
    const [timerRows] = await connection.execute<(RowDataPacket & {
      id: string;
      patient_id: string;
      label: string;
    })[]>(
      `SELECT id, patient_id, label
       FROM timers
       WHERE status = 'active' AND due_at <= UTC_TIMESTAMP(3) AND notified_at IS NULL
       ORDER BY due_at ASC
       LIMIT 100
       FOR UPDATE`,
    );
    for (const timer of timerRows) {
      await insertMemberNotifications(connection, {
        patientId: timer.patient_id,
        type: "timer",
        title: "Temporizador listo",
        body: timer.label,
        href: "/agenda",
        sourceType: "timer",
        sourceId: timer.id,
        preference: "timers",
      });
      await connection.execute(
        "UPDATE timers SET status = 'due', notified_at = UTC_TIMESTAMP(3) WHERE id = ?",
        [timer.id],
      );
      timers += 1;
    }

    const [appointmentRows] = await connection.execute<(RowDataPacket & {
      id: string;
      patient_id: string;
      title: string;
    })[]>(
      `SELECT id, patient_id, title
       FROM appointments
       WHERE status = 'active' AND reminder_sent_at IS NULL
         AND scheduled_at > UTC_TIMESTAMP(3)
         AND scheduled_at <= DATE_ADD(UTC_TIMESTAMP(3), INTERVAL reminder_minutes MINUTE)
       ORDER BY scheduled_at ASC
       LIMIT 100
       FOR UPDATE`,
    );
    for (const appointment of appointmentRows) {
      await insertMemberNotifications(connection, {
        patientId: appointment.patient_id,
        type: "appointment",
        title: "Cita próxima",
        body: appointment.title,
        href: "/agenda",
        sourceType: "appointment",
        sourceId: appointment.id,
        preference: "appointments",
      });
      await connection.execute(
        "UPDATE appointments SET reminder_sent_at = UTC_TIMESTAMP(3) WHERE id = ?",
        [appointment.id],
      );
      appointments += 1;
    }
    await connection.commit();
    return { timers, appointments };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deliverPendingPushNotifications() {
  if (!configureWebPush()) return { configured: false, sent: 0, failed: 0 };
  await db().execute(
    `INSERT IGNORE INTO notification_deliveries (notification_id, push_subscription_id)
     SELECT n.id, ps.id
     FROM notifications n
     JOIN push_subscriptions ps ON ps.user_id = n.user_id AND ps.revoked_at IS NULL
     WHERE n.created_at >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 7 DAY)`,
  );
  const [rows] = await db().execute<DeliveryRow[]>(
    `SELECT nd.notification_id, nd.push_subscription_id, nd.attempts,
            n.type, n.href, n.source_type, n.source_id,
            ps.endpoint, ps.p256dh, ps.auth
     FROM notification_deliveries nd
     JOIN notifications n ON n.id = nd.notification_id
     JOIN push_subscriptions ps ON ps.id = nd.push_subscription_id
     WHERE nd.status = 'pending' AND nd.attempts < 5 AND ps.revoked_at IS NULL
     ORDER BY n.created_at ASC
     LIMIT 100`,
  );
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const payload = JSON.stringify({
      title: "Polar",
      body: pushBody(row.type),
      href: row.href,
      tag: `polar-${row.source_type}-${row.source_id}`,
    });
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        payload,
        { TTL: 86_400, urgency: "high", timeout: 10_000 },
      );
      await db().execute(
        `UPDATE notification_deliveries
         SET status = 'sent', attempts = attempts + 1, sent_at = UTC_TIMESTAMP(3), last_error = NULL
         WHERE notification_id = ? AND push_subscription_id = ?`,
        [row.notification_id, row.push_subscription_id],
      );
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error
        ? Number(error.statusCode)
        : 0;
      const unavailable = statusCode === 404 || statusCode === 410;
      const message = error instanceof Error ? error.message.slice(0, 500) : "Push delivery failed";
      await db().execute(
        `UPDATE notification_deliveries
         SET status = IF(? OR attempts + 1 >= 5, 'failed', 'pending'),
             attempts = attempts + 1, last_error = ?
         WHERE notification_id = ? AND push_subscription_id = ?`,
        [unavailable, message, row.notification_id, row.push_subscription_id],
      );
      if (unavailable) {
        await db().execute(
          "UPDATE push_subscriptions SET revoked_at = UTC_TIMESTAMP(3) WHERE id = ?",
          [row.push_subscription_id],
        );
      }
      failed += 1;
    }
  }
  return { configured: true, sent, failed };
}

export async function dispatchScheduledNotifications() {
  const created = await createScheduledNotifications();
  const delivery = await deliverPendingPushNotifications();
  return { ...created, ...delivery };
}
