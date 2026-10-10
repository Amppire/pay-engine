import test from "node:test";
import assert from "node:assert/strict";
import { classifyHoursAndOvertime, calculateOvertimePay } from "../src/calculators/overtime.ts";
import { calculateRegularPay } from "../src/calculators/regular-pay.ts";
import { Money } from "../src/models/money.ts";

test("Section 73 deterministic test: 45 hours worked, $25/hr, 40h weekly OT threshold", () => {
  // Mon to Fri, 9 hours each day = 45 hours
  const dailyHoursMap = new Map<string, { dayOfWeek: number; hours: number }>();
  dailyHoursMap.set("2026-10-12", { dayOfWeek: 1, hours: 9 });
  dailyHoursMap.set("2026-10-13", { dayOfWeek: 2, hours: 9 });
  dailyHoursMap.set("2026-10-14", { dayOfWeek: 3, hours: 9 });
  dailyHoursMap.set("2026-10-15", { dayOfWeek: 4, hours: 9 });
  dailyHoursMap.set("2026-10-16", { dayOfWeek: 5, hours: 9 });

  const classification = classifyHoursAndOvertime(dailyHoursMap, {
    weeklyRule: {
      type: "weekly_overtime",
      thresholdHours: 40,
      multiplier: 1.5,
    },
  });

  assert.equal(classification.totalRegularHours, 40);
  assert.equal(classification.totalWeeklyOvertimeHours, 5);

  const rate = Money.fromCents(2500, "USD"); // $25.00
  const regularPay = calculateRegularPay(classification.totalRegularHours, rate);
  const otPay = calculateOvertimePay(classification.totalWeeklyOvertimeHours, rate, 1.5);
  const grossPay = regularPay.add(otPay);

  // Expect:
  // Regular: $1,000 (100000 cents)
  // OT: $187.50 (18750 cents)
  // Gross: $1,187.50 (118750 cents)
  assert.equal(regularPay.minorUnits, 100000);
  assert.equal(otPay.minorUnits, 18750);
  assert.equal(grossPay.minorUnits, 118750);
});

test("Daily overtime & non-pyramiding: 5 days of 10h = 40h regular + 10h daily OT", () => {
  const dailyHoursMap = new Map<string, { dayOfWeek: number; hours: number }>();
  dailyHoursMap.set("2026-10-12", { dayOfWeek: 1, hours: 10 });
  dailyHoursMap.set("2026-10-13", { dayOfWeek: 2, hours: 10 });
  dailyHoursMap.set("2026-10-14", { dayOfWeek: 3, hours: 10 });
  dailyHoursMap.set("2026-10-15", { dayOfWeek: 4, hours: 10 });
  dailyHoursMap.set("2026-10-16", { dayOfWeek: 5, hours: 10 });

  const classification = classifyHoursAndOvertime(dailyHoursMap, {
    dailyRule: {
      type: "daily_overtime",
      thresholdHours: 8,
      multiplier: 1.5,
    },
    weeklyRule: {
      type: "weekly_overtime",
      thresholdHours: 40,
      multiplier: 1.5,
    },
  });

  // Daily OT is 2h per day = 10h total
  // Straight hours are 8h per day = 40h total (does not trigger additional weekly OT)
  assert.equal(classification.totalRegularHours, 40);
  assert.equal(classification.totalDailyOvertimeHours, 10);
  assert.equal(classification.totalWeeklyOvertimeHours, 0);
  assert.equal(classification.totalPayableHours, 50);
});

test("Double time: shift with 14 hours (>8h OT, >12h double time)", () => {
  const dailyHoursMap = new Map<string, { dayOfWeek: number; hours: number }>();
  dailyHoursMap.set("2026-10-12", { dayOfWeek: 1, hours: 14 });

  const classification = classifyHoursAndOvertime(dailyHoursMap, {
    dailyRule: {
      type: "daily_overtime",
      thresholdHours: 8,
      multiplier: 1.5,
    },
    doubleTimeRule: {
      type: "double_time",
      thresholdHours: 12,
      multiplier: 2.0,
    },
  });

  // 14 hours total:
  // 8h regular, 4h daily OT (hours 8-12), 2h double-time (hours 12-14)
  assert.equal(classification.totalRegularHours, 8);
  assert.equal(classification.totalDailyOvertimeHours, 4);
  assert.equal(classification.totalDoubleTimeHours, 2);
  assert.equal(classification.totalPayableHours, 14);
});
