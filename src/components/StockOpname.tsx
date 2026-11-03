import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Scale, 
  FileText, 
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { Item, StockOpnameRecord, UserRole } from '../types/index.ts';
import { formatNumber, formatCurrency, formatDateTime } from '../utils/formatters.ts';

interface StockOpnameProps {
  items: Item[];
  opnameRecords: StockOpnameRecord[];
  onSubmitOpname: (record: StockOpnameRecord) => void;
  onApproveOpname?: (recordId: string) => void;
  onRejectOpname?: (recordId: string) => void;
  preselectedItemId?: string;
  userRole: UserRole;
  userName: string;
}

function formatLongDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export const StockOpname: React.FC<StockOpnameProps> = ({
  items,
  opnameRecords,
  onSubmitOpname,
  userRole,
  userName,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'input' | 'riwayat'>('input');

  // Multi-item Physical Count state: itemId -> physical count input string
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // History Filter State
  const [historyDateFilter, setHistoryDateFilter] = useState<string>(''); // YYYY-MM-DD
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  // Expanded Date Groups state: dateKey -> boolean (true = expanded)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Filter items for form input tab
  const filteredItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return items;
    const q = itemSearchQuery.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [items, itemSearchQuery]);

  // Handle physical input change for specific item
  const handlePhysicalCountChange = (itemId: string, value: string) => {
    setPhysicalCounts(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  // Reset all physical counts
  const handleResetInputs = () => {
    setPhysicalCounts({});
  };

  // Compute calculated values for all items in form
  const itemCalculations = useMemo(() => {
    let totalLoss = 0;
    let totalGain = 0;
    let modifiedCount = 0;

    const calculated = items.map(item => {
      const inputVal = physicalCounts[item.id];
      const hasInput = inputVal !== undefined && inputVal.trim() !== '';
      const physicalStock = hasInput ? (parseFloat(inputVal) || 0) : item.currentStock;
      const difference = Number((physicalStock - item.currentStock).toFixed(2));
      const differenceCost = Math.round(difference * item.baseBuyPrice);
      const isModified = hasInput && difference !== 0;

      if (isModified) {
        modifiedCount++;
        if (differenceCost < 0) {
          totalLoss += Math.abs(differenceCost);
        } else if (differenceCost > 0) {
          totalGain += differenceCost;
        }
      }

      return {
        item,
        inputVal,
        hasInput,
        physicalStock,
        difference,
        differenceCost,
        isModified,
      };
    });

    const netImpact = totalGain - totalLoss;

    return {
      calculated,
      totalLoss,
      totalGain,
      netImpact,
      modifiedCount,
    };
  }, [items, physicalCounts]);

  // Handle Submit Opname Form (batch process all modified items or entered items)
  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();

    // Find items that have been modified (or where input was provided)
    const itemsToSubmit = itemCalculations.calculated.filter(c => c.hasInput && c.difference !== 0);

    if (itemsToSubmit.length === 0) {
      setSuccessMessage('Tidak ada item yang diubah stok fisiknya. Silakan isi hasil timbangan fisik pada item yang selisih.');
      setTimeout(() => setSuccessMessage(null), 4000);
      return;
    }

    const batchTimestamp = new Date().toISOString();

    itemsToSubmit.forEach(c => {
      const record: StockOpnameRecord = {
        id: `opn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: batchTimestamp,
        itemId: c.item.id,
        itemName: c.item.name,
        unit: c.item.unit,
        unitPrice: c.item.baseBuyPrice,
        systemStock: c.item.currentStock,
        physicalStock: c.physicalStock,
        difference: c.difference,
        differenceCost: c.differenceCost,
        reason: 'Susut Timbangan',
        notes: '',
        adjustedBy: userName || (userRole === 'admin' ? 'Admin' : 'Kasir'),
        status: 'Approved',
        approvedBy: userName,
        approvedAt: batchTimestamp,
      };

      onSubmitOpname(record);
    });

    setSuccessMessage(`Berhasil memperbarui ${itemsToSubmit.length} item stok opname! Data tersimpan di Riwayat.`);
    setPhysicalCounts({});

    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  // --- RIWAYAT GROUPED BY DATE ---
  const groupedHistory = useMemo(() => {
    let records = [...opnameRecords];

    // Apply Date Filter if specified
    if (historyDateFilter) {
      records = records.filter(r => r.date.startsWith(historyDateFilter));
    }

    // Apply Search Query if specified
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase();
      records = records.filter(r => r.itemName.toLowerCase().includes(q) || r.adjustedBy.toLowerCase().includes(q));
    }

    // Group by YYYY-MM-DD
    const map: Record<string, StockOpnameRecord[]> = {};
    records.forEach(r => {
      const dateKey = r.date.substring(0, 10); // "YYYY-MM-DD"
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(r);
    });

    // Convert map to sorted array (newest date first)
    const sortedDateKeys = Object.keys(map).sort((a, b) => b.localeCompare(a));

    return sortedDateKeys.map(dateKey => {
      const dayRecords = map[dateKey];

      let totalLoss = 0;
      let totalGain = 0;

      dayRecords.forEach(r => {
        const cost = r.differenceCost ?? Math.round(r.difference * (r.unitPrice || 0));
        if (cost < 0) {
          totalLoss += Math.abs(cost);
        } else if (cost > 0) {
          totalGain += cost;
        }
      });

      const netCost = totalGain - totalLoss;

      return {
        dateKey,
        formattedDate: formatLongDate(dateKey),
        records: dayRecords,
        itemCount: dayRecords.length,
        totalLoss,
        totalGain,
        netCost,
      };
    });
  }, [opnameRecords, historyDateFilter, historySearchQuery]);

  // Toggle expand for a date group
  const toggleDateExpanded = (dateKey: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: prev[dateKey] === undefined ? false : !prev[dateKey]
    }));
  };

  // Helper check if date is expanded (defaults to true for top date group)
  const isDateExpanded = (dateKey: string, index: number) => {
    if (expandedDates[dateKey] !== undefined) {
      return expandedDates[dateKey];
    }
    return index === 0; // expand the most recent date by default
  };

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      
      {/* Header & Sub-Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-white/60 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              <span>Stok Opname & Susut Timbangan</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Input hasil penimbangan seluruh item terdaftar dan pantau riwayat penyesuaian harian
            </p>
          </div>
        </div>

        {/* 2 Main Sub-Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('input')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'input'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Form Input Cek Fisik ({items.length} Item)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('riwayat')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'riwayat'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Riwayat Per Hari ({groupedHistory.length} Hari)</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TAB 1: FORM INPUT CEK FISIK (MENAMPILKAN SEMUA ITEM TERDAFTAR) */}
      {activeSubTab === 'input' && (
        <form onSubmit={handleSubmitAll} className="space-y-4">
          
          {/* Top Bar with Search & Quick Reset */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span>Cek Timbangan Fisik Semua Item</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Isi angka timbangan fisik pada item yang mengalami perubahan atau susut timbangan
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari item..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                {Object.keys(physicalCounts).length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetInputs}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Batch Financial Summary Box */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Item Di-Input / Diubah:</span>
                <span className="text-sm font-bold font-mono text-slate-900">{itemCalculations.modifiedCount} / {items.length} item</span>
              </div>

              <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex flex-col justify-center">
                <span className="text-[10px] text-rose-700 uppercase font-semibold flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-rose-600" /> Total Kerugian (Susut):
                </span>
                <span className="text-sm font-bold font-mono text-rose-700">
                  {itemCalculations.totalLoss > 0 ? `-${formatCurrency(itemCalculations.totalLoss)}` : 'Rp 0'}
                </span>
              </div>

              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex flex-col justify-center">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" /> Total Keuntungan (Surplus):
                </span>
                <span className="text-sm font-bold font-mono text-emerald-700">
                  {itemCalculations.totalGain > 0 ? `+${formatCurrency(itemCalculations.totalGain)}` : 'Rp 0'}
                </span>
              </div>

              <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex flex-col justify-center">
                <span className="text-[10px] text-amber-900 uppercase font-semibold">Selisih Bersih Rupiah:</span>
                <span className={`text-sm font-bold font-mono ${
                  itemCalculations.netImpact < 0 ? 'text-rose-700' : itemCalculations.netImpact > 0 ? 'text-emerald-700' : 'text-slate-800'
                }`}>
                  {itemCalculations.netImpact < 0 
                    ? `-${formatCurrency(Math.abs(itemCalculations.netImpact))}` 
                    : itemCalculations.netImpact > 0 
                      ? `+${formatCurrency(itemCalculations.netImpact)}` 
                      : 'Rp 0'}
                </span>
              </div>
            </div>
          </div>

          {/* TABLE LIST OF ALL REGISTERED ITEMS */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/60 overflow-hidden shadow-xs">
            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-2.5 px-3">Kode & Item Ayam</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-right">Stok</th>
                    <th className="py-2.5 px-3 text-right w-40">Fisik</th>
                    <th className="py-2.5 px-3 text-right">Selisih Qty</th>
                    <th className="py-2.5 px-3 text-right">Nilai Rugi/Untung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const calc = itemCalculations.calculated.find(c => c.item.id === item.id);
                    const isLoss = (calc?.difference || 0) < 0;
                    const isGain = (calc?.difference || 0) > 0;
                    const isModified = calc?.isModified;

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${
                          isModified ? (isLoss ? 'bg-rose-50/50' : 'bg-emerald-50/50') : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{item.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{item.code} · Harga: {formatCurrency(item.baseBuyPrice)}/{item.unit}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                          {formatNumber(item.currentStock)} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step={item.unit === 'kg' ? '0.1' : '1'}
                              placeholder={String(item.currentStock)}
                              value={physicalCounts[item.id] !== undefined ? physicalCounts[item.id] : ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handlePhysicalCountChange(item.id, e.target.value)}
                              className={`w-28 p-1.5 text-right bg-white border rounded-lg font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                                isModified ? (isLoss ? 'border-rose-400 bg-rose-50/80' : 'border-emerald-400 bg-emerald-50/80') : 'border-slate-300'
                              }`}
                            />
                            <span className="text-[11px] font-semibold text-slate-500 w-7 text-left">{item.unit}</span>
                          </div>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                          isLoss ? 'text-rose-600' : isGain ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {calc && calc.difference !== 0 ? (
                            calc.difference > 0 ? `+${formatNumber(calc.difference)} ${item.unit}` : `${formatNumber(calc.difference)} ${item.unit}`
                          ) : (
                            '0'
                          )}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                          isLoss ? 'text-rose-600' : isGain ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {calc && calc.differenceCost !== 0 ? (
                            calc.differenceCost < 0 
                              ? `-${formatCurrency(Math.abs(calc.differenceCost))}` 
                              : `+${formatCurrency(calc.differenceCost)}`
                          ) : (
                            'Rp 0'
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        Tidak ada item yang sesuai pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Save Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Petugas Input: <strong className="text-slate-800">{userName}</strong> ({userRole === 'admin' ? 'Admin' : 'Kasir'})
              </span>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Penyesuaian Stok</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: RIWAYAT PER HARI DENGAN FILTER HARI & TANGGAL */}
      {activeSubTab === 'riwayat' && (
        <div className="space-y-3">
          
          {/* Filter Bar */}
          <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold text-slate-700 whitespace-nowrap">Filter Tanggal:</span>
              <input
                type="date"
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:outline-hidden"
              />
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter('')}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[11px] font-semibold cursor-pointer"
                >
                  Semua
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari item / petugas..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* GROUPED DAILY HISTORY ACCORDION CARDS */}
          {groupedHistory.map((group, groupIdx) => {
            const isExpanded = isDateExpanded(group.dateKey, groupIdx);

            return (
              <div 
                key={group.dateKey} 
                className="bg-white/85 backdrop-blur-md rounded-xl border border-white/60 shadow-xs overflow-hidden transition-all"
              >
                {/* DAILY SUMMARY HEADER (CLICKABLE ACCORDION) */}
                <div 
                  onClick={() => toggleDateExpanded(group.dateKey)}
                  className="p-3.5 bg-slate-50/90 hover:bg-slate-100/90 border-b border-slate-200/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 capitalize flex items-center gap-2">
                        <span>{group.formattedDate}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                          {group.itemCount} Item
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Penyesuaian stok opname tanggal {group.dateKey}
                      </p>
                    </div>
                  </div>

                  {/* Daily Financial Summary & Accordion Chevron */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      {group.totalLoss > 0 && (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                          Susut: -{formatCurrency(group.totalLoss)}
                        </span>
                      )}
                      {group.totalGain > 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          Surplus: +{formatCurrency(group.totalGain)}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        group.netCost < 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : group.netCost > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        Net: {group.netCost < 0 ? `-${formatCurrency(Math.abs(group.netCost))}` : group.netCost > 0 ? `+${formatCurrency(group.netCost)}` : 'Rp 0'}
                      </span>
                    </div>

                    <div className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* EXPANDED ITEM DETAILS FOR THIS DAY */}
                {isExpanded && (
                  <div>
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                            <th className="py-2 px-3">Waktu</th>
                            <th className="py-2 px-3">Nama Item Ayam</th>
                            <th className="py-2 px-3 text-right">Stok Sistem</th>
                            <th className="py-2 px-3 text-right">Fisik Riil</th>
                            <th className="py-2 px-3 text-right">Selisih</th>
                            <th className="py-2 px-3 text-right">Harga (HPP)</th>
                            <th className="py-2 px-3 text-right">Nilai Rugi / Untung</th>
                            <th className="py-2 px-3">Petugas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {group.records.map((rec) => {
                            const isLoss = rec.difference < 0;
                            const isGain = rec.difference > 0;
                            const cost = rec.differenceCost ?? Math.round(rec.difference * (rec.unitPrice || 0));

                            return (
                              <tr key={rec.id} className="hover:bg-slate-50/70">
                                <td className="py-2 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                  {formatDateTime(rec.date).split(',')[1] || formatDateTime(rec.date)}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="font-bold text-slate-900">{rec.itemName}</span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-500">
                                  {formatNumber(rec.systemStock)} {rec.unit}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                                  {formatNumber(rec.physicalStock)} {rec.unit}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                                  isLoss ? 'text-rose-600' : isGain ? 'text-emerald-600' : 'text-slate-600'
                                }`}>
                                  {rec.difference > 0 ? `+${formatNumber(rec.difference)}` : formatNumber(rec.difference)} {rec.unit}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-500">
                                  {formatCurrency(rec.unitPrice || 0)}
                                </td>
                                <td className={`py-2 px-3 text-right font-mono tabular-nums font-bold ${
                                  isLoss ? 'text-rose-600' : isGain ? 'text-emerald-600' : 'text-slate-700'
                                }`}>
                                  {cost < 0 ? `-${formatCurrency(Math.abs(cost))}` : cost > 0 ? `+${formatCurrency(cost)}` : 'Rp 0'}
                                </td>
                                <td className="py-2 px-3 text-slate-600 text-[11px]">{rec.adjustedBy}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer Summary for this date */}
                    <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600">
                      <span>Total {group.itemCount} item disesuaikan pada {group.formattedDate}</span>
                      <div className="flex items-center gap-3 font-semibold">
                        {group.totalLoss > 0 && <span className="text-rose-700">Total Susut: -{formatCurrency(group.totalLoss)}</span>}
                        {group.totalGain > 0 && <span className="text-emerald-700">Total Surplus: +{formatCurrency(group.totalGain)}</span>}
                        <span className="text-slate-900 font-bold font-mono">
                          Bersih: {group.netCost < 0 ? `-${formatCurrency(Math.abs(group.netCost))}` : group.netCost > 0 ? `+${formatCurrency(group.netCost)}` : 'Rp 0'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {groupedHistory.length === 0 && (
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-12 text-center text-slate-400 border border-white/60">
              <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">Belum ada riwayat stok opname pada filter tanggal ini.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Silakan lakukan penyesuaian di tab "Form Input Cek Fisik".</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
