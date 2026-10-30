import { 
  Item, 
  Supplier, 
  Customer, 
  PurchaseTransaction, 
  SaleTransaction, 
  StockOpnameRecord, 
  Employee, 
  AttendanceRecord, 
  SalarySlip, 
  OperationalExpense, 
  OperationalTransaction,
  StoreProfile,
  UserRole,
  AuthUser,
  ProcessedCalculationRecord,
  CustomerPreOrder,
  EmployeeKasbonRecord
} from '../types/index.ts';

const STORAGE_KEYS = {
  CURRENT_USER: 'ayampro_current_user',
  ITEMS: 'ayampro_items',
  SUPPLIERS: 'ayampro_suppliers',
  CUSTOMERS: 'ayampro_customers',
  PURCHASES: 'ayampro_purchases',
  SALES: 'ayampro_sales',
  PREORDERS: 'ayampro_preorders',
  OPNAME_RECORDS: 'ayampro_opnames',
  EMPLOYEES: 'ayampro_employees',
  ATTENDANCE: 'ayampro_attendance',
  SALARY_SLIPS: 'ayampro_salary_slips',
  KASBON: 'ayampro_kasbon',
  EXPENSES: 'ayampro_expenses',
  OPERATIONAL_TXS: 'ayampro_operational_txs',
  PROCESSED_CALCS: 'ayampro_processed_calcs',
  STORE_PROFILE: 'ayampro_profile',
  USERS: 'ayampro_users',
};

export const DEFAULT_USERS: AuthUser[] = [
  {
    id: 'user-admin',
    username: 'admin',
    name: 'H. Suryanto (Owner/Admin)',
    role: 'admin',
    roleLabel: 'Administrator Usaha',
  },
  {
    id: 'user-operator',
    username: 'user',
    name: 'Siti Rohimah (Kasir & Petugas Gudang)',
    role: 'user',
    roleLabel: 'User Operasional (Kasir / Gudang)',
  },
];

// Initial Realistic Seed Data for Indonesian Poultry Business
const DEFAULT_STORE_PROFILE: StoreProfile = {
  name: 'Berkah Unggas Sejahtera',
  phone: '0812-3456-7890',
  address: 'Jl. Raya Pasar Unggas No. 18, Sentra Daging Ayam Segar',
  footerNote: 'Terima kasih telah berbelanja ayam segar & berkualitas!',
  logoUrl: '/logo_unggas.svg',
  thermalWidth: '58mm',
  bankName: 'Bank BCA',
  bankAccountNo: '7820-1199-88',
  bankAccountName: 'Berkah Unggas Sejahtera (H. Suryanto)',
};

const DEFAULT_ITEMS: Item[] = [
  {
    id: 'item-1',
    code: 'ACG/001',
    name: 'Ayam Broiler Hidup',
    category: 'Ayam Utuh',
    unit: 'kg',
    currentStock: 450,
    minStock: 100,
    baseBuyPrice: 21500,
    sellPrice: 25500,
    description: 'Ayam hidup dari peternak kemitraan bobot 1.8 - 2.2 kg',
    updatedAt: '2026-10-26T10:00:00Z',
  },
  {
    id: 'item-2',
    code: 'ACG/002',
    name: 'Ayam Karkas Segar (0.8 - 1.0 kg)',
    category: 'Karkas',
    unit: 'pcs',
    currentStock: 85,
    minStock: 25,
    baseBuyPrice: 28000,
    sellPrice: 34000,
    description: 'Ayam potong bersih tanpa kepala & ceker, cocok untuk warung pecel lele',
    updatedAt: '2026-10-26T10:00:00Z',
  },
  {
    id: 'item-3',
    code: 'ACG/003',
    name: 'Ayam Karkas Segar (1.0 - 1.2 kg)',
    category: 'Karkas',
    unit: 'pcs',
    currentStock: 110,
    minStock: 30,
    baseBuyPrice: 32000,
    sellPrice: 39500,
    description: 'Ayam potong ukuran standar restoran padang & katering',
    updatedAt: '2026-10-26T10:00:00Z',
  },
  {
    id: 'item-4',
    code: 'ACG/004',
    name: 'Daging Fillet Dada (Boneless)',
    category: 'Potongan',
    unit: 'kg',
    currentStock: 65,
    minStock: 20,
    baseBuyPrice: 42000,
    sellPrice: 51000,
    description: 'Fillet dada ayam murni tanpa kulit & tulang, langganan ayam geprek & steak',
    updatedAt: '2026-10-26T10:00:00Z',
  },
  {
    id: 'item-5',
    code: 'ACG/005',
    name: 'Daging Fillet Paha (BLP)',
    category: 'Potongan',
    unit: 'kg',
    currentStock: 45,
    minStock: 15,
    baseBuyPrice: 44000,
    sellPrice: 53500,
    description: 'Fillet paha ayam juicy tanpa tulang',
    updatedAt: '2026-10-26T10:00:00Z',
  },
  {
    id: 'item-6',
    code: 'ACG/006',
    name: 'Paha Utuh / Drumstick & Thigh',
    category: 'Potongan',
    unit: 'kg',
    currentStock: 70,
    minStock: 20,
    baseBuyPrice: 31000,
    sellPrice: 38000,
    description: 'Paha ayam segar dengan kulit',
    updatedAt: '2026-10-26T10:00:00Z',
  },
  {
    id: 'item-7',
    code: 'ACG/007',
    name: 'Sayap Ayam (Chicken Wings)',
    category: 'Potongan',
    unit: 'kg',
    currentStock: 50,
    minStock: 15,
    baseBuyPrice: 29000,
    sellPrice: 36000,
    description: 'Sayap ayam utuh bersih untuk cafe & resto grill',
    updatedAt: '2026-10-26T10:00:00Z',
  },
  {
    id: 'item-8',
    code: 'ACG/008',
    name: 'Ati Ampela Bersih',
    category: 'Jeroan',
    unit: 'pcs',
    currentStock: 40,
    minStock: 15,
    baseBuyPrice: 16000,
    sellPrice: 22000,
    description: 'Ati ampela cuci bersih isi 5 pasang per pack',
    updatedAt: '2026-10-26T10:00:00Z',
  },
  {
    id: 'item-9',
    code: 'ACG/009',
    name: 'Ceker Ayam Bersih',
    category: 'Jeroan',
    unit: 'kg',
    currentStock: 35,
    minStock: 10,
    baseBuyPrice: 17000,
    sellPrice: 23000,
    description: 'Ceker ayam kupas kulit kuning kuku terpotong',
    updatedAt: '2026-10-26T10:00:00Z',
  },
  {
    id: 'item-10',
    code: 'ACG/010',
    name: 'Kepala Ayam',
    category: 'Lainnya',
    unit: 'kg',
    currentStock: 30,
    minStock: 10,
    baseBuyPrice: 11000,
    sellPrice: 16000,
    description: 'Kepala leher ayam untuk pakan ternak / soto',
    updatedAt: '2026-10-26T10:00:00Z',
  },
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    code: 'PMS-01',
    name: 'PT Mitra Ternak Mandiri (Kandang Subang)',
    phone: '0813-8899-2211',
    address: 'Kandang Modern Blok C, Pagaden, Subang',
    notes: 'Kapasitas suplai broiler 1.000 - 2.000 ekor/hari. Rutin panen pagi.',
  },
  {
    id: 'sup-2',
    code: 'PMS-02',
    name: 'CV Berkah Unggas Farm',
    phone: '0812-7766-5544',
    address: 'Jl. Raya Sukabumi Km 12, Jawa Barat',
    notes: 'Spesialis karkas dingin & fillet siap olah, kualitas sertifikasi halal.',
  },
  {
    id: 'sup-3',
    code: 'PMS-03',
    name: 'Pengepul Ayam H. Syamsuddin',
    phone: '0857-1122-3344',
    address: 'Pasar Induk Unggas Karang Anyar',
    notes: 'Pemasok alternatif cepat jika kandang utama habis.',
  },
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    code: 'CST-01',
    name: 'Resto Ayam Geprek Juara',
    phone: '0812-9988-1122',
    address: 'Ruko Boulevard No. 45',
    type: 'Restoran / Rumah Makan',
    defaultDiscountPercent: 2,
    notes: 'Pengambilan rutin Fillet Dada 20-30 kg per hari pukul 07.00 pagi.',
  },
  {
    id: 'cust-2',
    code: 'CST-02',
    name: 'Warung Tenda Pecel Lele Cak Joko',
    phone: '0878-5544-3322',
    address: 'Pertigaan Lampu Merah Pos Pengumben',
    type: 'Langganan',
    defaultDiscountPercent: 0,
    notes: 'Langganan Karkas 0.8-1.0 kg 15 ekor setiap sore.',
  },
  {
    id: 'cust-3',
    code: 'CST-03',
    name: 'Ibu Hj. Aminah (Pedagang Pasar Pagi)',
    phone: '0856-7788-9900',
    address: 'Los Daging No. 12 Pasar Baru',
    type: 'Grosir',
    defaultDiscountPercent: 3,
    notes: 'Beli ayam hidup atau karkas partai 50 ekor.',
  },
  {
    id: 'cust-4',
    code: 'CST-04',
    name: 'Katering Berkah Rasa Ibu Dewi',
    phone: '0811-3322-1144',
    address: 'Kavling DKI Blok F No. 8',
    type: 'Katering',
    defaultDiscountPercent: 1.5,
    notes: 'Pesanan partai paha & fillet untuk acara pesta.',
  },
  {
    id: 'cust-5',
    code: 'CST-05',
    name: 'Pelanggan Umum (Eceran Tunai)',
    phone: '-',
    address: 'Beli langsung di kios',
    type: 'Eceran',
    defaultDiscountPercent: 0,
    notes: 'Walk-in customer tunai',
  },
];

const DEFAULT_EMPLOYEES: Employee[] = [];

const DEFAULT_KASBON: EmployeeKasbonRecord[] = [];

// Helper to seed initial transactions
function createInitialTransactions() {
  const purchases: PurchaseTransaction[] = [
    {
      id: 'pur-1',
      invoiceNumber: 'PO-20261025-101',
      date: '2026-10-25T07:30:00Z',
      supplierId: 'sup-1',
      supplierName: 'PT Mitra Ternak Mandiri (Kandang Subang)',
      items: [
        {
          itemId: 'item-1',
          itemName: 'Ayam Broiler Hidup',
          unit: 'kg',
          quantity: 350,
          buyPrice: 21500,
          subtotal: 7525000,
          effectiveHPP: 23200,
          targetSellPrice: 28000,
          profit: 2275000,
        },
        {
          itemId: 'item-4',
          itemName: 'Daging Fillet Dada (Boneless)',
          unit: 'kg',
          quantity: 40,
          buyPrice: 42000,
          subtotal: 1680000,
          effectiveHPP: 43700,
          targetSellPrice: 52000,
          profit: 400000,
        }
      ],
      additionalCosts: [
        { id: 'cost-1', name: 'Ongkos Kirim Armada Pick Up / Truk', amount: 350000 },
        { id: 'cost-2', name: 'Es Balok Pendingin Transport', amount: 80000 },
        { id: 'cost-3', name: 'Biaya Bongkar Muat Tenaga', amount: 100000 },
        { id: 'cost-4', name: 'Jasa Pemotongan RPA', amount: 200000 }
      ],
      totalItemsCost: 9205000,
      totalAdditionalCosts: 730000,
      grandTotal: 9935000,
      totalQuantity: 390,
      averageHPPPerUnit: 25474,
      targetSellingPrice: 32000,
      estimatedTotalRevenue: 12480000,
      estimatedProfit: 2545000,
      estimatedProfitMargin: 20.4,
      paymentMethod: 'Transfer',
      paymentStatus: 'Lunas',
      amountPaid: 9935000,
      remainingDebt: 0,
      notes: 'Kiriman subuh, kondisi ayam segar dan sehat. Ongkir & es dimasukkan ke modal.',
      createdBy: 'Admin Usaha',
    },
    {
      id: 'pur-2',
      invoiceNumber: 'PO-20261026-102',
      date: '2026-10-26T06:00:00Z',
      supplierId: 'sup-2',
      supplierName: 'CV Berkah Unggas Farm',
      items: [
        {
          itemId: 'item-2',
          itemName: 'Ayam Karkas Segar (0.8 - 1.0 kg)',
          unit: 'pcs',
          quantity: 100,
          buyPrice: 28000,
          subtotal: 2800000,
          effectiveHPP: 29500,
          targetSellPrice: 35000,
          profit: 700000,
        }
      ],
      additionalCosts: [
        { id: 'cost-p2-1', name: 'Ongkos Kirim Pick Up', amount: 150000 },
      ],
      totalItemsCost: 2800000,
      totalAdditionalCosts: 150000,
      grandTotal: 2950000,
      totalQuantity: 100,
      averageHPPPerUnit: 29500,
      targetSellingPrice: 35000,
      estimatedTotalRevenue: 3500000,
      estimatedProfit: 550000,
      estimatedProfitMargin: 15.7,
      paymentMethod: 'Transfer',
      paymentStatus: 'Sebagian',
      amountPaid: 1500000, // DP dibayar 1.500.000
      remainingDebt: 1450000, // Sisa hutang 1.450.000
      debtPayments: [
        {
          id: 'pay-1',
          date: '2026-10-26T06:30:00Z',
          amount: 1500000,
          paymentMethod: 'Transfer',
          notes: 'Uang muka / DP saat ayam datang',
          recordedBy: 'Admin Usaha',
        }
      ],
      notes: 'Pembayaran DP Rp 1.500.000, sisa Rp 1.450.000 tempo 7 hari',
      createdBy: 'Admin Usaha',
    }
  ];

  const sales: SaleTransaction[] = [
    {
      id: 'sal-1',
      invoiceNumber: 'INV-20261026-401',
      date: '2026-10-26T08:15:00Z',
      customerId: 'cust-1',
      customerName: 'Resto Ayam Geprek Juara',
      customerType: 'Restoran / Rumah Makan',
      items: [
        {
          itemId: 'item-4',
          itemName: 'Daging Fillet Dada (Boneless)',
          unit: 'kg',
          quantity: 15,
          sellPrice: 51000,
          baseCost: 42000,
          subtotal: 765000,
          costSubtotal: 630000,
          itemProfit: 135000,
        },
        {
          itemId: 'item-7',
          itemName: 'Sayap Ayam (Chicken Wings)',
          unit: 'kg',
          quantity: 10,
          sellPrice: 36000,
          baseCost: 29000,
          subtotal: 360000,
          costSubtotal: 290000,
          itemProfit: 70000,
        }
      ],
      subtotal: 1125000,
      discount: 22500, // 2%
      grandTotal: 1102500,
      totalCostHPP: 920000,
      grossProfit: 182500,
      paymentMethod: 'Transfer',
      amountPaid: 1102500,
      change: 0,
      notes: 'Pengiriman pagi armada toko',
      createdBy: 'Kasir Utama',
    },
    {
      id: 'sal-2',
      invoiceNumber: 'INV-20261026-402',
      date: '2026-10-26T10:45:00Z',
      customerId: 'cust-2',
      customerName: 'Warung Tenda Pecel Lele Cak Joko',
      customerType: 'Langganan',
      items: [
        {
          itemId: 'item-2',
          itemName: 'Ayam Karkas Segar (0.8 - 1.0 kg)',
          unit: 'pcs',
          quantity: 15,
          sellPrice: 34000,
          baseCost: 28000,
          subtotal: 510000,
          costSubtotal: 420000,
          itemProfit: 90000,
        },
        {
          itemId: 'item-8',
          itemName: 'Ati Ampela Bersih',
          unit: 'pcs',
          quantity: 3,
          sellPrice: 22000,
          baseCost: 16000,
          subtotal: 66000,
          costSubtotal: 48000,
          itemProfit: 18000,
        }
      ],
      subtotal: 576000,
      discount: 0,
      grandTotal: 576000,
      totalCostHPP: 468000,
      grossProfit: 108000,
      paymentMethod: 'Tunai',
      amountPaid: 600000,
      change: 24000,
      notes: 'Ambil di kios',
      createdBy: 'Kasir Utama',
    }
  ];

  const attendances: AttendanceRecord[] = [
    {
      id: 'att-1',
      date: '2026-10-25',
      employeeId: 'emp-1',
      employeeName: 'Ahmad Supardi',
      role: 'Jagal / Pemotong',
      status: 'Hadir',
      wageAmount: 120000,
      overtimeHours: 0,
      overtimePay: 0,
      notes: 'Hadir penuh normal',
    },
    {
      id: 'att-2',
      date: '2026-10-25',
      employeeId: 'emp-2',
      employeeName: 'Budi Santoso',
      role: 'Sopir / Pengantar',
      status: 'Hadir',
      wageAmount: 110000,
      notes: 'Antar pesanan katering',
    },
    {
      id: 'att-3',
      date: '2026-10-25',
      employeeId: 'emp-3',
      employeeName: 'Siti Rohimah',
      role: 'Kasir',
      status: 'Hadir',
      wageAmount: 100000,
    },
    {
      id: 'att-4',
      date: '2026-10-25',
      employeeId: 'emp-4',
      employeeName: 'Danu Pratama',
      role: 'Helper / Gudang',
      status: 'Hadir',
      wageAmount: 95000,
    },
    {
      id: 'att-5',
      date: '2026-10-26',
      employeeId: 'emp-1',
      employeeName: 'Ahmad Supardi',
      role: 'Jagal / Pemotong',
      status: 'Hadir',
      wageAmount: 120000,
    },
    {
      id: 'att-6',
      date: '2026-10-26',
      employeeId: 'emp-2',
      employeeName: 'Budi Santoso',
      role: 'Sopir / Pengantar',
      status: 'Hadir',
      wageAmount: 110000,
    },
    {
      id: 'att-7',
      date: '2026-10-26',
      employeeId: 'emp-3',
      employeeName: 'Siti Rohimah',
      role: 'Kasir',
      status: 'Hadir',
      wageAmount: 100000,
    },
    {
      id: 'att-8',
      date: '2026-10-26',
      employeeId: 'emp-4',
      employeeName: 'Danu Pratama',
      role: 'Helper / Gudang',
      status: 'Hadir',
      wageAmount: 95000,
    },
  ];

  const expenses: OperationalExpense[] = [
    {
      id: 'exp-1',
      date: '2026-10-24',
      category: 'Listrik & Air',
      description: 'Token listrik cold storage pembeku karkas',
      amount: 450000,
      recordedBy: 'Admin',
    },
    {
      id: 'exp-2',
      date: '2026-10-25',
      category: 'Plastik & Kemasan',
      description: 'Plastik PE bening tebal & isolasi segel',
      amount: 175000,
      recordedBy: 'Admin',
    },
    {
      id: 'exp-3',
      date: '2026-10-26',
      category: 'Bahan Bakar & Kendaraan',
      description: 'Solar truk pengangkut & bensin motor delivery',
      amount: 250000,
      recordedBy: 'Admin',
    }
  ];

  const opnames: StockOpnameRecord[] = [
    {
      id: 'opn-1',
      date: '2026-10-25T17:00:00Z',
      itemId: 'item-1',
      itemName: 'Ayam Broiler Hidup',
      unit: 'kg',
      unitPrice: 21500,
      systemStock: 462,
      physicalStock: 450,
      difference: -12,
      differenceCost: -258000, // 12 kg x Rp 21.500
      reason: 'Susut Timbangan',
      notes: 'Penyusutan normal kadar air selama perjalanan pengiriman',
      adjustedBy: 'Siti Rohimah (User)',
      status: 'Approved',
      approvedBy: 'Admin Usaha',
      approvedAt: '2026-10-25T17:30:00Z',
    },
    {
      id: 'opn-2',
      date: '2026-10-26T18:00:00Z',
      itemId: 'item-2',
      itemName: 'Ayam Karkas Segar (0.8 - 1.0 kg)',
      unit: 'pcs',
      unitPrice: 28000,
      systemStock: 88,
      physicalStock: 85,
      difference: -3,
      differenceCost: -84000, // 3 ekor x Rp 28.000
      reason: 'Mati / Rusak',
      notes: 'Karkas sobek kemasan saat bongkar dari pendingin',
      adjustedBy: 'Siti Rohimah (User)',
      status: 'Pending',
    }
  ];

  return { purchases, sales, attendances, expenses, opnames };
}

export const DEFAULT_PROCESSED_CALCS: ProcessedCalculationRecord[] = [
  {
    id: 'calc-101',
    date: '2026-10-28',
    source: 'PT Berkah Unggas Utama',
    items: [
      { itemId: 'item-1', itemName: 'Ayam Broiler Hidup', unit: 'kg', quantity: 100, sellPrice: 25500, subtotal: 2550000 },
      { itemId: 'item-2', itemName: 'Ayam Karkas Segar (0.8 - 1.0 kg)', unit: 'pcs', quantity: 50, sellPrice: 34000, subtotal: 1700000 },
    ],
    totalModal: 3500000,
    grandTotal: 4250000,
    profit: 750000,
    recordedBy: 'Admin Usaha',
  },
  {
    id: 'calc-102',
    date: '2026-10-29',
    source: 'CV Sumber Ayam Segar',
    items: [
      { itemId: 'item-3', itemName: 'Dada Ayam Fillet Boneless', unit: 'kg', quantity: 30, sellPrice: 52000, subtotal: 1560000 },
      { itemId: 'item-4', itemName: 'Paha Ayam Utuh', unit: 'kg', quantity: 25, sellPrice: 38000, subtotal: 950000 },
      { itemId: 'item-5', itemName: 'Sayap Ayam Potong', unit: 'kg', quantity: 20, sellPrice: 35000, subtotal: 700000 },
    ],
    totalModal: 2600000,
    grandTotal: 3210000,
    profit: 610000,
    recordedBy: 'Admin Usaha',
  },
  {
    id: 'calc-103',
    date: '2026-10-30',
    source: 'Mandiri / Olahan Toko',
    items: [
      { itemId: 'item-6', itemName: 'Ati Ampela Bersih', unit: 'kg', quantity: 15, sellPrice: 28000, subtotal: 420000 },
      { itemId: 'item-7', itemName: 'Ceker Ayam Bersih', unit: 'kg', quantity: 15, sellPrice: 22000, subtotal: 330000 },
      { itemId: 'item-8', itemName: 'Kepala Ayam Segar', unit: 'kg', quantity: 10, sellPrice: 15000, subtotal: 150000 },
    ],
    totalModal: 700000,
    grandTotal: 900000,
    profit: 200000,
    recordedBy: 'Admin Usaha',
  },
];

// Storage Manager Functions
export const StorageManager = {
  checkAndClearOldData() {
    const clearedFlag = localStorage.getItem('ayampro_cleared_v3');
    if (!clearedFlag) {
      const users = this.getUsers();
      const adminUsers = users.filter(u => u.role === 'admin');
      const finalUsers = adminUsers.length > 0 ? adminUsers : DEFAULT_USERS.filter(u => u.role === 'admin');

      localStorage.clear();
      localStorage.setItem('ayampro_cleared_v3', 'true');
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(finalUsers));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(finalUsers[0]));
    }
  },

  getCurrentUser(): AuthUser | null {
    this.checkAndClearOldData();
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!data) return DEFAULT_USERS[0];
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_USERS[0];
    }
  },

  setCurrentUser(user: AuthUser | null) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  },

  getUsers(): AuthUser[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  },

  saveUsers(users: AuthUser[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  addUser(newUser: Omit<AuthUser, 'id'>): AuthUser {
    const users = this.getUsers();
    const id = `user-${Date.now()}`;
    const user: AuthUser = { ...newUser, id };
    const updated = [...users, user];
    this.saveUsers(updated);
    return user;
  },

  updateUser(updatedUser: AuthUser): void {
    const users = this.getUsers();
    const updated = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    this.saveUsers(updated);

    // Keep currentUser in sync if it was the updated user
    const current = this.getCurrentUser();
    if (current && current.id === updatedUser.id) {
      this.setCurrentUser(updatedUser);
    }
  },

  deleteUser(userId: string): boolean {
    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) return false;
    // Owner user cannot be deleted
    if (target.username.toLowerCase() === 'admin' || target.id === 'user-admin') {
      return false;
    }
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (target.role === 'admin' && adminCount <= 1) {
      return false; // Minimum 1 admin required
    }
    const updated = users.filter(u => u.id !== userId);
    this.saveUsers(updated);
    return true;
  },

  getStoreProfile(): StoreProfile {
    const data = localStorage.getItem(STORAGE_KEYS.STORE_PROFILE);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.STORE_PROFILE, JSON.stringify(DEFAULT_STORE_PROFILE));
      return DEFAULT_STORE_PROFILE;
    }
    try {
      const parsed = JSON.parse(data);
      if (!parsed.logoUrl) {
        parsed.logoUrl = '/logo_unggas.svg';
      }
      return parsed;
    } catch {
      return DEFAULT_STORE_PROFILE;
    }
  },

  saveStoreProfile(profile: StoreProfile) {
    localStorage.setItem(STORAGE_KEYS.STORE_PROFILE, JSON.stringify(profile));
  },

  getItems(): Item[] {
    const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!data) return [];
    try {
      const items: Item[] = JSON.parse(data);
      // Normalize units to only 'kg' and 'pcs'
      return items.map(item => ({
        ...item,
        unit: item.unit === 'kg' ? 'kg' : 'pcs'
      }));
    } catch {
      return [];
    }
  },

  saveItems(items: Item[]) {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  },

  getSuppliers(): Supplier[] {
    const data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveSuppliers(suppliers: Supplier[]) {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  getCustomers(): Customer[] {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveCustomers(customers: Customer[]) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  getPurchases(): PurchaseTransaction[] {
    const data = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  savePurchases(purchases: PurchaseTransaction[]) {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
  },

  getSales(): SaleTransaction[] {
    const data = localStorage.getItem(STORAGE_KEYS.SALES);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveSales(sales: SaleTransaction[]) {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  },

  getOpnameRecords(): StockOpnameRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.OPNAME_RECORDS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveOpnameRecords(records: StockOpnameRecord[]) {
    localStorage.setItem(STORAGE_KEYS.OPNAME_RECORDS, JSON.stringify(records));
  },

  getEmployees(): Employee[] {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveEmployees(employees: Employee[]) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  },

  getAttendance(): AttendanceRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveAttendance(attendance: AttendanceRecord[]) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
  },

  getSalarySlips(): SalarySlip[] {
    const data = localStorage.getItem(STORAGE_KEYS.SALARY_SLIPS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveSalarySlips(slips: SalarySlip[]) {
    localStorage.setItem(STORAGE_KEYS.SALARY_SLIPS, JSON.stringify(slips));
  },

  getKasbonRecords(): EmployeeKasbonRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.KASBON);
    if (!data) {
      this.saveKasbonRecords(DEFAULT_KASBON);
      return DEFAULT_KASBON;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_KASBON;
    }
  },

  saveKasbonRecords(records: EmployeeKasbonRecord[]) {
    localStorage.setItem(STORAGE_KEYS.KASBON, JSON.stringify(records));
  },

  getExpenses(): OperationalExpense[] {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveExpenses(expenses: OperationalExpense[]) {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  },

  getOperationalTransactions(): OperationalTransaction[] {
    const data = localStorage.getItem(STORAGE_KEYS.OPERATIONAL_TXS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveOperationalTransactions(txs: OperationalTransaction[]) {
    localStorage.setItem(STORAGE_KEYS.OPERATIONAL_TXS, JSON.stringify(txs));
  },

  getProcessedCalcs(): ProcessedCalculationRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.PROCESSED_CALCS);
    if (!data) return DEFAULT_PROCESSED_CALCS;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PROCESSED_CALCS;
    } catch {
      return DEFAULT_PROCESSED_CALCS;
    }
  },

  saveProcessedCalcs(records: ProcessedCalculationRecord[]) {
    localStorage.setItem(STORAGE_KEYS.PROCESSED_CALCS, JSON.stringify(records));
  },

  getPreOrders(): CustomerPreOrder[] {
    const data = localStorage.getItem(STORAGE_KEYS.PREORDERS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  savePreOrders(orders: CustomerPreOrder[]) {
    localStorage.setItem(STORAGE_KEYS.PREORDERS, JSON.stringify(orders));
  },

  // Reset all to sample data
  resetAllData() {
    const existingUsers = this.getUsers();
    const adminUsers = existingUsers.filter(u => u.role === 'admin');
    const finalUsers = adminUsers.length > 0 ? adminUsers : DEFAULT_USERS.filter(u => u.role === 'admin');

    localStorage.clear();

    localStorage.setItem(STORAGE_KEYS.STORE_PROFILE, JSON.stringify(DEFAULT_STORE_PROFILE));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(finalUsers));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(finalUsers[0]));
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.OPNAME_RECORDS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SALARY_SLIPS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
  },

  // Export full JSON backup
  exportBackup(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      storeProfile: this.getStoreProfile(),
      users: this.getUsers(),
      items: this.getItems(),
      suppliers: this.getSuppliers(),
      customers: this.getCustomers(),
      purchases: this.getPurchases(),
      sales: this.getSales(),
      opnameRecords: this.getOpnameRecords(),
      employees: this.getEmployees(),
      attendance: this.getAttendance(),
      salarySlips: this.getSalarySlips(),
      expenses: this.getExpenses(),
    };
    return JSON.stringify(backup, null, 2);
  },

  // Import backup JSON
  importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.storeProfile) this.saveStoreProfile(data.storeProfile);
      if (Array.isArray(data.users)) this.saveUsers(data.users);
      if (Array.isArray(data.items)) this.saveItems(data.items);
      if (Array.isArray(data.suppliers)) this.saveSuppliers(data.suppliers);
      if (Array.isArray(data.customers)) this.saveCustomers(data.customers);
      if (Array.isArray(data.purchases)) this.savePurchases(data.purchases);
      if (Array.isArray(data.sales)) this.saveSales(data.sales);
      if (Array.isArray(data.opnameRecords)) this.saveOpnameRecords(data.opnameRecords);
      if (Array.isArray(data.employees)) this.saveEmployees(data.employees);
      if (Array.isArray(data.attendance)) this.saveAttendance(data.attendance);
      if (Array.isArray(data.salarySlips)) this.saveSalarySlips(data.salarySlips);
      if (Array.isArray(data.expenses)) this.saveExpenses(data.expenses);
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  }
};
