import { Money } from "../models/money.ts";
import type { NormalizedWorkInterval } from "../models/time-entry.ts";
import type {
  WeekendDifferentialRule,
  NightDifferentialRule,
  HolidayPremiumRule,
  DayOfWeekName,
} from "../models/rules.ts";
import { msToHours, getLocalHour } from "./duration.ts";

const DAY_MAP: Record<number, DayOfWeekName> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

/**
 * Calculates additional weekend differential earnings
 */
export function calculateWeekendDifferential(
  intervals: NormalizedWorkInterval[],
  rule: WeekendDifferentialRule,
  baseRate: Money
): { hours: number; amount: Money } {
  let qualifyingHours = 0;

  for (const interval of intervals) {
    const dayName = DAY_MAP[interval.dayOfWeek];
    if (dayName && rule.days.includes(dayName)) {
      qualifyingHours += msToHours(interval.paidDurationMs);
    }
  }

  qualifyingHours = Math.round(qualifyingHours * 10000) / 10000;

  if (qualifyingHours === 0) {
    return { hours: 0, amount: Money.zero(baseRate.currency) };
  }

  let amountCents = 0;
  if (rule.mode === "hourly" && rule.amount) {
    amountCents = Math.round(qualifyingHours * rule.amount.minorUnits);
  } else if (rule.mode === "multiplier" && rule.multiplier && rule.multiplier > 1) {
    // Differential is the additional premium above straight rate: (multiplier - 1) * baseRate
    const premiumRate = Math.round(baseRate.minorUnits * (rule.multiplier - 1));
    amountCents = Math.round(qualifyingHours * premiumRate);
  }

  return {
    hours: qualifyingHours,
    amount: new Money(amountCents, baseRate.currency),
  };
}

/**
 * Calculates night / shift differential earnings
 */
export function calculateNightDifferential(
  intervals: NormalizedWorkInterval[],
  rule: NightDifferentialRule,
  baseRate: Money
): { hours: number; amount: Money } {
  let qualifyingHours = 0;

  for (const interval of intervals) {
    // Check start and end hours in interval timezone
    const startHour = getLocalHour(interval.startedAt, interval.timezone);
    const endHour = getLocalHour(interval.endedAt, interval.timezone);

    // If whole shift or majority falls within night window
    const isNight =
      rule.startHour > rule.endHour
        ? startHour >= rule.startHour || endHour <= rule.endHour // overnight window e.g. 18 to 6
        : startHour >= rule.startHour && endHour <= rule.endHour;

    if (isNight) {
      qualifyingHours += msToHours(interval.paidDurationMs);
    }
  }

  qualifyingHours = Math.round(qualifyingHours * 10000) / 10000;

  if (qualifyingHours === 0) {
    return { hours: 0, amount: Money.zero(baseRate.currency) };
  }

  let amountCents = 0;
  if (rule.mode === "hourly" && rule.amount) {
    amountCents = Math.round(qualifyingHours * rule.amount.minorUnits);
  } else if (rule.mode === "multiplier" && rule.multiplier && rule.multiplier > 1) {
    const premiumRate = Math.round(baseRate.minorUnits * (rule.multiplier - 1));
    amountCents = Math.round(qualifyingHours * premiumRate);
  }

  return {
    hours: qualifyingHours,
    amount: new Money(amountCents, baseRate.currency),
  };
}

/**
 * Calculates holiday premium earnings
 */
export function calculateHolidayPremium(
  intervals: NormalizedWorkInterval[],
  rule: HolidayPremiumRule,
  baseRate: Money
): { hours: number; amount: Money } {
  let holidayHours = 0;

  for (const interval of intervals) {
    if (rule.holidayDates.includes(interval.workDate)) {
      holidayHours += msToHours(interval.paidDurationMs);
    }
  }

  holidayHours = Math.round(holidayHours * 10000) / 10000;

  if (holidayHours === 0 || rule.multiplier <= 1) {
    return { hours: 0, amount: Money.zero(baseRate.currency) };
  }

  // Premium differential is (multiplier - 1) * baseRate
  const premiumRate = Math.round(baseRate.minorUnits * (rule.multiplier - 1));
  const amountCents = Math.round(holidayHours * premiumRate);

  return {
    hours: holidayHours,
    amount: new Money(amountCents, baseRate.currency),
  };
}
