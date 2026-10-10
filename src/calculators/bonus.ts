import { Money } from "../models/money.ts";
import type { FixedBonusRule } from "../models/rules.ts";

export function calculateBonuses(
  bonusRules: FixedBonusRule[],
  defaultCurrency: string = "USD"
): { totalBonus: Money; items: { label: string; amount: Money }[] } {
  if (!bonusRules || bonusRules.length === 0) {
    return { totalBonus: Money.zero(defaultCurrency), items: [] };
  }

  let totalCents = 0;
  const items: { label: string; amount: Money }[] = [];

  for (const rule of bonusRules) {
    totalCents += rule.amount.minorUnits;
    items.push({
      label: rule.label,
      amount: rule.amount,
    });
  }

  return {
    totalBonus: new Money(totalCents, defaultCurrency),
    items,
  };
}
