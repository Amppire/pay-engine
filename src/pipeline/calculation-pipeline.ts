import { Money } from "../models/money.ts";
import type { TimeEntry, NormalizedWorkInterval } from "../models/time-entry.ts";
import type { PayRate } from "../models/compensation.ts";
import type {
  PayPolicy,
  WeeklyOvertimeRule,
  DailyOvertimeRule,
  DoubleTimeRule,
  ScheduledExcessOvertimeRule,
  WeekendDifferentialRule,
  NightDifferentialRule,
  HolidayPremiumRule,
  FixedBonusRule,
} from "../models/rules.ts";
import type { PayPeriod } from "../models/pay-period.ts";
import type { CalculationResult, EarningItem } from "../models/result.ts";
import { normalizeTimeEntry, msToHours } from "../calculators/duration.ts";
import { resolveRateForDate, calculateRegularPay } from "../calculators/regular-pay.ts";
import { classifyHoursAndOvertime, calculateOvertimePay } from "../calculators/overtime.ts";
import {
  calculateWeekendDifferential,
  calculateNightDifferential,
  calculateHolidayPremium,
} from "../calculators/differential.ts";
import { calculateBonuses } from "../calculators/bonus.ts";
import { validateTimeEntries } from "../validators/entry-validator.ts";
import { buildCalculationExplanation } from "../explanations/calculation-explanation.ts";

export interface CalculatePayParams {
  timeEntries: TimeEntry[];
  payRates: PayRate[];
  payPolicy: PayPolicy;
  payPeriod?: PayPeriod;
  scheduledHoursByDate?: Map<string, number> | Record<string, number>;
  options?: {
    validateEntries?: boolean;
  };
}

/**
 * 11-Stage Pure Calculation Pipeline
 */
export function calculatePay(params: CalculatePayParams): CalculationResult {
  const { timeEntries, payRates, payPolicy, payPeriod, options } = params;

  // Stage 1 & Validator: Entry validation
  if (options?.validateEntries !== false) {
    const validationErrors = validateTimeEntries(timeEntries);
    if (validationErrors.length > 0) {
      throw new Error(`Time entry validation failed: ${validationErrors.map((e) => e.message).join("; ")}`);
    }
  }

  const currency = payPolicy.currency || payRates[0]?.currency || "USD";

  if (timeEntries.length === 0) {
    const zeroMoney = Money.zero(currency);
    return {
      regularHours: 0,
      overtimeHours: 0,
      doubleTimeHours: 0,
      unpaidBreakHours: 0,
      paidBreakHours: 0,
      grossHours: 0,
      paidHours: 0,
      regularEarnings: zeroMoney,
      overtimeEarnings: zeroMoney,
      doubleTimeEarnings: zeroMoney,
      differentialEarnings: zeroMoney,
      bonusEarnings: zeroMoney,
      grossEarnings: zeroMoney,
      breakdown: [],
      explanation: {
        summary: "No time entries recorded for this calculation.",
        steps: [],
        auditTrail: ["No entries provided."],
      },
    };
  }

  // Stage 2 & 3: Normalize intervals & subtract unpaid breaks
  const normalizedIntervals: NormalizedWorkInterval[] = [];
  let totalGrossMs = 0;
  let totalUnpaidBreakMs = 0;
  let totalPaidBreakMs = 0;

  for (const entry of timeEntries) {
    const norm = normalizeTimeEntry(entry);
    normalizedIntervals.push(norm);
    totalGrossMs += norm.grossDurationMs;
    totalUnpaidBreakMs += norm.unpaidBreakDurationMs;
    totalPaidBreakMs += norm.paidBreakDurationMs;
  }

  // Filter intervals if payPeriod provided
  const activeIntervals = payPeriod
    ? normalizedIntervals.filter((int) => int.workDate >= payPeriod.startDate && int.workDate <= payPeriod.endDate)
    : normalizedIntervals;

  // Group paid hours by date for daily & weekly evaluation
  const dailyHoursMap = new Map<string, { dayOfWeek: number; hours: number }>();
  for (const int of activeIntervals) {
    const current = dailyHoursMap.get(int.workDate) || { dayOfWeek: int.dayOfWeek, hours: 0 };
    current.hours += msToHours(int.paidDurationMs);
    dailyHoursMap.set(int.workDate, current);
  }

  // Extract relevant rules from policy
  const weeklyRule = payPolicy.rules.find((r): r is WeeklyOvertimeRule => r.type === "weekly_overtime");
  const dailyRule = payPolicy.rules.find((r): r is DailyOvertimeRule => r.type === "daily_overtime");
  const doubleTimeRule = payPolicy.rules.find((r): r is DoubleTimeRule => r.type === "double_time");
  const scheduledExcessRule = payPolicy.rules.find(
    (r): r is ScheduledExcessOvertimeRule => r.type === "scheduled_excess_overtime"
  );
  const weekendRule = payPolicy.rules.find((r): r is WeekendDifferentialRule => r.type === "weekend_differential");
  const nightRule = payPolicy.rules.find((r): r is NightDifferentialRule => r.type === "night_differential");
  const holidayRule = payPolicy.rules.find((r): r is HolidayPremiumRule => r.type === "holiday_premium");
  const bonusRules = payPolicy.rules.filter((r): r is FixedBonusRule => r.type === "fixed_bonus");

  // Stage 4, 5, 6: Classify hours & apply overtime rules
  const classification = classifyHoursAndOvertime(dailyHoursMap, {
    dailyRule,
    weeklyRule,
    doubleTimeRule,
    scheduledExcessRule,
    scheduledHoursByDate: params.scheduledHoursByDate,
  });

  const referenceDate = activeIntervals[0]?.workDate || new Date().toISOString().slice(0, 10);
  const baseRate = resolveRateForDate(payRates, referenceDate).amount;

  // Calculate earnings for each classified bucket
  const regularEarnings = calculateRegularPay(classification.totalRegularHours, baseRate);

  const combinedOvertimeHours =
    Math.round((classification.totalDailyOvertimeHours + classification.totalWeeklyOvertimeHours) * 10000) / 10000;
  const otMultiplier = scheduledExcessRule?.multiplier || weeklyRule?.multiplier || dailyRule?.multiplier || 1.5;
  const overtimeEarnings = calculateOvertimePay(combinedOvertimeHours, baseRate, otMultiplier);

  const dtMultiplier = doubleTimeRule?.multiplier || 2.0;
  const doubleTimeEarnings = calculateOvertimePay(classification.totalDoubleTimeHours, baseRate, dtMultiplier);

  // Stage 7 & 8: Differentials & Premiums
  let differentialEarnings = Money.zero(currency);
  const breakdown: EarningItem[] = [];

  // Regular hours breakdown item
  if (classification.totalRegularHours > 0) {
    breakdown.push({
      type: "regular",
      hours: classification.totalRegularHours,
      rate: baseRate,
      amount: regularEarnings,
      description: "Regular Hours",
    });
  }

  // Overtime breakdown item
  if (combinedOvertimeHours > 0) {
    const effectiveOtRate = new Money(Math.round(baseRate.minorUnits * otMultiplier), currency);
    breakdown.push({
      type: "overtime",
      hours: combinedOvertimeHours,
      rate: effectiveOtRate,
      multiplier: otMultiplier,
      amount: overtimeEarnings,
      description: `Overtime (${otMultiplier}×)`,
    });
  }

  // Double time breakdown item
  if (classification.totalDoubleTimeHours > 0) {
    const effectiveDtRate = new Money(Math.round(baseRate.minorUnits * dtMultiplier), currency);
    breakdown.push({
      type: "double_time",
      hours: classification.totalDoubleTimeHours,
      rate: effectiveDtRate,
      multiplier: dtMultiplier,
      amount: doubleTimeEarnings,
      description: `Double Time (${dtMultiplier}×)`,
    });
  }

  // Apply Weekend Differential
  if (weekendRule) {
    const weekendRes = calculateWeekendDifferential(activeIntervals, weekendRule, baseRate);
    if (!weekendRes.amount.isZero()) {
      differentialEarnings = differentialEarnings.add(weekendRes.amount);
      breakdown.push({
        type: "differential",
        hours: weekendRes.hours,
        rate: baseRate,
        amount: weekendRes.amount,
        description: `Weekend Differential (${weekendRule.days.join(", ")})`,
      });
    }
  }

  // Apply Night Differential
  if (nightRule) {
    const nightRes = calculateNightDifferential(activeIntervals, nightRule, baseRate);
    if (!nightRes.amount.isZero()) {
      differentialEarnings = differentialEarnings.add(nightRes.amount);
      breakdown.push({
        type: "differential",
        hours: nightRes.hours,
        rate: baseRate,
        amount: nightRes.amount,
        description: `Night Differential (${nightRule.startHour}:00 - ${nightRule.endHour}:00)`,
      });
    }
  }

  // Apply Holiday Premium
  if (holidayRule) {
    const holidayRes = calculateHolidayPremium(activeIntervals, holidayRule, baseRate);
    if (!holidayRes.amount.isZero()) {
      differentialEarnings = differentialEarnings.add(holidayRes.amount);
      breakdown.push({
        type: "premium",
        hours: holidayRes.hours,
        rate: baseRate,
        amount: holidayRes.amount,
        description: `Holiday Premium (${holidayRule.multiplier}×)`,
      });
    }
  }

  // Stage 9: Apply Bonuses
  const bonusRes = calculateBonuses(bonusRules, currency);
  for (const b of bonusRes.items) {
    breakdown.push({
      type: "bonus",
      hours: 0,
      rate: b.amount,
      amount: b.amount,
      description: `Bonus: ${b.label}`,
    });
  }

  // Stage 10: Generate Gross Earnings
  const grossEarnings = regularEarnings
    .add(overtimeEarnings)
    .add(doubleTimeEarnings)
    .add(differentialEarnings)
    .add(bonusRes.totalBonus);

  const unpaidBreakHours = msToHours(totalUnpaidBreakMs);
  const paidBreakHours = msToHours(totalPaidBreakMs);
  const grossHours = msToHours(totalGrossMs);
  const paidHours = classification.totalPayableHours;

  // Stage 11: Produce Calculation Explanation
  const explanation = buildCalculationExplanation({
    regularHours: classification.totalRegularHours,
    regularRate: baseRate,
    regularEarnings,
    overtimeHours: combinedOvertimeHours,
    overtimeRate: new Money(Math.round(baseRate.minorUnits * otMultiplier), currency),
    overtimeEarnings,
    doubleTimeHours: classification.totalDoubleTimeHours,
    doubleTimeEarnings,
    differentialEarnings,
    bonusEarnings: bonusRes.totalBonus,
    grossEarnings,
    breakdown,
    unpaidBreakHours,
    paidBreakHours,
  });

  return {
    regularHours: classification.totalRegularHours,
    overtimeHours: combinedOvertimeHours,
    doubleTimeHours: classification.totalDoubleTimeHours,
    unpaidBreakHours,
    paidBreakHours,
    grossHours,
    paidHours,
    regularEarnings,
    overtimeEarnings,
    doubleTimeEarnings,
    differentialEarnings,
    bonusEarnings: bonusRes.totalBonus,
    grossEarnings,
    breakdown,
    explanation,
  };
}
