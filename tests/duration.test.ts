import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTimeEntry, msToHours } from "../src/calculators/duration.ts";
import type { TimeEntry } from "../src/models/time-entry.ts";

test("Calculates gross duration and subtracts unpaid breaks correctly", () => {
  const entry: TimeEntry = {
    id: "shift-1",
    employmentId: "emp-1",
    startedAt: "2026-10-12T08:03:00Z",
    endedAt: "2026-10-12T17:11:00Z", // 9h 8m = 548 minutes = 32880000 ms
    timezone: "America/New_York",
    breaks: [
      {
        startedAt: "2026-10-12T12:03:00Z",
        endedAt: "2026-10-12T12:34:00Z", // 31 minutes unpaid break = 1860000 ms
        paid: false,
        category: "meal",
      },
    ],
  };

  const norm = normalizeTimeEntry(entry);
  assert.equal(norm.grossDurationMs, 32880000);
  assert.equal(norm.unpaidBreakDurationMs, 1860000);
  assert.equal(norm.paidDurationMs, 31020000); // 8h 37m = 517 min

  const paidHours = msToHours(norm.paidDurationMs);
  assert.ok(Math.abs(paidHours - 8.6167) < 0.001);
});

test("Handles paid breaks without subtracting them from paid duration", () => {
  const entry: TimeEntry = {
    id: "shift-2",
    employmentId: "emp-1",
    startedAt: "2026-10-12T08:00:00Z",
    endedAt: "2026-10-12T16:00:00Z", // 8 hours
    timezone: "UTC",
    breaks: [
      {
        startedAt: "2026-10-12T10:00:00Z",
        endedAt: "2026-10-12T10:15:00Z", // 15 min rest break (paid)
        paid: true,
        category: "rest",
      },
      {
        startedAt: "2026-10-12T12:00:00Z",
        endedAt: "2026-10-12T12:30:00Z", // 30 min meal (unpaid)
        paid: false,
        category: "meal",
      },
    ],
  };

  const norm = normalizeTimeEntry(entry);
  assert.equal(msToHours(norm.grossDurationMs), 8);
  assert.equal(msToHours(norm.paidBreakDurationMs), 0.25);
  assert.equal(msToHours(norm.unpaidBreakDurationMs), 0.5);
  assert.equal(msToHours(norm.paidDurationMs), 7.5);
});
