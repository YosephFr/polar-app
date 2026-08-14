import type { BolusRecord } from "../db/data";
import { polarTimeZone } from "../date-time";
import type { MealType } from "./calculator";

export function suggestMealType(now: Date, latestRecord: BolusRecord | null): MealType {
  if (latestRecord) {
    const elapsedMinutes = (now.getTime() - new Date(latestRecord.occurredAt).getTime()) / 60_000;
    if (elapsedMinutes >= 90 && elapsedMinutes <= 210) return "correction";
  }
  const hour = Number(new Intl.DateTimeFormat("en", {
    timeZone: polarTimeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now));
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 12) return "morning_snack";
  if (hour >= 12 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 19) return "afternoon_snack";
  if (hour >= 19 || hour < 2) return "dinner";
  return "correction";
}
