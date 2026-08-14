export const mealTypes = [
  "breakfast",
  "morning_snack",
  "lunch",
  "afternoon_snack",
  "dinner",
  "correction",
] as const;

export type MealType = (typeof mealTypes)[number];

export type CarePlan = {
  version: number;
  correctionFactor: number;
  premealTarget: number;
  correctionTarget: number;
  lowThreshold: number;
  roundingIncrement: number;
  maxBolus: number | null;
  ratios: Record<Exclude<MealType, "correction">, number>;
};

export type DoseInput = {
  mealType: MealType;
  glucose: number;
  carbs: number;
  activeInsulin: number;
  activityAdjustmentPercent: number;
};

export type DoseResult = {
  status: "ready" | "blocked_low";
  target: number;
  ratio: number;
  mealDose: number;
  correctionDose: number;
  recommendedDose: number | null;
  limitedByMaximum: boolean;
};

function roundToIncrement(value: number, increment: number) {
  return Math.round(value / increment) * increment;
}

export function calculateDose(plan: CarePlan, input: DoseInput): DoseResult {
  if (!Number.isFinite(input.glucose) || input.glucose < 20 || input.glucose > 600) {
    throw new Error("Glucose must be between 20 and 600 mg/dL");
  }
  if (!Number.isFinite(input.carbs) || input.carbs < 0 || input.carbs > 300) {
    throw new Error("Carbohydrates must be between 0 and 300 g");
  }
  if (!Number.isFinite(input.activeInsulin) || input.activeInsulin < 0 || input.activeInsulin > 100) {
    throw new Error("Active insulin must be between 0 and 100 units");
  }
  if (
    !Number.isFinite(input.activityAdjustmentPercent) ||
    input.activityAdjustmentPercent < 0 ||
    input.activityAdjustmentPercent > 100
  ) {
    throw new Error("Activity adjustment must be between 0 and 100 percent");
  }
  if (plan.correctionFactor <= 0 || plan.roundingIncrement <= 0) {
    throw new Error("The care plan is incomplete");
  }

  const target = input.mealType === "correction" ? plan.correctionTarget : plan.premealTarget;
  const ratio = input.mealType === "correction" ? 0 : plan.ratios[input.mealType];

  if (input.glucose < plan.lowThreshold) {
    return {
      status: "blocked_low",
      target,
      ratio,
      mealDose: 0,
      correctionDose: 0,
      recommendedDose: null,
      limitedByMaximum: false,
    };
  }

  const mealDose = ratio > 0 ? input.carbs / ratio : 0;
  const correctionDose = Math.max(0, (input.glucose - target) / plan.correctionFactor);
  const afterActiveInsulin = Math.max(0, mealDose + correctionDose - input.activeInsulin);
  const afterActivity = afterActiveInsulin * (1 - input.activityAdjustmentPercent / 100);
  const rounded = Math.max(0, roundToIncrement(afterActivity, plan.roundingIncrement));
  const limitedByMaximum = plan.maxBolus !== null && rounded > plan.maxBolus;
  const recommendedDose = limitedByMaximum ? plan.maxBolus : rounded;

  return {
    status: "ready",
    target,
    ratio,
    mealDose,
    correctionDose,
    recommendedDose,
    limitedByMaximum,
  };
}

export const mealLabels: Record<MealType, string> = {
  breakfast: "Desayuno",
  morning_snack: "Colación",
  lunch: "Almuerzo",
  afternoon_snack: "Once / merienda",
  dinner: "Cena",
  correction: "Solo corrección",
};

