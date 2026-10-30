import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  CalendarCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock, 
  UserCheck, 
  CheckCircle2,
  FileText
} from 'lucide-react';
import { 
  OperationalTransaction, 
  OperationalTransactionType, 
  Employee, 
  AttendanceRecord, 
  SalarySlip, 
  UserRole,
  EmployeeKasbonRecord
} from '../types/index.ts';
import { formatCurrency, formatNumber, formatDate, formatDateTime } from '../utils/formatters.ts';
import { AttendanceSalary } from './AttendanceSalary.tsx';

interface OperationalManagementProps {
  operationalTransactions: OperationalTransaction[];
  onSaveTransaction: (tx: OperationalTransaction) => void;
  onDeleteTransaction: (txId: string) => void;
  // Props required for AttendanceSalary subtab
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  salarySlips: SalarySlip[];
  kasbonRecords: EmployeeKasbonRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  onGenerateSalarySlip: (slip: SalarySlip) => void;
  onDeleteSalarySlip: (slipId: string) => void;
  onPrintSalarySlip: (slip: SalarySlip) => void;
  onSaveEmployee: (emp: Employee) => void;
  onSaveKasbon: (record: EmployeeKasbonRecord) => void;
  onDeleteKasbon: (id: string) => void;
  userRole: UserRole;
  storeName: string;
}

export const OperationalManagement: React.FC<OperationalManagementProps> = ({
  operationalTransactions,
  onSaveTransaction,
  onDeleteTransaction,
  employees,
  attendanceRecords,
  salarySlips,
  kasbonRecords,
  onSaveAttendance,
  onGenerateSalarySlip,
  onDeleteSalarySlip,
  onPrintSalarySlip,
  onSaveEmployee,
  onSaveKasbon,
  onDeleteKasbon,
  userRole,
  storeName,
}) => {
  // Top Level Sub-Tab state: 'kas' vs 'absensi'
  const [activeSubTab, setActiveSubTab] = useState<'kas' | 'absensi'>('kas');

  // Form states for Operational Cash entry
  const todayStr = new Date().toISOString().substring(0, 10);
  const [date, setDate] = useState<string>(todayStr);
  const [type, setType] = useState<OperationalTransactionType>('pengeluaran');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<number>(50000);

  // Daily Report filter date (defaults to today)
  const [reportDate, setReportDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'daily' | 'all'>('daily');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    const newTx: OperationalTransaction = {
      id: `optx-${Date.now()}`,
      date,
      type,
      description: description.trim(),
      amount,
      recordedBy: userRole === 'admin' ? 'Admin Usaha' : 'User Operasional',
      createdAt: new Date().toISOString(),
    };

    onSaveTransaction(newTx);
    // Reset description & keep date for quick continuous entry
    setDescription('');
    setAmount(50000);
  };

  // Quick Amount Handlers
  const addAmount = (val: number) => {
    setAmount((prev) => Math.max(0, prev + val));
  };

  // Filtered transactions for Daily Report
  const filteredTransactions = useMemo(() => {
    return operationalTransactions.filter((tx) => {
      const matchDate = viewMode === 'all' || tx.date === reportDate;
      const matchSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.recordedBy.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDate && matchSearch;
    });
  }, [operationalTransactions, viewMode, reportDate, searchQuery]);

  // Real-time Daily Metrics
  const dailyTotalIn = useMemo(() => {
    return filteredTransactions
      .filter((tx) => tx.type === 'pendapatan')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredTransactions]);

  const dailyTotalOut = useMemo(() => {
    return filteredTransactions
      .filter((tx) => tx.type === 'pengeluaran')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredTransactions]);

  const dailyNetBalance = useMemo(() => {
    return dailyTotalIn - dailyTotalOut;
  }, [dailyTotalIn, dailyTotalOut]);

  return (
    <div className="space-y-5">
      {/* Top Header Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-white/60 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('kas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'kas'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Biaya & Transaksi Kas Operasional</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('absensi')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'absensi'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Absensi & Gaji Karyawan</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium px-2">
          Sub-menu Operasional Usaha Ayam
        </div>
      </div>

      {/* SUB-TAB 1: BIAYA & KAS OPERASIONAL */}
      {activeSubTab === 'kas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT FORM PANEL: INPUT TRANSAKSI (5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/85 backdrop-blur-md p-5 rounded-2xl border border-white/60 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Input Transaksi Kas Manual</h3>
                  <p className="text-xs text-slate-500">Catat uang masuk (pendapatan) atau uang keluar (pengeluaran)</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. TANGGAL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Transaksi:
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                    required
                  />
                </div>

                {/* 2. JENIS TRANSAKSI (PENDAPATAN VS PENGELUARAN) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jenis Transaksi:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('pendapatan')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        type === 'pendapatan'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Pendapatan / Uang Masuk</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('pengeluaran')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        type === 'pengeluaran'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Pengeluaran / Uang Keluar</span>
                    </button>
                  </div>
                </div>

                {/* 3. KETERANGAN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Keterangan Transaksi:
                  </label>
                  <input
                    type="text"
                    placeholder={type === 'pendapatan' ? 'Misal: Penjualan limbah bulu & usus ayam' : 'Misal: Beli es balok pendingin / BBM pick up'}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                    required
                  />
                </div>

                {/* 4. BIAYA / NOMINAL (FORMATTED NUMBER) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Jumlah Uang / Nominal (Rp):
                    </label>
                    {amount > 0 && (
                      <span className="text-[11px] font-mono font-bold text-amber-800">
                        {formatCurrency(amount)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount === 0 ? '' : amount.toLocaleString('id-ID')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\./g, '').replace(/,/g, '');
                        setAmount(raw === '' ? 0 : Math.max(0, parseInt(raw) || 0));
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    *Titik ribuan otomatis muncul saat mengetik agar tidak kelebihan atau kekurangan nol.
                  </p>

                  {/* Quick Addition Buttons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => addAmount(10000)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg cursor-pointer"
                    >
                      +10rb
                    </button>
                    <button
                      type="button"
                      onClick={() => addAmount(50000)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg cursor-pointer"
                    >
                      +50rb
                    </button>
                    <button
                      type="button"
                      onClick={() => addAmount(100000)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg cursor-pointer"
                    >
                      +100rb
                    </button>
                    <button
                      type="button"
                      onClick={() => addAmount(500000)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg cursor-pointer"
                    >
                      +500rb
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!description.trim() || amount <= 0}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    type === 'pendapatan' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Transaksi Kas ({type === 'pendapatan' ? 'Masuk' : 'Keluar'})</span>
                </button>

              </form>
            </div>
          </div>

          {/* RIGHT PANEL: REALTIME DAILY REPORT & DETAIL TABLE (7 COLS) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Filter Date Bar */}
            <div className="bg-white/85 backdrop-blur-md p-3.5 rounded-2xl border border-white/60 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800">Laporan Kas Harian:</span>
                
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode('daily')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg cursor-pointer ${
                      viewMode === 'daily' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg cursor-pointer ${
                      viewMode === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Transaksi
                  </button>
                </div>
              </div>

              {viewMode === 'daily' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setReportDate(todayStr)}
                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    Hari Ini
                  </button>
                </div>
              )}
            </div>

            {/* REAL-TIME DAILY SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Card 1: Total Uang Masuk */}
              <div className="bg-emerald-50/90 border border-emerald-200/80 p-3.5 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    Total Uang Masuk
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                    Pendapatan
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-900 tabular-nums">
                  {formatCurrency(dailyTotalIn)}
                </div>
              </div>

              {/* Card 2: Total Uang Keluar */}
              <div className="bg-rose-50/90 border border-rose-200/80 p-3.5 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-rose-800 flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" />
                    Total Uang Keluar
                  </span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                    Pengeluaran
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-rose-900 tabular-nums">
                  {formatCurrency(dailyTotalOut)}
                </div>
              </div>

              {/* Card 3: Net Saldo Kas Harian */}
              <div className="bg-amber-50/90 border border-amber-200/80 p-3.5 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-amber-600" />
                    Saldo Kas Harian
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                    Net Saldo
                  </span>
                </div>
                <div className={`text-lg font-bold font-mono tabular-nums ${dailyNetBalance >= 0 ? 'text-amber-950' : 'text-rose-700'}`}>
                  {dailyNetBalance >= 0 ? `+${formatCurrency(dailyNetBalance)}` : `-${formatCurrency(Math.abs(dailyNetBalance))}`}
                </div>
              </div>

            </div>

            {/* DETAIL TRANSACTION TABLE */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-white/60 shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-slate-200/60 bg-slate-50/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Rincian Transaksi Kas ({filteredTransactions.length})
                  </h4>
                </div>

                <div className="relative w-40 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Cari keterangan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Tanggal / Waktu</th>
                      <th className="py-2.5 px-3">Tipe</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                      <th className="py-2.5 px-3">Petugas</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx, idx) => {
                      const isIn = tx.type === 'pendapatan';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                            {formatDate(tx.date)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isIn ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isIn ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                              {isIn ? 'Uang Masuk' : 'Uang Keluar'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap tabular-nums ${
                            isIn ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {isIn ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {tx.recordedBy}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Hapus pencatatan kas "${tx.description}"?`)) {
                                  onDeleteTransaction(tx.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer transition-colors"
                              title="Hapus Transaksi Kas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                          Belum ada transaksi kas yang dicatat untuk tanggal ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 2: ABSENSI & GAJI KARYAWAN */}
      {activeSubTab === 'absensi' && (
        <AttendanceSalary
          employees={employees}
          attendanceRecords={attendanceRecords}
          salarySlips={salarySlips}
          kasbonRecords={kasbonRecords}
          onSaveAttendance={onSaveAttendance}
          onGenerateSalarySlip={onGenerateSalarySlip}
          onDeleteSalarySlip={onDeleteSalarySlip}
          onPrintSalarySlip={onPrintSalarySlip}
          onSaveEmployee={onSaveEmployee}
          onSaveKasbon={onSaveKasbon}
          onDeleteKasbon={onDeleteKasbon}
          userRole={userRole}
          storeName={storeName}
        />
      )}

    </div>
  );
};
