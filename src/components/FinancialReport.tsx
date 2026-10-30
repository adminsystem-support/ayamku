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

  // ----------------------------------------------------
  // ARUS KAS / MUTASI KELUAR MASUK UANG (SYNCHRONIZED CASH FLOW)
  // ----------------------------------------------------
  const [cashFlowFilterType, setCashFlowFilterType] = useState<'all' | 'masuk' | 'keluar'>('all');
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

  // Filtered Cash Flow list for display table
  const filteredCashFlowTransactions = useMemo(() => {
    return monthlyCashFlowTransactions.filter((item) => {
      // Flow type filter
      if (cashFlowFilterType !== 'all' && item.flowType !== cashFlowFilterType) return false;
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
  }, [monthlyCashFlowTransactions, cashFlowFilterType, cashFlowCategoryFilter, cashFlowSearch]);

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

      {/* Quick Jump Anchor Bar (Satu Halaman Laporan Terpadu) */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200/80 text-xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
          Lompat Ke Bagian:
        </span>
        <a
          href="#section-untung-rugi"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white/90 hover:bg-amber-50 hover:text-amber-800 text-slate-700 border border-slate-200 shadow-2xs transition-all"
        >
          <PieChart className="w-3.5 h-3.5 text-amber-600" />
          <span>1. Untung Rugi Bulanan</span>
        </a>

        <a
          href="#section-arus-kas"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white/90 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 shadow-2xs transition-all"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" />
          <span>2. Mutasi Keluar Masuk Uang</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold">
            {monthlyCashFlowTransactions.length}
          </span>
        </a>

        <a
          href="#section-bon-tagihan"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white/90 hover:bg-rose-50 hover:text-rose-800 text-slate-700 border border-slate-200 shadow-2xs transition-all"
        >
          <CreditCard className="w-3.5 h-3.5 text-rose-600" />
          <span>3. Bon & Tagihan Belum Lunas</span>
          {(countUnpaidPurchases + countUnpaidSales) > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold">
              {countUnpaidPurchases + countUnpaidSales}
            </span>
          )}
        </a>
      </div>

      {/* 6 TOP UNIFIED KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Total Penjualan */}
        <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-white/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Penjualan</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1.5 tabular-nums">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {monthlySales.length} nota penjualan
          </div>
        </div>

        {/* Modal Belanja Ayam */}
        <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-white/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Modal Belanja Ayam</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1.5 tabular-nums">
            {formatCurrency(totalHPP)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Modal pokok beli ayam (HPP)
          </div>
        </div>

        {/* Gaji & Biaya Operasional */}
        <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-white/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gaji & Operasional</span>
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1.5 tabular-nums">
            {formatCurrency(totalOperatingCosts)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Gaji {formatCurrency(totalSalaries)} + Ops {formatCurrency(totalOtherExpenses)}
          </div>
        </div>

        {/* Keuntungan Bersih Toko (Prominent) */}
        <div className={`p-3.5 rounded-xl border shadow-2xs backdrop-blur-xs ${
          netProfit >= 0 ? 'bg-emerald-50/90 border-emerald-300' : 'bg-rose-50/90 border-rose-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Keuntungan Bersih</span>
            <div className={`p-1.5 rounded-lg ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-lg font-bold font-mono mt-1.5 tabular-nums ${
            netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
          }`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="text-[10px] font-semibold mt-0.5 text-slate-600">
            {netProfit >= 0 ? 'Surplus Laba Toko' : 'Defisit Rugi'}
          </div>
        </div>

        {/* Arus Kas Riil (Uang Masuk vs Uang Keluar) */}
        <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Arus Kas Riil</span>
            <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-lg font-bold font-mono mt-1.5 tabular-nums ${
            netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between font-mono">
            <span className="text-emerald-600 font-semibold">+{formatCurrency(totalCashIn)}</span>
            <span className="text-rose-600 font-semibold">-{formatCurrency(totalCashOut)}</span>
          </div>
        </div>

        {/* Catatan Bon & Tagihan Belum Lunas */}
        <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bon & Tagihan</span>
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 mt-1 flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-rose-600 font-sans font-semibold">Hutang:</span>
              <span className="text-rose-700">{formatCurrency(totalUnpaidPurchaseDebt)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-amber-600 font-sans font-semibold">Piutang:</span>
              <span className="text-amber-700">{formatCurrency(totalUnpaidSaleReceivable)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SECTION: UNTUNG RUGI & BIAYA PENGELUARAN TOKO                          */}
      {/* ========================================================================= */}
      <div id="section-untung-rugi" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <PieChart className="w-4 h-4 text-amber-600" />
            <span>1. Laporan Untung Rugi Bulanan & Biaya Operasional</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">Periode: {selectedMonth}</span>
        </div>

          {/* DETAILED STATEMENT & EXPENSES BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT COLUMN: FORMAL LABA RUGI STATEMENT (7 COLS) */}
            <div className="lg:col-span-7 bg-white/80 backdrop-blur-md rounded-xl border border-white/60 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Rincian Untung Rugi Bulanan
                  </h3>
                  <p className="text-[11px] text-slate-500">Bulan: {selectedMonth}</p>
                </div>
              </div>

              <div className="p-4 space-y-4 text-xs">
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
                    <span className="font-medium">Total Gaji & Upah Karyawan</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">{formatCurrency(totalSalaries)}</span>
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

            {/* RIGHT COLUMN: OPERATIONAL EXPENSES LOG (5 COLS) */}
            <div className="lg:col-span-5 bg-white/80 backdrop-blur-md rounded-xl border border-white/60 shadow-xs flex flex-col">
              <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Daftar Pengeluaran Operasional
                </h3>
                <span className="text-[11px] text-slate-500 font-mono font-bold">
                  {formatCurrency(totalOtherExpenses)}
                </span>
              </div>

              <div className="p-3 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px] text-xs">
                {monthlyExpenses.map((exp) => (
                  <div key={exp.id} className="py-2.5 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium inline-block mb-1">
                          {exp.category}
                        </span>
                        <h5 className="font-medium text-slate-900">{exp.description}</h5>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">{formatDate(exp.date)}</span>
                      </div>
                      <span className="font-bold font-mono text-slate-900 tabular-nums">
                        {formatCurrency(exp.amount)}
                      </span>
                    </div>
                  </div>
                ))}

                {monthlyExpenses.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    Belum ada biaya operasional lain yang dicatat bulan ini.
                  </div>
                )}
              </div>
            </div>
          </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. SECTION: BUKU ARUS KAS (SINKRONISASI KELUAR MASUK UANG TOKO LENGKAP)    */}
      {/* ========================================================================= */}
      <div id="section-arus-kas" className="space-y-5 pt-6 border-t border-slate-200/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 backdrop-blur-md p-4 rounded-xl border border-emerald-100 shadow-2xs">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-emerald-600" />
              <span>2. Buku Arus Kas: Mutasi Keluar & Masuk Uang Toko (Tersinkronisasi)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Semua transaksi uang masuk (penjualan langsung, bayar piutang BKM, kasbon) dan uang keluar (belanja ayam, bayar utang BKK, gaji bersih, kasbon, operasional) tercatat otomatis
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              +{formatCurrency(totalCashIn)} Masuk
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              -{formatCurrency(totalCashOut)} Keluar
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
              netCashFlow >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              Kas: {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
            </span>
          </div>
        </div>

        {/* 4 TOP KPI CARDS FOR CASH FLOW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Cash In */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Uang Masuk</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-bold font-mono text-emerald-600">
                  +{formatCurrency(totalCashIn)}
                </h3>
                <div className="mt-2 space-y-1 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>Penjualan Tunai/Transfer:</span>
                    <span className="font-mono font-semibold text-slate-700">{formatCurrency(cashInSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelunasan Piutang (BKM):</span>
                    <span className="font-mono font-semibold text-slate-700">{formatCurrency(cashInDebt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bayar Kasbon Karyawan:</span>
                    <span className="font-mono font-semibold text-slate-700">{formatCurrency(cashInKasbon)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Cash Out */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Uang Keluar</span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-bold font-mono text-rose-600">
                  -{formatCurrency(totalCashOut)}
                </h3>
                <div className="mt-2 space-y-1 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>Belanja Ayam (Tunai/Trf):</span>
                    <span className="font-mono font-semibold text-slate-700">{formatCurrency(cashOutPurchase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bayar Utang Supplier (BKK):</span>
                    <span className="font-mono font-semibold text-slate-700">{formatCurrency(cashOutDebt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gaji Karyawan:</span>
                    <span className="font-mono font-semibold text-slate-700">{formatCurrency(cashOutSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biaya Operasional:</span>
                    <span className="font-mono font-semibold text-slate-700">{formatCurrency(cashOutExpense)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasbon Karyawan:</span>
                    <span className="font-mono font-semibold text-slate-700">{formatCurrency(cashOutKasbon)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Cash Flow */}
            <div className={`bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border ${netCashFlow >= 0 ? 'border-emerald-200' : 'border-rose-200'} shadow-xs relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Arus Kas Bersih (Surplus)</span>
                <div className={`p-2 rounded-xl ${netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-xl sm:text-2xl font-bold font-mono ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
                </h3>
                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  netCashFlow >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {netCashFlow >= 0 ? 'Surplus Kas Riil' : 'Defisit Kas Riil'}
                </span>
                <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  Selisih riil antara seluruh uang yang masuk dan uang yang keluar pada periode ini.
                </p>
              </div>
            </div>

            {/* Cash Transactions Count */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Mutasi Kas Tercatat</span>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                  {monthlyCashFlowTransactions.length} <span className="text-sm font-normal text-slate-500">Transaksi</span>
                </h3>
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {monthlyCashFlowTransactions.filter(i => i.flowType === 'masuk').length} Masuk
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                    {monthlyCashFlowTransactions.filter(i => i.flowType === 'keluar').length} Keluar
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  Mencakup kasbon, utang, piutang, gaji, belanja, & operasional.
                </p>
              </div>
            </div>
          </div>

          {/* 2-COLUMN BREAKDOWN OF INFLOW & OUTFLOW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* INFLOW BREAKDOWN */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>Rincian Pos Uang Masuk</span>
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  +{formatCurrency(totalCashIn)}
                </span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-700 font-medium">1. Penjualan Tunai / Transfer Langsung</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(cashInSales)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${totalCashIn > 0 ? (cashInSales / totalCashIn) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-700 font-medium">2. Pelunasan Bon / Piutang Pelanggan (BKM)</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(cashInDebt)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-teal-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${totalCashIn > 0 ? (cashInDebt / totalCashIn) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-700 font-medium">3. Pembayaran / Setoran Kasbon Karyawan</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(cashInKasbon)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${totalCashIn > 0 ? (cashInKasbon / totalCashIn) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* OUTFLOW BREAKDOWN */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  <span>Rincian Pos Uang Keluar</span>
                </h4>
                <span className="text-xs font-mono font-bold text-rose-600">
                  -{formatCurrency(totalCashOut)}
                </span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-700 font-medium">1. Belanja Modal Ayam (Tunai / Transfer)</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(cashOutPurchase)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-rose-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${totalCashOut > 0 ? (cashOutPurchase / totalCashOut) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-700 font-medium">2. Pembayaran Cicilan / Pelunasan Hutang Supplier (BKK)</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(cashOutDebt)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-orange-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${totalCashOut > 0 ? (cashOutDebt / totalCashOut) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-700 font-medium">3. Pembayaran Gaji Bersih Karyawan</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(cashOutSalary)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${totalCashOut > 0 ? (cashOutSalary / totalCashOut) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-700 font-medium">4. Biaya Operasional Toko (Listrik, Plastik, dll)</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(cashOutExpense)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-600 h-1.5 rounded-full transition-all" 
                      style={{ width: `${totalCashOut > 0 ? (cashOutExpense / totalCashOut) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-700 font-medium">5. Pencairan Pinjaman Kasbon Karyawan</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(cashOutKasbon)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-purple-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${totalCashOut > 0 ? (cashOutKasbon / totalCashOut) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FILTER & SEARCH TOOLBAR */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 mr-1">Filter Arus:</span>
              <button
                type="button"
                onClick={() => setCashFlowFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  cashFlowFilterType === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({monthlyCashFlowTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => setCashFlowFilterType('masuk')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  cashFlowFilterType === 'masuk'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Uang Masuk ({monthlyCashFlowTransactions.filter(i => i.flowType === 'masuk').length})
              </button>
              <button
                type="button"
                onClick={() => setCashFlowFilterType('keluar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  cashFlowFilterType === 'keluar'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Uang Keluar ({monthlyCashFlowTransactions.filter(i => i.flowType === 'keluar').length})
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={cashFlowCategoryFilter}
                onChange={(e) => setCashFlowCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden font-medium cursor-pointer"
              >
                <option value="all">Semua Kategori Pos</option>
                <option value="Penjualan">Penjualan Tunai / Trf</option>
                <option value="Pembayaran Piutang Pelanggan">Pelunasan Piutang (BKM)</option>
                <option value="Pelunasan Kasbon Karyawan">Setoran Kasbon Karyawan</option>
                <option value="Pembelian Ayam">Belanja Modal Ayam</option>
                <option value="Pembayaran Utang Supplier">Bayar Hutang Supplier (BKK)</option>
                <option value="Gaji Karyawan">Gaji Karyawan</option>
                <option value="Biaya Operasional">Biaya Operasional Toko</option>
                <option value="Pinjaman Kasbon Karyawan">Pinjaman Kasbon Karyawan</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari transaksi / nama..."
                  value={cashFlowSearch}
                  onChange={(e) => setCashFlowSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-hidden w-full sm:w-48"
                />
              </div>
            </div>
          </div>

          {/* CASH FLOW TRANSACTION LEDGER TABLE */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl shadow-xs border border-white/80 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-amber-600" />
                  <span>Buku Kas & Riwayat Mutasi Uang</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Menampilkan {filteredCashFlowTransactions.length} dari {monthlyCashFlowTransactions.length} transaksi keluar masuk uang bulan ini
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Subtotal Mutasi Terfilter</span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {formatCurrency(filteredCashFlowTransactions.reduce((acc, curr) => acc + (curr.flowType === 'masuk' ? curr.amount : -curr.amount), 0))}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Tanggal & Waktu</th>
                    <th className="py-2.5 px-3">No. Bukti / Ref</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Keterangan & Pihak Terkait</th>
                    <th className="py-2.5 px-3 text-center">Metode</th>
                    <th className="py-2.5 px-3 text-center">Arah Arus</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCashFlowTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateTime(tx.date)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {tx.referenceNo || '-'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tx.flowType === 'masuk' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{tx.counterparty}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{tx.description}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.flowType === 'masuk'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {tx.flowType === 'masuk' ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              <span>UANG MASUK</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-rose-600" />
                              <span>UANG KELUAR</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap tabular-nums ${
                        tx.flowType === 'masuk' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {tx.flowType === 'masuk' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}

                  {filteredCashFlowTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Tidak ada transaksi arus kas yang sesuai dengan filter atau pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* ========================================================================= */}
      {/* 3. SECTION: CATATAN BON & TAGIHAN BELUM LUNAS (HUTANG & PIUTANG)          */}
      {/* ========================================================================= */}
      <div id="section-bon-tagihan" className="space-y-5 pt-6 border-t border-slate-200/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 backdrop-blur-md p-4 rounded-xl border border-rose-100 shadow-2xs">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-600" />
              <span>3. Catatan Bon & Tagihan Usaha (Hutang Supplier & Piutang Pelanggan)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau seluruh nota pembeli yang belum dibayar serta tagihan pembelian ayam dari supplier untuk pelunasan tepat waktu
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              Hutang: {formatCurrency(totalUnpaidPurchaseDebt)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
              Piutang: {formatCurrency(totalUnpaidSaleReceivable)}
            </span>
          </div>
        </div>
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
