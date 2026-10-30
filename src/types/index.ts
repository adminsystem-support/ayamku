export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  password?: string;
  pin?: string;
}

export type ItemCategory = 'Ayam Utuh' | 'Potongan' | 'Jeroan' | 'Karkas' | 'Lainnya';
export type ItemUnit = 'kg' | 'pcs';

export interface Item {
  id: string;
  code: string;
  name: string;
  category: ItemCategory;
  unit: ItemUnit;
  currentStock: number; // in kg or count based on unit
  minStock: number;
  baseBuyPrice: number; // Total Pembelian / Modal per unit (diinput manual oleh user)
  sellPrice: number; // Harga Jual per unit
  description?: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
}

export type CustomerType = 'Eceran' | 'Grosir' | 'Restoran / Rumah Makan' | 'Katering' | 'Langganan';

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  type: CustomerType;
  defaultDiscountPercent: number;
  notes?: string;
}

export interface AdditionalCost {
  id: string;
  name: string;
  amount: number;
}

export interface DebtPayment {
  id: string;
  receiptNo?: string; // e.g. BKM-20261028-101 (Bukti Kas Masuk) or BKK-20261028-101 (Bukti Kas Keluar)
  date: string;
  amount: number;
  paymentMethod: 'Tunai' | 'Transfer';
  notes?: string;
  recordedBy: string;
  remainingAfter?: number; // Sisa hutang/piutang setelah pembayaran ini
}

export interface PurchaseItem {
  itemId: string;
  itemName: string;
  unit: ItemUnit;
  quantity: number;
  buyPrice: number;
  subtotal: number;
  targetSellPrice: number;
  profit: number;
  effectiveHPP?: number;
}

export type PurchasePaymentStatus = 'Lunas' | 'Sebagian';

export interface PurchaseTransaction {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  additionalCosts: AdditionalCost[];
  totalItemsCost: number;
  totalAdditionalCosts: number;
  grandTotal: number;
  totalQuantity: number;
  averageHPPPerUnit: number;
  targetSellingPrice?: number; // Estimasi jual admin
  estimatedTotalRevenue?: number; // Proyeksi omset jual
  estimatedProfit?: number; // Proyeksi keuntungan
  estimatedProfitMargin?: number; // Margin %
  paymentMethod: 'Tunai' | 'Transfer';
  paymentStatus: PurchasePaymentStatus;
  amountPaid: number; // Nominal yang sudah dibayar
  remainingDebt: number; // Sisa hutang ke pemasok
  debtPayments?: DebtPayment[]; // Riwayat pembayaran hutang
  notes?: string;
  createdBy: string;
}

export interface SaleItem {
  itemId: string;
  itemName: string;
  unit: ItemUnit;
  quantity: number;
  sellPrice: number;
  baseCost: number;
  subtotal: number;
  costSubtotal: number;
  itemProfit: number;
}

export type SalePaymentStatus = 'Lunas' | 'Sebagian';

export interface SaleTransaction {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerType: CustomerType;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  totalCostHPP: number;
  grossProfit: number;
  paymentMethod: 'Tunai' | 'Transfer';
  paymentStatus?: SalePaymentStatus;
  amountPaid: number;
  remainingDebt?: number; // Sisa piutang dari pelanggan
  change: number;
  customerDebtPayments?: DebtPayment[];
  notes?: string;
  createdBy: string;
}

export type OpnameReason = 'Susut Timbangan' | 'Mati / Rusak' | 'Salah Hitung' | 'Bonus / Masuk Lebih' | 'Lainnya';
export type OpnameStatus = 'Pending' | 'Approved' | 'Rejected';

export interface StockOpnameRecord {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  unit: ItemUnit;
  unitPrice: number; // Harga beli pokok per unit saat opname
  systemStock: number;
  physicalStock: number;
  difference: number; // physicalStock - systemStock (bisa minus atau plus)
  differenceCost: number; // difference * unitPrice (minus = kerugian, plus = keuntungan)
  reason: OpnameReason;
  notes?: string;
  adjustedBy: string;
  status: OpnameStatus; // 'Pending' requires Admin approval, 'Approved' applies stock change
  approvedBy?: string;
  approvedAt?: string;
}

export type EmployeeRole = 'Jagal / Pemotong' | 'Sopir / Pengantar' | 'Kasir' | 'Helper / Gudang' | 'Admin' | string;

export interface Employee {
  id: string;
  code: string;
  name: string;
  role: EmployeeRole;
  phone: string;
  dailyWage: number;
  standardOvertimeRate: number;
  status: 'Aktif' | 'Non-Aktif';
  deactivatedAt?: string; // YYYY-MM-DD
}

export type AttendanceStatus = 'Hadir' | 'Setengah Hari' | 'Lembur' | 'Izin' | 'Sakit' | 'Alpa';

export interface AttendanceRecord {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  status: AttendanceStatus;
  wageAmount: number;
  overtimeHours?: number;
  overtimePay?: number;
  bonusAmount?: number;
  notes?: string;
}

export interface SalarySlip {
  id: string;
  slipNumber: string;
  periodStart: string;
  periodEnd: string;
  generatedDate: string;
  employeeId: string;
  employeeName: string;
  employeeRole: EmployeeRole;
  daysPresent: number;
  daysHalf: number;
  daysOvertime: number;
  totalOvertimeHours?: number;
  totalDailyWage: number;
  totalOvertimePay: number;
  allowance: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  paymentStatus: 'Sudah Dibayar' | 'Pending';
  notes?: string;
  kasbonOutstandingBefore?: number;
  kasbonRemainingAfter?: number;
}

export type KasbonTransactionType = 'pinjam' | 'bayar_slip' | 'bayar_manual';

export interface EmployeeKasbonRecord {
  id: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  type: KasbonTransactionType;
  amount: number;
  remainingBalanceAfter: number;
  notes?: string;
  salarySlipId?: string; // relasi jika pembayaran via slip gaji
  createdAt: string;
}

export interface OperationalExpense {
  id: string;
  date: string;
  category: 'Listrik & Air' | 'Bahan Bakar & Kendaraan' | 'Sewa Tempat & Cold Storage' | 'Plastik & Kemasan' | 'Perawatan Peralatan' | 'Lain-lain';
  description: string;
  amount: number;
  recordedBy: string;
}

export type OperationalTransactionType = 'pendapatan' | 'pengeluaran';

export interface OperationalTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: OperationalTransactionType; // 'pendapatan' | 'pengeluaran'
  description: string;
  amount: number;
  recordedBy: string;
  createdAt: string;
}

export interface StoreProfile {
  name: string;
  phone: string;
  address: string;
  footerNote: string;
  logoUrl?: string; // Logo image (Data URL / asset path)
  thermalWidth: '58mm' | '80mm';
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
}

export type ActiveTab = 
  | 'pos' 
  | 'produk' 
  | 'opname' 
  | 'kontak' 
  | 'operasional'
  | 'absensi_gaji' 
  | 'laporan' 
  | 'pengaturan';

export interface ProcessedCalculationItem {
  itemId: string;
  itemName: string;
  unit: ItemUnit;
  quantity: number;
  sellPrice: number;
  subtotal: number;
}

export interface ProcessedCalculationRecord {
  id: string;
  date: string; // YYYY-MM-DD
  source: string; // Supplier name
  items: ProcessedCalculationItem[];
  totalModal: number;
  grandTotal: number;
  profit: number;
  recordedBy: string;
}

export type PreOrderStatus = 'Menunggu Potong' | 'Siap Diambil' | 'Selesai' | 'Dibatalkan';

export interface PreOrderItem {
  itemId: string;
  itemName: string;
  unit: ItemUnit;
  quantity: number;
  sellPrice: number;
  subtotal: number;
}

export interface CustomerPreOrder {
  id: string;
  poNumber: string; // e.g. PO-20261029-001
  orderDate: string; // ISO
  pickupDate: string; // YYYY-MM-DD
  pickupTime?: string; // HH:mm e.g. 06:00
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerType: CustomerType;
  items: PreOrderItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  downPayment: number; // DP
  paymentMethod?: 'Tunai' | 'Transfer';
  status: PreOrderStatus;
  notes?: string;
  createdBy: string;
  convertedSaleId?: string;
  createdAt: string;
  updatedAt: string;
}



