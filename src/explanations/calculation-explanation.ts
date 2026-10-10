import { Money } from "../models/money.ts";
import type { CalculationExplanation, ExplanationStep, EarningItem } from "../models/result.ts";

export function buildCalculationExplanation(params: {
  regularHours: number;
  regularRate: Money;
  regularEarnings: Money;
  overtimeHours: number;
  overtimeRate?: Money;
  overtimeEarnings: Money;
  doubleTimeHours: number;
  doubleTimeEarnings: Money;
  differentialEarnings: Money;
  bonusEarnings: Money;
  grossEarnings: Money;
  breakdown: EarningItem[];
  unpaidBreakHours: number;
  paidBreakHours: number;
}): CalculationExplanation {
  const steps: ExplanationStep[] = [];
  const auditTrail: string[] = [];

  let stepCount = 1;

  // Step 1: Base Regular Hours
  steps.push({
    stepNumber: stepCount++,
    title: "Regular Hours",
    detail: `${params.regularHours.toFixed(2)}h × ${params.regularRate.format()} = ${params.regularEarnings.format()}`,
    subtotal: params.regularEarnings.format(),
  });
  auditTrail.push(
    `Calculated ${params.regularHours.toFixed(2)} regular hours at ${params.regularRate.format()}/hr = ${params.regularEarnings.format()}`
  );

  // Step 2: Overtime
  if (params.overtimeHours > 0) {
    const otRateStr = params.overtimeRate ? params.overtimeRate.format() : `${(params.regularRate.majorUnits * 1.5).toFixed(2)}`;
    steps.push({
      stepNumber: stepCount++,
      title: "Overtime Hours",
      detail: `${params.overtimeHours.toFixed(2)}h × ${otRateStr} = ${params.overtimeEarnings.format()}`,
      subtotal: params.overtimeEarnings.format(),
    });
    auditTrail.push(
      `Calculated ${params.overtimeHours.toFixed(2)} overtime hours = ${params.overtimeEarnings.format()}`
    );
  }

  // Step 3: Double Time
  if (params.doubleTimeHours > 0) {
    steps.push({
      stepNumber: stepCount++,
      title: "Double-Time Hours",
      detail: `${params.doubleTimeHours.toFixed(2)}h = ${params.doubleTimeEarnings.format()}`,
      subtotal: params.doubleTimeEarnings.format(),
    });
    auditTrail.push(
      `Calculated ${params.doubleTimeHours.toFixed(2)} double-time hours = ${params.doubleTimeEarnings.format()}`
    );
  }

  // Step 4: Differentials & Premiums
  if (!params.differentialEarnings.isZero()) {
    steps.push({
      stepNumber: stepCount++,
      title: "Shift & Weekend Differentials",
      detail: `Additional premiums applied = ${params.differentialEarnings.format()}`,
      subtotal: params.differentialEarnings.format(),
    });
    auditTrail.push(`Applied shift/weekend differentials: ${params.differentialEarnings.format()}`);
  }

  // Step 5: Bonuses
  if (!params.bonusEarnings.isZero()) {
    steps.push({
      stepNumber: stepCount++,
      title: "Bonuses & Allowances",
      detail: `Stipends and fixed bonuses = ${params.bonusEarnings.format()}`,
      subtotal: params.bonusEarnings.format(),
    });
    auditTrail.push(`Applied bonuses/stipends: ${params.bonusEarnings.format()}`);
  }

  // Breaks summary
  if (params.unpaidBreakHours > 0) {
    auditTrail.push(`Subtracted ${params.unpaidBreakHours.toFixed(2)} hours of unpaid breaks.`);
  }

  const summary = `Total expected gross: ${params.grossEarnings.format()} across ${params.breakdown.reduce((acc, b) => acc + b.hours, 0).toFixed(2)} compensated hours.`;

  return {
    summary,
    steps,
    auditTrail,
  };
}
