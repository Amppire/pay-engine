import { Money } from "./money.ts";

export type DayOfWeekName = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface WeeklyOvertimeRule {
  type: "weekly_overtime";
  thresholdHours: number; // e.g. 40
  multiplier: number; // e.g. 1.5
  name?: string;
}

export interface DailyOvertimeRule {
  type: "daily_overtime";
  thresholdHours: number; // e.g. 8
  multiplier: number; // e.g. 1.5
  name?: string;
}

export interface DoubleTimeRule {
  type: "double_time";
  thresholdHours: number; // e.g. 12
  multiplier: number; // e.g. 2.0
  name?: string;
}

export interface WeekendDifferentialRule {
  type: "weekend_differential";
  days: DayOfWeekName[];
  amount?: Money; // fixed added $/hr
  multiplier?: number; // e.g. 1.1x or 1.25x
  mode: "hourly" | "multiplier";
  name?: string;
}

export interface NightDifferentialRule {
  type: "night_differential";
  startHour: number; // 0-23 (e.g. 18 for 6 PM)
  endHour: number; // 0-23 (e.g. 6 for 6 AM)
  amount?: Money;
  multiplier?: number;
  mode: "hourly" | "multiplier";
  name?: string;
}

export interface HolidayPremiumRule {
  type: "holiday_premium";
  holidayDates: string[]; // YYYY-MM-DD
  multiplier: number; // e.g. 1.5 or 2.0
  name?: string;
}

export interface FixedBonusRule {
  type: "fixed_bonus";
  amount: Money;
  label: string;
}

export interface ScheduledExcessOvertimeRule {
  type: "scheduled_excess_overtime";
  multiplier: number; // e.g. 1.5
  fallbackThresholdHours?: number; // if unscheduled day, default e.g. 8
  name?: string;
}

export type PayRule =
  | WeeklyOvertimeRule
  | DailyOvertimeRule
  | DoubleTimeRule
  | ScheduledExcessOvertimeRule
  | WeekendDifferentialRule
  | NightDifferentialRule
  | HolidayPremiumRule
  | FixedBonusRule;

export interface PayPolicy {
  id?: string;
  employmentId: string;
  currency: string;
  rules: PayRule[];
  roundMinutes?: number; // e.g. 15 for 15-minute rounding, or 0/null for exact
}
