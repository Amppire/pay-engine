import { Money } from "../models/money.ts";
import type { PayRate } from "../models/compensation.ts";

/**
 * Resolves the applicable pay rate for a given date (YYYY-MM-DD)
 */
export function resolveRateForDate(rates: PayRate[], dateStr: string): PayRate {
  if (!rates || rates.length === 0) {
    throw new Error(`Cannot calculate earnings because no pay rates are configured for date ${dateStr}.`);
  }

  const targetDate = dateStr.slice(0, 10);

  // Find rate where effectiveFrom <= targetDate and (effectiveTo is null or >= targetDate)
  const applicable = rates.find((rate) => {
    const fromStr = (typeof rate.effectiveFrom === "string"
      ? rate.effectiveFrom
      : rate.effectiveFrom.toISOString()
    ).slice(0, 10);

    if (targetDate < fromStr) return false;

    if (rate.effectiveTo) {
      const toStr = (typeof rate.effectiveTo === "string"
        ? rate.effectiveTo
        : rate.effectiveTo.toISOString()
      ).slice(0, 10);
      if (targetDate > toStr) return false;
    }

    return true;
  });

  if (!applicable) {
    throw new Error(`Cannot calculate earnings because no pay rate applies to ${targetDate}.`);
  }

  return applicable;
}

/**
 * Calculates regular earnings for given hours and base hourly rate
 */
export function calculateRegularPay(hours: number, rate: Money): Money {
  // hours * rate.minorUnits
  const cents = Math.round(hours * rate.minorUnits);
  return new Money(cents, rate.currency);
}
