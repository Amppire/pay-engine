# 11-Stage Calculation Pipeline Specification (v1.0)

Per Section 21 of the Product & Technical Specification, all pay calculations follow an explicit 11-stage deterministic processing pipeline:

```text
Raw Time Entries
       ↓
Stage 1: Validate Entries
       ↓
Stage 2: Normalize Intervals & Timezones
       ↓
Stage 3: Subtract Unpaid Breaks
       ↓
Stage 4: Filter by Pay Period Boundaries
       ↓
Stage 5: Group by Workday & Resolve Applicable Rates
       ↓
Stage 6: Classify Hours (Straight, Daily OT, Double Time, Weekly OT)
       ↓
Stage 7: Apply Shift & Weekend Differentials
       ↓
Stage 8: Apply Holiday Premiums
       ↓
Stage 9: Apply Bonuses & Allowances
       ↓
Stage 10: Generate Gross Earnings (Integer Minor Units)
       ↓
Stage 11: Produce Human-Auditable Calculation Explanation
```

---

## Detailed Stages

### Stage 1: Validation
Validates date strings, ensures `startedAt <= endedAt`, ensures breaks fall within shift duration bounds, and detects overlapping shifts.

### Stage 2 & 3: Normalization & Break Subtraction
- Normalizes start and end timestamps.
- Evaluates `grossDurationMs`.
- Identifies unpaid vs. paid breaks.
- Subtracts unpaid breaks to produce `paidDurationMs`.
- Identifies whether the shift is overnight (`startDate !== endDate` in local timezone).

### Stage 4: Pay Period Filtering
If a `PayPeriod` is provided, filters intervals whose `workDate` falls within `[startDate, endDate]`.

### Stage 5: Grouping & Rate Resolution
- Groups paid hours by local calendar date (`YYYY-MM-DD`).
- Resolves effective pay rate using `effectiveFrom` and `effectiveTo` relative to the work date.

### Stage 6: Overtime Classification
1. Evaluates double-time rule (hours exceeding daily double-time threshold).
2. Evaluates daily overtime rule (hours exceeding daily threshold).
3. Accumulates straight hours against the weekly overtime threshold (anti-pyramiding).

### Stage 7 & 8: Differentials & Premiums
- **Weekend Differential:** Matches shifts on configured weekend days (e.g., Saturday/Sunday) and applies fixed hourly amount or multiplier.
- **Night Differential:** Matches shift hours falling within configured night window (e.g., 18:00 to 06:00).
- **Holiday Premium:** Matches shifts on designated holiday dates.

### Stage 9: Bonuses
Evaluates fixed stipends, allowances, and bonuses.

### Stage 10: Gross Earnings Generation
Sums all earnings buckets using exact `Money` integer addition:
$$\text{Gross} = \text{Regular} + \text{Overtime} + \text{DoubleTime} + \text{Differentials} + \text{Bonuses}$$

### Stage 11: Explanation Generation
Generates a structured audit trail and user-facing explanation steps for complete transparency.
