import test from "node:test";
import assert from "node:assert/strict";
import { calculatePay } from "../src/pipeline/calculation-pipeline.ts";
import { resolveRateForDate } from "../src/calculators/regular-pay.ts";
import { validateTimeEntries } from "../src/validators/entry-validator.ts";
import type { PayRate } from "../src/models/compensation.ts";
import { Money } from "../src/models/money.ts";
import type { TimeEntry } from "../src/models/time-entry.ts";

test("Rate changes mid-year: selects appropriate historical rate per Section 16", () => {
  const rates: PayRate[] = [
    {
      employmentId: "emp-1",
      amount: Money.fromCents(2400, "USD"), // $24.00
      unit: "hourly",
      currency: "USD",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-06-30",
    },
    {
      employmentId: "emp-1",
      amount: Money.fromCents(2600, "USD"), // $26.00
      unit: "hourly",
      currency: "USD",
      effectiveFrom: "2026-07-01",
      effectiveTo: null,
    },
  ];

  const rateJune = resolveRateForDate(rates, "2026-06-15");
  assert.equal(rateJune.amount.minorUnits, 2400);

  const rateJuly = resolveRateForDate(rates, "2026-07-01");
  assert.equal(rateJuly.amount.minorUnits, 2600);

  const rateOctober = resolveRateForDate(rates, "2026-10-12");
  assert.equal(rateOctober.amount.minorUnits, 2600);
});

test("Validation catches overlapping time entries", () => {
  const entries: TimeEntry[] = [
    {
      id: "entry-1",
      employmentId: "emp-1",
      startedAt: "2026-10-12T08:00:00Z",
      endedAt: "2026-10-12T16:00:00Z",
      timezone: "UTC",
    },
    {
      id: "entry-2",
      employmentId: "emp-1",
      startedAt: "2026-10-12T15:00:00Z", // Overlaps by 1 hour
      endedAt: "2026-10-12T20:00:00Z",
      timezone: "UTC",
    },
  ];

  const errors = validateTimeEntries(entries);
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.message.includes("Overlapping shifts detected")));
});

test("Overnight shift crossing midnight is accounted for correctly", () => {
  const entries: TimeEntry[] = [
    {
      id: "overnight-1",
      employmentId: "emp-1",
      startedAt: "2026-10-12T22:00:00Z",
      endedAt: "2026-10-13T06:00:00Z", // 8 hours
      timezone: "UTC",
    },
  ];

  const rates: PayRate[] = [
    {
      employmentId: "emp-1",
      amount: Money.fromCents(2000, "USD"),
      unit: "hourly",
      currency: "USD",
      effectiveFrom: "2026-01-01",
    },
  ];

  const result = calculatePay({
    timeEntries: entries,
    payRates: rates,
    payPolicy: {
      employmentId: "emp-1",
      currency: "USD",
      rules: [],
    },
  });

  assert.equal(result.paidHours, 8);
  assert.equal(result.grossEarnings.minorUnits, 16000); // 8h * $20 = $160.00
});
