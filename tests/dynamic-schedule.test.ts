import test from "node:test";
import assert from "node:assert/strict";
import { classifyHoursAndOvertime } from "../src/calculators/overtime.ts";
import { calculatePay } from "../src/pipeline/calculation-pipeline.ts";
import { Money } from "../src/models/money.ts";
import type { TimeEntry } from "../src/models/time-entry.ts";
import type { PayRate } from "../src/models/compensation.ts";
import type { PayPolicy } from "../src/models/rules.ts";

test("Dynamic schedule: overtime is calculated when hours exceed scheduled amount for the day", () => {
  // Monday: scheduled 6.0h, worked 8.5h -> 6.0 regular, 2.5 overtime
  // Tuesday: scheduled 4.0h, worked 7.0h -> 4.0 regular, 3.0 overtime
  // Wednesday: scheduled 8.0h, worked 8.0h -> 8.0 regular, 0.0 overtime
  const dailyHoursMap = new Map<string, { dayOfWeek: number; hours: number }>();
  dailyHoursMap.set("2026-10-12", { dayOfWeek: 1, hours: 8.5 });
  dailyHoursMap.set("2026-10-13", { dayOfWeek: 2, hours: 7.0 });
  dailyHoursMap.set("2026-10-14", { dayOfWeek: 3, hours: 8.0 });

  const scheduledHoursByDate = new Map<string, number>();
  scheduledHoursByDate.set("2026-10-12", 6.0);
  scheduledHoursByDate.set("2026-10-13", 4.0);
  scheduledHoursByDate.set("2026-10-14", 8.0);

  const classification = classifyHoursAndOvertime(dailyHoursMap, {
    scheduledExcessRule: {
      type: "scheduled_excess_overtime",
      multiplier: 1.5,
    },
    scheduledHoursByDate,
  });

  assert.equal(classification.totalRegularHours, 18.0);
  assert.equal(classification.totalDailyOvertimeHours, 5.5);
  assert.equal(classification.totalPayableHours, 23.5);

  const mon = classification.days.find((d) => d.date === "2026-10-12");
  assert.equal(mon?.regularHours, 6.0);
  assert.equal(mon?.dailyOvertimeHours, 2.5);
  assert.equal(mon?.scheduledHours, 6.0);

  const tue = classification.days.find((d) => d.date === "2026-10-13");
  assert.equal(tue?.regularHours, 4.0);
  assert.equal(tue?.dailyOvertimeHours, 3.0);
  assert.equal(tue?.scheduledHours, 4.0);

  const wed = classification.days.find((d) => d.date === "2026-10-14");
  assert.equal(wed?.regularHours, 8.0);
  assert.equal(wed?.dailyOvertimeHours, 0.0);
  assert.equal(wed?.scheduledHours, 8.0);
});

test("Full pipeline executes dynamic scheduled excess overtime calculation", () => {
  const timeEntries: TimeEntry[] = [
    {
      id: "shift-1",
      employmentId: "emp-1",
      startedAt: "2026-10-12T07:30:00Z", // Worker started early and stayed late
      endedAt: "2026-10-12T16:00:00Z",   // 8.5 hours total
      timezone: "UTC",
    },
  ];

  const payRates: PayRate[] = [
    {
      employmentId: "emp-1",
      amount: Money.fromCents(2000, "USD"), // $20.00/hr
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
        type: "scheduled_excess_overtime",
        multiplier: 1.5,
      },
    ],
  };

  const result = calculatePay({
    timeEntries,
    payRates,
    payPolicy,
    scheduledHoursByDate: {
      "2026-10-12": 6.0, // Scheduled for 6 hours
    },
  });

  // 8.5h worked: 6.0h regular ($120.00) + 2.5h overtime @ $30/hr ($75.00) = $195.00 (19500 cents)
  assert.equal(result.paidHours, 8.5);
  assert.equal(result.regularHours, 6.0);
  assert.equal(result.overtimeHours, 2.5);
  assert.equal(result.regularEarnings.minorUnits, 12000);
  assert.equal(result.overtimeEarnings.minorUnits, 7500);
  assert.equal(result.grossEarnings.minorUnits, 19500);
});
