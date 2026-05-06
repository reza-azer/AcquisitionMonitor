# Input Akuisisi Berdasarkan Tanggal - Dokumentasi

## Ringkasan Perubahan

Fitur baru untuk input akuisisi berdasarkan tanggal (bukan week statis) telah ditambahkan. User sekarang dapat:
- Input data akuisisi untuk tanggal apapun (termasuk tanggal lalu untuk koreksi)
- Melihat timestamp last update untuk setiap input
- Menggunakan tab "Input" yang terpisah dari tab "Manage"

## File yang Diubah/Dibuat

### 1. Database Schema
**File:** `supabase-schema.sql` (updated)
**File:** `migration-date-based-acquisitions.sql` (new)

Perubahan pada tabel `acquisitions`:
- Menambahkan kolom `date` (DATE) untuk menyimpan tanggal input yang sebenarnya
- Kolom `week` dibuat nullable untuk backward compatibility
- UNIQUE constraint diubah dari `(member_id, week, product_key)` menjadi `(member_id, date, product_key)`
- Index baru untuk query berbasis tanggal

### 2. API Route
**File:** `src/app/api/acquisitions/route.ts`

Perubahan:
- GET: Mendukung query by `date`, `startDate`, `endDate`
- POST: Menerima parameter `date` dan otomatis menghitung `week` dari tanggal
- Helper function `getWeekNumber()` untuk menghitung week number dari date

### 3. Komponen InputAkuisisi Baru
**File:** `src/components/InputAcquisition.tsx` (new)

Fitur:
- **Date Picker**: Pilih tanggal input (default: hari ini)
- **Member Selector**: Dropdown dengan search functionality
- **Product Input Form**: Input quantity untuk setiap produk aktif
- **Save Button**: Simpan semua input dengan validasi
- **Recent Inputs Panel**: Lihat 20 input terakhir dengan timestamp

### 4. Main Page
**File:** `src/app/page.tsx`

Perubahan:
- Menambahkan tab "Input" di navigation (desktop & mobile)
- Menambahkan view mode `input` yang me-render komponen `InputAcquisition`
- Import komponen `InputAcquisition`

## Cara Menggunakan

### 1. Setup Database

Jalankan migration di Supabase SQL Editor:

```sql
-- Copy paste isi file migration-date-based-acquisitions.sql
```

### 2. Input Data Baru

1. Buka tab **"Input"** di navigation bar
2. Pilih tanggal input (default: hari ini)
3. Pilih member dari dropdown (bisa search nama/jabatan)
4. Input quantity untuk setiap produk
5. Klik **"Simpan Data"**

### 3. Koreksi Tanggal Lalu

1. Buka tab **"Input"**
2. Pilih tanggal yang ingin dikoreksi di date picker
3. Pilih member yang bersangkutan
4. Data existing akan dimuat otomatis
5. Update quantity sesuai kebutuhan
6. Klik **"Simpan Data"**

### 4. Lihat History Input

Panel **"Input Terakhir"** di sebelah kanan menampilkan:
- 20 input terakhir (30 hari ke belakang)
- Nama member dan produk
- Quantity dan unit
- Tanggal input
- Waktu last update

## Struktur Data

### Tabel Acquisitions (Baru)

```
acquisitions (
  id UUID
  member_id UUID
  week INTEGER (nullable, untuk backward compatibility)
  date DATE (tanggal input sebenarnya)
  product_key TEXT
  quantity INTEGER
  created_at TIMESTAMP
  updated_at TIMESTAMP (auto-update)
)
```

### API Parameters

**GET /api/acquisitions**
- `member_id`: Filter by member
- `week`: Filter by week (legacy)
- `date`: Filter by specific date (YYYY-MM-DD)
- `startDate`: Filter from date (YYYY-MM-DD)
- `endDate`: Filter to date (YYYY-MM-DD)

**POST /api/acquisitions**
```json
{
  "member_id": "uuid",
  "date": "2025-03-27",  // optional, default: today
  "week": 1,             // optional, auto-calculated from date
  "product_key": "MTB",
  "quantity": 5
}
```

## Backward Compatibility

- Data lama berbasis week tetap dapat diakses
- Week number otomatis dihitung dari tanggal jika tidak disediakan
- Tab "Manage" masih menampilkan input grid berbasis week untuk existing workflow

## Catatan Penting

1. **Timestamp**: Setiap update akan otomatis mengupdate `updated_at`
2. **Unique Constraint**: Satu member hanya bisa punya satu input per produk per tanggal
3. **Week Number**: Dihitung otomatis menggunakan ISO week number standard
4. **Migration**: Data existing akan di-set tanggalnya berdasarkan week number (asumsi week 1 = first week of current month)

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
- Artinya sudah ada input untuk member + tanggal + produk yang sama
- Data akan di-update (upsert), bukan ditambahkan baru

### Week number tidak sesuai
- Week number dihitung otomatis dari tanggal
- Jika ingin manual set week, bisa pass parameter `week` di POST request

### Data existing tidak muncul
- Pastikan migration sudah dijalankan
- Cek apakah kolom `date` sudah ter-populate untuk data lama
