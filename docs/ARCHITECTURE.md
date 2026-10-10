# Pay Engine Architecture & Design Specification (v1.0)

## 1. Overview & Principles

The Pay Engine (`@workmetrik/pay-engine`) is an independent, pure TypeScript compensation calculation library. It is strictly isolated from application state, database implementations, web APIs, and UI frameworks.

### Pure Domain Philosophy
- **Zero Runtime Dependencies:** No external runtime libraries, ensuring zero supply-chain risk and lightweight execution.
- **Exact Minor Units Math (Section 75):** Monies are represented as integer minor units (e.g. cents) via the `Money` value object. Floating-point arithmetic is never used for currency.
- **Timezone Awareness (Section 74):** Workday boundaries and week boundaries are always evaluated in the employment's configured IANA timezone rather than UTC.
- **Explainable Calculations (Section 3.5 & 99):** Every calculation returns a human-auditable breakdown and step-by-step mathematical explanation.

---

## 2. Directory Structure

```text
pay-engine/
├── src/
│   ├── index.ts                     # Public API barrel export
│   ├── models/
│   │   ├── money.ts                 # Integer minor units Money value object
│   │   ├── time-entry.ts            # TimeEntry, Break, NormalizedWorkInterval
│   │   ├── compensation.ts          # PayRate, RateUnit, SalaryProfile
│   │   ├── pay-period.ts            # PayPeriod interval and date containment
│   │   ├── rules.ts                 # Serializable overtime, differential, premium rules
│   │   └── result.ts                # CalculationResult, EarningItem, Explanation
│   ├── calculators/
│   │   ├── duration.ts              # Normalization, unpaid break subtraction, timezone dates
│   │   ├── regular-pay.ts           # Effective date rate resolution, base earnings
│   │   ├── overtime.ts              # Daily OT, weekly OT, double-time, non-pyramiding
│   │   ├── differential.ts          # Weekend, night shift, and holiday premiums
│   │   └── bonus.ts                 # Fixed bonuses and allowances
│   ├── validators/
│   │   ├── entry-validator.ts       # Shift overlap and bounds validation
│   │   └── policy-validator.ts      # Policy thresholds and rates validation
│   ├── explanations/
│   │   └── calculation-explanation.ts # Human-auditable calculation steps builder
│   └── pipeline/
│       └── calculation-pipeline.ts  # 11-stage deterministic calculation orchestrator
└── tests/
    ├── money.test.ts
    ├── duration.test.ts
    ├── overtime.test.ts
    ├── differentials.test.ts
    ├── pipeline.test.ts
    └── boundary-conditions.test.ts
```

---

## 3. Core Domain Models

### `Money`
```typescript
class Money {
  readonly minorUnits: number; // e.g. 2510 for $25.10
  readonly currency: string;   // e.g. 'USD'

  static fromCents(cents: number, currency?: string): Money;
  static fromMajor(major: number, currency?: string): Money;
  add(other: Money): Money;
  subtract(other: Money): Money;
  multiply(factor: number): Money;
  divide(divisor: number): Money;
  format(locale?: string): string;
}
```

### `TimeEntry` & `Break`
```typescript
interface Break {
  id?: string;
  startedAt: Date | string;
  endedAt: Date | string;
  paid: boolean;
  category: "meal" | "rest" | "personal" | "custom";
}

interface TimeEntry {
  id: string;
  employmentId: string;
  startedAt: Date | string;
  endedAt: Date | string;
  timezone: string;
  breaks?: Break[];
  category?: string;
}
```

### `PayPolicy`
```typescript
interface PayPolicy {
  employmentId: string;
  currency: string;
  rules: PayRule[];
  roundMinutes?: number;
}
```

---

## 4. FLSA Overtime Non-Pyramiding Rule

Under standard labor standards (e.g., FLSA), hours already compensated at daily overtime or double-time do not double-count toward the weekly 40-hour overtime threshold.

For example, an employee working five 10-hour shifts:
- Each day has 8 straight hours + 2 daily overtime hours.
- Total accumulated straight hours over the week = $5 \times 8 = 40$ hours.
- The 40-hour weekly threshold is not exceeded by remaining straight hours, ensuring the employee receives 40 regular hours + 10 daily overtime hours, avoiding double-charging 20 overtime hours.
