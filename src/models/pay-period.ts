export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly" | "custom";
export type PayPeriodStatus = "future" | "open" | "calculated" | "paid" | "reconciled";

export interface PayPeriod {
  id?: string;
  employmentId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  payDate: string; // YYYY-MM-DD
  status?: PayPeriodStatus;
}

/**
 * Checks whether an ISO date or YYYY-MM-DD string falls within a pay period (inclusive)
 */
export function isDateInPayPeriod(dateStr: string, period: PayPeriod): boolean {
  const target = dateStr.slice(0, 10);
  return target >= period.startDate && target <= period.endDate;
}
