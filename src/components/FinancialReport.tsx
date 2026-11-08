import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  History,
  Search,
  Wallet,
  Building2,
  Users,
  Eye,
  FileText,
  MessageCircle,
  Send,
  X,
  RotateCcw,
  Edit3,
  Check,
  Package,
  Layers
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
  Item,
  StockOpnameRecord,
  EmployeeKasbonRecord,
  DailyFinancialReportData
} from '../types/index.ts';
import { 
  formatCurrency, 
  formatNumber, 
  formatDate, 
  formatDateTime, 
  getMonthYearKey, 
  generateInvoiceCode, 
  formatPhoneNumberForWhatsApp,
  getTodayDateString
} from '../utils/formatters.ts';

interface FinancialReportProps {
  sales: SaleTransaction[];
  purchases: PurchaseTransaction[];
  customers?: Customer[];
  suppliers?: Supplier[];
  items?: Item[];
  opnameRecords?: StockOpnameRecord[];
  salarySlips?: SalarySlip[];
  attendanceRecords?: AttendanceRecord[];
  expenses?: OperationalExpense[];
  operationalTransactions?: OperationalTransaction[];
  kasbonRecords?: EmployeeKasbonRecord[];
  onAddExpense?: (expense: OperationalExpense) => void;
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
  items = [],
  opnameRecords = [],
  salarySlips = [],
  attendanceRecords = [],
  expenses = [],
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
  // Main Sub-Tab: 'laporan_harian' (default exact recreation) | 'hutang_piutang'
  const [activeSubTab, setActiveSubTab] = useState<'laporan_harian' | 'hutang_piutang'>('laporan_harian');

  // Selected date for Laporan Harian (default: Today)
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Compute yesterday's date
  const yesterdayDate = useMemo(() => {
    if (!selectedDate) return todayStr;
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [selectedDate, todayStr]);

  // Expandable row details state for each of the 7 items
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const toggleDetail = (key: string) => {
    setExpandedDetails(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Manual Overrides state (allows user to override any calculated row directly)
  const [manualOverrides, setManualOverrides] = useState<Record<string, number | null>>({});

  // Reset manual overrides when date changes
  const handleResetManualOverrides = () => {
    setManualOverrides({});
  };

  // ----------------------------------------------------
  // AUTO-CALCULATION FROM SYSTEM DATA
  // ----------------------------------------------------

  // 1. TAGIHAN PER HARI (NOTA) - TANPA SISA HUTANG & KEMBALIAN / TABUNGAN
  const dailySales = useMemo(() => {
    return sales.filter(s => s.date.substring(0, 10) === selectedDate);
  }, [sales, selectedDate]);

  const autoTagihanPerHari = useMemo(() => {
    return dailySales.reduce((sum, s) => {
      // Pure item total of today's sales
      const itemsTotal = s.totalBarang !== undefined 
        ? s.totalBarang 
        : (s.subtotal || s.items.reduce((isum, item) => isum + item.subtotal, 0));
      return sum + itemsTotal;
    }, 0);
  }, [dailySales]);

  // 2. STOK OPNAME PER HARI (Aset Fisik Stok Akhir Hari Ini)
  const autoStokOpnameHariIni = useMemo(() => {
    // Check if there are specific opname records on selectedDate
    const dateOpnames = opnameRecords.filter(o => o.date.substring(0, 10) === selectedDate);
    if (dateOpnames.length > 0) {
      return dateOpnames.reduce((sum, o) => {
        const it = items.find(i => i.id === o.itemId);
        const price = it?.baseBuyPrice || 25000;
        return sum + (o.physicalStock * price);
      }, 0);
    }
    // Fallback: Total inventory asset value from live items
    return items.reduce((sum, i) => sum + (i.currentStock * i.baseBuyPrice), 0);
  }, [opnameRecords, items, selectedDate]);

  // 3. STOK OPNAME KEMARIN (Aset Fisik Stok Awal H-1 Kemarin)
  const autoStokOpnameKemarin = useMemo(() => {
    const yesterdayOpnames = opnameRecords.filter(o => o.date.substring(0, 10) === yesterdayDate);
    if (yesterdayOpnames.length > 0) {
      return yesterdayOpnames.reduce((sum, o) => {
        const it = items.find(i => i.id === o.itemId);
        const price = it?.baseBuyPrice || 25000;
        return sum + (o.physicalStock * price);
      }, 0);
    }
    return 0;
  }, [opnameRecords, items, yesterdayDate]);

  // 4. OPERASIONAL PER HARI (Biaya Operasional + Gaji / Upah Hari Ini)
  const dailyExpenses = useMemo(() => {
    return expenses.filter(e => e.date.substring(0, 10) === selectedDate);
  }, [expenses, selectedDate]);

  const dailyOperationalTxs = useMemo(() => {
    return operationalTransactions.filter(tx => 
      tx.type === 'pengeluaran' && tx.date.substring(0, 10) === selectedDate
    );
  }, [operationalTransactions, selectedDate]);

  const dailySalarySlips = useMemo(() => {
    return salarySlips.filter(s => {
      const d = (s.periodStart || s.generatedDate || '').substring(0, 10);
      return d === selectedDate;
    });
  }, [salarySlips, selectedDate]);

  const autoOperasionalPerHari = useMemo(() => {
    const expSum = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const opTxSum = dailyOperationalTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const salarySum = dailySalarySlips.reduce((sum, s) => sum + s.netSalary, 0);
    return expSum + opTxSum + salarySum;
  }, [dailyExpenses, dailyOperationalTxs, dailySalarySlips]);

  // 5. MODAL SUPLAIER (Pembelian Bahan / Ayam Masuk dari Supplier)
  const dailyPurchases = useMemo(() => {
    return purchases.filter(p => p.date.substring(0, 10) === selectedDate);
  }, [purchases, selectedDate]);

  const autoModalSuplaier = useMemo(() => {
    return dailyPurchases.reduce((sum, p) => sum + p.grandTotal, 0);
  }, [dailyPurchases]);

  // 6. SISA HUTANG COSTUMER (Piutang / Sisa Tagihan Pelanggan Belum Bayar)
  const dailyUnpaidSales = useMemo(() => {
    return dailySales.filter(s => (s.remainingDebt || 0) > 0 || s.paymentStatus === 'Sebagian');
  }, [dailySales]);

  const autoSisaHutangCostumer = useMemo(() => {
    const fromDaily = dailyUnpaidSales.reduce((sum, s) => {
      return sum + (s.remainingDebt !== undefined ? s.remainingDebt : Math.max(0, s.grandTotal - s.amountPaid));
    }, 0);
    return fromDaily;
  }, [dailyUnpaidSales]);

  // 7. KEMBALIAN / TABUNGAN COSTUMER (Deposit / Tabungan Pelanggan & Kelebihan Bayar)
  const dailySavingsSales = useMemo(() => {
    return dailySales.filter(s => (s.newSavingsRecorded && s.newSavingsRecorded > 0) || (s.overpaymentAmount && s.overpaymentAmount > 0));
  }, [dailySales]);

  const autoKembalianTabunganCostumer = useMemo(() => {
    const fromDaily = dailySavingsSales.reduce((sum, s) => {
      return sum + (s.newSavingsRecorded || s.overpaymentAmount || 0);
    }, 0);
    return fromDaily;
  }, [dailySavingsSales]);

  // EFFECTIVE VALUES (USING MANUAL OVERRIDES IF PRESENT, OR AUTO-CALCULATED)
  const valTagihanPerHari = manualOverrides['tagihan'] !== undefined && manualOverrides['tagihan'] !== null
    ? manualOverrides['tagihan']
    : autoTagihanPerHari;

  const valStokOpnameHariIni = manualOverrides['stokHariIni'] !== undefined && manualOverrides['stokHariIni'] !== null
    ? manualOverrides['stokHariIni']
    : autoStokOpnameHariIni;

  // STEP 1 + 2: TOTAL OUTPUT
  const valTotalOutput = valTagihanPerHari + valStokOpnameHariIni;

  const valStokOpnameKemarin = manualOverrides['stokKemarin'] !== undefined && manualOverrides['stokKemarin'] !== null
    ? manualOverrides['stokKemarin']
    : autoStokOpnameKemarin;

  const valOperasionalPerHari = manualOverrides['operasional'] !== undefined && manualOverrides['operasional'] !== null
    ? manualOverrides['operasional']
    : autoOperasionalPerHari;

  const valModalSuplaier = manualOverrides['modalSuplaier'] !== undefined && manualOverrides['modalSuplaier'] !== null
    ? manualOverrides['modalSuplaier']
    : autoModalSuplaier;

  // HASIL LAPORAN HARIAN / OMZET BERSIH = (TOTAL) - 3 - 4 - 5
  const valHasilLaporanHarian = valTotalOutput - valStokOpnameKemarin - valOperasionalPerHari - valModalSuplaier;

  const valSisaHutangCostumer = manualOverrides['sisaHutang'] !== undefined && manualOverrides['sisaHutang'] !== null
    ? manualOverrides['sisaHutang']
    : autoSisaHutangCostumer;

  // TOTAL = HASIL LAPORAN HARIAN + 6
  const valTotalSetelahHutang = valHasilLaporanHarian + valSisaHutangCostumer;

  const valKembalianTabunganCostumer = manualOverrides['tabungan'] !== undefined && manualOverrides['tabungan'] !== null
    ? manualOverrides['tabungan']
    : autoKembalianTabunganCostumer;

  // FINAL: TOTAL KEUANGAN = TOTAL - 7
  const valTotalKeuangan = valTotalSetelahHutang - valKembalianTabunganCostumer;

  // Prepare full data payload for printing
  const dailyReportData: DailyFinancialReportData = useMemo(() => {
    return {
      reportDate: selectedDate,
      tagihanPerHari: valTagihanPerHari,
      stokOpnameHariIni: valStokOpnameHariIni,
      totalOutput: valTotalOutput,
      stokOpnameKemarin: valStokOpnameKemarin,
      operasionalPerHari: valOperasionalPerHari,
      modalSuplaier: valModalSuplaier,
      hasilLaporanHarian: valHasilLaporanHarian,
      sisaHutangCostumer: valSisaHutangCostumer,
      totalSetelahHutang: valTotalSetelahHutang,
      kembalianTabunganCostumer: valKembalianTabunganCostumer,
      totalKeuangan: valTotalKeuangan,
      salesCount: dailySales.length,
      purchasesCount: dailyPurchases.length,
      expenseCount: dailyExpenses.length + dailyOperationalTxs.length + dailySalarySlips.length,
      unpaidCustomersCount: dailyUnpaidSales.length,
      depositCustomersCount: dailySavingsSales.length,
    };
  }, [
    selectedDate,
    valTagihanPerHari,
    valStokOpnameHariIni,
    valTotalOutput,
    valStokOpnameKemarin,
    valOperasionalPerHari,
    valModalSuplaier,
    valHasilLaporanHarian,
    valSisaHutangCostumer,
    valTotalSetelahHutang,
    valKembalianTabunganCostumer,
    valTotalKeuangan,
    dailySales.length,
    dailyPurchases.length,
    dailyExpenses.length,
    dailyOperationalTxs.length,
    dailySalarySlips.length,
    dailyUnpaidSales.length,
    dailySavingsSales.length,
  ]);

  const handlePrintReport = () => {
    if (onPrintDocument) {
      onPrintDocument({
        type: 'daily_financial_report',
        data: dailyReportData,
      });
    }
  };

  // ----------------------------------------------------
  // SUB-TAB 2: HUTANG & PIUTANG HANDLERS & MODALS
  // ----------------------------------------------------
  const [debtSearchQuery, setDebtSearchQuery] = useState('');
  const [debtTypeFilter, setDebtTypeFilter] = useState<'all' | 'hutang_supplier' | 'piutang_pelanggan'>('all');
  
  // Pay Purchase Debt Modal
  const [debtModalPurchase, setDebtModalPurchase] = useState<PurchaseTransaction | null>(null);
  const [purchasePayAmount, setPurchasePayAmount] = useState<number>(0);
  const [purchasePayMethod, setPurchasePayMethod] = useState<'Tunai' | 'Transfer'>('Transfer');
  const [purchasePayNotes, setPurchasePayNotes] = useState('');

  // Pay Customer Debt Modal
  const [debtModalSale, setDebtModalSale] = useState<SaleTransaction | null>(null);
  const [salePayAmount, setSalePayAmount] = useState<number>(0);
  const [salePayMethod, setSalePayMethod] = useState<'Tunai' | 'Transfer'>('Tunai');
  const [salePayNotes, setSalePayNotes] = useState('');

  // Unpaid Purchases & Sales lists
  const unpaidPurchases = useMemo(() => {
    return purchases.filter(p => {
      const remaining = p.remainingDebt !== undefined ? p.remainingDebt : Math.max(0, p.grandTotal - (p.amountPaid || 0));
      return remaining > 0 && p.paymentStatus !== 'Lunas';
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases]);

  const unpaidSales = useMemo(() => {
    return sales.filter(s => {
      const remaining = s.remainingDebt !== undefined ? s.remainingDebt : Math.max(0, s.grandTotal - (s.amountPaid || 0));
      return remaining > 0 && s.paymentStatus !== 'Lunas';
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [sales]);

  const totalOutstandingPurchases = useMemo(() => {
    return unpaidPurchases.reduce((sum, p) => sum + (p.remainingDebt || Math.max(0, p.grandTotal - (p.amountPaid || 0))), 0);
  }, [unpaidPurchases]);

  const totalOutstandingSales = useMemo(() => {
    return unpaidSales.reduce((sum, s) => sum + (s.remainingDebt || Math.max(0, s.grandTotal - (s.amountPaid || 0))), 0);
  }, [unpaidSales]);

  // Handle Pay Purchase Debt Submit
  const handleConfirmPurchasePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtModalPurchase || purchasePayAmount <= 0) return;

    const currentPaid = debtModalPurchase.amountPaid || 0;
    const currentRemaining = debtModalPurchase.remainingDebt !== undefined 
      ? debtModalPurchase.remainingDebt 
      : Math.max(0, debtModalPurchase.grandTotal - currentPaid);

    const actualAmount = Math.min(purchasePayAmount, currentRemaining);
    const newPaid = currentPaid + actualAmount;
    const remainingAfter = Math.max(0, currentRemaining - actualAmount);

    const receiptNo = generateInvoiceCode('BKK');
    const payment: DebtPayment = {
      id: `pay-${Date.now()}`,
      receiptNo,
      date: new Date().toISOString(),
      amount: actualAmount,
      paymentMethod: purchasePayMethod,
      notes: purchasePayNotes.trim() || `Pembayaran hutang ke supplier ${debtModalPurchase.supplierName}`,
      recordedBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir',
      remainingAfter,
    };

    if (onPayPurchaseDebt) {
      onPayPurchaseDebt(debtModalPurchase.id, payment);
    }

    if (onPrintDocument) {
      onPrintDocument({
        type: 'payment_receipt',
        data: {
          receiptType: 'BKK',
          receiptNo,
          title: remainingAfter === 0 ? 'BUKTI PELUNASAN KAS KELUAR (BKK)' : 'BUKTI PEMBAYARAN CICILAN KAS KELUAR (BKK)',
          date: payment.date,
          counterpartyName: debtModalPurchase.supplierName,
          invoiceNumber: debtModalPurchase.invoiceNumber,
          totalInvoiceAmount: debtModalPurchase.grandTotal,
          paymentAmount: actualAmount,
          remainingDebt: remainingAfter,
          paymentMethod: purchasePayMethod,
          notes: payment.notes,
          recordedBy: payment.recordedBy,
          counterpartyType: 'Supplier',
        }
      });
    }

    setDebtModalPurchase(null);
  };

  // Handle Pay Customer Debt Submit
  const handleConfirmCustomerPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtModalSale || salePayAmount <= 0) return;

    const currentPaid = debtModalSale.amountPaid || 0;
    const currentRemaining = debtModalSale.remainingDebt !== undefined 
      ? debtModalSale.remainingDebt 
      : Math.max(0, debtModalSale.grandTotal - currentPaid);

    const actualAmount = Math.min(salePayAmount, currentRemaining);
    const newPaid = currentPaid + actualAmount;
    const remainingAfter = Math.max(0, currentRemaining - actualAmount);

    const receiptNo = generateInvoiceCode('BKM');
    const payment: DebtPayment = {
      id: `pay-${Date.now()}`,
      receiptNo,
      date: new Date().toISOString(),
      amount: actualAmount,
      paymentMethod: salePayMethod,
      notes: salePayNotes.trim() || `Pembayaran piutang dari pelanggan ${debtModalSale.customerName}`,
      recordedBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir',
      remainingAfter,
    };

    if (onPayCustomerDebt) {
      onPayCustomerDebt(debtModalSale.id, payment);
    }

    if (onPrintDocument) {
      onPrintDocument({
        type: 'payment_receipt',
        data: {
          receiptType: 'BKM',
          receiptNo,
          title: remainingAfter === 0 ? 'BUKTI PELUNASAN KAS MASUK (BKM)' : 'BUKTI PENERIMAAN CICILAN KAS MASUK (BKM)',
          date: payment.date,
          counterpartyName: debtModalSale.customerName,
          invoiceNumber: debtModalSale.invoiceNumber,
          totalInvoiceAmount: debtModalSale.grandTotal,
          paymentAmount: actualAmount,
          remainingDebt: remainingAfter,
          paymentMethod: salePayMethod,
          notes: payment.notes,
          recordedBy: payment.recordedBy,
          counterpartyType: 'Customer',
        }
      });
    }

    setDebtModalSale(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      
      {/* 1. TOP HEADER & SUB-TAB NAVIGATION */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              LAPORAN KEUANGAN
            </h2>
            <p className="text-xs text-slate-500">
              Rekap keuangan harian dan buku hutang piutang
            </p>
          </div>
        </div>

        {/* Tab Switcher Controls */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('laporan_harian')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'laporan_harian'
                ? 'bg-amber-500 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Laporan Harian</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('hutang_piutang')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'hutang_piutang'
                ? 'bg-slate-900 text-amber-300 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>2. Hutang & Piutang</span>
            {(unpaidPurchases.length > 0 || unpaidSales.length > 0) && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                {unpaidPurchases.length + unpaidSales.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. SUB-TAB 1: LAPORAN HARIAN SESUAI CATATAN BUKU */}
      {activeSubTab === 'laporan_harian' && (
        <div className="space-y-4">
          
          {/* Top Filter Bar: Date Selector & Quick Buttons */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Pilih Tanggal:</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === todayStr 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Hari Ini
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(yesterdayDate)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === yesterdayDate 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Kemarin
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
              />

              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                {formatDate(selectedDate)}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {Object.keys(manualOverrides).length > 0 && (
                <button
                  type="button"
                  onClick={handleResetManualOverrides}
                  className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Kembalikan semua baris yang diedit manual ke hitungan otomatis data sistem"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset ke Otomatis Sistem</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrintReport}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                title="Cetak Laporan Harian resmi sesuai format"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Cetak Laporan</span>
              </button>
            </div>
          </div>

          {/* MAIN JOURNAL CARD CONTAINER: EXACT MATCH WITH NOTEBOOK */}
          <div className="bg-white rounded-3xl border border-slate-300 shadow-xl max-w-4xl mx-auto overflow-hidden">
            
            {/* Header Title inside card */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-slate-700 bg-white p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                  <img
                    src={storeProfile.logoUrl || '/logo_unggas.svg'}
                    alt={storeProfile.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-amber-400 font-extrabold text-xs sm:text-sm tracking-wider uppercase">
                    {storeProfile.name}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2 mt-0.5">
                    <span>LAPORAN</span>
                    <span className="text-sm sm:text-base font-extrabold text-amber-300 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700 tracking-normal">
                      KEUANGAN
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Alur Perhitungan Harian Murni Sesuai Buku Catatan Operasional
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 shrink-0">
                <span className="text-[11px] font-semibold text-slate-400 block">Tanggal:</span>
                <span className="font-mono font-bold text-base sm:text-lg text-amber-300 block">
                  {formatDate(selectedDate)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  (H-1 Kemarin: {formatDate(yesterdayDate)})
                </span>
              </div>
            </div>

            {/* 7 ROWS AND INTERMEDIATE TOTALS (EXACT HANDWRITTEN MATCH) */}
            <div className="p-5 sm:p-8 space-y-6 text-xs">
              
              {/* ======================================================== */}
              {/* SECTION 1: OUTPUT (1. TAGIHAN + 2. STOK OPNAME HARI INI) */}
              {/* ======================================================== */}
              <div className="space-y-3">
                
                {/* 1. TAGIHAN PER HARI (NOTA) */}
                <div className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          1
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                          TAGIHAN PER HARI (NOTA)
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 pl-9">
                        (TANPA SISA HUTANG & KEMBALIAN / TABUNGAN)
                      </div>
                      <div className="pl-9 pt-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          Total {dailySales.length} Nota Penjualan
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDetail('tagihan')}
                          className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {expandedDetails['tagihan'] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{expandedDetails['tagihan'] ? 'Tutup Rincian' : 'Lihat Rincian Nota'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Value Input / Display */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-slate-400 font-mono font-bold text-base">=</span>
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
                        <span className="text-xs text-slate-400 font-mono mr-1">Rp</span>
                        <input
                          type="number"
                          value={valTagihanPerHari}
                          onChange={(e) => setManualOverrides(prev => ({ ...prev, tagihan: parseFloat(e.target.value) || 0 }))}
                          className="w-36 sm:w-44 font-mono font-black text-slate-900 text-right text-base focus:outline-hidden"
                          title="Ubah nominal Tagihan Per Hari (Nota)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detail Accordion for Tagihan */}
                  {expandedDetails['tagihan'] && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <span className="font-bold text-[11px] text-slate-700 block">Daftar Nota Penjualan Tanggal {formatDate(selectedDate)}:</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {dailySales.map((s, idx) => (
                          <div key={s.id} className="py-1.5 flex justify-between items-center text-[11px]">
                            <div>
                              <strong className="text-slate-900">{idx + 1}. {s.customerName}</strong> ({s.invoiceNumber})
                            </div>
                            <div className="font-mono font-bold text-slate-800">
                              {formatCurrency(s.totalBarang !== undefined ? s.totalBarang : s.grandTotal)}
                            </div>
                          </div>
                        ))}
                        {dailySales.length === 0 && (
                          <div className="text-slate-400 py-2 italic text-center">Belum ada transaksi penjualan pada tanggal ini.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. STOK OPNAME PER HARI */}
                <div className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          2
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                          STOK OPNAME PER HARI
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium pl-9">
                        (Aset Fisik Stok Akhir Hari Ini)
                      </div>
                      <div className="pl-9 pt-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {items.length} Item Katalog Terdaftar
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDetail('stokHariIni')}
                          className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {expandedDetails['stokHariIni'] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{expandedDetails['stokHariIni'] ? 'Tutup Rincian' : 'Lihat Rincian Stok'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Value Input / Display */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-slate-400 font-mono font-bold text-base">=</span>
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
                        <span className="text-xs text-slate-400 font-mono mr-1">Rp</span>
                        <input
                          type="number"
                          value={valStokOpnameHariIni}
                          onChange={(e) => setManualOverrides(prev => ({ ...prev, stokHariIni: parseFloat(e.target.value) || 0 }))}
                          className="w-36 sm:w-44 font-mono font-black text-slate-900 text-right text-base focus:outline-hidden"
                          title="Ubah nominal Stok Opname Hari Ini"
                        />
                      </div>
                      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-300" title="Ditambahkan (+)">
                        (+)
                      </span>
                    </div>
                  </div>

                  {/* Detail Accordion for Stok Hari Ini */}
                  {expandedDetails['stokHariIni'] && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <span className="font-bold text-[11px] text-slate-700 block">Rincian Estimasi Nilai Stok Hari Ini:</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {items.map((it, idx) => (
                          <div key={it.id} className="py-1.5 flex justify-between items-center text-[11px]">
                            <div>
                              <strong className="text-slate-900">{idx + 1}. {it.name}</strong>: {formatNumber(it.currentStock)} {it.unit} @ {formatCurrency(it.baseBuyPrice)}
                            </div>
                            <div className="font-mono font-bold text-slate-800">
                              {formatCurrency(it.currentStock * it.baseBuyPrice)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* INTERMEDIATE RESULT 1: (TOTAL) */}
                <div className="bg-amber-500/10 border-2 border-amber-400 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wider">
                      (TOTAL)
                    </span>
                    <span className="text-[11px] text-amber-800 font-semibold bg-amber-200/80 px-2 py-0.5 rounded-md">
                      ① Tagihan + ② Stok Hari Ini
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-slate-900 text-lg sm:text-xl">
                      {formatCurrency(valTotalOutput)}
                    </span>
                  </div>
                </div>

              </div>

              {/* ======================================================== */}
              {/* SECTION 2: INPUTS / PENGELUARAN & MODAL (3, 4, 5)        */}
              {/* ======================================================== */}
              <div className="space-y-3 pt-2">
                
                {/* 3. STOK OPNAME KEMARIN */}
                <div className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          3
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                          STOK OPNAME KEMARIN
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium pl-9">
                        (Aset Fisik Stok Awal H-1 Kemarin: {formatDate(yesterdayDate)})
                      </div>
                    </div>

                    {/* Value Input / Display */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-slate-400 font-mono font-bold text-base">=</span>
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
                        <span className="text-xs text-slate-400 font-mono mr-1">Rp</span>
                        <input
                          type="number"
                          value={valStokOpnameKemarin}
                          onChange={(e) => setManualOverrides(prev => ({ ...prev, stokKemarin: parseFloat(e.target.value) || 0 }))}
                          className="w-36 sm:w-44 font-mono font-black text-slate-900 text-right text-base focus:outline-hidden"
                          title="Ubah nominal Stok Opname Kemarin"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. OPERASIONAL PER HARI */}
                <div className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          4
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                          OPERASIONAL PER HARI
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium pl-9">
                        (Biaya Operasional Usaha + Upah Gaji Harian)
                      </div>
                      <div className="pl-9 pt-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {dailyExpenses.length + dailyOperationalTxs.length} Pengeluaran • {dailySalarySlips.length} Slip Gaji
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDetail('operasional')}
                          className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {expandedDetails['operasional'] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{expandedDetails['operasional'] ? 'Tutup Rincian' : 'Lihat Rincian Biaya'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Value Input / Display */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-slate-400 font-mono font-bold text-base">=</span>
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
                        <span className="text-xs text-slate-400 font-mono mr-1">Rp</span>
                        <input
                          type="number"
                          value={valOperasionalPerHari}
                          onChange={(e) => setManualOverrides(prev => ({ ...prev, operasional: parseFloat(e.target.value) || 0 }))}
                          className="w-36 sm:w-44 font-mono font-black text-slate-900 text-right text-base focus:outline-hidden"
                          title="Ubah nominal Operasional Per Hari"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detail Accordion for Operasional */}
                  {expandedDetails['operasional'] && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <span className="font-bold text-[11px] text-slate-700 block">Rincian Operasional & Upah Tanggal {formatDate(selectedDate)}:</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {dailyExpenses.map(e => (
                          <div key={e.id} className="py-1.5 flex justify-between items-center text-[11px]">
                            <div><strong className="text-slate-900">{e.category}</strong>: {e.description}</div>
                            <div className="font-mono font-bold text-slate-800">{formatCurrency(e.amount)}</div>
                          </div>
                        ))}
                        {dailyOperationalTxs.map(tx => (
                          <div key={tx.id} className="py-1.5 flex justify-between items-center text-[11px]">
                            <div><strong className="text-slate-900">Operasional ({tx.type})</strong>: {tx.description}</div>
                            <div className="font-mono font-bold text-slate-800">{formatCurrency(tx.amount)}</div>
                          </div>
                        ))}
                        {dailySalarySlips.map(s => (
                          <div key={s.id} className="py-1.5 flex justify-between items-center text-[11px]">
                            <div><strong className="text-slate-900">Slip Gaji</strong>: {s.employeeName} ({s.slipNumber})</div>
                            <div className="font-mono font-bold text-slate-800">{formatCurrency(s.netSalary)}</div>
                          </div>
                        ))}
                        {dailyExpenses.length === 0 && dailyOperationalTxs.length === 0 && dailySalarySlips.length === 0 && (
                          <div className="text-slate-400 py-2 italic text-center">Belum ada catatan pengeluaran/gaji pada tanggal ini.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. MODAL SUPLAIER */}
                <div className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          5
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                          MODAL SUPLAIER
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium pl-9">
                        (Pembelian Ayam / Bahan Masuk dari Supplier)
                      </div>
                      <div className="pl-9 pt-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          Total {dailyPurchases.length} Faktur Pembelian Supplier
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDetail('modalSuplaier')}
                          className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {expandedDetails['modalSuplaier'] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{expandedDetails['modalSuplaier'] ? 'Tutup Rincian' : 'Lihat Rincian Faktur'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Value Input / Display */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-slate-400 font-mono font-bold text-base">=</span>
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
                        <span className="text-xs text-slate-400 font-mono mr-1">Rp</span>
                        <input
                          type="number"
                          value={valModalSuplaier}
                          onChange={(e) => setManualOverrides(prev => ({ ...prev, modalSuplaier: parseFloat(e.target.value) || 0 }))}
                          className="w-36 sm:w-44 font-mono font-black text-slate-900 text-right text-base focus:outline-hidden"
                          title="Ubah nominal Modal Suplaier"
                        />
                      </div>
                      <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 font-black text-sm flex items-center justify-center shrink-0 border border-rose-300" title="Dikurangkan (-)">
                        (-)
                      </span>
                    </div>
                  </div>

                  {/* Detail Accordion for Modal Suplaier */}
                  {expandedDetails['modalSuplaier'] && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <span className="font-bold text-[11px] text-slate-700 block">Daftar Pembelian Supplier Tanggal {formatDate(selectedDate)}:</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {dailyPurchases.map((p, idx) => (
                          <div key={p.id} className="py-1.5 flex justify-between items-center text-[11px]">
                            <div>
                              <strong className="text-slate-900">{idx + 1}. {p.supplierName}</strong> ({p.invoiceNumber})
                            </div>
                            <div className="font-mono font-bold text-slate-800">
                              {formatCurrency(p.grandTotal)}
                            </div>
                          </div>
                        ))}
                        {dailyPurchases.length === 0 && (
                          <div className="text-slate-400 py-2 italic text-center">Belum ada faktur pembelian supplier pada tanggal ini.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* INTERMEDIATE RESULT 2: (HASIL LAPORAN HARIAN / OMZET BERSIH) */}
                <div className="bg-blue-600 text-white p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                        (HASIL LAPORAN HARIAN / OMZET BERSIH)
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-100 mt-0.5">
                      (TOTAL) - ③ Stok Kemarin - ④ Operasional - ⑤ Modal Suplaier
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="font-mono font-black text-amber-300 text-xl sm:text-2xl drop-shadow-xs">
                      {formatCurrency(valHasilLaporanHarian)}
                    </span>
                  </div>
                </div>

              </div>

              {/* ======================================================== */}
              {/* SECTION 3: SISA HUTANG COSTUMER (6)                      */}
              {/* ======================================================== */}
              <div className="space-y-3 pt-2">
                
                {/* 6. SISA HUTANG COSTUMER */}
                <div className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          6
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                          SISA HUTANG COSTUMER
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium pl-9">
                        (Piutang / Sisa Tagihan Pelanggan Belum Bayar Hari Ini)
                      </div>
                      <div className="pl-9 pt-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {dailyUnpaidSales.length} Pelanggan Belum Lunas
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDetail('sisaHutang')}
                          className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {expandedDetails['sisaHutang'] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{expandedDetails['sisaHutang'] ? 'Tutup Rincian' : 'Lihat Rincian Hutang'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Value Input / Display */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-slate-400 font-mono font-bold text-base">=</span>
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
                        <span className="text-xs text-slate-400 font-mono mr-1">Rp</span>
                        <input
                          type="number"
                          value={valSisaHutangCostumer}
                          onChange={(e) => setManualOverrides(prev => ({ ...prev, sisaHutang: parseFloat(e.target.value) || 0 }))}
                          className="w-36 sm:w-44 font-mono font-black text-slate-900 text-right text-base focus:outline-hidden"
                          title="Ubah nominal Sisa Hutang Costumer"
                        />
                      </div>
                      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-300" title="Ditambahkan (+)">
                        (+)
                      </span>
                    </div>
                  </div>

                  {/* Detail Accordion for Sisa Hutang */}
                  {expandedDetails['sisaHutang'] && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <span className="font-bold text-[11px] text-slate-700 block">Daftar Sisa Tagihan Pelanggan Tanggal {formatDate(selectedDate)}:</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {dailyUnpaidSales.map((s, idx) => (
                          <div key={s.id} className="py-1.5 flex justify-between items-center text-[11px]">
                            <div>
                              <strong className="text-slate-900">{idx + 1}. {s.customerName}</strong> ({s.invoiceNumber})
                            </div>
                            <div className="font-mono font-bold text-rose-600">
                              {formatCurrency(s.remainingDebt !== undefined ? s.remainingDebt : Math.max(0, s.grandTotal - s.amountPaid))}
                            </div>
                          </div>
                        ))}
                        {dailyUnpaidSales.length === 0 && (
                          <div className="text-slate-400 py-2 italic text-center">Semua penjualan hari ini lunas (tidak ada sisa hutang).</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* INTERMEDIATE RESULT 3: (TOTAL) */}
                <div className="bg-amber-500/10 border-2 border-amber-400 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wider">
                      (TOTAL)
                    </span>
                    <span className="text-[11px] text-amber-800 font-semibold bg-amber-200/80 px-2 py-0.5 rounded-md">
                      Hasil Omzet Bersih + ⑥ Sisa Hutang
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-slate-900 text-lg sm:text-xl">
                      {formatCurrency(valTotalSetelahHutang)}
                    </span>
                  </div>
                </div>

              </div>

              {/* ======================================================== */}
              {/* SECTION 4: KEMBALIAN / TABUNGAN (7) & TOTAL KEUANGAN      */}
              {/* ======================================================== */}
              <div className="space-y-3 pt-2">
                
                {/* 7. KEMBALIAN / TABUNGAN COSTUMER */}
                <div className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          7
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                          KEMBALIAN / TABUNGAN COSTUMER
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium pl-9">
                        (Deposit / Tabungan Pelanggan & Kelebihan Bayar Hari Ini)
                      </div>
                      <div className="pl-9 pt-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {dailySavingsSales.length} Transaksi Menambah Tabungan
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDetail('tabungan')}
                          className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {expandedDetails['tabungan'] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{expandedDetails['tabungan'] ? 'Tutup Rincian' : 'Lihat Rincian Tabungan'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Value Input / Display */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-slate-400 font-mono font-bold text-base">=</span>
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
                        <span className="text-xs text-slate-400 font-mono mr-1">Rp</span>
                        <input
                          type="number"
                          value={valKembalianTabunganCostumer}
                          onChange={(e) => setManualOverrides(prev => ({ ...prev, tabungan: parseFloat(e.target.value) || 0 }))}
                          className="w-36 sm:w-44 font-mono font-black text-slate-900 text-right text-base focus:outline-hidden"
                          title="Ubah nominal Kembalian / Tabungan Costumer"
                        />
                      </div>
                      <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 font-black text-sm flex items-center justify-center shrink-0 border border-rose-300" title="Dikurangkan (-)">
                        (-)
                      </span>
                    </div>
                  </div>

                  {/* Detail Accordion for Tabungan */}
                  {expandedDetails['tabungan'] && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <span className="font-bold text-[11px] text-slate-700 block">Daftar Kelebihan Bayar / Tabungan Tanggal {formatDate(selectedDate)}:</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {dailySavingsSales.map((s, idx) => (
                          <div key={s.id} className="py-1.5 flex justify-between items-center text-[11px]">
                            <div>
                              <strong className="text-slate-900">{idx + 1}. {s.customerName}</strong> ({s.invoiceNumber})
                            </div>
                            <div className="font-mono font-bold text-emerald-700">
                              +{formatCurrency(s.newSavingsRecorded || s.overpaymentAmount || 0)}
                            </div>
                          </div>
                        ))}
                        {dailySavingsSales.length === 0 && (
                          <div className="text-slate-400 py-2 italic text-center">Tidak ada transaksi yang menambah tabungan pada tanggal ini.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* FINAL RESULT: (TOTAL KEUANGAN) ✓ */}
                <div className="bg-emerald-950 text-white p-5 sm:p-6 rounded-3xl border-4 border-emerald-500 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg sm:text-2xl font-black text-white tracking-wider uppercase">
                        (TOTAL KEUANGAN)
                      </span>
                      <span className="w-8 h-8 rounded-full bg-emerald-400 text-emerald-950 font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                        ✓
                      </span>
                    </div>
                    <div className="text-xs text-emerald-200">
                      Formula: (TOTAL) - ⑦ Kembalian / Tabungan Costumer
                    </div>
                    <div className="text-[11px] text-emerald-300/80 font-mono">
                      Status Laporan: Valid & Siap Dicetak
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="font-mono font-black text-amber-300 text-2xl sm:text-3xl drop-shadow-md">
                      {formatCurrency(valTotalKeuangan)}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Footer Actions inside Card */}
            <div className="bg-slate-100 p-4 border-t border-slate-300 flex items-center justify-end">
              <button
                type="button"
                onClick={handlePrintReport}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Cetak Lembar Laporan</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* 3. SUB-TAB 2: BUKU HUTANG & PIUTANG (PELUNASAN HUTANG SUPPLIER & PIUTANG PELANGGAN) */}
      {activeSubTab === 'hutang_piutang' && (
        <div className="space-y-4">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Hutang ke Supplier
                </span>
                <span className="text-2xl font-black font-mono text-rose-600 mt-1 block">
                  {formatCurrency(totalOutstandingPurchases)}
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  {unpaidPurchases.length} Faktur belum lunas
                </span>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Building2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Piutang Pelanggan (Customer)
                </span>
                <span className="text-2xl font-black font-mono text-amber-600 mt-1 block">
                  {formatCurrency(totalOutstandingSales)}
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  {unpaidSales.length} Nota belum lunas
                </span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setDebtTypeFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  debtTypeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua ({unpaidPurchases.length + unpaidSales.length})
              </button>
              <button
                type="button"
                onClick={() => setDebtTypeFilter('hutang_supplier')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  debtTypeFilter === 'hutang_supplier' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Hutang Supplier ({unpaidPurchases.length})
              </button>
              <button
                type="button"
                onClick={() => setDebtTypeFilter('piutang_pelanggan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  debtTypeFilter === 'piutang_pelanggan' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Piutang Pelanggan ({unpaidSales.length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama supplier / pelanggan..."
                value={debtSearchQuery}
                onChange={(e) => setDebtSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Tables: Supplier Debt */}
          {(debtTypeFilter === 'all' || debtTypeFilter === 'hutang_supplier') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-rose-50/70 border-b border-rose-200 flex justify-between items-center">
                <span className="font-bold text-xs text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-rose-600" />
                  <span>Daftar Hutang ke Supplier ({unpaidPurchases.length})</span>
                </span>
                <span className="font-mono font-bold text-xs text-rose-700">
                  Total: {formatCurrency(totalOutstandingPurchases)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">No. Faktur & Tanggal</th>
                      <th className="py-2.5 px-3">Supplier</th>
                      <th className="py-2.5 px-3 text-right">Total Pembelian</th>
                      <th className="py-2.5 px-3 text-right">Telah Dibayar</th>
                      <th className="py-2.5 px-3 text-right">Sisa Hutang</th>
                      <th className="py-2.5 px-3 text-center">Aksi Pelunasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {unpaidPurchases
                      .filter(p => !debtSearchQuery.trim() || p.supplierName.toLowerCase().includes(debtSearchQuery.toLowerCase()) || p.invoiceNumber.toLowerCase().includes(debtSearchQuery.toLowerCase()))
                      .map((p) => {
                        const paid = p.amountPaid || 0;
                        const remaining = p.remainingDebt !== undefined ? p.remainingDebt : Math.max(0, p.grandTotal - paid);

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-slate-900 block">{p.invoiceNumber}</span>
                              <span className="text-[10px] text-slate-500">{formatDate(p.date)}</span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {p.supplierName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                              {formatCurrency(p.grandTotal)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                              {formatCurrency(paid)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(remaining)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setDebtModalPurchase(p);
                                  setPurchasePayAmount(remaining);
                                  setPurchasePayNotes('');
                                }}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                Bayar Hutang
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {unpaidPurchases.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Tidak ada hutang supplier yang belum lunas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tables: Customer Debt (Piutang) */}
          {(debtTypeFilter === 'all' || debtTypeFilter === 'piutang_pelanggan') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-amber-50/70 border-b border-amber-200 flex justify-between items-center">
                <span className="font-bold text-xs text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Daftar Piutang Pelanggan ({unpaidSales.length})</span>
                </span>
                <span className="font-mono font-bold text-xs text-amber-700">
                  Total: {formatCurrency(totalOutstandingSales)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">No. Nota & Tanggal</th>
                      <th className="py-2.5 px-3">Pelanggan</th>
                      <th className="py-2.5 px-3 text-right">Total Belanja</th>
                      <th className="py-2.5 px-3 text-right">Telah Dibayar</th>
                      <th className="py-2.5 px-3 text-right">Sisa Piutang</th>
                      <th className="py-2.5 px-3 text-center">Aksi Penerimaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {unpaidSales
                      .filter(s => !debtSearchQuery.trim() || s.customerName.toLowerCase().includes(debtSearchQuery.toLowerCase()) || s.invoiceNumber.toLowerCase().includes(debtSearchQuery.toLowerCase()))
                      .map((s) => {
                        const paid = s.amountPaid || 0;
                        const remaining = s.remainingDebt !== undefined ? s.remainingDebt : Math.max(0, s.grandTotal - paid);

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-slate-900 block">{s.invoiceNumber}</span>
                              <span className="text-[10px] text-slate-500">{formatDate(s.date)}</span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {s.customerName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                              {formatCurrency(s.grandTotal)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                              {formatCurrency(paid)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                              {formatCurrency(remaining)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setDebtModalSale(s);
                                  setSalePayAmount(remaining);
                                  setSalePayNotes('');
                                }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                Terima Bayar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {unpaidSales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Tidak ada piutang pelanggan yang belum lunas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL BAYAR HUTANG SUPPLIER (BKK) */}
      {debtModalPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Bayar Hutang Supplier</h3>
                <p className="text-xs text-slate-500">{debtModalPurchase.supplierName} • {debtModalPurchase.invoiceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setDebtModalPurchase(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPurchasePayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sisa Hutang Saat Ini:</label>
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl font-mono font-bold text-rose-700 text-sm">
                  {formatCurrency(debtModalPurchase.remainingDebt !== undefined ? debtModalPurchase.remainingDebt : Math.max(0, debtModalPurchase.grandTotal - (debtModalPurchase.amountPaid || 0)))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal yang Akan Dibayar (Rp):</label>
                <input
                  type="number"
                  min="1000"
                  max={debtModalPurchase.remainingDebt !== undefined ? debtModalPurchase.remainingDebt : Math.max(0, debtModalPurchase.grandTotal - (debtModalPurchase.amountPaid || 0))}
                  value={purchasePayAmount}
                  onChange={(e) => setPurchasePayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-sm focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Metode Pembayaran:</label>
                <select
                  value={purchasePayMethod}
                  onChange={(e) => setPurchasePayMethod(e.target.value as 'Tunai' | 'Transfer')}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden"
                >
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Tunai">Tunai (Kas Toko)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Tambahan (Opsional):</label>
                <input
                  type="text"
                  placeholder="e.g. Pembayaran via rekening BCA..."
                  value={purchasePayNotes}
                  onChange={(e) => setPurchasePayNotes(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDebtModalPurchase(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TERIMA BAYAR PIUTANG PELANGGAN (BKM) */}
      {debtModalSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Terima Pembayaran Piutang</h3>
                <p className="text-xs text-slate-500">{debtModalSale.customerName} • {debtModalSale.invoiceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setDebtModalSale(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCustomerPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sisa Piutang Saat Ini:</label>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl font-mono font-bold text-amber-700 text-sm">
                  {formatCurrency(debtModalSale.remainingDebt !== undefined ? debtModalSale.remainingDebt : Math.max(0, debtModalSale.grandTotal - (debtModalSale.amountPaid || 0)))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal yang Diterima (Rp):</label>
                <input
                  type="number"
                  min="1000"
                  max={debtModalSale.remainingDebt !== undefined ? debtModalSale.remainingDebt : Math.max(0, debtModalSale.grandTotal - (debtModalSale.amountPaid || 0))}
                  value={salePayAmount}
                  onChange={(e) => setSalePayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-sm focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Metode Pembayaran:</label>
                <select
                  value={salePayMethod}
                  onChange={(e) => setSalePayMethod(e.target.value as 'Tunai' | 'Transfer')}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden"
                >
                  <option value="Tunai">Tunai (Cash)</option>
                  <option value="Transfer">Transfer Bank</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Tambahan (Opsional):</label>
                <input
                  type="text"
                  placeholder="e.g. Pembayaran tunai saat pengantaran..."
                  value={salePayNotes}
                  onChange={(e) => setSalePayNotes(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDebtModalSale(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Konfirmasi Penerimaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
