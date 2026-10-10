export type BreakCategory = "meal" | "rest" | "personal" | "custom";

export interface Break {
  id?: string;
  startedAt: Date | string;
  endedAt: Date | string;
  paid: boolean;
  category: BreakCategory;
  notes?: string;
}

export type TimeEntrySource = "manual" | "clock" | "import" | "api" | "sync";
export type TimeEntryStatus = "completed" | "active";

export type WorkCategory =
  | "regular"
  | "overtime"
  | "training"
  | "travel"
  | "on_call"
  | "holiday"
  | "pto"
  | "sick_leave"
  | "administrative"
  | "billable"
  | "non_billable"
  | (string & {});

export interface TimeEntry {
  id: string;
  employmentId: string;
  userId?: string;
  startedAt: Date | string;
  endedAt: Date | string;
  timezone: string;
  breaks?: Break[];
  source?: TimeEntrySource;
  status?: TimeEntryStatus;
  category?: WorkCategory;
  notes?: string;
  locationLabel?: string;
}

/**
 * Normalized work interval evaluated by the Pay Engine
 */
export interface NormalizedWorkInterval {
  entryId: string;
  startedAt: Date;
  endedAt: Date;
  timezone: string;
  grossDurationMs: number;
  unpaidBreakDurationMs: number;
  paidBreakDurationMs: number;
  paidDurationMs: number;
  category: string;
  workDate: string; // YYYY-MM-DD in employment timezone
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isOvernight: boolean;
}
