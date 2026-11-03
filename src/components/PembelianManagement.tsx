import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Trash2, 
  Printer, 
  Building2, 
  CheckCircle2, 
  CreditCard, 
  AlertCircle,
  History,
  X
} from 'lucide-react';
import { 
  Item, 
  Supplier, 
  PurchaseTransaction, 
  PurchaseItem, 
  PurchasePaymentStatus,
  DebtPayment,
  UserRole
} from '../types/index.ts';
import { formatCurrency, formatNumber, formatDateTime, generateInvoiceCode } from '../utils/formatters.ts';

interface PembelianManagementProps {
  items: Item[];
  suppliers: Supplier[];
  purchases: PurchaseTransaction[];
  onCompletePurchase: (purchase: PurchaseTransaction) => void;
  onPrintPurchase: (purchase: PurchaseTransaction) => void;
  onPayDebt?: (purchaseId: string, payment: DebtPayment) => void;
  userRole: UserRole;
}

export const PembelianManagement: React.FC<PembelianManagementProps> = ({
  items,
  suppliers,
  purchases,
  onCompletePurchase,
  onPrintPurchase,
  onPayDebt,
  userRole,
}) => {
  const [activeTab, setActiveTab] = useState<'baru' | 'riwayat'>('baru');

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Transfer'>('Transfer');
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus>('Lunas');
  const [amountPaidInput, setAmountPaidInput] = useState<number>(0);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Modal Pay Debt State
  const [debtModalPurchase, setDebtModalPurchase] = useState<PurchaseTransaction | null>(null);
  const [debtPaymentAmount, setDebtPaymentAmount] = useState<number>(0);
  const [debtPaymentMethod, setDebtPaymentMethod] = useState<'Tunai' | 'Transfer'>('Transfer');
  const [debtPaymentNotes, setDebtPaymentNotes] = useState<string>('');
  const [debtSuccessMsg, setDebtSuccessMsg] = useState<string | null>(null);

  // Items in purchase (default empty/0)
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
    {
      itemId: items[0]?.id || '',
      itemName: items[0]?.name || '',
      unit: items[0]?.unit || 'kg',
      quantity: 0,
      buyPrice: 0,
      subtotal: 0,
      targetSellPrice: 0,
      profit: 0,
    }
  ]);

  // Handle adding an item row (pick unselected item or first)
  const handleAddItemRow = () => {
    const availableItem = items.find(item => !purchaseItems.some(pi => pi.itemId === item.id)) || items[0];
    if (!availableItem) return;
    if (purchaseItems.some(pi => pi.itemId === availableItem.id)) return;

    setPurchaseItems((prev) => [
      ...prev,
      {
        itemId: availableItem.id,
        itemName: availableItem.name,
        unit: availableItem.unit,
        quantity: 0,
        buyPrice: availableItem.baseBuyPrice || 0,
        subtotal: 0,
        targetSellPrice: availableItem.sellPrice || 0,
        profit: ((availableItem.sellPrice || 0) - (availableItem.baseBuyPrice || 0)) * 0,
      }
    ]);
  };

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const handleUpdateItemRow = (index: number, field: keyof PurchaseItem, value: any) => {
    if (field === 'itemId') {
      const found = items.find(i => i.id === value);
      if (found) {
        const existingIndex = purchaseItems.findIndex((r, i) => i !== index && r.itemId === found.id);
        if (existingIndex !== -1) {
          setDuplicateWarning(`Item "${found.name}" sudah terdaftar dalam list pembelian!`);
          setTimeout(() => setDuplicateWarning(null), 4000);
          return;
        }
      }
    }

    setPurchaseItems((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };

      if (field === 'itemId') {
        const found = items.find(i => i.id === value);
        if (found) {
          row.itemId = found.id;
          row.itemName = found.name;
          row.unit = found.unit;
          row.buyPrice = found.baseBuyPrice || 0;
          row.targetSellPrice = found.sellPrice || 0;
          row.subtotal = row.quantity * row.buyPrice;
          row.profit = (row.targetSellPrice - row.buyPrice) * row.quantity;
        }
      } else if (field === 'quantity') {
        const qty = value === '' || value === '-' ? 0 : Math.max(0, parseFloat(value) || 0);
        row.quantity = qty;
        row.subtotal = qty * row.buyPrice;
      } else if (field === 'buyPrice') {
        const price = value === '' || value === '-' ? 0 : Math.max(0, parseFloat(value) || 0);
        row.buyPrice = price;
        row.subtotal = row.quantity * price;
        row.profit = (row.targetSellPrice - price) * row.quantity;
      } else if (field === 'targetSellPrice') {
        const sellPrice = value === '' || value === '-' ? 0 : Math.max(0, parseFloat(value) || 0);
        row.targetSellPrice = sellPrice;
        row.profit = (sellPrice - row.buyPrice) * row.quantity;
      }


      updated[index] = row;
      return updated;
    });
  };

  const handleRemoveItemRow = (index: number) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems(prev => prev.filter((_, i) => i !== index));
  };

  // Total Calculations
  const totalItemsCost = useMemo(() => {
    return purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [purchaseItems]);

  const totalQuantity = useMemo(() => {
    return purchaseItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [purchaseItems]);

  // Sync initial DP if status changes
  React.useEffect(() => {
    if (paymentStatus === 'Lunas') {
      setAmountPaidInput(totalItemsCost);
    } else if (paymentStatus === 'Sebagian') {
      if (amountPaidInput === 0 || amountPaidInput >= totalItemsCost) {
        setAmountPaidInput(Math.round(totalItemsCost / 2));
      }
    }
  }, [paymentStatus, totalItemsCost]);

  const actualAmountPaid = useMemo(() => {
    if (paymentStatus === 'Lunas') return totalItemsCost;
    return Math.min(totalItemsCost, Math.max(0, amountPaidInput));
  }, [paymentStatus, totalItemsCost, amountPaidInput]);

  const actualRemainingDebt = useMemo(() => {
    return Math.max(0, totalItemsCost - actualAmountPaid);
  }, [totalItemsCost, actualAmountPaid]);

  // Save purchase
  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseItems.length === 0 || totalQuantity <= 0) return;

    const supplier = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];

    const cleanItems = purchaseItems.map(pi => ({
      ...pi,
      effectiveHPP: pi.buyPrice
    }));

    const newPurchase: PurchaseTransaction = {
      id: `pur-${Date.now()}`,
      invoiceNumber: generateInvoiceCode('PO'),
      date: new Date(purchaseDate).toISOString(),
      supplierId: supplier?.id || 'sup-unknown',
      supplierName: supplier?.name || 'Pemasok Umum',
      items: cleanItems,
      additionalCosts: [],
      totalItemsCost,
      totalAdditionalCosts: 0,
      grandTotal: totalItemsCost,
      totalQuantity,
      averageHPPPerUnit: totalQuantity > 0 ? Math.round(totalItemsCost / totalQuantity) : 0,
      paymentMethod,
      paymentStatus,
      amountPaid: actualAmountPaid,
      remainingDebt: actualRemainingDebt,
      debtPayments: actualAmountPaid > 0 && paymentStatus !== 'Lunas' ? [
        {
          id: `dp-${Date.now()}`,
          date: new Date().toISOString(),
          amount: actualAmountPaid,
          paymentMethod,
          notes: 'Uang Muka (DP) Pembelian',
          recordedBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir'
        }
      ] : [],
      notes: purchaseNotes,
      createdBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir',
    };

    onCompletePurchase(newPurchase);
    setPurchaseNotes('');
    onPrintPurchase(newPurchase);
  };

  const handleOpenPayDebtModal = (purchase: PurchaseTransaction) => {
    setDebtModalPurchase(purchase);
    const debt = purchase.remainingDebt !== undefined ? purchase.remainingDebt : Math.max(0, purchase.grandTotal - (purchase.amountPaid || 0));
    setDebtPaymentAmount(debt);
    setDebtPaymentMethod('Transfer');
    setDebtPaymentNotes('');
    setDebtSuccessMsg(null);
  };

  const handleSubmitPayDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtModalPurchase || !onPayDebt || debtPaymentAmount <= 0) return;

    const payment: DebtPayment = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString(),
      amount: debtPaymentAmount,
      paymentMethod: debtPaymentMethod,
      notes: debtPaymentNotes || 'Pelunasan Utang Pemasok',
      recordedBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir'
    };

    onPayDebt(debtModalPurchase.id, payment);
    setDebtSuccessMsg(`Berhasil mencatat pembayaran utang sebesar ${formatCurrency(debtPaymentAmount)}!`);
    
    setTimeout(() => {
      setDebtModalPurchase(null);
      setDebtSuccessMsg(null);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Subtab navigation */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('baru')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'baru'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white/80 hover:bg-white backdrop-blur-xs'
            }`}
          >
            Input Pembelian Baru
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('riwayat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'riwayat'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white/80 hover:bg-white backdrop-blur-xs'
            }`}
          >
            Riwayat Pembelian ({purchases.length})
          </button>
        </div>

        <div className="text-xs text-slate-700 hidden sm:block bg-white/80 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/60">
          Modul: <span className="font-semibold text-amber-900">Pembelian</span>
        </div>
      </div>

      {activeTab === 'baru' ? (
        <form onSubmit={handleSubmitPurchase} className="space-y-4">
          
          {/* TOP SECTION: SUPPLIER & PAYMENT INFO */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Data Supplier & Informasi Pembelian</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Supplier:</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Pembelian:</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Metode Pembayaran:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'Tunai' | 'Transfer')}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden font-medium"
                >
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Tunai">Tunai / Cash</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Pembayaran:</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PurchasePaymentStatus)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden font-semibold"
                >
                  <option value="Lunas">Lunas Penuh</option>
                  <option value="Sebagian">Sebagian (DP / Cicilan)</option>
                </select>
              </div>
            </div>

            {paymentStatus === 'Sebagian' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>Pembayaran Sebagian (DP)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nominal Dibayar (DP):</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountPaidInput === 0 ? '' : amountPaidInput.toLocaleString('id-ID')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                        setAmountPaidInput(raw === '' ? 0 : Math.min(totalItemsCost, parseFloat(raw) || 0));
                      }}
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Tagihan:</span>
                    <span className="text-sm font-bold font-mono text-slate-800">{formatCurrency(totalItemsCost)}</span>
                  </div>
                  <div className="bg-rose-50 p-2 rounded-lg border border-rose-200 flex flex-col justify-center">
                    <span className="text-[10px] text-rose-700 uppercase font-semibold">Sisa Utang:</span>
                    <span className="text-sm font-bold font-mono text-rose-700">{formatCurrency(actualRemainingDebt)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PURCHASE ITEMS LIST (JUST LIKE SALES) */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-600" />
                  <span>Daftar Item Pembelian</span>
                </h3>
                <p className="text-[11px] text-slate-500">Pilih item ayam atau produk yang dibeli dari supplier</p>
              </div>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Item</span>
              </button>
            </div>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold">{duplicateWarning}</span>
              </div>
            )}

            {/* Desktop Table View */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                    <th className="py-2.5 px-3 w-12 text-center font-bold">No.</th>
                    <th className="py-2.5 px-3">Nama Item / Ayam</th>
                    <th className="py-2.5 px-3">Satuan</th>
                    <th className="py-2.5 px-3 w-32">Kuantitas (Qty)</th>
                    <th className="py-2.5 px-3 w-36">Modal (Harga Beli)</th>
                    <th className="py-2.5 px-3 w-40">Harga Jual (Auto-Update)</th>
                    <th className="py-2.5 px-3 w-32">Keuntungan</th>
                    <th className="py-2.5 px-3 text-right">Subtotal Modal</th>
                    <th className="py-2.5 px-3 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center font-bold text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={row.itemId}
                          onChange={(e) => handleUpdateItemRow(idx, 'itemId', e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-hidden"
                        >
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-500">{row.unit}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.quantity === 0 ? '' : row.quantity.toLocaleString('id-ID')}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                            handleUpdateItemRow(idx, 'quantity', raw === '' ? 0 : raw);
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold text-slate-900"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.buyPrice === 0 ? '' : row.buyPrice.toLocaleString('id-ID')}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                            handleUpdateItemRow(idx, 'buyPrice', raw === '' ? 0 : raw);
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.targetSellPrice === 0 ? '' : row.targetSellPrice.toLocaleString('id-ID')}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                            handleUpdateItemRow(idx, 'targetSellPrice', raw === '' ? 0 : raw);
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                        />
                      </td>
                      <td className={`py-2 px-3 font-mono font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(row.profit)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(row.subtotal)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={purchaseItems.length === 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Total Qty: <strong className="text-slate-800">{formatNumber(totalQuantity)} unit</strong>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-slate-600 font-semibold">Grand Total Pembelian:</span>
                <span className="text-lg font-bold font-mono text-slate-900">{formatCurrency(totalItemsCost)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Submit */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-2/3">
              <label className="text-xs text-slate-600 block mb-1">Catatan Pembelian:</label>
              <input
                type="text"
                placeholder="Catatan tambahan (opsional)"
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div className="w-full sm:w-1/3 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan & Cetak Nota Beli</span>
              </button>
            </div>
          </div>

        </form>
      ) : (
        /* PURCHASE HISTORY VIEW */
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/60 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/90">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Riwayat Pembelian & Pelunasan Utang</h3>
            <p className="text-xs text-slate-500">Daftar transaksi pembelian barang dan status pelunasan</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">No. Faktur</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Total Pembelian</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi / Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {purchases.map((pur) => {
                  const currentDebt = pur.remainingDebt !== undefined ? pur.remainingDebt : (pur.paymentStatus === 'Lunas' ? 0 : pur.grandTotal);
                  return (
                    <tr key={pur.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{pur.invoiceNumber}</td>
                      <td className="py-3 px-3">{formatDateTime(pur.date)}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{pur.supplierName}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{formatCurrency(pur.grandTotal)}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pur.paymentStatus === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {pur.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => onPrintPurchase(pur)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md text-[11px] font-semibold cursor-pointer transition-colors inline-flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </button>
                        {currentDebt > 0 && onPayDebt && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayDebtModal(pur)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            Bayar Utang
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      Belum ada riwayat pembelian. Silakan input pembelian baru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAY DEBT MODAL */}
      {debtModalPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Pembayaran Utang Supplier</h3>
              <button
                type="button"
                onClick={() => setDebtModalPurchase(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayDebt} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Faktur:</span>
                  <span className="font-mono font-bold">{debtModalPurchase.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="font-semibold text-slate-800">{debtModalPurchase.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Utang:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(debtModalPurchase.remainingDebt !== undefined ? debtModalPurchase.remainingDebt : debtModalPurchase.grandTotal)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal Pembayaran (Rp):</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={debtPaymentAmount === 0 ? '' : debtPaymentAmount.toLocaleString('id-ID')}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, '').replace(/,/g, '');
                      setDebtPaymentAmount(raw === '' ? 0 : Math.max(0, parseInt(raw) || 0));
                    }}
                    className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Metode Pembayaran:</label>
                <select
                  value={debtPaymentMethod}
                  onChange={(e) => setDebtPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900"
                >
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Tunai">Tunai</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Pembayaran:</label>
                <input
                  type="text"
                  value={debtPaymentNotes}
                  onChange={(e) => setDebtPaymentNotes(e.target.value)}
                  placeholder="Contoh: Cicilan ke-1 via BCA"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              {debtSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 font-semibold rounded-lg text-center">
                  {debtSuccessMsg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDebtModalPurchase(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
