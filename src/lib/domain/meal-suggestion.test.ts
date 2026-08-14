import { describe, expect, it } from "vitest";
import { suggestMealType } from "./meal-suggestion";

describe("suggestMealType", () => {
  it("suggests a correction during the follow-up window", () => {
    const now = new Date("2026-08-14T15:00:00.000Z");
    expect(suggestMealType(now, {
      id: "record",
      mealType: "breakfast",
      glucose: 110,
      carbs: 30,
      recommendedDose: 3,
      administeredDose: 3,
      status: "administered",
      notes: null,
      occurredAt: "2026-08-14T13:00:00.000Z",
      actorName: "Familiar",
    })).toBe("correction");
  });

  it("uses the local daily routine outside the follow-up window", () => {
    expect(suggestMealType(new Date("2026-08-14T16:00:00.000Z"), null)).toBe("lunch");
  });
});
