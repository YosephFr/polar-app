import { describe, expect, it } from "vitest";
import { calculateDose, type CarePlan } from "./calculator";

const plan: CarePlan = {
  version: 1,
  correctionFactor: 50,
  premealTarget: 100,
  correctionTarget: 150,
  lowThreshold: 70,
  roundingIncrement: 0.5,
  maxBolus: 15,
  ratios: {
    breakfast: 10,
    morning_snack: 12,
    lunch: 10,
    afternoon_snack: 12,
    dinner: 10,
  },
};

describe("calculateDose", () => {
  it("blocks the dose below the configured low threshold", () => {
    const result = calculateDose(plan, {
      mealType: "breakfast",
      glucose: 54,
      carbs: 50,
      activeInsulin: 0,
      activityAdjustmentPercent: 0,
    });
    expect(result.status).toBe("blocked_low");
    expect(result.recommendedDose).toBeNull();
  });

  it("combines meal and correction doses and rounds once", () => {
    const result = calculateDose(plan, {
      mealType: "breakfast",
      glucose: 175,
      carbs: 45,
      activeInsulin: 0,
      activityAdjustmentPercent: 0,
    });
    expect(result.mealDose).toBe(4.5);
    expect(result.correctionDose).toBe(1.5);
    expect(result.recommendedDose).toBe(6);
  });

  it("subtracts active insulin and applies the explicit activity adjustment", () => {
    const result = calculateDose(plan, {
      mealType: "lunch",
      glucose: 150,
      carbs: 60,
      activeInsulin: 1,
      activityAdjustmentPercent: 20,
    });
    expect(result.recommendedDose).toBe(5);
  });

  it("never returns a negative correction", () => {
    const result = calculateDose(plan, {
      mealType: "correction",
      glucose: 100,
      carbs: 0,
      activeInsulin: 2,
      activityAdjustmentPercent: 0,
    });
    expect(result.correctionDose).toBe(0);
    expect(result.recommendedDose).toBe(0);
  });

  it("honors the configured maximum", () => {
    const result = calculateDose(plan, {
      mealType: "dinner",
      glucose: 300,
      carbs: 250,
      activeInsulin: 0,
      activityAdjustmentPercent: 0,
    });
    expect(result.limitedByMaximum).toBe(true);
    expect(result.recommendedDose).toBe(15);
  });
});
