import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X,
  Calculator,
  CheckCircle2,
  Calendar,
  Building2,
  History,
  Eye,
  Layers,
  Sparkles,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Item, ItemUnit, Supplier, ProcessedCalculationRecord, UserRole } from '../types/index.ts';
import { formatCurrency, formatNumber, formatDate, formatDateTime } from '../utils/formatters.ts';

interface ItemManagementProps {
  items: Item[];
  suppliers?: Supplier[];
  processedCalcs?: ProcessedCalculationRecord[];
  onSaveItem: (item: Item) => void;
  onDeleteItem: (itemId: string) => void;
  onGoToOpname: (itemId?: string) => void;
  onSaveProcessedCalc: (record: ProcessedCalculationRecord) => void;
  onSaveSupplier?: (supplier: Supplier) => void;
  userRole: UserRole;
  userName: string;
}

interface RegistrationRow {
  itemId: string; // If linked to an existing item
  itemName: string;
  unit: ItemUnit;
  quantity: number;
  sellPrice: number;
  subtotal: number;
  isCustom: boolean; // True if typing a new item
  showSuggestions?: boolean;
}

export const ItemManagement: React.FC<ItemManagementProps> = ({
  items,
  suppliers = [],
  processedCalcs = [],
  onSaveItem,
  onDeleteItem,
  onGoToOpname,
  onSaveProcessedCalc,
  onSaveSupplier,
  userRole,
  userName,
}) => {
  // Sub-tabs: 'registrasi' (Hitung Keuntungan & Registrasi Item), 'daftar' (Katalog Item), 'riwayat' (Riwayat)
  const [activeSubTab, setActiveSubTab] = useState<'registrasi' | 'daftar' | 'riwayat'>('registrasi');

  const [searchQuery, setSearchQuery] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Single Item Edit Modal States (for quick edits in 'daftar' tab)
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Ayam Utuh');
  const [unit, setUnit] = useState<ItemUnit>('kg');
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [baseBuyPrice, setBaseBuyPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [description, setDescription] = useState('');

  // -------------------------------------------------------------
  // REGISTRASI ITEM & PERHITUNGAN KEUNTUNGAN (ALL-IN-ONE)
  // -------------------------------------------------------------
  const [calcDate, setCalcDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [calcSource, setCalcSource] = useState<string>(suppliers[0]?.name || '');

  // Pastikan calcSource selalu tersinkronisasi dengan supplier terdaftar
  useEffect(() => {
    if (suppliers.length > 0 && (!calcSource || !suppliers.some(s => s.name === calcSource))) {
      setCalcSource(suppliers[0].name);
    }
  }, [suppliers, calcSource]);

  // Rows of items to register & calculate
  const [rows, setRows] = useState<RegistrationRow[]>([
    {
      itemId: '',
      itemName: '',
      unit: 'kg',
      quantity: 0,
      sellPrice: 0,
      subtotal: 0,
      isCustom: true,
      showSuggestions: false,
    }
  ]);

  // Modal (nominal modal)
  const [totalModalInput, setTotalModalInput] = useState<number>(0);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // History Filter State
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<ProcessedCalculationRecord | null>(null);

  // Quick Supplier Registration Modal State
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupCode, setNewSupCode] = useState('');
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupNotes, setNewSupNotes] = useState('');
  const [supError, setSupError] = useState<string | null>(null);

  const handleOpenAddSupplier = () => {
    setNewSupCode(`PMS-${String(suppliers.length + 1).padStart(2, '0')}`);
    setNewSupName('');
    setNewSupPhone('');
    setNewSupAddress('');
    setNewSupNotes('');
    setSupError(null);
    setShowAddSupplierModal(true);
  };

  const handleSaveQuickSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) {
      setSupError('Nama supplier wajib diisi!');
      return;
    }

    const createdSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      code: newSupCode.trim() || `PMS-${String(suppliers.length + 1).padStart(2, '0')}`,
      name: newSupName.trim(),
      phone: newSupPhone.trim() || '-',
      address: newSupAddress.trim() || '-',
      notes: newSupNotes.trim(),
    };

    if (onSaveSupplier) {
      onSaveSupplier(createdSupplier);
    }
    setCalcSource(createdSupplier.name);
    setShowAddSupplierModal(false);
    setSaveSuccessMsg(`Supplier "${createdSupplier.name}" berhasil didaftarkan dan langsung dipilih!`);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3000);
  };

  const selectedSupplierObj = useMemo(() => {
    return suppliers.find(s => s.name.trim().toLowerCase() === calcSource.trim().toLowerCase());
  }, [suppliers, calcSource]);

  // -------------------------------------------------------------
  // ROW HANDLERS
  // -------------------------------------------------------------
  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        itemId: '',
        itemName: '',
        unit: 'kg',
        quantity: 0,
        sellPrice: 0,
        subtotal: 0,
        isCustom: true,
        showSuggestions: false,
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemNameChange = (index: number, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index] };
      row.itemName = value;
      row.itemId = ''; // Reset ID if user is typing
      row.isCustom = true;
      row.showSuggestions = value.trim().length > 0;
      updated[index] = row;
      return updated;
    });
  };

  const handleSelectExistingItem = (index: number, existingItem: Item) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index] };
      row.itemId = existingItem.id;
      row.itemName = existingItem.name;
      row.unit = existingItem.unit || 'kg';
      row.sellPrice = existingItem.sellPrice || 0;
      row.subtotal = row.quantity * (existingItem.sellPrice || 0);
      row.isCustom = false;
      row.showSuggestions = false;
      updated[index] = row;
      return updated;
    });
  };

  const handleResetRowSelection = (index: number) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index] };
      row.itemId = '';
      row.itemName = '';
      row.isCustom = true;
      row.showSuggestions = false;
      updated[index] = row;
      return updated;
    });
  };

  const handleUpdateRowField = (index: number, field: 'unit' | 'quantity' | 'sellPrice', value: any) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index] };

      if (field === 'unit') {
        row.unit = value as ItemUnit;
      } else if (field === 'quantity') {
        const qty = value === '' || value === '-' ? 0 : Math.max(0, parseFloat(value) || 0);
        row.quantity = qty;
        row.subtotal = qty * row.sellPrice;
      } else if (field === 'sellPrice') {
        const price = value === '' || value === '-' ? 0 : Math.max(0, parseFloat(value) || 0);
        row.sellPrice = price;
        row.subtotal = row.quantity * price;
      }

      updated[index] = row;
      return updated;
    });
  };

  // Grand Total & Profit Calculations
  const grandTotalSellValue = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.subtotal, 0);
  }, [rows]);

  const totalQuantityProcessed = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.quantity, 0);
  }, [rows]);

  const calculatedProfit = useMemo(() => {
    return grandTotalSellValue - totalModalInput;
  }, [grandTotalSellValue, totalModalInput]);

  // -------------------------------------------------------------
  // SAVE HANDLER: REGISTRASI ITEM & HITUNG KEUNTUNGAN
  // -------------------------------------------------------------
  const handleSaveRegistrationAndProfit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const invalidRows = rows.filter(r => !r.itemName.trim() || r.quantity <= 0);
    if (invalidRows.length > 0) {
      setFormError('Harap lengkapi nama item dan kuantitas (> 0) pada setiap baris item.');
      return;
    }

    if (totalModalInput <= 0 && grandTotalSellValue <= 0) {
      setFormError('Harap masukkan nilai kuantitas, harga jual, dan modal dengan benar.');
      return;
    }

    // Process each row: Update existing or create new item in master
    const savedItemsRecord: {
      itemId: string;
      itemName: string;
      unit: ItemUnit;
      quantity: number;
      sellPrice: number;
      subtotal: number;
    }[] = [];

    rows.forEach((row, idx) => {
      // Find if exists by ID or exact name (case-insensitive)
      const existing = items.find(
        i => (row.itemId && i.id === row.itemId) || 
             i.name.trim().toLowerCase() === row.itemName.trim().toLowerCase()
      );

      const propHPP = totalQuantityProcessed > 0 
        ? Math.round(totalModalInput / totalQuantityProcessed) 
        : (existing ? existing.baseBuyPrice : 0);

      if (existing) {
        // Update existing item: add stock and update sellPrice
        const updatedItem: Item = {
          ...existing,
          currentStock: Number((existing.currentStock + row.quantity).toFixed(2)),
          sellPrice: row.sellPrice > 0 ? row.sellPrice : existing.sellPrice,
          baseBuyPrice: propHPP > 0 ? propHPP : existing.baseBuyPrice,
          unit: row.unit,
          updatedAt: new Date().toISOString(),
        };
        onSaveItem(updatedItem);

        savedItemsRecord.push({
          itemId: existing.id,
          itemName: existing.name,
          unit: row.unit,
          quantity: row.quantity,
          sellPrice: row.sellPrice,
          subtotal: row.subtotal,
        });
      } else {
        // Register brand new item
        const newItemId = `item-${Date.now()}-${idx}`;
        const newCode = `ACG/${String(items.length + idx + 1).padStart(3, '0')}`;
        const newItem: Item = {
          id: newItemId,
          code: newCode,
          name: row.itemName.trim(),
          category: 'Potongan',
          unit: row.unit,
          currentStock: row.quantity,
          minStock: 0,
          baseBuyPrice: propHPP,
          sellPrice: row.sellPrice,
          description: `Registrasi item olahan (${calcDate})`,
          updatedAt: new Date().toISOString(),
        };
        onSaveItem(newItem);

        savedItemsRecord.push({
          itemId: newItemId,
          itemName: newItem.name,
          unit: row.unit,
          quantity: row.quantity,
          sellPrice: row.sellPrice,
          subtotal: row.subtotal,
        });
      }
    });

    // Record into History (processedCalcs)
    const newRecord: ProcessedCalculationRecord = {
      id: `calc-${Date.now()}`,
      date: calcDate,
      source: calcSource || 'Mandiri / Olahan Toko',
      items: savedItemsRecord,
      totalModal: totalModalInput,
      grandTotal: grandTotalSellValue,
      profit: calculatedProfit,
      recordedBy: userName,
    };
    onSaveProcessedCalc(newRecord);

    // Reset Form & show success
    setSaveSuccessMsg(`Item berhasil teregistrasi dan data keuntungan telah masuk ke Riwayat!`);
    setRows([
      {
        itemId: '',
        itemName: '',
        unit: 'kg',
        quantity: 0,
        sellPrice: 0,
        subtotal: 0,
        isCustom: true,
        showSuggestions: false,
      }
    ]);
    setTotalModalInput(0);

    setTimeout(() => {
      setSaveSuccessMsg(null);
      setActiveSubTab('riwayat');
    }, 1800);
  };

  // -------------------------------------------------------------
  // MASTER DATA ITEM HANDLERS (DAFTAR ITEM)
  // -------------------------------------------------------------
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [items, searchQuery]);

  const filteredHistoryRecords = useMemo(() => {
    return processedCalcs.filter(rec => {
      if (historyDateFilter && rec.date !== historyDateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return rec.source.toLowerCase().includes(q) ||
               rec.items.some(i => i.itemName.toLowerCase().includes(q));
      }
      return true;
    });
  }, [processedCalcs, historyDateFilter, searchQuery]);

  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setCategory(item.category || 'Ayam Utuh');
    setUnit(item.unit || 'kg');
    setCurrentStock(item.currentStock || 0);
    setBaseBuyPrice(item.baseBuyPrice || 0);
    setSellPrice(item.sellPrice || 0);
    setDescription(item.description || '');
    setShowItemModal(true);
  };

  const handleSaveSingleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      const updated: Item = {
        ...editingItem,
        name: name.trim(),
        unit: unit,
        currentStock: Number(currentStock) || 0,
        sellPrice: Number(sellPrice) || 0,
        description: description.trim(),
        updatedAt: new Date().toISOString(),
      };
      onSaveItem(updated);
    }
    setShowItemModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 backdrop-blur-md p-4 rounded-xl border border-white/80 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" />
            <span>Registrasi Item & Perhitungan Keuntungan</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Daftarkan item sekaligus hitung keuntungan dan mutasi stok secara otomatis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subtab Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('registrasi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'registrasi'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Registrasi Item</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('daftar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'daftar'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Item ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('riwayat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'riwayat'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat ({processedCalcs.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onGoToOpname()}
            className="px-3 py-2 bg-white/90 hover:bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            Stok Opname
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: REGISTRASI ITEM & HITUNG KEUNTUNGAN            */}
      {/* ========================================================= */}
      {activeSubTab === 'registrasi' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-amber-200/80 p-3 sm:p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-600" />
                <span>Form Registrasi Item & Perhitungan Keuntungan</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ketik nama item atau pilih item terdaftar, tentukan satuan, kuantitas, harga jual, dan modal. Item akan otomatis teregistrasi dan tersimpan ke riwayat.
              </p>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveRegistrationAndProfit} className="space-y-4">
            
            {/* TANGGAL & SUMBER SUPPLIER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tanggal:</span>
                </label>
                <input
                  type="date"
                  required
                  value={calcDate}
                  onChange={(e) => setCalcDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Supplier:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenAddSupplier}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Daftarkan supplier baru langsung ke sistem"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Registrasi Supplier</span>
                  </button>
                </div>
                <select
                  required
                  value={calcSource}
                  onChange={(e) => setCalcSource(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:border-amber-500"
                >
                  <option value="">-- Pilih Supplier Terdaftar --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.code}) {s.phone && s.phone !== '-' ? `• ${s.phone}` : ''}
                    </option>
                  ))}
                  {suppliers.length === 0 && (
                    <option value="" disabled>-- Belum ada supplier terdaftar --</option>
                  )}
                </select>

                {/* Detail Supplier Terpilih */}
                {selectedSupplierObj ? (
                  <div className="mt-1.5 px-2.5 py-1.5 bg-amber-50/80 border border-amber-200/70 rounded-md text-[11px] text-amber-950 flex flex-wrap items-center gap-x-3 gap-y-0.5 animate-in fade-in">
                    <span className="font-bold text-amber-800">Kode: {selectedSupplierObj.code}</span>
                    {selectedSupplierObj.phone && selectedSupplierObj.phone !== '-' && (
                      <span className="text-slate-700">Telp: {selectedSupplierObj.phone}</span>
                    )}
                    {selectedSupplierObj.address && selectedSupplierObj.address !== '-' && (
                      <span className="text-slate-600 truncate max-w-[200px] sm:max-w-xs">
                        Alamat: {selectedSupplierObj.address}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1">
                    *Hanya menampilkan data supplier terdaftar. Jika belum terdaftar, klik <b>+ Registrasi Supplier</b>.
                  </p>
                )}
              </div>
            </div>

            {/* MOBILE VIEW (CARD FORMAT FOR PHONE SCREENS) */}
            <div className="block sm:hidden space-y-3">
              {rows.map((row, idx) => {
                const searchLower = row.itemName.trim().toLowerCase();
                const matchingItems = row.isCustom && searchLower.length > 0
                  ? items.filter(it => it.name.toLowerCase().includes(searchLower))
                  : [];

                return (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5 text-xs shadow-2xs relative">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Item #{idx + 1}
                      </span>
                      {row.itemId && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Item Terdaftar
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={rows.length === 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* NAMA ITEM DENGAN DROPDOWN SUGGESTIONS */}
                    <div className="relative">
                      <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">
                        Nama Item:
                      </label>
                      {row.itemId ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-lg p-2 text-emerald-950 font-bold">
                          <span>{row.itemName}</span>
                          <button
                            type="button"
                            onClick={() => handleResetRowSelection(idx)}
                            className="text-slate-500 hover:text-rose-600 text-xs p-1 cursor-pointer"
                            title="Ganti Item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="text"
                            required
                            placeholder="Ketik nama item..."
                            value={row.itemName}
                            onChange={(e) => handleItemNameChange(idx, e.target.value)}
                            onFocus={() => {
                              if (row.itemName.trim().length > 0) {
                                setRows(prev => {
                                  const u = [...prev];
                                  u[idx] = { ...u[idx], showSuggestions: true };
                                  return u;
                                });
                              }
                            }}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-hidden focus:border-amber-500"
                          />

                          {/* DROPDOWN AUTOCOMPLETE SUGGESTIONS JIKA SUDAH ADA */}
                          {row.showSuggestions && matchingItems.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-300 z-50 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                              <div className="p-2 bg-amber-50 text-[11px] text-amber-900 font-bold">
                                Item Terdaftar (Pilih agar tidak ganda):
                              </div>
                              {matchingItems.map(item => {
                                const isPickedInOtherRow = rows.some((r, rIdx) => rIdx !== idx && r.itemId === item.id);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    disabled={isPickedInOtherRow}
                                    onClick={() => handleSelectExistingItem(idx, item)}
                                    className="w-full text-left p-2.5 hover:bg-amber-50 transition-colors flex items-center justify-between disabled:opacity-50 cursor-pointer"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-900 block">{item.name}</span>
                                      <span className="text-[10px] text-slate-500">
                                        Stok: {formatNumber(item.currentStock)} {item.unit} • Harga: {formatCurrency(item.sellPrice)}
                                      </span>
                                    </div>
                                    {isPickedInOtherRow ? (
                                      <span className="text-[10px] text-slate-400 italic">(sudah dipilih)</span>
                                    ) : (
                                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Pilih</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">Satuan:</label>
                        <select
                          value={row.unit}
                          onChange={(e) => handleUpdateRowField(idx, 'unit', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
                        >
                          <option value="kg">kg</option>
                          <option value="pcs">pcs</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">Kuantitas:</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.quantity === 0 ? '' : row.quantity.toLocaleString('id-ID')}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                            handleUpdateRowField(idx, 'quantity', raw === '' ? 0 : raw);
                          }}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">Harga Jual:</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.sellPrice === 0 ? '' : row.sellPrice.toLocaleString('id-ID')}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                            handleUpdateRowField(idx, 'sellPrice', raw === '' ? 0 : raw);
                          }}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-[11px] text-slate-600 font-medium">Subtotal Jual:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(row.subtotal)}</span>
                    </div>
                  </div>
                );
              })}

              {/* TOMBOL TAMBAH BARIS ITEM DI BAWAH ITEM TERAKHIR (MOBILE) */}
              <button
                type="button"
                onClick={handleAddRow}
                className="w-full py-2.5 px-3 border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs mt-2"
              >
                <Plus className="w-4 h-4 text-amber-600" />
                <span>+ Tambah Baris Item</span>
              </button>
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden sm:block overflow-x-visible">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 font-bold">
                    <th className="py-2.5 px-3 w-12 text-center">No.</th>
                    <th className="py-2.5 px-3 min-w-[260px]">Nama Item</th>
                    <th className="py-2.5 px-3 w-28">Satuan</th>
                    <th className="py-2.5 px-3 w-32">Kuantitas</th>
                    <th className="py-2.5 px-3 w-40">Harga Jual (Rp)</th>
                    <th className="py-2.5 px-3 text-right w-36">Subtotal</th>
                    <th className="py-2.5 px-3 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const searchLower = row.itemName.trim().toLowerCase();
                    const matchingItems = row.isCustom && searchLower.length > 0
                      ? items.filter(it => it.name.toLowerCase().includes(searchLower))
                      : [];

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 align-top">
                        <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono">
                          {idx + 1}
                        </td>

                        {/* NAMA ITEM DENGAN AUTOCOMPLETE SUGGESTION */}
                        <td className="py-3 px-3 relative">
                          {row.itemId ? (
                            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-emerald-950 font-bold">
                              <span className="flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                {row.itemName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleResetRowSelection(idx)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                title="Ganti Item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type="text"
                                required
                                placeholder="Ketik nama item..."
                                value={row.itemName}
                                onChange={(e) => handleItemNameChange(idx, e.target.value)}
                                onFocus={() => {
                                  if (row.itemName.trim().length > 0) {
                                    setRows(prev => {
                                      const u = [...prev];
                                      u[idx] = { ...u[idx], showSuggestions: true };
                                      return u;
                                    });
                                  }
                                }}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-hidden focus:border-amber-500"
                              />

                              {/* DROPDOWN AUTOCOMPLETE LIST */}
                              {row.showSuggestions && matchingItems.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-300 z-50 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                  <div className="p-2 bg-amber-50 text-[11px] text-amber-900 font-bold flex items-center justify-between">
                                    <span>Item Terdaftar (Pilih agar tidak ganda):</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRows(prev => {
                                          const u = [...prev];
                                          u[idx] = { ...u[idx], showSuggestions: false };
                                          return u;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  {matchingItems.map(item => {
                                    const isPickedInOtherRow = rows.some((r, rIdx) => rIdx !== idx && r.itemId === item.id);
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        disabled={isPickedInOtherRow}
                                        onClick={() => handleSelectExistingItem(idx, item)}
                                        className="w-full text-left p-2.5 hover:bg-amber-50 transition-colors flex items-center justify-between disabled:opacity-50 cursor-pointer"
                                      >
                                        <div>
                                          <span className="font-bold text-slate-900 block">{item.name}</span>
                                          <span className="text-[10px] text-slate-500">
                                            Stok: {formatNumber(item.currentStock)} {item.unit} • Harga: {formatCurrency(item.sellPrice)}
                                          </span>
                                        </div>
                                        {isPickedInOtherRow ? (
                                          <span className="text-[10px] text-slate-400 italic">(sudah dipilih)</span>
                                        ) : (
                                          <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Pilih</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* SATUAN */}
                        <td className="py-3 px-3">
                          <select
                            value={row.unit}
                            onChange={(e) => handleUpdateRowField(idx, 'unit', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
                          >
                            <option value="kg">kg</option>
                            <option value="pcs">pcs</option>
                          </select>
                        </td>

                        {/* KUANTITAS */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row.quantity === 0 ? '' : row.quantity.toLocaleString('id-ID')}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                              handleUpdateRowField(idx, 'quantity', raw === '' ? 0 : raw);
                            }}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                          />
                        </td>

                        {/* HARGA JUAL */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row.sellPrice === 0 ? '' : row.sellPrice.toLocaleString('id-ID')}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                              handleUpdateRowField(idx, 'sellPrice', raw === '' ? 0 : raw);
                            }}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                          />
                        </td>

                        {/* SUBTOTAL */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(row.subtotal)}
                        </td>

                        {/* AKSI HAPUS */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={rows.length === 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                            title="Hapus Baris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200">
                    <td colSpan={7} className="pt-3 px-1">
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="w-full py-2.5 px-4 border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-4 h-4 text-amber-600" />
                        <span>+ Tambah Baris Item</span>
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* RINGKASAN: TOTAL NILAI JUAL, MODAL, KEUNTUNGAN */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 w-full sm:max-w-md sm:ml-auto">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-200">
                <span>Total Penjualan:</span>
                <span className="font-mono text-sm text-slate-900 tabular-nums">{formatCurrency(grandTotalSellValue)}</span>
              </div>

              {/* MODAL INPUT: NAMA DISEDERHANAKAN JADI 'MODAL', TANPA KATA INPUT MANUAL */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Modal:
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={totalModalInput === 0 ? '' : totalModalInput.toLocaleString('id-ID')}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                    setTotalModalInput(raw === '' ? 0 : parseFloat(raw) || 0);
                  }}
                  placeholder="0"
                  className="w-full p-2.5 bg-white border border-amber-400 rounded-lg font-mono font-bold text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* KEUNTUNGAN */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Keuntungan:
                </span>
                <span className={`text-base font-mono font-bold tabular-nums ${calculatedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(calculatedProfit)}
                </span>
              </div>
            </div>

            {/* TOMBOL SIMPAN (HANYA 'SIMPAN') */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: DAFTAR STOK ITEM                               */}
      {/* ========================================================= */}
      {activeSubTab === 'daftar' && (
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari kode, nama item, atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/70 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('registrasi')}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah / Registrasi Item</span>
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/60 overflow-hidden shadow-xs">
            {/* MOBILE VIEW */}
            <div className="block sm:hidden divide-y divide-slate-100 p-2 space-y-2">
              {filteredItems.map((item) => {
                const isOutOfStock = item.currentStock <= 0;

                return (
                  <div key={item.id} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400">{item.code}</span>
                        <h4 className="font-bold text-slate-900 text-xs">{item.name}</h4>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isOutOfStock ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {isOutOfStock ? 'Stok Habis' : 'Tersedia'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-slate-200/60 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Stok Fisik:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">{formatNumber(item.currentStock)} {item.unit}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Harga Jual:</span>
                        <span className="font-mono font-bold text-amber-800 text-xs">{formatCurrency(item.sellPrice)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-medium cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onGoToOpname(item.id)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold cursor-pointer"
                      >
                        Opname
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[11px] cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Belum ada item terdaftar. Buka tab "Registrasi Item" untuk mendaftarkan barang baru.
                </div>
              )}
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                    <th className="py-3 px-3.5">Kode</th>
                    <th className="py-3 px-3.5">Nama Item</th>
                    <th className="py-3 px-3.5 text-right">Stok Fisik Saat Ini</th>
                    <th className="py-3 px-3.5 text-right">Harga Jual</th>
                    <th className="py-3 px-3.5 text-center">Status Stok</th>
                    <th className="py-3 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredItems.map((item) => {
                    const isOutOfStock = item.currentStock <= 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3.5 font-mono font-medium text-slate-700">{item.code}</td>
                        <td className="py-2.5 px-3.5">
                          <span className="font-semibold text-slate-900 block">{item.name}</span>
                          {item.description && (
                            <span className="text-[10px] text-slate-400 block line-clamp-1">{item.description}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold text-slate-900">
                          {formatNumber(item.currentStock)} {item.unit}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold text-amber-800">
                          {formatCurrency(item.sellPrice)}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isOutOfStock ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {isOutOfStock ? 'Stok Habis' : 'Tersedia'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Edit Item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onGoToOpname(item.id)}
                              className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded font-medium transition-colors cursor-pointer"
                              title="Stok Opname Item Ini"
                            >
                              Opname
                            </button>
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Belum ada item terdaftar. Buka tab "Registrasi Item" untuk mendaftarkan barang baru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: RIWAYAT PERHITUNGAN KEUNTUNGAN                 */}
      {/* ========================================================= */}
      {activeSubTab === 'riwayat' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <span>Riwayat Perhitungan Keuntungan Olahan</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Daftar arsip perhitungan keuntungan yang tersimpan otomatis saat registrasi item
              </p>
            </div>

            {/* Filter Harian & Pencarian */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-900 focus:outline-hidden cursor-pointer"
                />
                {historyDateFilter && (
                  <button
                    type="button"
                    onClick={() => setHistoryDateFilter('')}
                    className="text-slate-400 hover:text-slate-700 font-bold ml-1 cursor-pointer"
                    title="Reset Filter Tanggal"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari sumber / item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden w-40"
                />
              </div>
            </div>
          </div>

          {/* Table of History Records */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 font-bold">
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Sumber / Supplier</th>
                  <th className="py-2.5 px-3">Daftar Item</th>
                  <th className="py-2.5 px-3 text-right">Total Jual</th>
                  <th className="py-2.5 px-3 text-right">Modal</th>
                  <th className="py-2.5 px-3 text-right">Keuntungan</th>
                  <th className="py-2.5 px-3 text-center">Petugas</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredHistoryRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-mono text-slate-700">{formatDate(rec.date)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{rec.source}</td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {rec.items.map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(rec.grandTotal)}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">{formatCurrency(rec.totalModal)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-emerald-700">{formatCurrency(rec.profit)}</td>
                    <td className="py-3 px-3 text-center text-slate-500">{rec.recordedBy}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailRecord(rec)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredHistoryRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                      Belum ada riwayat perhitungan dengan filter tersebut.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL RECORD MODAL */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Detail Perhitungan Keuntungan</h3>
                <p className="text-[11px] text-slate-500">{formatDate(selectedDetailRecord.date)} • Sumber: {selectedDetailRecord.source}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                    <th className="py-2 px-2.5">Item</th>
                    <th className="py-2 px-2.5 text-right">Qty</th>
                    <th className="py-2 px-2.5 text-right">Harga Jual</th>
                    <th className="py-2 px-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDetailRecord.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2.5 font-semibold text-slate-900">{it.itemName}</td>
                      <td className="py-2 px-2.5 text-right font-mono">{formatNumber(it.quantity)} {it.unit}</td>
                      <td className="py-2 px-2.5 text-right font-mono">{formatCurrency(it.sellPrice)}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold">{formatCurrency(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Penjualan:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedDetailRecord.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Modal:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedDetailRecord.totalModal)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-bold text-emerald-700">
                <span>Keuntungan:</span>
                <span className="font-mono">{formatCurrency(selectedDetailRecord.profit)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK EDIT SINGLE ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Data Item
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSingleEdit} className="space-y-3.5 pt-2 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kode Item:</label>
                <input
                  type="text"
                  readOnly
                  value={code}
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Item:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Satuan:</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ItemUnit)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
                  >
                    <option value="kg">Kg (Kilogram)</option>
                    <option value="pcs">Pcs (Pieces / Satuan)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stok Fisik:</label>
                  <input
                    type="number"
                    step={unit === 'kg' ? '0.1' : '1'}
                    required
                    value={currentStock === 0 ? '' : currentStock}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Harga Jual (Rp):</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={sellPrice === 0 ? '' : sellPrice.toLocaleString('id-ID')}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, '').replace(/,/g, '');
                      setSellPrice(raw === '' ? 0 : Math.max(0, parseInt(raw) || 0));
                    }}
                    className="w-full pl-9 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi / Catatan (Opsional):</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  placeholder="Keterangan item (opsional)"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK SUPPLIER REGISTRATION MODAL */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Registrasi Supplier Baru</h3>
                  <p className="text-[11px] text-slate-500">Daftarkan supplier baru langsung ke sistem</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{supError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickSupplier} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="font-semibold text-slate-700 block mb-1">Kode:</label>
                  <input
                    type="text"
                    required
                    value={newSupCode}
                    onChange={(e) => setNewSupCode(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:outline-hidden focus:border-amber-500"
                    placeholder="PMS-01"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nama Supplier <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newSupName}
                    onChange={(e) => {
                      setNewSupName(e.target.value);
                      if (supError) setSupError(null);
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-hidden focus:border-amber-500"
                    placeholder="Contoh: Peternak Berkah Farm"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp / Telepon:</label>
                <input
                  type="tel"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:border-amber-500"
                  placeholder="0812-xxxx-xxxx"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat Gudang / Lokasi:</label>
                <input
                  type="text"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:border-amber-500"
                  placeholder="Alamat atau domisili supplier"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan / Pasokan (Opsional):</label>
                <input
                  type="text"
                  value={newSupNotes}
                  onChange={(e) => setNewSupNotes(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:border-amber-500"
                  placeholder="Contoh: Pasokan ayam hidup bobot 1.8-2.0kg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan & Pilih Supplier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
