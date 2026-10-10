import { Money } from "./money.ts";

export type EarningType =
  | "regular"
  | "overtime"
  | "double_time"
  | "differential"
  | "premium"
  | "bonus";

export interface EarningItem {
  type: EarningType;
  hours: number;
  rate: Money;
  multiplier?: number;
  amount: Money;
  description: string;
  date?: string;
  ruleName?: string;
}

export interface ExplanationStep {
  stepNumber: number;
  title: string;
  detail: string;
  subtotal?: string;
}

export interface CalculationExplanation {
  summary: string;
  steps: ExplanationStep[];
  auditTrail: string[];
}

export interface CalculationResult {
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  unpaidBreakHours: number;
  paidBreakHours: number;
  grossHours: number;
  paidHours: number;

  regularEarnings: Money;
  overtimeEarnings: Money;
  doubleTimeEarnings: Money;
  differentialEarnings: Money;
  bonusEarnings: Money;
  grossEarnings: Money;

  breakdown: EarningItem[];
  explanation: CalculationExplanation;
}
