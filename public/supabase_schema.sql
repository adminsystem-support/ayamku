-- ========================================================
-- SKEMA LENGKAP POSTGRESQL UNTUK SUPABASE / PGADMIN 4
-- Sistem POS & Operasional Usaha Ayam Potong (Ayamku)
-- ========================================================

-- 1. TABEL ITEM / PRODUK AYAM
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  min_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  base_buy_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  sell_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  description TEXT,
  updated_at TEXT NOT NULL
);

-- 2. TABEL PELANGGAN (CUSTOMERS)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Eceran',
  default_discount_percent DOUBLE PRECISION DEFAULT 0,
  notes TEXT
);

-- 3. TABEL PEMASOK (SUPPLIERS)
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT
);

-- 4. TABEL TRANSAKSI PENJUALAN (SALES / NOTA)
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_type TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
  discount DOUBLE PRECISION NOT NULL DEFAULT 0,
  grand_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_cost_hpp DOUBLE PRECISION NOT NULL DEFAULT 0,
  gross_profit DOUBLE PRECISION NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'Lunas',
  amount_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
  remaining_debt DOUBLE PRECISION DEFAULT 0,
  change DOUBLE PRECISION DEFAULT 0,
  customer_debt_payments JSONB,
  notes TEXT,
  created_by TEXT NOT NULL
);

-- 4b. TABEL PRE-ORDER / PESANAN PO
CREATE TABLE IF NOT EXISTS preorders (
  id TEXT PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  order_date TEXT NOT NULL,
  pickup_date TEXT NOT NULL,
  pickup_time TEXT,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_type TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
  discount DOUBLE PRECISION NOT NULL DEFAULT 0,
  grand_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  down_payment DOUBLE PRECISION NOT NULL DEFAULT 0,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'Menunggu Diambil',
  notes TEXT,
  created_by TEXT NOT NULL,
  converted_sale_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. TABEL PEMBELIAN / FAKTUR SUPPLIER
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  items JSONB NOT NULL,
  additional_costs JSONB,
  total_items_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_additional_costs DOUBLE PRECISION NOT NULL DEFAULT 0,
  grand_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  average_hpp_per_unit DOUBLE PRECISION NOT NULL DEFAULT 0,
  target_selling_price DOUBLE PRECISION,
  estimated_total_revenue DOUBLE PRECISION,
  estimated_profit DOUBLE PRECISION,
  estimated_profit_margin DOUBLE PRECISION,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Lunas',
  amount_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
  remaining_debt DOUBLE PRECISION NOT NULL DEFAULT 0,
  debt_payments JSONB,
  notes TEXT,
  created_by TEXT NOT NULL
);

-- 6. TABEL KARYAWAN (EMPLOYEES)
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  daily_wage DOUBLE PRECISION NOT NULL DEFAULT 0,
  half_day_wage DOUBLE PRECISION NOT NULL DEFAULT 0,
  overtime_pay_per_hour DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aktif'
);

-- 7. TABEL ABSENSI HARIAN
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  status TEXT NOT NULL,
  wage_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  overtime_hours DOUBLE PRECISION DEFAULT 0,
  overtime_pay DOUBLE PRECISION DEFAULT 0,
  bonus_amount DOUBLE PRECISION DEFAULT 0,
  notes TEXT
);

-- 8. TABEL SLIP GAJI KARYAWAN
CREATE TABLE IF NOT EXISTS salary_slips (
  id TEXT PRIMARY KEY,
  slip_number TEXT UNIQUE NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  generated_date TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_role TEXT NOT NULL,
  days_present INTEGER NOT NULL DEFAULT 0,
  days_half INTEGER NOT NULL DEFAULT 0,
  days_overtime INTEGER NOT NULL DEFAULT 0,
  total_daily_wage DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_overtime_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
  allowance DOUBLE PRECISION NOT NULL DEFAULT 0,
  bonus DOUBLE PRECISION NOT NULL DEFAULT 0,
  deduction DOUBLE PRECISION NOT NULL DEFAULT 0,
  net_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Lunas',
  notes TEXT
);

-- 9. TABEL TRANSAKSI KAS OPERASIONAL
CREATE TABLE IF NOT EXISTS operational_transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  recorded_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 10. TABEL STOK OPNAME FISIK
CREATE TABLE IF NOT EXISTS stock_opname (
  id TEXT PRIMARY KEY,
  opname_number TEXT NOT NULL,
  date TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  system_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  physical_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  difference DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Disetujui',
  notes TEXT,
  conducted_by TEXT NOT NULL
);

-- 11. TABEL PROFIL TOKO
CREATE TABLE IF NOT EXISTS store_profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  footer_note TEXT,
  logo_url TEXT,
  thermal_width TEXT DEFAULT '58mm',
  bank_name TEXT,
  bank_account_no TEXT,
  bank_account_name TEXT
);

-- 12. TABEL AKUN PENGGUNA (USERS)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  role_label TEXT NOT NULL,
  password TEXT,
  pin TEXT
);

-- 13. TABEL KASBON KARYAWAN
CREATE TABLE IF NOT EXISTS employee_kasbon (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  date TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  balance_after DOUBLE PRECISION NOT NULL DEFAULT 0
);
