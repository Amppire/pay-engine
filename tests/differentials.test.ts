import test from "node:test";
import assert from "node:assert/strict";
import { calculateWeekendDifferential, calculateNightDifferential } from "../src/calculators/differential.ts";
import { normalizeTimeEntry } from "../src/calculators/duration.ts";
import { Money } from "../src/models/money.ts";
import type { TimeEntry } from "../src/models/time-entry.ts";

test("Weekend differential adds hourly premium on Saturday/Sunday", () => {
  // Saturday shift: 2026-10-17
  const entry: TimeEntry = {
    id: "sat-1",
    employmentId: "emp-1",
    startedAt: "2026-10-17T09:00:00Z",
    endedAt: "2026-10-17T17:00:00Z", // 8 hours
    timezone: "UTC",
  };

  const norm = normalizeTimeEntry(entry);
  const baseRate = Money.fromCents(2000, "USD"); // $20/hr

  const res = calculateWeekendDifferential([norm], {
    type: "weekend_differential",
    days: ["SATURDAY", "SUNDAY"],
    amount: Money.fromCents(250, "USD"), // +$2.50/hr
    mode: "hourly",
  }, baseRate);

  assert.equal(res.hours, 8);
  assert.equal(res.amount.minorUnits, 2000); // 8h * $2.50 = $20.00 (2000 cents)
});

test("Night differential applies to overnight shifts", () => {
  const entry: TimeEntry = {
    id: "night-1",
    employmentId: "emp-1",
    startedAt: "2026-10-12T20:00:00Z",
    endedAt: "2026-10-13T04:00:00Z", // 8 hours
    timezone: "UTC",
  };

  const norm = normalizeTimeEntry(entry);
  const baseRate = Money.fromCents(3000, "USD"); // $30/hr

  const res = calculateNightDifferential([norm], {
    type: "night_differential",
    startHour: 18,
    endHour: 6,
    amount: Money.fromCents(300, "USD"), // +$3.00/hr
    mode: "hourly",
  }, baseRate);

  assert.equal(res.hours, 8);
  assert.equal(res.amount.minorUnits, 2400); // 8h * $3.00 = $24.00
});
