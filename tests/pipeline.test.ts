import test from "node:test";
import assert from "node:assert/strict";
import { calculatePay } from "../src/pipeline/calculation-pipeline.ts";
import type { TimeEntry } from "../src/models/time-entry.ts";
import type { PayRate } from "../src/models/compensation.ts";
import type { PayPolicy } from "../src/models/rules.ts";
import { Money } from "../src/models/money.ts";

test("calculatePay runs full pipeline and generates explainable breakdown", () => {
  const timeEntries: TimeEntry[] = [
    {
      id: "e1",
      employmentId: "emp-1",
      startedAt: "2026-10-12T08:00:00Z",
      endedAt: "2026-10-12T17:00:00Z", // 9 hours
      timezone: "UTC",
      breaks: [
        {
          startedAt: "2026-10-12T12:00:00Z",
          endedAt: "2026-10-12T13:00:00Z", // 1 hour unpaid break
          paid: false,
          category: "meal",
        },
      ],
    },
    {
      id: "e2",
      employmentId: "emp-1",
      startedAt: "2026-10-13T08:00:00Z",
      endedAt: "2026-10-13T16:00:00Z", // 8 hours (0 break)
      timezone: "UTC",
    },
  ];

  const payRates: PayRate[] = [
    {
      employmentId: "emp-1",
      amount: Money.fromCents(2500, "USD"), // $25.00/hr
      unit: "hourly",
      currency: "USD",
      effectiveFrom: "2026-01-01",
    },
  ];

  const payPolicy: PayPolicy = {
    employmentId: "emp-1",
    currency: "USD",
    rules: [
      {
        type: "weekly_overtime",
        thresholdHours: 40,
        multiplier: 1.5,
      },
    ],
  };

  const result = calculatePay({
    timeEntries,
    payRates,
    payPolicy,
  });

  // e1: 9h - 1h unpaid break = 8h paid
  // e2: 8h paid
  // Total paid = 16h
  // Gross earnings: 16h * $25 = $400.00 (40000 cents)
  assert.equal(result.paidHours, 16);
  assert.equal(result.regularHours, 16);
  assert.equal(result.overtimeHours, 0);
  assert.equal(result.unpaidBreakHours, 1);
  assert.equal(result.grossEarnings.minorUnits, 40000);
  assert.equal(result.regularEarnings.minorUnits, 40000);

  // Validate explainable steps
  assert.ok(result.explanation.steps.length > 0);
  assert.ok(result.explanation.summary.includes("$400.00"));
});

test("calculatePay returns zero figures when no entries are given", () => {
  const result = calculatePay({
    timeEntries: [],
    payRates: [],
    payPolicy: {
      employmentId: "emp-1",
      currency: "USD",
      rules: [],
    },
  });

  assert.equal(result.paidHours, 0);
  assert.equal(result.grossEarnings.minorUnits, 0);
  assert.equal(result.breakdown.length, 0);
});
