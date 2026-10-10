# Pay Engine Public API Reference (v1.0)

## `calculatePay(params: CalculatePayParams): CalculationResult`

Main entry point for computing compensation.

### Parameters

```typescript
interface CalculatePayParams {
  timeEntries: TimeEntry[];
  payRates: PayRate[];
  payPolicy: PayPolicy;
  payPeriod?: PayPeriod;
  scheduledHoursByDate?: Map<string, number> | Record<string, number>;
  options?: {
    validateEntries?: boolean;
  };
}
```

### Return Value

```typescript
interface CalculationResult {
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
```

### `EarningItem`
```typescript
interface EarningItem {
  type: "regular" | "overtime" | "double_time" | "differential" | "premium" | "bonus";
  hours: number;
  rate: Money;
  multiplier?: number;
  amount: Money;
  description: string;
}
```

### `CalculationExplanation`
```typescript
interface CalculationExplanation {
  summary: string;
  steps: {
    stepNumber: number;
    title: string;
    detail: string;
    subtotal?: string;
  }[];
  auditTrail: string[];
}
```
