import { Money } from "../models/money.ts";
import type {
  DailyOvertimeRule,
  WeeklyOvertimeRule,
  DoubleTimeRule,
  ScheduledExcessOvertimeRule,
} from "../models/rules.ts";

export interface DayWorkSummary {
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  totalHours: number;
  scheduledHours?: number;
  regularHours: number;
  dailyOvertimeHours: number;
  doubleTimeHours: number;
}

export interface OvertimeClassification {
  days: DayWorkSummary[];
  totalRegularHours: number;
  totalDailyOvertimeHours: number;
  totalWeeklyOvertimeHours: number;
  totalDoubleTimeHours: number;
  totalPayableHours: number;
}

/**
 * Classifies hours by day and week, applying daily overtime, double-time,
 * dynamic schedule-excess overtime, and weekly overtime with proper non-pyramiding rules.
 */
export function classifyHoursAndOvertime(
  dailyHoursMap: Map<string, { dayOfWeek: number; hours: number }>,
  options: {
    dailyRule?: DailyOvertimeRule;
    weeklyRule?: WeeklyOvertimeRule;
    doubleTimeRule?: DoubleTimeRule;
    scheduledExcessRule?: ScheduledExcessOvertimeRule;
    scheduledHoursByDate?: Map<string, number> | Record<string, number>;
  }
): OvertimeClassification {
  const { dailyRule, weeklyRule, doubleTimeRule, scheduledExcessRule, scheduledHoursByDate } = options;

  const days: DayWorkSummary[] = [];
  let accumulatedWeeklyStraightHours = 0;
  let totalDailyOvertimeHours = 0;
  let totalWeeklyOvertimeHours = 0;
  let totalDoubleTimeHours = 0;
  let totalRegularHours = 0;

  // Sort dates chronologically
  const sortedDates = Array.from(dailyHoursMap.keys()).sort();

  for (const date of sortedDates) {
    const entry = dailyHoursMap.get(date)!;
    const hours = entry.hours;

    let dayRegular = hours;
    let dayDailyOT = 0;
    let dayDoubleTime = 0;

    // Check if dynamic scheduled hours are configured for this date
    let schedThreshold: number | undefined;
    if (scheduledExcessRule && scheduledHoursByDate) {
      if (scheduledHoursByDate instanceof Map) {
        schedThreshold = scheduledHoursByDate.get(date);
      } else {
        schedThreshold = (scheduledHoursByDate as Record<string, number>)[date];
      }
    }

    // Apply double-time if configured
    if (doubleTimeRule && hours > doubleTimeRule.thresholdHours) {
      dayDoubleTime = hours - doubleTimeRule.thresholdHours;
      dayRegular = doubleTimeRule.thresholdHours;
    }

    // Apply dynamic scheduled excess overtime (hours exceeding scheduled amount)
    if (scheduledExcessRule && schedThreshold !== undefined) {
      if (dayRegular > schedThreshold) {
        dayDailyOT = dayRegular - schedThreshold;
        dayRegular = schedThreshold;
      }
    } else if (dailyRule && dayRegular > dailyRule.thresholdHours) {
      // Apply standard daily overtime if configured
      dayDailyOT = dayRegular - dailyRule.thresholdHours;
      dayRegular = dailyRule.thresholdHours;
    }

    // Accumulate non-overtime straight hours for weekly threshold
    let dayWeeklyOT = 0;
    if (weeklyRule) {
      const remainingWeeklyCapacity = Math.max(0, weeklyRule.thresholdHours - accumulatedWeeklyStraightHours);
      if (dayRegular > remainingWeeklyCapacity) {
        dayWeeklyOT = dayRegular - remainingWeeklyCapacity;
        dayRegular = remainingWeeklyCapacity;
      }
      accumulatedWeeklyStraightHours += dayRegular;
    }

    totalRegularHours += dayRegular;
    totalDailyOvertimeHours += dayDailyOT;
    totalWeeklyOvertimeHours += dayWeeklyOT;
    totalDoubleTimeHours += dayDoubleTime;

    days.push({
      date,
      dayOfWeek: entry.dayOfWeek,
      totalHours: hours,
      scheduledHours: schedThreshold,
      regularHours: dayRegular,
      dailyOvertimeHours: dayDailyOT + dayWeeklyOT,
      doubleTimeHours: dayDoubleTime,
    });
  }

  // Combined overtime hours (daily OT + weekly OT)
  const combinedOTHours = Math.round((totalDailyOvertimeHours + totalWeeklyOvertimeHours) * 10000) / 10000;
  const regularRounded = Math.round(totalRegularHours * 10000) / 10000;
  const doubleRounded = Math.round(totalDoubleTimeHours * 10000) / 10000;

  return {
    days,
    totalRegularHours: regularRounded,
    totalDailyOvertimeHours: Math.round(totalDailyOvertimeHours * 10000) / 10000,
    totalWeeklyOvertimeHours: Math.round(totalWeeklyOvertimeHours * 10000) / 10000,
    totalDoubleTimeHours: doubleRounded,
    totalPayableHours: Math.round((regularRounded + combinedOTHours + doubleRounded) * 10000) / 10000,
  };
}

/**
 * Calculates overtime earnings
 */
export function calculateOvertimePay(
  hours: number,
  baseRate: Money,
  multiplier: number = 1.5
): Money {
  const effectiveRateCents = Math.round(baseRate.minorUnits * multiplier);
  const totalCents = Math.round(hours * effectiveRateCents);
  return new Money(totalCents, baseRate.currency);
}
