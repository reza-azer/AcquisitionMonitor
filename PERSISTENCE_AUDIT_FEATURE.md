# Fitur Persistensi & Riwayat Koreksi - Dokumentasi

## Ringkasan Fitur

### 1. Persistensi Data "Input Terakhir"
Data input sekarang **tersimpan meskipun page di-refresh** menggunakan localStorage.

### 2. Riwayat Koreksi (Audit Trail)
Sistem mencatat setiap perubahan data dengan detail:
- **Member** yang mengubah
- **Produk** yang diubah
- **Nilai lama → Nilai baru**
- **Timestamp** perubahan (jam & tanggal)

## Cara Kerja

### Input Terakhir Panel
- Menampilkan produk dengan quantity > 0 yang baru saja diinput
- Data tersimpan di localStorage browser
- Persist sampai user clear manual atau clear browser data
- Maksimal 20 entry terbaru

### Riwayat Koreksi Panel
- Muncul setiap kali user mengubah data yang sudah ada
- Mencatat perubahan: nilai lama → nilai baru
- Color coding:
  - **Hijau** (↑): Kenaikan (contoh: 5 → 10)
  - **Merah** (↓): Penurunan (contoh: 10 → 5)
- Menampilkan timestamp exact perubahan
- Maksimal 50 entry terbaru

## Database Changes

### Tabel Baru: `acquisition_audit_log`

```sql
CREATE TABLE acquisition_audit_log (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  member_name TEXT,
  date DATE,
  product_key TEXT,
  old_quantity INTEGER,
  new_quantity INTEGER,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

**Migration File:** `migration-audit-log.sql`

## Cara Menggunakan

### 1. Setup Database
Jalankan migration di Supabase SQL Editor:
```bash
# Copy paste isi file migration-audit-log.sql
```

### 2. Input Data Baru
1. Buka tab **Input**
2. Pilih member & tanggal
3. Input produk (quantity > 0)
4. Klik **Simpan Data**
5. Data muncul di panel **Input Terakhir**

### 3. Koreksi Data
1. Pilih member & tanggal yang sama
2. Data existing akan dimuat
3. Ubah quantity (misal: 10 → 5)
4. Klik **Simpan Data**
5. Perubahan tercatat di **Riwayat Koreksi**
   - Format: "10 → 5" (merah, karena turun)
   - Timestamp: "14:30" (jam perubahan)

### 4. Clear History
Klik tombol **Clear** di panel Riwayat Koreksi untuk reset semua history.

## File Changes

### 1. Component: `src/components/InputAcquisition.tsx`
**Changes:**
- Added localStorage persistence (save/load)
- Added audit log state management
- Added `clearHistory()` function
- Updated `handleSave()` to track changes
- Added "Riwayat Koreksi" panel UI
- Added `member_name` to Acquisition interface

### 2. Schema: `supabase-schema.sql`
**Changes:**
- Added `acquisition_audit_log` table
- Added indexes for performance
- Added RLS policy

### 3. Migration: `migration-audit-log.sql` (new)
**Purpose:** Standalone migration for existing deployments

## Technical Details

### LocalStorage Keys
- `recentInputs` - Array of recent input entries
- `auditLogs` - Array of audit log entries

### Audit Log Entry Format
```json
{
  "id": "audit-1711555200000-MTB",
  "member_id": "uuid",
  "member_name": "John Doe",
  "date": "2026-03-27",
  "product_key": "MTB",
  "product_name": "Mandiri Tabangan Bisnis",
  "old_quantity": 10,
  "new_quantity": 5,
  "changed_at": "2026-03-27T14:30:00.000Z",
  "unit": "Rekening"
}
```

### Change Detection Logic
```javascript
// Before save, fetch existing data
const existingData = await fetch(...);

// Compare old vs new
const changedLogs = products
  .filter(p => existingMap[p.key] !== inputData[p.key])
  .map(p => ({
    old_quantity: existingMap[p.key],
    new_quantity: inputData[p.key]
  }));
```

## Future Enhancements (Optional)

1. **Database Sync** - Periodically sync localStorage audit logs to DB
2. **Export Audit Log** - Download as CSV/Excel
3. **Filter by Date/Member** - Search in audit history
4. **User Attribution** - Track which user made changes (when auth implemented)

## Troubleshooting

### Data hilang setelah refresh
- Check localStorage: Open DevTools > Application > Local Storage
- Verify key `recentInputs` and `auditLogs` exist
- If empty, data was not saved properly

### Audit log tidak muncul
- Pastikan mengubah nilai (bukan nilai yang sama)
- Check console log: `[InputAcquisition] Audit logs created: X`
- Verify data berubah: old_quantity ≠ new_quantity

### Clear history tidak bekerja
- Confirm alert "Hapus semua riwayat..." muncul
- Check localStorage setelah clear
- Refresh page jika perlu
