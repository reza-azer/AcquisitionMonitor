# Bulk Edit Feature for Acquisitions

## Overview

Added bulk edit functionality for acquisitions, allowing users to create/update/delete multiple acquisition records at once across multiple members and date ranges.

## Features

### Create/Edit Mode
- Select multiple members (with search and "Select All" functionality)
- Choose a date range (from/to)
- Select a product from active products list
- Enter quantity to apply to all selected combinations
- Shows preview of affected records count

### Delete Mode
- Select multiple members
- Choose a date range
- Deletes all acquisitions for selected member/date combinations
- Shows warning with affected records count

## Usage

### In InputAcquisition Component

1. Click the **"Bulk Edit"** button (purple button with Users icon)
2. Toggle between **"Akuisisi"** and **"Absensi"** mode using the buttons at the top
3. Select **Create/Edit** or **Delete** mode

#### For Acquisitions:
1. Select members (use search or "SELECT ALL")
2. Choose date range
3. Select product from dropdown
4. Enter quantity
5. Click **SIMPAN** to create/update

#### For Delete:
1. Select members
2. Choose date range
3. Click **HAPUS** to delete

## Technical Implementation

### Files Modified

| File | Changes |
|------|---------|
| `src/components/BulkEditModal.tsx` | Added Product interface, acquisition fields (product selection, quantity), conditional rendering for mode-specific UI |
| `src/app/api/acquisitions/route.ts` | Added bulk POST handler (`.upsert()` with array), bulk DELETE handler (parallel deletions) |
| `src/components/InputAcquisition.tsx` | Added `products` and `mode` props to BulkEditModal |

### API Endpoints

#### Bulk Create/Update
```
POST /api/acquisitions
Body: {
  bulk: true,
  records: [
    { member_id, date, product_key, quantity },
    ...
  ]
}
```

#### Bulk Delete
```
DELETE /api/acquisitions?bulk=true
Body: {
  records: [
    { member_id, date },
    ...
  ]
}
```

### Week Calculation

All bulk operations automatically calculate the `week` field from the `date` using:
```typescript
week = Math.min(Math.ceil(day / 7), 4)
```

This ensures consistency with the calendar-based input system.

## Example Scenarios

### Scenario 1: Weekly Team Input
- Select all team members
- Date range: Monday to Friday
- Product: KPR
- Quantity: 2
- Result: Creates 5 acquisitions per member (one for each day)

### Scenario 2: Month-End Correction
- Select specific members who need corrections
- Date range: Specific dates
- Product: Selected product
- Quantity: Corrected value
- Result: Updates existing records or creates new ones

### Scenario 3: Bulk Cleanup
- Select members
- Date range: Period to clean
- Mode: Delete
- Result: Removes all acquisitions in that period

## UI/UX Features

- **Search**: Filter members by name, position, or team
- **Select All**: Quick selection of all filtered members
- **Affected Records Preview**: Shows count before saving
- **Loading States**: GridLoader during save/delete operations
- **Mode Toggle**: Easy switching between Create/Edit and Delete modes
- **Product Filter**: Only shows active products

## Error Handling

- Validates member selection
- Validates date range
- Validates product selection (for acquisitions)
- Shows alerts for missing required fields
- Logs errors to console for debugging

## Database Constraints

The bulk upsert respects the unique constraint:
```sql
UNIQUE(member_id, date, product_key)
```

If a record exists for the same member, date, and product, it will be updated. Otherwise, a new record is inserted.

## Future Enhancements

Potential improvements:
- Multiple products in single bulk operation
- Export/import bulk data via CSV
- Schedule bulk operations
- Bulk edit with different quantities per member
- Audit log for bulk operations
