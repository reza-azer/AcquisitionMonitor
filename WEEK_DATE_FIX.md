# Week/Date Handling Fix

## Problem

After transitioning from the old week selector system to the new calendar-based system, data wasn't displaying correctly on the dashboard.

### Root Cause
- **Old System**: Users input acquisitions by selecting Week 1-4 (no specific dates)
- **New System**: Users click on calendar dates, and week is auto-calculated
- **Issue**: The week calculation formula was inconsistent between:
  - The acquisitions API (`getWeekOfMonth`)
  - The analytics API (`getWeekFromDate`)
  - The SQL migration

The old formula incorrectly included `firstDayWeekday` in the calculation, causing week mismatches.

## Solution

### 1. SQL Migration (`migration-fix-week-date-mapping.sql`)

Run this in Supabase SQL Editor to fix legacy data:

```sql
-- Maps old week-based data to specific dates:
-- Week 1 -> Day 7
-- Week 2 -> Day 14
-- Week 3 -> Day 21
-- Week 4 -> Day 28

-- Then recalculates all week numbers using: CEIL(EXTRACT(DAY FROM date) / 7.0)
```

**How to run:**
1. Open Supabase Dashboard > SQL Editor
2. Copy and paste the contents of `migration-fix-week-date-mapping.sql`
3. Click "Run"

### 2. Unified Week Calculation

All week calculations now use the same simple formula:

```typescript
function getWeekOfMonth(date: Date): number {
  const day = date.getDate();
  const weekNum = Math.ceil(day / 7);
  return Math.min(weekNum, 4); // Cap at 4 for days 29-31
}
```

**Week boundaries:**
- Week 1: Days 1-7
- Week 2: Days 8-14
- Week 3: Days 15-21
- Week 4: Days 22-31

### 3. Updated Files

| File | Changes |
|------|---------|
| `migration-fix-week-date-mapping.sql` | **NEW** - SQL migration to fix legacy data |
| `src/app/api/acquisitions/route.ts` | Fixed `getWeekOfMonth()` to use simple formula; Updated PATCH to recalculate week from date |
| `src/app/api/analytics/route.ts` | Fixed `getWeekFromDate()` to use simple formula; Changed `||` to `??` for null handling |

## Testing

After running the migration:

1. **Check legacy data is visible:**
   - Open Dashboard Analytics
   - Data from before the calendar update should now appear

2. **Test new calendar input:**
   - Click a date (e.g., March 28)
   - Input acquisition data
   - Verify it appears in the correct week (Week 4)

3. **Verify week calculation:**
   - Day 7 → Week 1
   - Day 14 → Week 2
   - Day 21 → Week 3
   - Day 28 → Week 4

## Notes

- The `updated_at` trigger ensures week is recalculated on every update
- Week is now always derived from the `date` field for consistency
- Future updates will automatically maintain week/date alignment
