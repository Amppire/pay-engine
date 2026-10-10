import type { PayPolicy, PayRule } from "../models/rules.ts";
import type { PayRate } from "../models/compensation.ts";

export function validatePayPolicy(policy: PayPolicy, rates?: PayRate[]): string[] {
  const issues: string[] = [];

  if (!policy.currency) {
    issues.push("PayPolicy missing currency code.");
  }

  for (const rule of policy.rules) {
    switch (rule.type) {
      case "weekly_overtime":
      case "daily_overtime":
      case "double_time":
        if (rule.thresholdHours <= 0) {
          issues.push(`${rule.type} thresholdHours must be greater than 0.`);
        }
        if (rule.multiplier <= 1.0) {
          issues.push(`${rule.type} multiplier must be greater than 1.0.`);
        }
        break;
      case "weekend_differential":
        if (!rule.days || rule.days.length === 0) {
          issues.push("weekend_differential must specify at least one day.");
        }
        break;
      case "night_differential":
        if (rule.startHour < 0 || rule.startHour > 23 || rule.endHour < 0 || rule.endHour > 23) {
          issues.push("night_differential startHour and endHour must be between 0 and 23.");
        }
        break;
    }
  }

  if (rates) {
    for (const rate of rates) {
      if (rate.amount.minorUnits < 0) {
        issues.push("Pay rate cannot be negative.");
      }
    }
  }

  return issues;
}
