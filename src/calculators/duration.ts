import type { TimeEntry, NormalizedWorkInterval, Break } from "../models/time-entry.ts";

/**
 * Returns formatted local date string 'YYYY-MM-DD' in given IANA timezone
 */
export function getLocalDateString(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // en-CA gives YYYY-MM-DD
  } catch {
    // Fallback if timezone string is invalid/local
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Returns day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) in given IANA timezone
 */
export function getLocalDayOfWeek(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
    const dayStr = formatter.format(date);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[dayStr] ?? date.getUTCDay();
  } catch {
    return date.getUTCDay();
  }
}

/**
 * Returns local hour (0-23) in given IANA timezone
 */
export function getLocalHour(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(formatter.format(date), 10);
  } catch {
    return date.getUTCHours();
  }
}

/**
 * Normalizes raw time entry:
 * - Computes gross duration
 * - Subtracts unpaid breaks
 * - Tracks paid breaks
 * - Evaluates workday date and timezone
 */
export function normalizeTimeEntry(entry: TimeEntry): NormalizedWorkInterval {
  const startedAt = typeof entry.startedAt === "string" ? new Date(entry.startedAt) : entry.startedAt;
  const endedAt = typeof entry.endedAt === "string" ? new Date(entry.endedAt) : entry.endedAt;

  if (isNaN(startedAt.getTime()) || isNaN(endedAt.getTime())) {
    throw new Error(`Invalid start or end date in TimeEntry ${entry.id}`);
  }

  if (endedAt.getTime() < startedAt.getTime()) {
    throw new Error(`TimeEntry ${entry.id} endedAt is before startedAt`);
  }

  const grossDurationMs = endedAt.getTime() - startedAt.getTime();

  let unpaidBreakDurationMs = 0;
  let paidBreakDurationMs = 0;

  if (entry.breaks && entry.breaks.length > 0) {
    for (const b of entry.breaks) {
      const bStart = typeof b.startedAt === "string" ? new Date(b.startedAt) : b.startedAt;
      const bEnd = typeof b.endedAt === "string" ? new Date(b.endedAt) : b.endedAt;

      if (!isNaN(bStart.getTime()) && !isNaN(bEnd.getTime()) && bEnd.getTime() > bStart.getTime()) {
        const breakMs = bEnd.getTime() - bStart.getTime();
        if (b.paid) {
          paidBreakDurationMs += breakMs;
        } else {
          unpaidBreakDurationMs += breakMs;
        }
      }
    }
  }

  // Ensure unpaid breaks do not exceed gross duration
  const effectiveUnpaidMs = Math.min(unpaidBreakDurationMs, grossDurationMs);
  const paidDurationMs = Math.max(0, grossDurationMs - effectiveUnpaidMs);

  const tz = entry.timezone || "UTC";
  const startDateStr = getLocalDateString(startedAt, tz);
  const endDateStr = getLocalDateString(endedAt, tz);
  const isOvernight = startDateStr !== endDateStr;
  const dayOfWeek = getLocalDayOfWeek(startedAt, tz);

  return {
    entryId: entry.id,
    startedAt,
    endedAt,
    timezone: tz,
    grossDurationMs,
    unpaidBreakDurationMs: effectiveUnpaidMs,
    paidBreakDurationMs,
    paidDurationMs,
    category: entry.category || "regular",
    workDate: startDateStr,
    dayOfWeek,
    isOvernight,
  };
}

/**
 * Converts milliseconds to decimal hours (rounded to 4 decimal places)
 */
export function msToHours(ms: number): number {
  return Math.round((ms / (1000 * 60 * 60)) * 10000) / 10000;
}
