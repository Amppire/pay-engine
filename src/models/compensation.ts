import { Money } from "./money.ts";

export type RateUnit = "hourly" | "salary" | "daily" | "shift";
export type EmploymentType = "hourly" | "salary" | "contractor" | "freelance" | "custom";

export interface PayRate {
  id?: string;
  employmentId: string;
  amount: Money;
  unit: RateUnit;
  currency: string;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
}

export interface SalaryProfile {
  annualSalary: Money;
  expectedWeeklyHours: number;
  payFrequency: "weekly" | "biweekly" | "semimonthly" | "monthly";
}

/**
 * Converts a salary profile into derived hourly and periodic figures
 */
export function deriveSalaryFigures(profile: SalaryProfile): {
  periodicGross: Money;
  effectiveHourlyRate: Money;
  expectedAnnualHours: number;
} {
  const annualHours = profile.expectedWeeklyHours * 52;
  const effectiveHourlyCents = Math.round(profile.annualSalary.minorUnits / annualHours);
  const effectiveHourlyRate = new Money(effectiveHourlyCents, profile.annualSalary.currency);

  let periodsPerYear: number;
  switch (profile.payFrequency) {
    case "weekly":
      periodsPerYear = 52;
      break;
    case "biweekly":
      periodsPerYear = 26;
      break;
    case "semimonthly":
      periodsPerYear = 24;
      break;
    case "monthly":
      periodsPerYear = 12;
      break;
  }

  const periodicCents = Math.round(profile.annualSalary.minorUnits / periodsPerYear);
  const periodicGross = new Money(periodicCents, profile.annualSalary.currency);

  return {
    periodicGross,
    effectiveHourlyRate,
    expectedAnnualHours: annualHours,
  };
}
