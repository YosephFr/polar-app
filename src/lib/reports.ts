import "server-only";

import type { RowDataPacket } from "mysql2/promise";
import { assertPatientAccess } from "@/lib/db/data";
import { db } from "@/lib/db/pool";
import type { MealType } from "@/lib/domain/calculator";

export type ReportRecord = {
  id: string;
  mealType: MealType;
  glucose: number;
  carbs: number;
  administeredDose: number | null;
  recommendedDose: number | null;
  status: string;
  occurredAt: string;
  actorName: string;
};

export type ReportData = {
  patientName: string;
  lowBoundary: number;
  rangeHighBoundary: number;
  days: number;
  generatedAt: string;
  records: ReportRecord[];
};

export async function getReportData(userId: string, patientId: string, days: number): Promise<ReportData> {
  await assertPatientAccess(userId, patientId);
  const safeDays = [7, 10, 14, 30, 90].includes(days) ? days : 30;
  const [patientResult, recordResult] = await Promise.all([
    db().execute<(RowDataPacket & { name: string; low_threshold: number })[]>(
      `SELECT p.name, cp.low_threshold
       FROM patients p
       JOIN care_plan_versions cp ON cp.patient_id = p.id
       WHERE p.id = ?
       ORDER BY cp.version DESC
       LIMIT 1`,
      [patientId],
    ),
    db().execute<(RowDataPacket & {
      id: string;
      meal_type: MealType;
      glucose: number;
      carbs: number;
      administered_dose: number | null;
      recommended_dose: number | null;
      status: string;
      occurred_at: Date;
      display_name: string;
    })[]>(
      `SELECT br.id, br.meal_type, br.glucose, br.carbs, br.administered_dose,
              br.recommended_dose, br.status, br.occurred_at, u.display_name
       FROM bolus_records br
       JOIN users u ON u.id = br.user_id
       WHERE br.patient_id = ? AND br.occurred_at >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? DAY)
       ORDER BY br.occurred_at DESC
       LIMIT 1000`,
      [patientId, safeDays],
    ),
  ]);
  const [patientRows] = patientResult;
  const [recordRows] = recordResult;
  if (!patientRows[0]) throw new Error("Patient access denied");
  return {
    patientName: patientRows[0].name,
    lowBoundary: patientRows[0].low_threshold,
    rangeHighBoundary: 180,
    days: safeDays,
    generatedAt: new Date().toISOString(),
    records: recordRows.map((row) => ({
      id: row.id,
      mealType: row.meal_type,
      glucose: row.glucose,
      carbs: row.carbs,
      administeredDose: row.administered_dose,
      recommendedDose: row.recommended_dose,
      status: row.status,
      occurredAt: row.occurred_at.toISOString(),
      actorName: row.display_name,
    })),
  };
}

export function reportStatistics(data: ReportData) {
  const total = data.records.length;
  const low = data.records.filter((record) => record.glucose <= data.lowBoundary).length;
  const inRange = data.records.filter((record) => record.glucose > data.lowBoundary && record.glucose <= data.rangeHighBoundary).length;
  const elevated = data.records.filter((record) => record.glucose > data.rangeHighBoundary && record.glucose <= 240).length;
  const high = data.records.filter((record) => record.glucose > 240).length;
  const percent = (value: number) => total ? Math.round(value / total * 100) : 0;
  return {
    total,
    average: total ? Math.round(data.records.reduce((sum, record) => sum + record.glucose, 0) / total) : null,
    low: percent(low),
    inRange: percent(inRange),
    elevated: percent(elevated),
    high: percent(high),
  };
}
