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
  Send
} from 'lucide-react';
import { 
  SaleTransaction, 
  PurchaseTransaction, 
  SaleItem,
  PurchaseItem,
  SalarySlip, 
  AttendanceRecord,
  OperationalExpense, 
  OperationalTransaction,
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

interface FinancialReportProps {
  sales: SaleTransaction[];
  purchases: PurchaseTransaction[];
  customers?: Customer[];
  suppliers?: Supplier[];
  salarySlips: SalarySlip[];
  attendanceRecords: AttendanceRecord[];
  expenses: OperationalExpense[];
  operationalTransactions?: OperationalTransaction[];
  kasbonRecords?: EmployeeKasbonRecord[];
  onAddExpense: (expense: OperationalExpense) => void;
  onPayPurchaseDebt?: (purchaseId: string, payment: DebtPayment) => void;
  onPayCustomerDebt?: (saleId: string, payment: DebtPayment) => void;
  onPrintDocument?: (printData: any) => void;
  onNavigateTab?: (tab: string) => void;
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
  operationalTransactions = [],
  kasbonRecords = [],
  onAddExpense,
  onPayPurchaseDebt,
  onPayCustomerDebt,
  onPrintDocument,
  onNavigateTab,
  storeProfile,
  userRole,
}) => {
  // Report View Sub-tab
  const [activeReportTab, setActiveReportTab] = useState<'laba_rugi' | 'hutang_piutang'>('laba_rugi');

  // Period Filter: 'harian' | 'mingguan' | 'bulanan'
  const [filterPeriodType, setFilterPeriodType] = useState<'harian' | 'mingguan' | 'bulanan'>('bulanan');

  const today = new Date();
  const todayStr = today.toISOString().substring(0, 10);
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const pastWeekDate = new Date(today);
  pastWeekDate.setDate(today.getDate() - 6);
  const pastWeekStr = pastWeekDate.toISOString().substring(0, 10);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [weekStartDate, setWeekStartDate] = useState<string>(pastWeekStr);
  const [weekEndDate, setWeekEndDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Helper filter check
  const isDateInPeriod = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = dateStr.substring(0, 10);
    if (filterPeriodType === 'harian') {
      return d === selectedDate;
    }
    if (filterPeriodType === 'mingguan') {
      return d >= weekStartDate && d <= weekEndDate;
    }
    return d.startsWith(selectedMonth);
  };

  const isSlipInPeriod = (slip: SalarySlip) => {
    const d = (slip.generatedDate || slip.periodEnd).substring(0, 10);
    if (filterPeriodType === 'harian') {
      return d === selectedDate;
    }
    if (filterPeriodType === 'mingguan') {
      return slip.periodEnd >= weekStartDate && slip.periodStart <= weekEndDate;
    }
    return d.startsWith(selectedMonth);
  };

  const periodLabel = useMemo(() => {
    if (filterPeriodType === 'harian') {
      return `Harian (${formatDate(selectedDate)})`;
    }
    if (filterPeriodType === 'mingguan') {
      return `Mingguan (${formatDate(weekStartDate)} s/d ${formatDate(weekEndDate)})`;
    }
    return `Bulanan (${selectedMonth})`;
  }, [filterPeriodType, selectedDate, weekStartDate, weekEndDate, selectedMonth]);
  
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

  // Filter data by selected period (harian, mingguan, bulanan)
  const monthlySales = useMemo(() => {
    return sales.filter(s => isDateInPeriod(s.date));
  }, [sales, filterPeriodType, selectedDate, weekStartDate, weekEndDate, selectedMonth]);

  const monthlyPurchases = useMemo(() => {
    return purchases.filter(p => isDateInPeriod(p.date));
  }, [purchases, filterPeriodType, selectedDate, weekStartDate, weekEndDate, selectedMonth]);

  const monthlySlips = useMemo(() => {
    return salarySlips.filter(s => isSlipInPeriod(s));
  }, [salarySlips, filterPeriodType, selectedDate, weekStartDate, weekEndDate, selectedMonth]);

  const monthlyAttendanceWages = useMemo(() => {
    return attendanceRecords.filter(a => isDateInPeriod(a.date));
  }, [attendanceRecords, filterPeriodType, selectedDate, weekStartDate, weekEndDate, selectedMonth]);

  const monthlyExpenses = useMemo(() => {
    return expenses.filter(e => isDateInPeriod(e.date));
  }, [expenses, filterPeriodType, selectedDate, weekStartDate, weekEndDate, selectedMonth]);

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

  const totalKasbon = useMemo(() => {
    return kasbonRecords
      .filter(k => k.type === 'pinjam' && isDateInPeriod(k.date))
      .reduce((sum, k) => sum + k.amount, 0);
  }, [kasbonRecords, filterPeriodType, selectedDate, weekStartDate, weekEndDate, selectedMonth]);

  const totalOtherExpenses = useMemo(() => {
    const opTxTotal = (operationalTransactions || [])
      .filter(tx => tx.type === 'pengeluaran' && isDateInPeriod(tx.date))
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    return opTxTotal + expTotal;
  }, [operationalTransactions, monthlyExpenses, filterPeriodType, selectedDate, weekStartDate, weekEndDate, selectedMonth]);

  const totalOperatingCosts = useMemo(() => {
    return totalSalaries + totalKasbon + totalOtherExpenses;
  }, [totalSalaries, totalKasbon, totalOtherExpenses]);

  const netProfit = useMemo(() => {
    return grossProfit - totalOperatingCosts;
  }, [grossProfit, totalOperatingCosts]);

  const netMarginPercent = useMemo(() => {
    return totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  }, [netProfit, totalRevenue]);

  // ----------------------------------------------------
  // HUTANG & PIUTANG CALCULATIONS & LISTS
  // ----------------------------------------------------

  // 1. Purchases with Debt info
  const processedPurchases = useMemo(() => {
    let list = purchases;
    if (filterByMonthOnly) {
      list = list.filter(p => isDateInPeriod(p.date));
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
  }, [purchases, filterByMonthOnly, filterPeriodType, selectedDate, weekStartDate, weekEndDate, selectedMonth]);

  // 2. Sales with Receivable (Piutang) info
  const processedSales = useMemo(() => {
    let list = sales;
    if (filterByMonthOnly) {
      list = list.filter(s => isDateInPeriod(s.date));
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
  }, [sales, filterByMonthOnly, filterPeriodType, selectedDate, weekStartDate, weekEndDate, selectedMonth]);

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
          {/* Segmented Filter Period: Harian, Mingguan, Bulanan */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterPeriodType('harian')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterPeriodType === 'harian'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriodType('mingguan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterPeriodType === 'mingguan'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mingguan
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriodType('bulanan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterPeriodType === 'bulanan'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulanan
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200/80 px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            {filterPeriodType === 'harian' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-hidden cursor-pointer"
              />
            )}
            {filterPeriodType === 'mingguan' && (
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  className="bg-transparent focus:outline-hidden cursor-pointer"
                />
                <span className="text-slate-400 font-normal">s/d</span>
                <input
                  type="date"
                  value={weekEndDate}
                  onChange={(e) => setWeekEndDate(e.target.value)}
                  className="bg-transparent focus:outline-hidden cursor-pointer"
                />
              </div>
            )}
            {filterPeriodType === 'bulanan' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-hidden cursor-pointer"
              />
            )}
          </div>

          {activeReportTab === 'laba_rugi' && (
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Pengeluaran Toko</span>
            </button>
          )}

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

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveReportTab('laba_rugi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'laba_rugi'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Untung Rugi & Biaya Toko</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('hutang_piutang')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
            activeReportTab === 'hutang_piutang'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Catatan Bon & Tagihan</span>
          {(countUnpaidPurchases + countUnpaidSales) > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeReportTab === 'hutang_piutang'
                ? 'bg-white text-amber-700'
                : 'bg-rose-500 text-white'
            }`}>
              {countUnpaidPurchases + countUnpaidSales}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW TAB: UNTUNG RUGI & BIAYA PENGELUARAN TOKO                         */}
      {/* ========================================================================= */}
      {activeReportTab === 'laba_rugi' && (
        <>
          {/* 4 TOP KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="bg-white/85 backdrop-blur-xs p-4 rounded-xl border border-white/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Penjualan (Omset)</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
                {formatCurrency(totalRevenue)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Dari <span className="font-semibold text-slate-800">{monthlySales.length}</span> nota penjualan periode ini
              </div>
            </div>

            {/* HPP */}
            <div className="bg-white/85 backdrop-blur-xs p-4 rounded-xl border border-white/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modal Belanja Ayam (HPP)</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
                {formatCurrency(totalHPP)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Modal pokok ayam hidup & logistik
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-white/85 backdrop-blur-xs p-4 rounded-xl border border-white/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Keuntungan Kotor</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-blue-700 mt-2 tabular-nums">
                {formatCurrency(grossProfit)}
              </div>
              <div className="text-[11px] text-blue-700 font-medium mt-1">
                (Penjualan dikurangi Modal Ayam)
              </div>
            </div>

            {/* Net Profit */}
            <div className={`p-4 rounded-xl border shadow-2xs backdrop-blur-xs ${
              netProfit >= 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-rose-50/80 border-rose-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Keuntungan Bersih Toko</span>
                <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-bold font-mono mt-2 tabular-nums ${
                netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}>
                {formatCurrency(netProfit)}
              </div>
              <div className="text-[11px] font-semibold mt-1 text-slate-600">
                Uang untung bersih setelah potong gaji & operasional
              </div>
            </div>
          </div>

          {/* FORMAL LABA RUGI STATEMENT */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/60 shadow-xs overflow-hidden max-w-4xl">
            <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Rincian Untung Rugi
                </h3>
                <p className="text-[11px] text-slate-500">Periode: {periodLabel}</p>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              {/* 1. TOTAL PENJUALAN */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-slate-900 text-sm pb-1 border-b border-slate-200">
                  <span>1. Total Penjualan</span>
                  <span className="font-mono tabular-nums">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pl-3">
                  <span>Penjualan Daging Ayam ({monthlySales.length} transaksi)</span>
                  <span className="font-mono tabular-nums text-slate-800">{formatCurrency(totalRevenue)}</span>
                </div>
              </div>

              {/* 2. MODAL BELANJA AYAM (HPP) */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-slate-900 text-sm pb-1 border-b border-slate-200">
                  <span>2. Modal Belanja Ayam (HPP)</span>
                  <span className="font-mono text-rose-700 tabular-nums">({formatCurrency(totalHPP)})</span>
                </div>
                <div className="flex justify-between text-slate-600 pl-3">
                  <span>Harga Beli Ayam</span>
                  <span className="font-mono tabular-nums text-slate-800">{formatCurrency(totalHPP)}</span>
                </div>
              </div>

              {/* KEUNTUNGAN KOTOR ROW */}
              <div className="p-3 bg-slate-50 rounded-lg flex justify-between font-bold text-sm text-slate-900 border border-slate-200">
                <span>KEUNTUNGAN KOTOR (PENJUALAN DIKURANGI MODAL):</span>
                <span className="font-mono tabular-nums text-blue-700">{formatCurrency(grossProfit)}</span>
              </div>

              {/* 3. BIAYA PENGELUARAN GAJI & OPERASIONAL */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between font-bold text-slate-900 text-sm pb-1 border-b border-slate-200">
                  <span>3. Biaya Pengeluaran Gaji & Operasional</span>
                  <span className="font-mono text-rose-700 tabular-nums">({formatCurrency(totalOperatingCosts)})</span>
                </div>
                
                <div className="flex justify-between text-slate-700 pl-3 py-1">
                  <span className="font-medium">Total Gaji</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">{formatCurrency(totalSalaries)}</span>
                </div>

                <div className="flex justify-between text-slate-700 pl-3 py-1">
                  <span className="font-medium">Total Kasbon</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">{formatCurrency(totalKasbon)}</span>
                </div>

                <div className="flex justify-between text-slate-700 pl-3 py-1">
                  <span className="font-medium">Biaya Operasional</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">{formatCurrency(totalOtherExpenses)}</span>
                </div>
              </div>

              {/* KEUNTUNGAN BERSIH FINAL */}
              <div className={`p-4 rounded-xl flex justify-between items-center text-base font-bold border shadow-xs ${
                netProfit >= 0 ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-rose-500 text-white border-rose-600'
              }`}>
                <span className="uppercase tracking-wide font-extrabold">Keuntungan Bersih</span>
                <span className="font-mono text-xl tabular-nums font-extrabold">{formatCurrency(netProfit)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW TAB: LAPORAN HUTANG & PIUTANG USAHA (PEMBELIAN & PENJUALAN)      */}
      {/* ========================================================================= */}
      {activeReportTab === 'hutang_piutang' && (
        <div className="space-y-5">
          {selectedPartyDetail ? (
            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-5 sm:p-6 shadow-xs border border-white/80 animate-in fade-in zoom-in-95 duration-150 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <button 
                    type="button" 
                    onClick={() => setSelectedPartyDetail(null)} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition-colors"
                    title="Kembali ke Ringkasan"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>Rincian Transaksi: <strong className="text-amber-800">{selectedPartyDetail.name}</strong></span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {selectedPartyDetail.type === 'purchase' ? 'Supplier' : 'Pelanggan'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Daftar semua faktur dan status pelunasan
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedPartyDetail(null)} 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors self-start sm:self-auto"
                >
                  ← Kembali ke Ringkasan
                </button>
              </div>

              <div className="overflow-x-auto py-2">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">No Nota / Faktur</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3 text-right">Total Transaksi</th>
                      <th className="py-2.5 px-3 text-right">Sudah Dibayar</th>
                      <th className="py-2.5 px-3 text-right">Sisa {selectedPartyDetail.type === 'purchase' ? 'Hutang' : 'Piutang'}</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedPartyDetail.type === 'purchase' 
                        ? processedPurchases.filter(p => p.supplierName.toLowerCase() === selectedPartyDetail.name.toLowerCase())
                        : processedSales.filter(s => s.customerName.toLowerCase() === selectedPartyDetail.name.toLowerCase())
                    ).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{tx.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatDate(tx.date)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(tx.grandTotal)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">{formatCurrency((tx as any).computedPaid)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">{formatCurrency((tx as any).computedRemaining)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.isLunas ? 'bg-emerald-100 text-emerald-800' : (tx as any).computedPaid > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {tx.isLunas ? 'Lunas' : (tx as any).computedPaid > 0 ? 'Sebagian' : 'Belum Lunas'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              type="button"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-bold cursor-pointer transition-colors"
                              onClick={() => setSelectedDetailModal({ type: selectedPartyDetail.type, id: tx.id })}
                            >
                              Detail Nota
                            </button>
                            {selectedPartyDetail.type === 'purchase' ? (
                              !tx.isLunas && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayPurchaseModal(tx as any)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  Bayar Hutang
                                </button>
                              )
                            ) : (
                              !tx.isLunas && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaySaleModal(tx as any)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  Terima Cicilan
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button 
                type="button"
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors" 
                onClick={() => setSelectedPartyDetail(null)}
              >
                Kembali ke Ringkasan
              </button>
            </div>
          ) : (
            <>
              {/* 4 TOP SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Hutang Usaha (ke Pemasok) */}
                <div className="bg-white/85 backdrop-blur-xs p-4 rounded-xl border border-rose-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">HUTANG KE SUPPLIER</span>
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-bold font-mono text-rose-700 mt-2 tabular-nums">
                    {formatCurrency(totalUnpaidPurchaseDebt)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{countUnpaidPurchases} belanjaan ayam ke supplier belum kita bayar</span>
                  </div>
                </div>

                {/* Total Piutang Usaha (dari Pelanggan) */}
                <div className="bg-white/85 backdrop-blur-xs p-4 rounded-xl border border-amber-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">BON / TAGIHAN PELANGGAN</span>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-700 mt-2 tabular-nums">
                    {formatCurrency(totalUnpaidSaleReceivable)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{countUnpaidSales} nota pembeli yang belum dibayar ke kita</span>
                  </div>
                </div>

                {/* Posisi Bersih (Piutang - Hutang) */}
                <div className={`bg-white/85 backdrop-blur-xs p-4 rounded-xl border shadow-2xs ${
                  (totalUnpaidSaleReceivable - totalUnpaidPurchaseDebt) >= 0 
                    ? 'border-emerald-200/80' 
                    : 'border-orange-200/80'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">SELISIH TAGIHAN & HUTANG</span>
                    <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className={`text-xl font-bold font-mono mt-2 tabular-nums ${
                    (totalUnpaidSaleReceivable - totalUnpaidPurchaseDebt) >= 0 
                      ? 'text-emerald-700' 
                      : 'text-orange-700'
                  }`}>
                    {formatCurrency(totalUnpaidSaleReceivable - totalUnpaidPurchaseDebt)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {(totalUnpaidSaleReceivable - totalUnpaidPurchaseDebt) >= 0 
                      ? 'Uang tagihan pelanggan lebih banyak dari hutang kita' 
                      : 'Hutang kita ke supplier lebih besar dari tagihan pelanggan'}
                  </div>
                </div>

                {/* Total Transaksi Bermasalah / Butuh Tindakan */}
                <div className="bg-white/85 backdrop-blur-xs p-4 rounded-xl border border-white/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">NOTA BELUM LUNAS</span>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
                    {countUnpaidPurchases + countUnpaidSales} <span className="text-xs font-normal text-slate-500">transaksi</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Perlu ditagih atau dibayar cicilannya
                  </div>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                {/* Filter Type Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-500 mr-1">Tampilkan:</span>
                  <button
                    type="button"
                    onClick={() => setDebtFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      debtFilterType === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({processedPurchases.length + processedSales.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtFilterType('hutang_pembelian')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      debtFilterType === 'hutang_pembelian'
                        ? 'bg-rose-700 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Hutang ke Supplier ({countUnpaidPurchases} sisa)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtFilterType('piutang_penjualan')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      debtFilterType === 'piutang_penjualan'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Bon Pelanggan ({countUnpaidSales} sisa)</span>
                  </button>
                </div>

                {/* Status & Search */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-slate-600 font-medium">Status:</label>
                    <select
                      value={debtStatusFilter}
                      onChange={(e) => setDebtStatusFilter(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-hidden"
                    >
                      <option value="unpaid">Belum Lunas / Masih Ada Sisa</option>
                      <option value="all">Semua Nota</option>
                      <option value="paid">Sudah Lunas</option>
                    </select>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari nomor nota atau nama..."
                      value={debtSearchQuery}
                      onChange={(e) => setDebtSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden w-48"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={filterByMonthOnly}
                      onChange={(e) => setFilterByMonthOnly(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-0"
                    />
                    <span>Hanya Bulan Ini</span>
                  </label>
                </div>
              </div>

              {/* 1. TABLE: SUMMARY VIEW (Grouping by Supplier) */}
              {(debtFilterType === 'all' || debtFilterType === 'hutang_pembelian') && (
                <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/60 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200/80 bg-rose-50/50">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Daftar Hutang ke Supplier (Belum Kita Bayar)
                    </h3>
                  </div>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">Nama Supplier / Pemasok</th>
                        <th className="py-2.5 px-3 text-right">Sisa Hutang Belum Dibayar</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(processedPurchases.reduce((acc, p) => {
                        if (!p.isLunas) {
                          acc[p.supplierName] = (acc[p.supplierName] || 0) + p.computedRemaining;
                        }
                        return acc;
                      }, {} as Record<string, number>)).map(([supplier, total]) => (
                        <tr key={supplier} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{supplier}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">{formatCurrency(total)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedPartyDetail({ type: 'purchase', name: supplier })}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              Lihat Rincian Nota
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. SUMMARY VIEW: PIUTANG PENJUALAN */}
              {(debtFilterType === 'all' || debtFilterType === 'piutang_penjualan') && (
                <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/60 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200/80 bg-amber-50/50">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Daftar Bon Pelanggan (Belum Dibayar ke Kita)
                    </h3>
                  </div>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">Nama Pembeli / Pelanggan</th>
                        <th className="py-2.5 px-3 text-right">Sisa Bon Belum Dibayar</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(processedSales.reduce((acc, s) => {
                        if (!s.isLunas) {
                          acc[s.customerName] = (acc[s.customerName] || 0) + s.computedRemaining;
                        }
                        return acc;
                      }, {} as Record<string, number>)).map(([customer, total]) => (
                        <tr key={customer} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{customer}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">{formatCurrency(total)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedPartyDetail({ type: 'sale', name: customer })}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              Lihat Rincian Nota
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. TABLE: DAFTAR RINCIAN TRANSAKSI (SESUAI FILTER & PENCARIAN) */}
              <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/60 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Daftar Semua Nota Belanja & Penjualan ({debtFilterType === 'hutang_pembelian' ? filteredPurchases.length : debtFilterType === 'piutang_penjualan' ? filteredSales.length : filteredPurchases.length + filteredSales.length} nota)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {debtStatusFilter === 'unpaid' ? 'Belum Lunas / Ada Sisa' : debtStatusFilter === 'paid' ? 'Sudah Lunas' : 'Semua Nota'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">Jenis</th>
                        <th className="py-2.5 px-3">No. Nota</th>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Nama Supplier / Pembeli</th>
                        <th className="py-2.5 px-3 text-right">Total Belanja</th>
                        <th className="py-2.5 px-3 text-right">Sudah Dibayar</th>
                        <th className="py-2.5 px-3 text-right">Sisa Belum Bayar</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Purchases */}
                      {(debtFilterType === 'all' || debtFilterType === 'hutang_pembelian') &&
                        filteredPurchases.map((p) => (
                          <tr key={`pur-${p.id}`} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Hutang Beli
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.invoiceNumber}</td>
                            <td className="py-2.5 px-3 text-slate-600">{formatDate(p.date)}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{p.supplierName}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(p.grandTotal)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatCurrency(p.computedPaid)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">{formatCurrency(p.computedRemaining)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.isLunas ? 'bg-emerald-100 text-emerald-800' : p.computedPaid > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {p.isLunas ? 'Lunas' : p.computedPaid > 0 ? 'Ada Sisa' : 'Belum Lunas'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDetailModal({ type: 'purchase', id: p.id })}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded cursor-pointer transition-colors"
                                >
                                  Rincian
                                </button>
                                {!p.isLunas && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPayPurchaseModal(p)}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded cursor-pointer transition-colors"
                                  >
                                    Bayar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}

                      {/* Sales */}
                      {(debtFilterType === 'all' || debtFilterType === 'piutang_penjualan') &&
                        filteredSales.map((s) => (
                          <tr key={`sal-${s.id}`} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Bon Jual
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.invoiceNumber}</td>
                            <td className="py-2.5 px-3 text-slate-600">{formatDate(s.date)}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{s.customerName}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(s.grandTotal)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatCurrency(s.computedPaid)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">{formatCurrency(s.computedRemaining)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.isLunas ? 'bg-emerald-100 text-emerald-800' : s.computedPaid > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {s.isLunas ? 'Lunas' : s.computedPaid > 0 ? 'Ada Sisa' : 'Belum Lunas'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDetailModal({ type: 'sale', id: s.id })}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded cursor-pointer transition-colors"
                                >
                                  Rincian
                                </button>
                                {!s.isLunas && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPaySaleModal(s)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded cursor-pointer transition-colors"
                                  >
                                    Terima
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}

                      {filteredPurchases.length === 0 && filteredSales.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            Tidak ditemukan transaksi dengan filter yang dipilih.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
