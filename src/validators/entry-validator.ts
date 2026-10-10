import type { TimeEntry } from "../models/time-entry.ts";

export interface ValidationError {
  field: string;
  message: string;
  entryId?: string;
}

export function validateTimeEntries(entries: TimeEntry[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const entry of entries) {
    const start = typeof entry.startedAt === "string" ? new Date(entry.startedAt) : entry.startedAt;
    const end = typeof entry.endedAt === "string" ? new Date(entry.endedAt) : entry.endedAt;

    if (isNaN(start.getTime())) {
      errors.push({ field: "startedAt", message: "Invalid startedAt date", entryId: entry.id });
    }
    if (isNaN(end.getTime())) {
      errors.push({ field: "endedAt", message: "Invalid endedAt date", entryId: entry.id });
    }
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end.getTime() < start.getTime()) {
      errors.push({
        field: "endedAt",
        message: "endedAt cannot be before startedAt",
        entryId: entry.id,
      });
    }

    if (entry.breaks) {
      for (let i = 0; i < entry.breaks.length; i++) {
        const b = entry.breaks[i]!;
        const bStart = typeof b.startedAt === "string" ? new Date(b.startedAt) : b.startedAt;
        const bEnd = typeof b.endedAt === "string" ? new Date(b.endedAt) : b.endedAt;

        if (bEnd.getTime() < bStart.getTime()) {
          errors.push({
            field: `breaks[${i}]`,
            message: "Break end time cannot be before break start time",
            entryId: entry.id,
          });
        }

        if (bStart.getTime() < start.getTime() || bEnd.getTime() > end.getTime()) {
          errors.push({
            field: `breaks[${i}]`,
            message: "Break interval must fall completely within the shift duration",
            entryId: entry.id,
          });
        }
      }
    }
  }

  // Check for overlapping entries
  const sorted = [...entries]
    .filter((e) => !isNaN(new Date(e.startedAt).getTime()) && !isNaN(new Date(e.endedAt).getTime()))
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]!;
    const next = sorted[i + 1]!;
    const curEnd = new Date(current.endedAt).getTime();
    const nextStart = new Date(next.startedAt).getTime();

    if (curEnd > nextStart) {
      errors.push({
        field: "time_range",
        message: `Overlapping shifts detected between entry ${current.id} and entry ${next.id}`,
        entryId: next.id,
      });
    }
  }

  return errors;
}
