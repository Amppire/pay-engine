# @workmetrik/pay-engine

Pure, deterministic compensation and pay calculation engine for **Workmetrik** / **TimePay**.

## Features

- **Pure Domain Library:** Zero UI or database dependencies (usable by web applications, server APIs, CLIs, mobile apps, and third-party tools).
- **Exact Minor-Units Money:** Financial math strictly uses integer minor units (cents) to avoid IEEE 754 floating-point inaccuracies.
- **11-Stage Calculation Pipeline:** Interval normalization, unpaid break deduction, historical rate resolution, hours classification, overtime rules, differentials, premiums, bonuses, earnings generation, and transparent explanation generation.
- **Timezone-Aware:** Workday boundaries, overnight shifts, and week intervals are correctly evaluated in the employment's local timezone.
- **Explainable Calculations:** Transparent breakdown and human-friendly step-by-step audit explanations for all calculated pay.
- **Flexible Overtime & Differentials:**
  - Weekly overtime (e.g., >40h/week at 1.5×)
  - Daily overtime (e.g., >8h/day at 1.5×)
  - Double-time (e.g., >12h/day at 2.0×)
  - Anti-pyramiding (daily overtime hours do not double-count toward the weekly 40-hour threshold)
  - Weekend differentials (hourly bonus or multiplier)
  - Night / shift differentials
  - Holiday premiums
  - Fixed bonuses and stipends

## Installation

```bash
npm install @workmetrik/pay-engine
```

## Quick Example

```typescript
import { calculatePay, Money } from "@workmetrik/pay-engine";

const result = calculatePay({
  timeEntries: [
    {
      id: "shift-1",
      employmentId: "emp-1",
      startedAt: "2026-10-12T08:00:00Z",
      endedAt: "2026-10-12T17:00:00Z", // 9 hours
      timezone: "America/New_York",
      breaks: [
        {
          startedAt: "2026-10-12T12:00:00Z",
          endedAt: "2026-10-12T12:30:00Z", // 30 min unpaid break
          paid: false,
          category: "meal",
        },
      ],
    },
  ],
  payRates: [
    {
      employmentId: "emp-1",
      amount: Money.fromCents(2500, "USD"), // $25.00/hour
      unit: "hourly",
      currency: "USD",
      effectiveFrom: "2026-01-01",
    },
  ],
  payPolicy: {
    employmentId: "emp-1",
    currency: "USD",
    rules: [
      {
        type: "weekly_overtime",
        thresholdHours: 40,
        multiplier: 1.5,
      },
    ],
  },
});

console.log(`Paid Hours: ${result.paidHours}`);
console.log(`Gross Earnings: ${result.grossEarnings.format()}`);
console.log(result.explanation.summary);
```

## Testing

```bash
npm test
```

Runs the deterministic test suite including Section 73 boundary condition validations, overtime non-pyramiding, and overnight shifts.

## License

AGPL-3.0-or-later