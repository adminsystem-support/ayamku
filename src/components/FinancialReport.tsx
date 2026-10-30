import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  Printer, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  Receipt,
  PieChart,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  ChevronRight,
  History,
  Search,
  Wallet,
  Building2,
  Users,
  Eye,
  FileText,
  MessageCircle,
  Send,
  ArrowUpDown,
  ArrowDownRight,
  Coins
} from 'lucide-react';
import { 
  SaleTransaction, 
  PurchaseTransaction, 
  SaleItem,
  PurchaseItem,
  SalarySlip, 
  AttendanceRecord,
  OperationalExpense, 
  StoreProfile,
  UserRole,
  DebtPayment,
  Customer,
  Supplier,
  EmployeeKasbonRecord
} from '../types/index.ts';
import { 
  formatCurrency, 
  formatNumber, 
  formatDate, 
  formatDateTime, 
  getMonthYearKey, 
  generateInvoiceCode,
  formatPhoneNumberForWhatsApp,
  generateWhatsAppDebtReminderMessage
} from '../utils/formatters.ts';

export interface CashFlowItem {
  id: string;
  date: string;
  timestamp: number;
  flowType: 'masuk' | 'keluar';
  category: 
    | 'Penjualan' 
    | 'Pembayaran Piutang Pelanggan' 
    | 'Pelunasan Kasbon Karyawan' 
    | 'Pembelian Ayam' 
    | 'Pembayaran Utang Supplier' 
    | 'Gaji Karyawan' 
    | 'Biaya Operasional' 
    | 'Pinjaman Kasbon Karyawan';
  title: string;
  description: string;
  counterparty: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
}

interface FinancialReportProps {
  sales: SaleTransaction[];
  purchases: PurchaseTransaction[];
  customers?: Customer[];
  suppliers?: Supplier[];
  salarySlips: SalarySlip[];
  attendanceRecords: AttendanceRecord[];
  expenses: OperationalExpense[];
  kasbonRecords?: EmployeeKasbonRecord[];
  onAddExpense: (expense: OperationalExpense) => void;
  onPayPurchaseDebt?: (purchaseId: string, payment: DebtPayment) => void;
  onPayCustomerDebt?: (saleId: string, payment: DebtPayment) => void;
  onPrintDocument?: (printData: any) => void;
  storeProfile: StoreProfile;
  userRole: UserRole;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  sales,
  purchases,
  customers = [],
  suppliers = [],
  salarySlips,
  attendanceRecords,
  expenses,
  kasbonRecords = [],
  onAddExpense,
  onPayPurchaseDebt,
  onPayCustomerDebt,
  onPrintDocument,
  storeProfile,
  userRole,
}) => {
  // Current month & year selector
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  
  // Expense form modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<OperationalExpense['category']>('Listrik & Air');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState<number>(100000);
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().substring(0, 10));

  // Hutang & Piutang Filters & States
  const [debtFilterType, setDebtFilterType] = useState<'all' | 'hutang_pembelian' | 'piutang_penjualan'>('all');
  const [debtStatusFilter, setDebtStatusFilter] = useState<'unpaid' | 'all' | 'paid'>('unpaid');
  const [debtSearchQuery, setDebtSearchQuery] = useState('');
  const [filterByMonthOnly, setFilterByMonthOnly] = useState(false);

  // Pay Purchase Debt Modal State
  const [debtModalPurchase, setDebtModalPurchase] = useState<(PurchaseTransaction & { computedRemaining: number; computedPaid: number; isLunas: boolean }) | null>(null);
  const [purchasePayMode, setPurchasePayMode] = useState<'lunas' | 'sebagian'>('lunas');
  const [purchasePayAmount, setPurchasePayAmount] = useState<number>(0);
  const [purchasePayMethod, setPurchasePayMethod] = useState<'Tunai' | 'Transfer'>('Transfer');
  const [purchasePayNotes, setPurchasePayNotes] = useState('');

  // Pay Customer Debt (Piutang) Modal State
  const [debtModalSale, setDebtModalSale] = useState<(SaleTransaction & { computedRemaining: number; computedPaid: number; isLunas: boolean }) | null>(null);
  const [salePayMode, setSalePayMode] = useState<'lunas' | 'sebagian'>('lunas');
  const [salePayAmount, setSalePayAmount] = useState<number>(0);
  const [salePayMethod, setSalePayMethod] = useState<'Tunai' | 'Transfer'>('Tunai');
  const [salePayNotes, setSalePayNotes] = useState('');

  // View Detail Modal State
  const [selectedDetailModal, setSelectedDetailModal] = useState<{
    type: 'purchase' | 'sale';
    id: string;
  } | null>(null);

  // New Party Detail Modal State
  const [selectedPartyDetail, setSelectedPartyDetail] = useState<{
    type: 'purchase' | 'sale';
    name: string;
  } | null>(null);

  // View Debt History Modal
  const [historyModalData, setHistoryModalData] = useState<{
    title: string;
    invoice: string;
    counterparty: string;
    total: number;
    paid: number;
    remaining: number;
    payments: DebtPayment[];
  } | null>(null);

  // Filter data by selected month
  const monthlySales = useMemo(() => {
    return sales.filter(s => s.date.startsWith(selectedMonth));
  }, [sales, selectedMonth]);

  const monthlyPurchases = useMemo(() => {
    return purchases.filter(p => p.date.startsWith(selectedMonth));
  }, [purchases, selectedMonth]);

  const monthlySlips = useMemo(() => {
    return salarySlips.filter(s => s.periodEnd.startsWith(selectedMonth));
  }, [salarySlips, selectedMonth]);

  const monthlyAttendanceWages = useMemo(() => {
    return attendanceRecords.filter(a => a.date.startsWith(selectedMonth));
  }, [attendanceRecords, selectedMonth]);

  const monthlyExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Calculations for Laba Rugi
  const totalRevenue = useMemo(() => {
    return monthlySales.reduce((sum, s) => sum + s.grandTotal, 0);
  }, [monthlySales]);

  const totalHPP = useMemo(() => {
    return monthlySales.reduce((sum, s) => sum + s.totalCostHPP, 0);
  }, [monthlySales]);

  const grossProfit = useMemo(() => {
    return totalRevenue - totalHPP;
  }, [totalRevenue, totalHPP]);

  const grossMarginPercent = useMemo(() => {
    return totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  }, [grossProfit, totalRevenue]);

  const totalSalaries = useMemo(() => {
    if (monthlySlips.length > 0) {
      return monthlySlips.reduce((sum, s) => sum + s.netSalary, 0);
    }
    return monthlyAttendanceWages.reduce((sum, a) => sum + a.wageAmount + (a.overtimePay || 0), 0);
  }, [monthlySlips, monthlyAttendanceWages]);

  const totalOtherExpenses = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  const totalOperatingCosts = useMemo(() => {
    return totalSalaries + totalOtherExpenses;
  }, [totalSalaries, totalOtherExpenses]);

  const netProfit = useMemo(() => {
    return grossProfit - totalOperatingCosts;
  }, [grossProfit, totalOperatingCosts]);

  const netMarginPercent = useMemo(() => {
    return totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  }, [netProfit, totalRevenue]);

  // Breakdown detail pengeluaran operasional per kategori
  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      'Listrik & Air': 0,
      'Bahan Bakar & Kendaraan': 0,
      'Plastik & Kemasan': 0,
      'Sewa Tempat & Cold Storage': 0,
      'Perawatan Peralatan': 0,
      'Lain-lain': 0,
    };
    monthlyExpenses.forEach(e => {
      if (map[e.category] !== undefined) {
        map[e.category] += e.amount;
      } else {
        map['Lain-lain'] += e.amount;
      }
    });
    return map;
  }, [monthlyExpenses]);

  // Total Kasbon Diberikan & Dibayar Bulan Ini
  const monthlyKasbonGiven = useMemo(() => {
    return kasbonRecords
      .filter(k => k.type === 'pinjam' && k.date.startsWith(selectedMonth))
      .reduce((sum, k) => sum + k.amount, 0);
  }, [kasbonRecords, selectedMonth]);

  const monthlyKasbonRepaid = useMemo(() => {
    return kasbonRecords
      .filter(k => (k.type === 'bayar_manual' || k.type === 'bayar_slip') && k.date.startsWith(selectedMonth))
      .reduce((sum, k) => sum + k.amount, 0);
  }, [kasbonRecords, selectedMonth]);

  const totalActiveKasbonBalance = useMemo(() => {
    return Math.max(0, kasbonRecords.reduce((sum, k) => {
      if (k.type === 'pinjam') return sum + k.amount;
      return sum - k.amount;
    }, 0));
  }, [kasbonRecords]);

  const totalBaseSalaries = useMemo(() => {
    if (monthlySlips.length > 0) {
      return monthlySlips.reduce((sum, s) => sum + s.totalDailyWage, 0);
    }
    return monthlyAttendanceWages.reduce((sum, a) => sum + a.wageAmount, 0);
  }, [monthlySlips, monthlyAttendanceWages]);

  const totalOvertimeSalaries = useMemo(() => {
    if (monthlySlips.length > 0) {
      return monthlySlips.reduce((sum, s) => sum + s.totalOvertimePay, 0);
    }
    return monthlyAttendanceWages.reduce((sum, a) => sum + (a.overtimePay || 0), 0);
  }, [monthlySlips, monthlyAttendanceWages]);

  const totalKasbonDeductions = useMemo(() => {
    return monthlySlips.reduce((sum, s) => sum + s.deduction, 0);
  }, [monthlySlips]);

  // ----------------------------------------------------
  // ARUS KAS / MUTASI KELUAR MASUK UANG (SYNCHRONIZED CASH FLOW)
  // ----------------------------------------------------
  const [cashFlowFilterType, setCashFlowFilterType] = useState<'all' | 'masuk' | 'keluar' | 'bon'>('all');
  const [cashFlowCategoryFilter, setCashFlowCategoryFilter] = useState<string>('all');
  const [cashFlowSearch, setCashFlowSearch] = useState<string>('');

  const allCashFlowTransactions = useMemo<CashFlowItem[]>(() => {
    const list: CashFlowItem[] = [];

    // 1. Penerimaan Uang dari Penjualan (Uang Masuk Langsung)
    sales.forEach((s) => {
      if (s.amountPaid > 0) {
        list.push({
          id: `cf-sale-${s.id}`,
          date: s.date,
          timestamp: new Date(s.date).getTime() || 0,
          flowType: 'masuk',
          category: 'Penjualan',
          title: `Penjualan Nota ${s.invoiceNumber}`,
          description: `Pembayaran ${s.paymentMethod || 'Tunai'} pelanggan ${s.customerName}`,
          counterparty: s.customerName,
          amount: s.amountPaid,
          paymentMethod: s.paymentMethod || 'Tunai',
          referenceNo: s.invoiceNumber,
        });
      }

      // Pembayaran Piutang / Cicilan Bon Pelanggan (BKM - Uang Masuk)
      if (s.customerDebtPayments && s.customerDebtPayments.length > 0) {
        s.customerDebtPayments.forEach((dp) => {
          list.push({
            id: `cf-sdebt-${s.id}-${dp.id}`,
            date: dp.date,
            timestamp: new Date(dp.date).getTime() || 0,
            flowType: 'masuk',
            category: 'Pembayaran Piutang Pelanggan',
            title: `Pelunasan Piutang (${dp.receiptNo || s.invoiceNumber})`,
            description: dp.notes || `Pembayaran bon oleh ${s.customerName} (Faktur: ${s.invoiceNumber})`,
            counterparty: s.customerName,
            amount: dp.amount,
            paymentMethod: dp.paymentMethod || 'Tunai',
            referenceNo: dp.receiptNo || s.invoiceNumber,
          });
        });
      }
    });

    // 2. Pengeluaran Uang untuk Pembelian Ayam / Supplier (Uang Keluar Langsung)
    purchases.forEach((p) => {
      const paid = p.amountPaid !== undefined ? p.amountPaid : (p.paymentStatus === 'Lunas' ? p.grandTotal : 0);
      if (paid > 0) {
        list.push({
          id: `cf-purch-${p.id}`,
          date: p.date,
          timestamp: new Date(p.date).getTime() || 0,
          flowType: 'keluar',
          category: 'Pembelian Ayam',
          title: `Pembelian Faktur ${p.invoiceNumber}`,
          description: `Pembayaran ${p.paymentMethod || 'Tunai'} ke pemasok ${p.supplierName}`,
          counterparty: p.supplierName,
          amount: paid,
          paymentMethod: p.paymentMethod || 'Tunai',
          referenceNo: p.invoiceNumber,
        });
      }

      // Pembayaran Hutang ke Supplier (BKK - Uang Keluar)
      if (p.debtPayments && p.debtPayments.length > 0) {
        p.debtPayments.forEach((dp) => {
          list.push({
            id: `cf-pdebt-${p.id}-${dp.id}`,
            date: dp.date,
            timestamp: new Date(dp.date).getTime() || 0,
            flowType: 'keluar',
            category: 'Pembayaran Utang Supplier',
            title: `Pembayaran Utang (${dp.receiptNo || p.invoiceNumber})`,
            description: dp.notes || `Cicilan/pelunasan hutang ke ${p.supplierName} (Faktur: ${p.invoiceNumber})`,
            counterparty: p.supplierName,
            amount: dp.amount,
            paymentMethod: dp.paymentMethod || 'Transfer',
            referenceNo: dp.receiptNo || p.invoiceNumber,
          });
        });
      }
    });

    // 3. Pembayaran Gaji & Upah Karyawan (Uang Keluar)
    salarySlips.forEach((slip) => {
      if (slip.netSalary > 0) {
        const dateStr = slip.generatedDate || slip.periodEnd;
        list.push({
          id: `cf-slip-${slip.id}`,
          date: dateStr,
          timestamp: new Date(dateStr).getTime() || 0,
          flowType: 'keluar',
          category: 'Gaji Karyawan',
          title: `Gaji Karyawan (${slip.slipNumber})`,
          description: `Gaji bersih ${slip.employeeName} (${slip.employeeRole}) periode ${formatDate(slip.periodStart)} s/d ${formatDate(slip.periodEnd)}`,
          counterparty: slip.employeeName,
          amount: slip.netSalary,
          paymentMethod: 'Tunai',
          referenceNo: slip.slipNumber,
        });
      }
    });

    // 4. Biaya Operasional Toko (Listrik, BBM, Sewa, Plastik, dll - Uang Keluar)
    expenses.forEach((exp) => {
      if (exp.amount > 0) {
        list.push({
          id: `cf-exp-${exp.id}`,
          date: exp.date,
          timestamp: new Date(exp.date).getTime() || 0,
          flowType: 'keluar',
          category: 'Biaya Operasional',
          title: `Operasional: ${exp.category}`,
          description: exp.description || `Pengeluaran ${exp.category}`,
          counterparty: exp.recordedBy || 'Admin Usaha',
          amount: exp.amount,
          paymentMethod: 'Tunai',
          referenceNo: exp.id,
        });
      }
    });

    // 5. Kasbon Karyawan:
    // - Pinjaman Kasbon Baru = UANG KELUAR
    // - Pelunasan Kasbon Manual (Setor Tunai) = UANG MASUK
    kasbonRecords.forEach((k) => {
      if (k.type === 'pinjam' && k.amount > 0) {
        list.push({
          id: `cf-kasbon-${k.id}`,
          date: k.date,
          timestamp: new Date(k.createdAt || k.date).getTime() || 0,
          flowType: 'keluar',
          category: 'Pinjaman Kasbon Karyawan',
          title: `Pinjaman Kasbon - ${k.employeeName}`,
          description: k.notes ? `Pinjaman kasbon: ${k.notes}` : `Pemberian pinjaman kasbon untuk ${k.employeeName}`,
          counterparty: k.employeeName,
          amount: k.amount,
          paymentMethod: 'Tunai',
          referenceNo: k.id,
        });
      } else if (k.type === 'bayar_manual' && k.amount > 0) {
        list.push({
          id: `cf-kasbon-${k.id}`,
          date: k.date,
          timestamp: new Date(k.createdAt || k.date).getTime() || 0,
          flowType: 'masuk',
          category: 'Pelunasan Kasbon Karyawan',
          title: `Setor Pelunasan Kasbon - ${k.employeeName}`,
          description: k.notes ? `Pelunasan kasbon: ${k.notes}` : `Penerimaan setor tunai kasbon dari ${k.employeeName}`,
          counterparty: k.employeeName,
          amount: k.amount,
          paymentMethod: 'Tunai',
          referenceNo: k.id,
        });
      }
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [sales, purchases, salarySlips, expenses, kasbonRecords]);

  // Transaksi Arus Kas Bulan Ini
  const monthlyCashFlowTransactions = useMemo(() => {
    return allCashFlowTransactions.filter((item) => item.date.startsWith(selectedMonth));
  }, [allCashFlowTransactions, selectedMonth]);

  // Total Uang Masuk Bulan Ini
  const totalCashIn = useMemo(() => {
    return monthlyCashFlowTransactions
      .filter((item) => item.flowType === 'masuk')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [monthlyCashFlowTransactions]);

  // Total Uang Keluar Bulan Ini
  const totalCashOut = useMemo(() => {
    return monthlyCashFlowTransactions
      .filter((item) => item.flowType === 'keluar')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [monthlyCashFlowTransactions]);

  // Saldo Arus Kas Bersih (Surplus / Defisit Kas Riil)
  const netCashFlow = useMemo(() => {
    return totalCashIn - totalCashOut;
  }, [totalCashIn, totalCashOut]);

  // Rincian Kategori Arus Kas Bulan Ini
  const cashInSales = useMemo(() => monthlyCashFlowTransactions.filter(i => i.category === 'Penjualan').reduce((s, i) => s + i.amount, 0), [monthlyCashFlowTransactions]);
  const cashInDebt = useMemo(() => monthlyCashFlowTransactions.filter(i => i.category === 'Pembayaran Piutang Pelanggan').reduce((s, i) => s + i.amount, 0), [monthlyCashFlowTransactions]);
  const cashInKasbon = useMemo(() => monthlyCashFlowTransactions.filter(i => i.category === 'Pelunasan Kasbon Karyawan').reduce((s, i) => s + i.amount, 0), [monthlyCashFlowTransactions]);

  const cashOutPurchase = useMemo(() => monthlyCashFlowTransactions.filter(i => i.category === 'Pembelian Ayam').reduce((s, i) => s + i.amount, 0), [monthlyCashFlowTransactions]);
  const cashOutDebt = useMemo(() => monthlyCashFlowTransactions.filter(i => i.category === 'Pembayaran Utang Supplier').reduce((s, i) => s + i.amount, 0), [monthlyCashFlowTransactions]);
  const cashOutSalary = useMemo(() => monthlyCashFlowTransactions.filter(i => i.category === 'Gaji Karyawan').reduce((s, i) => s + i.amount, 0), [monthlyCashFlowTransactions]);
  const cashOutExpense = useMemo(() => monthlyCashFlowTransactions.filter(i => i.category === 'Biaya Operasional').reduce((s, i) => s + i.amount, 0), [monthlyCashFlowTransactions]);
  const cashOutKasbon = useMemo(() => monthlyCashFlowTransactions.filter(i => i.category === 'Pinjaman Kasbon Karyawan').reduce((s, i) => s + i.amount, 0), [monthlyCashFlowTransactions]);

  // ----------------------------------------------------
  // HUTANG & PIUTANG CALCULATIONS & LISTS
  // ----------------------------------------------------

  // 1. Purchases with Debt info
  const processedPurchases = useMemo(() => {
    let list = purchases;
    if (filterByMonthOnly) {
      list = list.filter(p => p.date.startsWith(selectedMonth));
    }

    return list.map(p => {
      const amountPaid = p.amountPaid !== undefined ? p.amountPaid : (p.paymentStatus === 'Lunas' ? p.grandTotal : 0);
      const remainingDebt = p.remainingDebt !== undefined ? p.remainingDebt : Math.max(0, p.grandTotal - amountPaid);
      const isLunas = remainingDebt === 0 || p.paymentStatus === 'Lunas';
      return {
        ...p,
        computedPaid: amountPaid,
        computedRemaining: remainingDebt,
        isLunas,
      };
    });
  }, [purchases, filterByMonthOnly, selectedMonth]);

  // 2. Sales with Receivable (Piutang) info
  const processedSales = useMemo(() => {
    let list = sales;
    if (filterByMonthOnly) {
      list = list.filter(s => s.date.startsWith(selectedMonth));
    }

    return list.map(s => {
      const amountPaid = s.amountPaid || 0;
      const remainingReceivable = Math.max(0, s.grandTotal - amountPaid);
      const isLunas = remainingReceivable === 0;
      return {
        ...s,
        computedPaid: amountPaid,
        computedRemaining: remainingReceivable,
        isLunas,
      };
    });
  }, [sales, filterByMonthOnly, selectedMonth]);

  // Filtered Cash Flow list for display table
  const filteredCashFlowTransactions = useMemo(() => {
    return monthlyCashFlowTransactions.filter((item) => {
      // Flow type / bon filter
      if (cashFlowFilterType === 'masuk' && item.flowType !== 'masuk') return false;
      if (cashFlowFilterType === 'keluar' && item.flowType !== 'keluar') return false;
      if (cashFlowFilterType === 'bon') {
        const isPiutangOrHutang = item.category === 'Pembayaran Piutang Pelanggan' || item.category === 'Pembayaran Utang Supplier';
        const matchedPurchase = processedPurchases.find(p => p.invoiceNumber === item.referenceNo);
        const matchedSale = processedSales.find(s => s.invoiceNumber === item.referenceNo);
        const hasUnpaid = (matchedPurchase && !matchedPurchase.isLunas) || (matchedSale && !matchedSale.isLunas);
        if (!isPiutangOrHutang && !hasUnpaid) return false;
      }
      // Category filter
      if (cashFlowCategoryFilter !== 'all' && item.category !== cashFlowCategoryFilter) return false;
      // Search filter
      if (cashFlowSearch.trim()) {
        const q = cashFlowSearch.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchParty = item.counterparty.toLowerCase().includes(q);
        const matchRef = (item.referenceNo || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchParty && !matchRef) return false;
      }
      return true;
    });
  }, [monthlyCashFlowTransactions, cashFlowFilterType, cashFlowCategoryFilter, cashFlowSearch, processedPurchases, processedSales]);

  // Filtered Purchases list for table
  const filteredPurchases = useMemo(() => {
    return processedPurchases.filter(p => {
      // Status filter
      if (debtStatusFilter === 'unpaid' && p.isLunas) return false;
      if (debtStatusFilter === 'paid' && !p.isLunas) return false;
      // Search query
      if (debtSearchQuery.trim()) {
        const q = debtSearchQuery.toLowerCase();
        return p.invoiceNumber.toLowerCase().includes(q) ||
               p.supplierName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [processedPurchases, debtStatusFilter, debtSearchQuery]);

  // Filtered Sales list for table
  const filteredSales = useMemo(() => {
    return processedSales.filter(s => {
      // Status filter
      if (debtStatusFilter === 'unpaid' && s.isLunas) return false;
      if (debtStatusFilter === 'paid' && !s.isLunas) return false;
      // Search query
      if (debtSearchQuery.trim()) {
        const q = debtSearchQuery.toLowerCase();
        return s.invoiceNumber.toLowerCase().includes(q) ||
               s.customerName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [processedSales, debtStatusFilter, debtSearchQuery]);

  // Totals
  const totalUnpaidPurchaseDebt = useMemo(() => {
    return processedPurchases.reduce((sum, p) => sum + p.computedRemaining, 0);
  }, [processedPurchases]);

  const totalUnpaidSaleReceivable = useMemo(() => {
    return processedSales.reduce((sum, s) => sum + s.computedRemaining, 0);
  }, [processedSales]);

  const countUnpaidPurchases = useMemo(() => {
    return processedPurchases.filter(p => !p.isLunas).length;
  }, [processedPurchases]);

  const countUnpaidSales = useMemo(() => {
    return processedSales.filter(s => !s.isLunas).length;
  }, [processedSales]);

  // Send WhatsApp Debt Reminder to Customer
  const handleSendWAReminder = (s: typeof processedSales[0]) => {
    const matchedCustomer = customers.find(c => c.id === s.customerId || c.name.toLowerCase() === s.customerName.toLowerCase());
    let rawPhone = matchedCustomer?.phone || '';

    if (!rawPhone) {
      const userEntered = window.prompt(`Masukkan nomor WhatsApp pelanggan ${s.customerName}:`, '');
      if (!userEntered) return;
      rawPhone = userEntered;
    }

    const formattedPhone = formatPhoneNumberForWhatsApp(rawPhone);
    const textMsg = generateWhatsAppDebtReminderMessage(
      s.customerName,
      s.invoiceNumber,
      s.date,
      s.grandTotal,
      s.computedPaid,
      s.computedRemaining,
      storeProfile.name
    );

    window.open(`https://wa.me/${formattedPhone}?text=${textMsg}`, '_blank');
  };

  // Handlers for expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0) return;

    const newExp: OperationalExpense = {
      id: `exp-${Date.now()}`,
      date: expDate,
      category: expCategory,
      description: expDesc.trim(),
      amount: expAmount,
      recordedBy: 'Admin Usaha',
    };

    onAddExpense(newExp);
    setShowExpenseModal(false);
    setExpDesc('');
  };

  const handlePrintFinancialStatement = () => {
    window.print();
  };

  // Open modal for paying purchase debt
  const handleOpenPayPurchaseModal = (p: typeof processedPurchases[0]) => {
    setDebtModalPurchase(p);
    setPurchasePayMode('lunas');
    setPurchasePayAmount(p.computedRemaining);
    setPurchasePayMethod('Transfer');
    setPurchasePayNotes('');
  };

  const handleConfirmPayPurchaseDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtModalPurchase || !onPayPurchaseDebt || purchasePayAmount <= 0) return;

    const receiptNo = generateInvoiceCode('BKK');
    const currentRemaining = debtModalPurchase.computedRemaining;
    const remainingAfter = Math.max(0, currentRemaining - purchasePayAmount);

    const payment: DebtPayment = {
      id: `dp-pur-${Date.now()}`,
      date: new Date().toISOString(),
      amount: purchasePayAmount,
      paymentMethod: purchasePayMethod,
      notes: purchasePayNotes || (remainingAfter === 0 ? 'Pelunasan Penuh Hutang Supplier' : 'Cicilan Hutang Supplier'),
      recordedBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir',
      receiptNo,
      remainingAfter,
    };

    onPayPurchaseDebt(debtModalPurchase.id, payment);

    // Trigger official payment receipt (Bukti Kas Keluar) printout
    onPrintDocument?.({
      type: 'payment_receipt',
      data: {
        receiptType: 'BKK',
        receiptNo,
        date: payment.date,
        invoiceNumber: debtModalPurchase.invoiceNumber,
        counterpartyName: debtModalPurchase.supplierName,
        counterpartyType: 'Supplier / Pemasok',
        amount: purchasePayAmount,
        paymentMethod: purchasePayMethod,
        remainingDebt: remainingAfter,
        notes: payment.notes,
        recordedBy: payment.recordedBy,
      }
    });

    setDebtModalPurchase(null);
  };

  // Open modal for paying customer receivable
  const handleOpenPaySaleModal = (s: typeof processedSales[0]) => {
    setDebtModalSale(s);
    setSalePayMode('lunas');
    setSalePayAmount(s.computedRemaining);
    setSalePayMethod('Tunai');
    setSalePayNotes('');
  };

  const handleConfirmPayCustomerDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtModalSale || !onPayCustomerDebt || salePayAmount <= 0) return;

    const receiptNo = generateInvoiceCode('BKM');
    const currentRemaining = debtModalSale.computedRemaining;
    const remainingAfter = Math.max(0, currentRemaining - salePayAmount);

    const payment: DebtPayment = {
      id: `dp-sale-${Date.now()}`,
      date: new Date().toISOString(),
      amount: salePayAmount,
      paymentMethod: salePayMethod,
      notes: salePayNotes || (remainingAfter === 0 ? 'Pelunasan Penuh Piutang Pelanggan' : 'Cicilan Piutang Pelanggan'),
      recordedBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir',
      receiptNo,
      remainingAfter,
    };

    onPayCustomerDebt(debtModalSale.id, payment);

    // Trigger official payment receipt (Bukti Kas Masuk) printout
    onPrintDocument?.({
      type: 'payment_receipt',
      data: {
        receiptType: 'BKM',
        receiptNo,
        date: payment.date,
        invoiceNumber: debtModalSale.invoiceNumber,
        counterpartyName: debtModalSale.customerName,
        counterpartyType: 'Pelanggan',
        amount: salePayAmount,
        paymentMethod: salePayMethod,
        remainingDebt: remainingAfter,
        notes: payment.notes,
        recordedBy: payment.recordedBy,
      }
    });

    setDebtModalSale(null);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Month Filter */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            <span>Ringkasan Keuangan & Catatan Bon Toko</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau omset penjualan, modal belanja ayam, keuntungan bersih toko, dan daftar bon yang belum lunas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200/80 px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-hidden cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Pengeluaran Toko</span>
          </button>

          <button
            type="button"
            onClick={handlePrintFinancialStatement}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Cetak Laporan"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 PILAR UTAMA KEUANGAN TOKO                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Penjualan */}
        <div className="bg-white/95 backdrop-blur-xs p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">1. Total Penjualan (Omset)</span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{monthlySales.length} nota penjualan</span>
            <span className="text-emerald-600 font-semibold">+{formatCurrency(totalCashIn)} kas masuk</span>
          </div>
        </div>

        {/* 2. Modal Belanja Ayam (HPP) */}
        <div className="bg-white/95 backdrop-blur-xs p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">2. Modal Belanja Ayam (HPP)</span>
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
            {formatCurrency(totalHPP)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{monthlyPurchases.length} faktur supplier</span>
            <span className="text-slate-700 font-semibold">{formatNumber(monthlyPurchases.reduce((s, p) => s + (p.totalQuantity || 0), 0))} kg ayam</span>
          </div>
        </div>

        {/* 3. Beban Gaji & Operasional */}
        <div className="bg-white/95 backdrop-blur-xs p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">3. Gaji & Operasional</span>
            <div className="p-1.5 bg-orange-50 text-orange-700 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
            {formatCurrency(totalOperatingCosts)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Gaji: {formatCurrency(totalSalaries)}</span>
            <span>Operasional: {formatCurrency(totalOtherExpenses)}</span>
          </div>
        </div>

        {/* 4. Keuntungan Bersih Toko */}
        <div className={`p-4 rounded-xl border shadow-xs backdrop-blur-xs ${
          netProfit >= 0 ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-200' : 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Keuntungan Bersih Toko</span>
            <div className={`p-1.5 rounded-lg ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-bold font-mono mt-2 tabular-nums ${
            netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
          }`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="text-[11px] font-semibold mt-1 flex items-center justify-between">
            <span className={netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
              {netProfit >= 0 ? 'SURPLUS KEUNTUNGAN' : 'DEFISIT RUGI'}
            </span>
            <span className="text-slate-600 font-mono">
              Margin {netMarginPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* SUB-BAR: ARUS KAS RIIL & SALDO BON PIUTANG / HUTANG */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-slate-200">Arus Kas Riil (Net Cash Flow):</span>
          <span className={`font-mono font-bold text-sm ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (Masuk: +{formatCurrency(totalCashIn)} | Keluar: -{formatCurrency(totalCashOut)})
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-rose-300 font-sans font-semibold">Hutang ke Supplier:</span>
            <span className="font-bold text-rose-400">{formatCurrency(totalUnpaidPurchaseDebt)}</span>
            <span className="text-[10px] text-slate-400 font-sans">({countUnpaidPurchases} faktur)</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-amber-300 font-sans font-semibold">Bon Piutang Pelanggan:</span>
            <span className="font-bold text-amber-400">{formatCurrency(totalUnpaidSaleReceivable)}</span>
            <span className="text-[10px] text-slate-400 font-sans">({countUnpaidSales} nota)</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEMBAR LAPORAN KEUANGAN TERPADU (SATU LEMBAR LAPORAN RESMI TOKO)          */}
      {/* ========================================================================= */}
      <div id="unified-financial-statement" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        {/* KOP RESMI LAPORAN TOKO */}
        <div className="p-6 border-b border-slate-200 bg-linear-to-r from-slate-50 via-white to-slate-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center">
                {storeProfile.logoUrl ? (
                  <img src={storeProfile.logoUrl} alt="Logo Toko" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {storeProfile.name || 'Ans Chicken Group'}
                </h1>
                <p className="text-xs text-slate-500">
                  {storeProfile.address || 'Pasar Kemis - Tangerang'} {storeProfile.phone ? `• Telp/WA: ${storeProfile.phone}` : ''}
                </p>
                <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                  Laporan Keuangan & Laba Rugi Komprehensif
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                LAPORAN KEUANGAN TERPADU
              </span>
              <div className="text-xs font-bold text-slate-800">
                Periode: <span className="font-mono">{selectedMonth}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Dicetak: {formatDate(new Date().toISOString())}
              </div>
            </div>
          </div>
        </div>

        {/* ISI SATU LEMBAR LAPORAN TERPADU */}
        <div className="p-6 space-y-6 text-xs text-slate-800">
          
          {/* BAGIAN 1: TOTAL PENJUALAN & UANG MASUK (OMSET) */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-amber-500/10 px-4 py-2.5 border-b border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center">1</span>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">Total Penjualan & Uang Masuk Toko</span>
              </div>
              <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(totalRevenue)}</span>
            </div>
            
            <div className="p-4 space-y-2 bg-white divide-y divide-slate-100">
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-600">Penjualan Daging Ayam Tunai (Cash Langsung):</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(monthlySales.filter(s => s.paymentMethod === 'Tunai').reduce((sum, s) => sum + s.grandTotal, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-600">Penjualan Transfer Bank / QRIS:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(monthlySales.filter(s => s.paymentMethod === 'Transfer').reduce((sum, s) => sum + s.grandTotal, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-600">Penjualan Bon / Piutang Belum Lunas:</span>
                <span className="font-mono font-semibold text-amber-700">
                  {formatCurrency(totalUnpaidSaleReceivable)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 bg-emerald-50/50 px-2 rounded-md">
                <span className="text-emerald-800 font-medium">Penerimaan Cicilan / Pelunasan Bon Pelanggan (BKM):</span>
                <span className="font-mono font-bold text-emerald-700">
                  +{formatCurrency(monthlyCashFlowTransactions.filter(t => t.category === 'Pembayaran Piutang Pelanggan').reduce((sum, t) => sum + t.amount, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 bg-emerald-50/50 px-2 rounded-md">
                <span className="text-emerald-800 font-medium">Penerimaan Setoran / Pelunasan Kasbon Karyawan:</span>
                <span className="font-mono font-bold text-emerald-700">
                  +{formatCurrency(monthlyKasbonRepaid)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold pt-2 text-slate-900 border-t border-slate-200">
                <span>Total Omset Penjualan Bersih Toko (1):</span>
                <span className="font-mono text-sm text-amber-700">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          </div>

          {/* BAGIAN 2: MODAL BELANJA AYAM (HPP) */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-rose-500/10 px-4 py-2.5 border-b border-rose-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-500 text-white font-bold text-xs flex items-center justify-center">2</span>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">Modal Belanja Ayam (Harga Pokok Penjualan / HPP)</span>
              </div>
              <span className="font-mono font-bold text-rose-700 text-sm">{formatCurrency(totalHPP)}</span>
            </div>

            <div className="p-4 space-y-2 bg-white divide-y divide-slate-100">
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-600">Total Pembelian Ayam Supplier (Harga Beli Ayam):</span>
                <span className="font-mono font-semibold text-slate-900">{formatCurrency(totalHPP)}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-600">Pembayaran Hutang Supplier Ayam (BKK Keluar):</span>
                <span className="font-mono font-semibold text-rose-700">
                  {formatCurrency(monthlyCashFlowTransactions.filter(t => t.category === 'Pembayaran Utang Supplier').reduce((sum, t) => sum + t.amount, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 text-slate-500">
                <span>Akumulasi Muatan Ayam Diterima:</span>
                <span className="font-mono">
                  {formatNumber(monthlyPurchases.reduce((sum, p) => sum + (p.totalQuantity || 0), 0))} kg ayam
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold pt-2 text-slate-900 border-t border-slate-200">
                <span>Total Modal Belanja Ayam / HPP (2):</span>
                <span className="font-mono text-sm text-rose-700">{formatCurrency(totalHPP)}</span>
              </div>
            </div>
          </div>

          {/* HIGHLIGHT BOX: LABA KOTOR TOKO */}
          <div className="bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 p-4 rounded-xl border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Laba Kotor Usaha (Gross Profit)
              </div>
              <p className="text-[11px] text-amber-800">
                Rumus: Total Penjualan (1) dikurangi Modal Belanja Ayam HPP (2)
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="font-mono text-lg font-extrabold text-amber-950">
                {formatCurrency(grossProfit)}
              </div>
              <div className="text-[11px] font-semibold text-amber-800 font-mono">
                Margin Kotor: {grossMarginPercent}%
              </div>
            </div>
          </div>

          {/* BAGIAN 3: BIAYA PENGELUARAN GAJI, KASBON & OPERASIONAL */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-orange-500/10 px-4 py-2.5 border-b border-orange-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-orange-500 text-white font-bold text-xs flex items-center justify-center">3</span>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">Biaya Pengeluaran Gaji, Kasbon & Operasional Toko</span>
              </div>
              <span className="font-mono font-bold text-orange-700 text-sm">{formatCurrency(totalOperatingCosts)}</span>
            </div>

            <div className="p-4 space-y-4 bg-white">
              {/* SUB-SECTION A: GAJI & UPAH KARYAWAN */}
              <div className="space-y-1.5 pb-3 border-b border-slate-100">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>A. Total Gaji & Upah Karyawan:</span>
                  </span>
                  <span className="font-mono text-slate-900">{formatCurrency(totalSalaries)}</span>
                </div>
                <div className="pl-5 space-y-1 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>• Upah Harian Pokok Karyawan ({monthlySlips.length > 0 ? monthlySlips.length : 1} orang):</span>
                    <span className="font-mono">{formatCurrency(totalBaseSalaries)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Upah Lembur Karyawan:</span>
                    <span className="font-mono">+{formatCurrency(totalOvertimeSalaries)}</span>
                  </div>
                  {totalKasbonDeductions > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>• Potongan Kasbon di Slip Gaji (Mengurangi kas keluar gaji):</span>
                      <span className="font-mono">-{formatCurrency(totalKasbonDeductions)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-800 pt-0.5">
                    <span>Subtotal Beban Gaji Karyawan:</span>
                    <span className="font-mono">{formatCurrency(totalSalaries)}</span>
                  </div>
                </div>
              </div>

              {/* SUB-SECTION B: BIAYA OPERASIONAL TOKO */}
              <div className="space-y-1.5 pb-3 border-b border-slate-100">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>B. Biaya Operasional Toko:</span>
                  </span>
                  <span className="font-mono text-slate-900">{formatCurrency(totalOtherExpenses)}</span>
                </div>
                <div className="pl-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>• Listrik & Air (Freezer/Cold Storage):</span>
                    <span className="font-mono font-semibold">{formatCurrency(expenseBreakdown['Listrik & Air'])}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Bahan Bakar & Armada Toko:</span>
                    <span className="font-mono font-semibold">{formatCurrency(expenseBreakdown['Bahan Bakar & Kendaraan'])}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Plastik & Kemasan Ayam:</span>
                    <span className="font-mono font-semibold">{formatCurrency(expenseBreakdown['Plastik & Kemasan'])}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Sewa Kios & Cold Storage:</span>
                    <span className="font-mono font-semibold">{formatCurrency(expenseBreakdown['Sewa Tempat & Cold Storage'])}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Perawatan Pisau & Timbangan:</span>
                    <span className="font-mono font-semibold">{formatCurrency(expenseBreakdown['Perawatan Peralatan'])}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Operasional Toko Lainnya:</span>
                    <span className="font-mono font-semibold">{formatCurrency(expenseBreakdown['Lain-lain'])}</span>
                  </div>
                </div>
                <div className="pl-5 flex justify-between font-bold text-slate-800 pt-1 text-xs">
                  <span>Subtotal Biaya Operasional Toko:</span>
                  <span className="font-mono">{formatCurrency(totalOtherExpenses)}</span>
                </div>
              </div>

              {/* SUB-SECTION C: REKAP KASBON KARYAWAN */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-purple-600" />
                    <span>C. Rekap Transaksi Kasbon Karyawan:</span>
                  </span>
                  <span className="font-mono text-purple-700">Saldo Berjalan: {formatCurrency(totalActiveKasbonBalance)}</span>
                </div>
                <div className="pl-5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Pinjaman Baru Dicairkan:</span>
                    <span className="font-mono font-bold text-rose-600">{formatCurrency(monthlyKasbonGiven)}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Kasbon Dilunasi Periode Ini:</span>
                    <span className="font-mono font-bold text-emerald-600">{formatCurrency(monthlyKasbonRepaid)}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Sisa Saldo Kasbon Karyawan:</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(totalActiveKasbonBalance)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-bold pt-3 text-slate-900 border-t border-slate-200">
                <span>Total Biaya Beban Usaha Toko (Gaji + Operasional) (3):</span>
                <span className="font-mono text-sm text-orange-700">{formatCurrency(totalOperatingCosts)}</span>
              </div>
            </div>
          </div>

          {/* BAGIAN 4: KEUNTUNGAN BERSIH TOKO (LABA BERSIH) */}
          <div className={`p-5 rounded-xl border-2 transition-all ${
            netProfit >= 0 
              ? 'bg-linear-to-r from-emerald-50 via-emerald-100/70 to-emerald-50 border-emerald-400 text-emerald-950' 
              : 'bg-linear-to-r from-rose-50 via-rose-100/70 to-rose-50 border-rose-400 text-rose-950'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                    netProfit >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {netProfit >= 0 ? 'SURPLUS KEUNTUNGAN BERSIH' : 'DEFISIT RUGI'}
                  </span>
                  <span className="text-xs font-bold text-slate-700">BAGIAN 4</span>
                </div>
                <h2 className="text-base font-extrabold mt-1">
                  Keuntungan Bersih Toko (Laba Bersih Akhir)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Laba Kotor ({formatCurrency(grossProfit)}) dikurangi Beban Gaji & Operasional ({formatCurrency(totalOperatingCosts)})
                </p>
              </div>

              <div className="text-left sm:text-right">
                <div className={`text-2xl font-black font-mono tracking-tight ${
                  netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}>
                  {formatCurrency(netProfit)}
                </div>
                <div className="text-xs font-bold mt-0.5 text-slate-700">
                  Margin Laba Bersih: <span className="font-mono">{netMarginPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* BAGIAN 5: STATUS ARUS KAS RIIL & SALDO BON / HUTANG */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* KAS MASUK VS KAS KELUAR */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Arus Kas Riil Masuk & Keluar</span>
                </span>
                <span className={`font-mono font-bold text-xs ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Kas Masuk Riil:</span>
                  <span className="font-mono font-bold text-emerald-600">+{formatCurrency(totalCashIn)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Kas Keluar Riil:</span>
                  <span className="font-mono font-bold text-rose-600">-{formatCurrency(totalCashOut)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200 text-slate-900">
                  <span>Net Cash Flow (Selisih Kas):</span>
                  <span className={`font-mono ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
                  </span>
                </div>
              </div>
            </div>

            {/* STATUS BON PIUTANG & HUTANG */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                  <span>Saldo Bon Belum Lunas</span>
                </span>
                <span className="text-[11px] text-slate-500 font-sans">
                  Total {countUnpaidPurchases + countUnpaidSales} Tagihan
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Hutang ke Supplier Ayam:</span>
                  <span className="font-mono font-bold text-rose-600">{formatCurrency(totalUnpaidPurchaseDebt)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Bon Piutang Pelanggan Toko:</span>
                  <span className="font-mono font-bold text-amber-600">{formatCurrency(totalUnpaidSaleReceivable)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200 text-slate-900">
                  <span>Sisa Kasbon Karyawan Berjalan:</span>
                  <span className="font-mono text-purple-700">{formatCurrency(totalActiveKasbonBalance)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* DOKUMEN FOOTER KETERANGAN RESMI */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Seluruh transaksi uang masuk, keuntungan, penjualan, pengeluaran, dan kasbon tersinkron dalam 1 laporan resmi.</span>
            </div>
            <div className="font-medium text-slate-500">
              {storeProfile.name || 'Ans Chicken Group'} • Sistem Keuangan Otomatis
            </div>
          </div>

        </div>
      </div>

            {/* ========================================================================= */}
      {/* TABEL MUTASI TRANSAKSI TERPADU (SATU BUKU TRANSAKSI LENGKAP & SINKRON)     */}
      {/* ========================================================================= */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-emerald-600" />
              <span>Rincian Seluruh Transaksi & Mutasi Keuangan</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar kronologis uang masuk, uang keluar, belanja modal ayam, gaji, operasional, kasbon, dan cicilan bon
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start lg:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Catat Biaya Operasional</span>
          </button>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setCashFlowFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                cashFlowFilterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Mutasi ({monthlyCashFlowTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setCashFlowFilterType('masuk')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                cashFlowFilterType === 'masuk'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <span>Uang Masuk</span>
              <span className="font-mono text-[10px] opacity-90">
                (+{formatCurrency(totalCashIn)})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCashFlowFilterType('keluar')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                cashFlowFilterType === 'keluar'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <span>Uang Keluar</span>
              <span className="font-mono text-[10px] opacity-90">
                (-{formatCurrency(totalCashOut)})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCashFlowFilterType('bon')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                cashFlowFilterType === 'bon'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              <span>Bon & Tagihan</span>
              {(countUnpaidPurchases + countUnpaidSales) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px]">
                  {countUnpaidPurchases + countUnpaidSales}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={cashFlowCategoryFilter}
              onChange={(e) => setCashFlowCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Kategori Transaksi</option>
              <option value="Penjualan">Penjualan Ayam</option>
              <option value="Pembelian Ayam">Modal Belanja Ayam</option>
              <option value="Gaji Karyawan">Gaji Karyawan</option>
              <option value="Pinjaman Kasbon Karyawan">Pinjaman Kasbon</option>
              <option value="Pelunasan Kasbon Karyawan">Pelunasan Kasbon</option>
              <option value="Biaya Operasional">Biaya Operasional Toko</option>
              <option value="Pembayaran Piutang Pelanggan">Pembayaran Piutang (BKM)</option>
              <option value="Pembayaran Utang Supplier">Pembayaran Utang (BKK)</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={cashFlowSearch}
                onChange={(e) => setCashFlowSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500 w-36 sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* TABEL TRANSAKSI TERPADU */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Tanggal & Waktu</th>
                <th className="py-2.5 px-3">No. Ref</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">Pihak / Keterangan</th>
                <th className="py-2.5 px-3">Metode</th>
                <th className="py-2.5 px-3 text-right text-emerald-700">Uang Masuk</th>
                <th className="py-2.5 px-3 text-right text-rose-700">Uang Keluar</th>
                <th className="py-2.5 px-3 text-center">Status / Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCashFlowTransactions.map((tx) => {
                const matchedSale = processedSales.find(s => s.invoiceNumber === tx.referenceNo);
                const matchedPurchase = processedPurchases.find(p => p.invoiceNumber === tx.referenceNo);

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {formatDateTime(tx.date)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                      {tx.referenceNo || '-'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        tx.category === 'Penjualan' ? 'bg-amber-100 text-amber-900' :
                        tx.category === 'Pembelian Ayam' ? 'bg-rose-100 text-rose-900' :
                        tx.category === 'Gaji Karyawan' ? 'bg-blue-100 text-blue-900' :
                        tx.category === 'Pinjaman Kasbon Karyawan' ? 'bg-purple-100 text-purple-900' :
                        tx.category === 'Pelunasan Kasbon Karyawan' ? 'bg-teal-100 text-teal-900' :
                        tx.category === 'Pembayaran Piutang Pelanggan' ? 'bg-emerald-100 text-emerald-900' :
                        tx.category === 'Pembayaran Utang Supplier' ? 'bg-orange-100 text-orange-900' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{tx.counterparty || tx.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{tx.description}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                      {tx.paymentMethod || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600 tabular-nums">
                      {tx.flowType === 'masuk' ? `+${formatCurrency(tx.amount)}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-rose-600 tabular-nums">
                      {tx.flowType === 'keluar' ? `-${formatCurrency(tx.amount)}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* If Sale with unpaid debt */}
                        {matchedSale && !matchedSale.isLunas && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenPaySaleModal(matchedSale)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                              title="Terima Cicilan / Pelunasan Piutang (BKM)"
                            >
                              Terima BKM
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendWAReminder(matchedSale)}
                              className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md cursor-pointer"
                              title="Kirim Pengingat Tagihan via WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* If Purchase with unpaid debt */}
                        {matchedPurchase && !matchedPurchase.isLunas && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayPurchaseModal(matchedPurchase)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                            title="Bayar Cicilan / Pelunasan Hutang (BKK)"
                          >
                            Bayar BKK
                          </button>
                        )}

                        {/* View Details Button */}
                        {matchedSale && (
                          <button
                            type="button"
                            onClick={() => setSelectedDetailModal({ type: 'sale', id: matchedSale.id })}
                            className="p-1 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
                            title="Lihat Detail Transaksi"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {matchedPurchase && (
                          <button
                            type="button"
                            onClick={() => setSelectedDetailModal({ type: 'purchase', id: matchedPurchase.id })}
                            className="p-1 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
                            title="Lihat Detail Transaksi"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!matchedSale && !matchedPurchase && (
                          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Selesai</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCashFlowTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data transaksi untuk kriteria filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

{/* ========================================================================= */}
      {/* MODALS SECTION                                                            */}
      {/* ========================================================================= */}

      {/* 1. RECORD OPERATIONAL EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Catat Biaya Operasional Baru</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 pt-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori Biaya:</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="Listrik & Air">Listrik & Air (Cold Storage / Freezer)</option>
                  <option value="Bahan Bakar & Kendaraan">Bahan Bakar Armada & Service Motor/Pick up</option>
                  <option value="Plastik & Kemasan">Plastik & Kemasan Daging Ayam</option>
                  <option value="Sewa Tempat & Cold Storage">Sewa Tempat / Kios / Ruang Pendingin</option>
                  <option value="Perawatan Peralatan">Perawatan Pisau, Timbangan, Talenan</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Pengeluaran:</label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan Biaya:</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Beli token listrik freezer 500rb"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal (Rp):</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={expAmount === 0 ? '' : expAmount.toLocaleString('id-ID')}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, '').replace(/,/g, '');
                      setExpAmount(raw === '' ? 0 : Math.max(0, parseInt(raw) || 0));
                    }}
                    className="w-full pl-9 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL BAYAR HUTANG PEMBELIAN KE SUPPLIER */}
      {debtModalPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Catat Pembayaran Hutang Supplier</h3>
              </div>
              <button onClick={() => setDebtModalPurchase(null)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">✕</button>
            </div>

            <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Faktur Pembelian:</span>
                <span className="font-mono font-bold text-slate-900">{debtModalPurchase.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Supplier:</span>
                <span className="font-semibold text-slate-900">{debtModalPurchase.supplierName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Nilai Faktur:</span>
                <span className="font-mono">{formatCurrency(debtModalPurchase.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-rose-200/60">
                <span>Sisa Hutang Saat Ini:</span>
                <span className="font-mono text-sm">{formatCurrency(debtModalPurchase.computedRemaining)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayPurchaseDebt} className="space-y-3.5 pt-3 text-xs">
              {/* Opsi Pembayaran: Lunas Penuh vs Bayar Sebagian (Cicilan) */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Jenis Pembayaran Hutang:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchasePayMode('lunas');
                      setPurchasePayAmount(debtModalPurchase.computedRemaining);
                    }}
                    className={`py-2 px-2.5 rounded-lg font-bold border transition-colors cursor-pointer text-center ${
                      purchasePayMode === 'lunas'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pelunasan Penuh (Lunas)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchasePayMode('sebagian');
                      if (purchasePayAmount >= debtModalPurchase.computedRemaining) {
                        setPurchasePayAmount(Math.round(debtModalPurchase.computedRemaining / 2));
                      }
                    }}
                    className={`py-2 px-2.5 rounded-lg font-bold border transition-colors cursor-pointer text-center ${
                      purchasePayMode === 'sebagian'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Bayar Sebagian (Cicilan)
                  </button>
                </div>
              </div>

              {/* Input Nominal Pembayaran */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">
                    {purchasePayMode === 'lunas' ? 'Nominal Pelunasan Penuh (Rp):' : 'Nominal yang Dibayarkan (Rp):'}
                  </label>
                  {purchasePayMode === 'sebagian' && (
                    <span className="text-[10px] text-slate-400">Maks: {formatCurrency(debtModalPurchase.computedRemaining)}</span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  disabled={purchasePayMode === 'lunas'}
                  value={purchasePayAmount === 0 ? '' : purchasePayAmount.toLocaleString('id-ID')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                    setPurchasePayAmount(raw === '' ? 0 : Math.min(debtModalPurchase.computedRemaining, parseFloat(raw) || 0));
                  }}
                  className={`w-full p-2.5 border rounded-lg font-mono font-bold text-base ${
                    purchasePayMode === 'lunas' 
                      ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-amber-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500'
                  }`}
                />
                {purchasePayMode === 'sebagian' && (
                  <div className="flex justify-between items-center mt-1.5 p-2 bg-slate-50 rounded-md border border-slate-200 text-[11px]">
                    <span className="text-slate-600">Sisa Hutang Setelah Bayar:</span>
                    <span className="font-mono font-bold text-rose-700">
                      {formatCurrency(Math.max(0, debtModalPurchase.computedRemaining - purchasePayAmount))}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Metode Pembayaran:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPurchasePayMethod('Transfer')}
                    className={`py-2 px-3 rounded-lg font-bold border transition-colors cursor-pointer ${
                      purchasePayMethod === 'Transfer'
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Transfer Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchasePayMethod('Tunai')}
                    className={`py-2 px-3 rounded-lg font-bold border transition-colors cursor-pointer ${
                      purchasePayMethod === 'Tunai'
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Uang Tunai
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Bukti / Keterangan:</label>
                <input
                  type="text"
                  placeholder="Misal: Cicilan ke-2 via BCA Admin"
                  value={purchasePayNotes}
                  onChange={(e) => setPurchasePayNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDebtModalPurchase(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={purchasePayAmount <= 0}
                  className={`px-5 py-2 font-bold rounded-lg shadow-xs transition-colors ${
                    purchasePayAmount <= 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                  }`}
                >
                  Simpan Pembayaran Hutang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL TERIMA PELUNASAN PIUTANG PELANGGAN */}
      {debtModalSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Terima Pelunasan / Cicilan Piutang Pelanggan</h3>
              </div>
              <button onClick={() => setDebtModalSale(null)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">✕</button>
            </div>

            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Nota Penjualan:</span>
                <span className="font-mono font-bold text-slate-900">{debtModalSale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pelanggan:</span>
                <span className="font-semibold text-slate-900">{debtModalSale.customerName} ({debtModalSale.customerType})</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Belanja:</span>
                <span className="font-mono">{formatCurrency(debtModalSale.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-amber-800 font-bold pt-1 border-t border-amber-200/60">
                <span>Sisa Piutang Saat Ini:</span>
                <span className="font-mono text-sm">{formatCurrency(debtModalSale.computedRemaining)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayCustomerDebt} className="space-y-3.5 pt-3 text-xs">
              {/* Opsi Penerimaan: Lunas Penuh vs Sebagian / Cicilan */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Jenis Penerimaan Piutang:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSalePayMode('lunas');
                      setSalePayAmount(debtModalSale.computedRemaining);
                    }}
                    className={`py-2 px-2.5 rounded-lg font-bold border transition-colors cursor-pointer text-center ${
                      salePayMode === 'lunas'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pelunasan Penuh (Lunas)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSalePayMode('sebagian');
                      if (salePayAmount >= debtModalSale.computedRemaining) {
                        setSalePayAmount(Math.round(debtModalSale.computedRemaining / 2));
                      }
                    }}
                    className={`py-2 px-2.5 rounded-lg font-bold border transition-colors cursor-pointer text-center ${
                      salePayMode === 'sebagian'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Bayar Sebagian (Cicilan)
                  </button>
                </div>
              </div>

              {/* Input Nominal Penerimaan */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">
                    {salePayMode === 'lunas' ? 'Nominal Pelunasan Penuh (Rp):' : 'Nominal yang Diterima (Rp):'}
                  </label>
                  {salePayMode === 'sebagian' && (
                    <span className="text-[10px] text-slate-400">Maks: {formatCurrency(debtModalSale.computedRemaining)}</span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  disabled={salePayMode === 'lunas'}
                  value={salePayAmount === 0 ? '' : salePayAmount.toLocaleString('id-ID')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                    setSalePayAmount(raw === '' ? 0 : Math.min(debtModalSale.computedRemaining, parseFloat(raw) || 0));
                  }}
                  className={`w-full p-2.5 border rounded-lg font-mono font-bold text-base ${
                    salePayMode === 'lunas' 
                      ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500'
                  }`}
                />
                {salePayMode === 'sebagian' && (
                  <div className="flex justify-between items-center mt-1.5 p-2 bg-slate-50 rounded-md border border-slate-200 text-[11px]">
                    <span className="text-slate-600">Sisa Piutang Setelah Diterima:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {formatCurrency(Math.max(0, debtModalSale.computedRemaining - salePayAmount))}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Metode Penerimaan:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSalePayMethod('Tunai')}
                    className={`py-2 px-3 rounded-lg font-bold border transition-colors cursor-pointer ${
                      salePayMethod === 'Tunai'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Uang Tunai
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalePayMethod('Transfer')}
                    className={`py-2 px-3 rounded-lg font-bold border transition-colors cursor-pointer ${
                      salePayMethod === 'Transfer'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Transfer Bank
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan / Referensi:</label>
                <input
                  type="text"
                  placeholder="Misal: Titip bayar via kasir sore"
                  value={salePayNotes}
                  onChange={(e) => setSalePayNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDebtModalSale(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={salePayAmount <= 0}
                  className={`px-5 py-2 font-bold rounded-lg shadow-xs transition-colors ${
                    salePayAmount <= 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  }`}
                >
                  Konfirmasi Penerimaan Piutang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL RIWAYAT CICILAN */}
      {historyModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">{historyModalData.title}</h3>
              </div>
              <button onClick={() => setHistoryModalData(null)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">✕</button>
            </div>

            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Dokumen:</span>
                <span className="font-mono font-bold text-slate-900">{historyModalData.invoice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pihak Terkait:</span>
                <span className="font-semibold text-slate-900">{historyModalData.counterparty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Transaksi:</span>
                <span className="font-mono">{formatCurrency(historyModalData.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sudah Terbayar:</span>
                <span className="font-mono text-emerald-700 font-bold">{formatCurrency(historyModalData.paid)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-700 font-semibold">Sisa Tagihan / Hutang:</span>
                <span className="font-mono text-rose-700 font-bold">{formatCurrency(historyModalData.remaining)}</span>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Daftar Pembayaran Cicilan:
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {historyModalData.payments.map((p, idx) => (
                  <div key={p.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {p.notes || `Pembayaran ke-${idx + 1}`}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatDateTime(p.date)} • Metode: {p.paymentMethod} • Dicatat: {p.recordedBy}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}

                {historyModalData.payments.length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Belum ada riwayat cicilan tercatat.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setHistoryModalData(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DETAIL NOTA TRANSAKSI & DAFTAR NOTA PEMBAYARAN (BKM / BKK) */}
      {selectedDetailModal && (() => {
        const targetPurchase = selectedDetailModal.type === 'purchase'
          ? processedPurchases.find(p => p.id === selectedDetailModal.id)
          : null;
        const targetSale = selectedDetailModal.type === 'sale'
          ? processedSales.find(s => s.id === selectedDetailModal.id)
          : null;

        if (!targetPurchase && !targetSale) return null;

        const isPurchase = selectedDetailModal.type === 'purchase';
        const invoiceNo = isPurchase ? targetPurchase!.invoiceNumber : targetSale!.invoiceNumber;
        const dateStr = isPurchase ? targetPurchase!.date : targetSale!.date;
        const counterparty = isPurchase ? targetPurchase!.supplierName : `${targetSale!.customerName} (${targetSale!.customerType})`;
        const grandTotal = isPurchase ? targetPurchase!.grandTotal : targetSale!.grandTotal;
        const paidAmount = isPurchase ? targetPurchase!.computedPaid : targetSale!.computedPaid;
        const remainingAmount = isPurchase ? targetPurchase!.computedRemaining : targetSale!.computedRemaining;
        const isLunas = isPurchase ? targetPurchase!.isLunas : targetSale!.isLunas;
        const paymentsList = isPurchase 
          ? (targetPurchase!.debtPayments || []) 
          : (targetSale!.customerDebtPayments || []);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${isPurchase ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isPurchase ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 font-mono">{invoiceNo}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isLunas ? 'bg-emerald-100 text-emerald-800' : paidAmount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isLunas ? 'Lunas' : paidAmount > 0 ? 'Pembayaran Sebagian' : 'Belum Lunas'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isPurchase ? 'Supplier:' : 'Pelanggan:'} <strong className="text-slate-800">{counterparty}</strong> • {formatDate(dateStr)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDetailModal(null)} 
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body Scrollable */}
              <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
                
                {/* 1. Kartu Ringkasan Informasi Nota & Tombol Cetak Nota Utama */}
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200/60">
                    <span className="font-bold text-amber-900 uppercase text-[11px] tracking-wider">
                      Informasi Ringkas Nota {isPurchase ? 'Pembelian' : 'Penjualan'}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {!isPurchase && !isLunas && (
                        <button
                          type="button"
                          onClick={() => handleSendWAReminder(targetSale!)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-[11px]"
                          title="Kirim Pesan WA Pengingat Tagihan"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Kirim WA Tagihan</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (isPurchase) {
                            onPrintDocument?.({ type: 'purchase', data: targetPurchase });
                          } else {
                            onPrintDocument?.({ type: 'sale', data: targetSale });
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-[11px]"
                        title="Cetak Nota Transaksi Original"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cetak Nota {isPurchase ? 'Pembelian' : 'Penjualan'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Belanja</span>
                      <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">{formatCurrency(grandTotal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Uang Sudah Masuk</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm tabular-nums">{formatCurrency(paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        {isPurchase ? 'Sisa Hutang' : 'Sisa Tagihan'}
                      </span>
                      <span className={`font-mono font-bold text-sm tabular-nums ${remainingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {formatCurrency(remainingAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Detail Informasi Nota Pembayaran (Bukti Kas BKM / BKK) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {isPurchase ? 'Daftar Nota Pembayaran Supplier (Bukti Pengeluaran Uang)' : 'Daftar Nota Pembayaran Pelanggan (Bukti Penerimaan Uang)'}
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {paymentsList.length} nota bayar
                    </span>
                  </div>

                  <div className="space-y-2">
                    {paymentsList.map((dp, idx) => {
                      const receiptCode = dp.receiptNo || (isPurchase ? `BKK-${dp.id}` : `BKM-${dp.id}`);
                      const remainingAfterVal = dp.remainingAfter !== undefined ? dp.remainingAfter : Math.max(0, remainingAmount);

                      return (
                        <div key={dp.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {receiptCode}
                              </span>
                              <span className="px-1.5 py-0.2 bg-slate-200/80 text-slate-700 text-[10px] font-bold rounded">
                                {dp.paymentMethod}
                              </span>
                              <span className="text-slate-400 text-[10px]">{formatDateTime(dp.date)}</span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Keterangan: <strong className="text-slate-800">{dp.notes || 'Pembayaran Cicilan'}</strong> • Petugas: {dp.recordedBy}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Sisa {isPurchase ? 'Hutang' : 'Tagihan'} Setelah Bayar: <strong className="text-slate-800">{formatCurrency(remainingAfterVal)}</strong>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Nominal</span>
                              <span className="font-mono font-bold text-emerald-700 text-sm">{formatCurrency(dp.amount)}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                onPrintDocument?.({
                                  type: 'payment_receipt',
                                  data: {
                                    receiptType: isPurchase ? 'BKK' : 'BKM',
                                    receiptNo: receiptCode,
                                    date: dp.date,
                                    invoiceNumber: invoiceNo,
                                    counterpartyName: isPurchase ? targetPurchase!.supplierName : targetSale!.customerName,
                                    counterpartyType: isPurchase ? 'Supplier / Pemasok' : 'Pelanggan',
                                    amount: dp.amount,
                                    paymentMethod: dp.paymentMethod,
                                    remainingDebt: remainingAfterVal,
                                    notes: dp.notes,
                                    recordedBy: dp.recordedBy,
                                  }
                                });
                              }}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                              title="Cetak Bukti Pembayaran Ini"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-400" />
                              <span>Cetak Bukti Pembayaran</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {paymentsList.length === 0 && (
                      <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        Belum ada nota pembayaran yang tercatat untuk transaksi ini.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                {!isLunas ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDetailModal(null);
                      if (isPurchase) {
                        handleOpenPayPurchaseModal(targetPurchase!);
                      } else {
                        handleOpenPaySaleModal(targetSale!);
                      }
                    }}
                    className={`px-4 py-2 font-bold text-white rounded-lg transition-colors cursor-pointer text-xs shadow-2xs flex items-center gap-1.5 ${
                      isPurchase ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isPurchase ? 'Bayar / Cicil Hutang Ini' : 'Bayar / Cicil Tagihan Ini'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Nota Sudah Lunas Sepenuhnya</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDetailModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
