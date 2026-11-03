import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Share2, 
  MessageSquare, 
  Search, 
  Sparkles, 
  Check, 
  X, 
  User, 
  Phone,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Calendar,
  Layers,
  History,
  Loader2
} from 'lucide-react';
import { 
  CustomerPreOrder, 
  PreOrderItem, 
  PreOrderStatus, 
  Item, 
  Customer, 
  CustomerType, 
  UserRole, 
  StoreProfile 
} from '../types/index.ts';
import { 
  formatCurrency, 
  formatNumber, 
  formatDate, 
  formatDateTime, 
  generateInvoiceCode 
} from '../utils/formatters.ts';
import { formatWhatsAppPhone, createPreOrderMatrixPdf } from '../utils/documentPdf.ts';

interface PreOrderManagementProps {
  preorders: CustomerPreOrder[];
  items: Item[];
  customers: Customer[];
  userRole: UserRole;
  storeProfile: StoreProfile;
  onSavePreOrder: (order: CustomerPreOrder) => void;
  onDeletePreOrder: (id: string) => void;
  onProcessPreOrderToSale: (order: CustomerPreOrder) => void;
  onGoToItemRegistration?: () => void;
  onSaveCustomer?: (customer: Customer) => void;
}

export const PreOrderManagement: React.FC<PreOrderManagementProps> = ({
  preorders,
  items,
  customers,
  userRole,
  storeProfile,
  onSavePreOrder,
  onDeletePreOrder,
  onProcessPreOrderToSale,
  onGoToItemRegistration,
  onSaveCustomer,
}) => {
  // View mode tab: 'matrix' (spreadheet grid) or 'history' (completed orders)
  const [activeTab, setActiveTab] = useState<'matrix' | 'history'>('matrix');

  // Search query for filtering customers in the matrix
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Create/Edit PO States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPO, setEditingPO] = useState<CustomerPreOrder | null>(null);

  // Form Fields for Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [formPickupDate, setFormPickupDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formPickupTime, setFormPickupTime] = useState<string>('06:00');
  const [formItems, setFormItems] = useState<PreOrderItem[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formDownPayment, setFormDownPayment] = useState<number>(0);
  const [formPaymentMethod, setFormPaymentMethod] = useState<'Tunai' | 'Transfer'>('Tunai');
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Customer Registration inside Modal
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustType, setNewCustType] = useState<CustomerType>('Restoran / Rumah Makan');

  // Filter Active vs Completed POs
  const activePreOrders = useMemo(() => {
    return preorders
      .filter(po => po.status !== 'Selesai' && po.status !== 'Dibatalkan')
      .filter(po => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          po.poNumber.toLowerCase().includes(q) ||
          po.customerName.toLowerCase().includes(q) ||
          (po.customerPhone || '').includes(q)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [preorders, searchQuery]);

  const historyPreOrders = useMemo(() => {
    return preorders
      .filter(po => po.status === 'Selesai' || po.status === 'Dibatalkan')
      .filter(po => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          po.poNumber.toLowerCase().includes(q) ||
          po.customerName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [preorders, searchQuery]);

  // Total demanded quantity per item across all active preorders
  const itemDemands = useMemo(() => {
    const demandMap: Record<string, number> = {};
    items.forEach(it => {
      demandMap[it.id] = 0;
    });

    activePreOrders.forEach(po => {
      po.items.forEach(pi => {
        if (pi.itemId && demandMap[pi.itemId] !== undefined) {
          demandMap[pi.itemId] += pi.quantity;
        } else {
          // match by name fallback
          const matchedItem = items.find(i => i.name.toLowerCase() === pi.itemName.toLowerCase());
          if (matchedItem) {
            demandMap[matchedItem.id] = (demandMap[matchedItem.id] || 0) + pi.quantity;
          }
        }
      });
    });

    return demandMap;
  }, [activePreOrders, items]);

  // Handle cell quantity change directly in the Matrix
  const handleMatrixQtyChange = (po: CustomerPreOrder, item: Item, newQtyStr: string) => {
    const newQty = parseFloat(newQtyStr) || 0;
    const updatedItems = [...po.items];
    const itemIdx = updatedItems.findIndex(pi => pi.itemId === item.id || pi.itemName.toLowerCase() === item.name.toLowerCase());

    if (itemIdx >= 0) {
      if (newQty <= 0) {
        // remove item from PO if 0
        updatedItems.splice(itemIdx, 1);
      } else {
        updatedItems[itemIdx] = {
          ...updatedItems[itemIdx],
          quantity: newQty,
          sellPrice: item.sellPrice,
          subtotal: Number((newQty * item.sellPrice).toFixed(2)),
        };
      }
    } else if (newQty > 0) {
      // add item to PO
      updatedItems.push({
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        quantity: newQty,
        sellPrice: item.sellPrice,
        subtotal: Number((newQty * item.sellPrice).toFixed(2)),
      });
    }

    const newSubtotal = updatedItems.reduce((s, i) => s + i.subtotal, 0);
    const newGrandTotal = Math.max(0, newSubtotal - (po.discount || 0));

    const updatedPO: CustomerPreOrder = {
      ...po,
      items: updatedItems,
      subtotal: newSubtotal,
      grandTotal: newGrandTotal,
      updatedAt: new Date().toISOString(),
    };

    onSavePreOrder(updatedPO);
  };

  // Handle DP change directly in Matrix
  const handleMatrixDPChange = (po: CustomerPreOrder, newDpStr: string) => {
    const newDp = parseFloat(newDpStr) || 0;
    const updatedPO: CustomerPreOrder = {
      ...po,
      downPayment: newDp,
      updatedAt: new Date().toISOString(),
    };
    onSavePreOrder(updatedPO);
  };

  // Handle Catatan change in Matrix
  const handleMatrixNotesChange = (po: CustomerPreOrder, newNotes: string) => {
    const updatedPO: CustomerPreOrder = {
      ...po,
      notes: newNotes,
      updatedAt: new Date().toISOString(),
    };
    onSavePreOrder(updatedPO);
  };

  // Reset & Open Create Modal
  const handleOpenCreateModal = (poToEdit?: CustomerPreOrder) => {
    if (poToEdit) {
      setEditingPO(poToEdit);
      setSelectedCustomerId(poToEdit.customerId);
      setFormPickupDate(poToEdit.pickupDate);
      setFormPickupTime(poToEdit.pickupTime || '06:00');
      setFormItems([...poToEdit.items]);
      setFormNotes(poToEdit.notes || '');
      setFormDiscount(poToEdit.discount || 0);
      setFormDownPayment(poToEdit.downPayment || 0);
      setFormPaymentMethod(poToEdit.paymentMethod || 'Tunai');
    } else {
      setEditingPO(null);
      setSelectedCustomerId(customers[0]?.id || '');
      setFormPickupDate(new Date().toISOString().substring(0, 10));
      setFormPickupTime('06:00');
      setFormItems([]);
      setFormNotes('');
      setFormDiscount(0);
      setFormDownPayment(0);
      setFormPaymentMethod('Tunai');
    }

    setFormError(null);
    setShowCreateModal(true);
  };

  // Add quick row for a customer directly
  const handleQuickAddCustomerRow = (customer: Customer) => {
    const newPO: CustomerPreOrder = {
      id: `po-${Date.now()}`,
      poNumber: generateInvoiceCode('PO'),
      orderDate: new Date().toISOString(),
      pickupDate: new Date().toISOString().substring(0, 10),
      pickupTime: '06:00',
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerType: customer.type,
      items: [],
      subtotal: 0,
      discount: 0,
      grandTotal: 0,
      downPayment: 0,
      paymentMethod: 'Tunai',
      status: 'Menunggu Potong',
      notes: '',
      createdBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSavePreOrder(newPO);
  };

  // Handle Save PO in Modal (Hanya memilih/mendaftarkan customer)
  const handleSavePOForm = () => {
    if (!selectedCustomerId) {
      setFormError('Silakan pilih pelanggan terlebih dahulu.');
      return;
    }

    const selectedCust = customers.find(c => c.id === selectedCustomerId);
    if (!selectedCust) {
      setFormError('Data pelanggan tidak ditemukan.');
      return;
    }

    const newPO: CustomerPreOrder = {
      id: editingPO ? editingPO.id : `po-${Date.now()}`,
      poNumber: editingPO ? editingPO.poNumber : generateInvoiceCode('PO'),
      orderDate: editingPO ? editingPO.orderDate : new Date().toISOString(),
      pickupDate: formPickupDate,
      pickupTime: '06:00',
      customerId: selectedCust.id,
      customerName: selectedCust.name,
      customerPhone: selectedCust.phone,
      customerType: selectedCust.type,
      items: editingPO ? editingPO.items : [],
      subtotal: editingPO ? editingPO.subtotal : 0,
      discount: 0,
      grandTotal: editingPO ? editingPO.grandTotal : 0,
      downPayment: 0,
      paymentMethod: 'Tunai',
      status: editingPO ? editingPO.status : 'Menunggu Potong',
      notes: '',
      createdBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir',
      convertedSaleId: editingPO?.convertedSaleId,
      createdAt: editingPO ? editingPO.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSavePreOrder(newPO);
    setShowCreateModal(false);
  };

  // Handle Quick Customer Save
  const handleCreateQuickCustomer = () => {
    if (!newCustName.trim()) {
      alert('Nama pelanggan wajib diisi.');
      return;
    }
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      code: `CST-${Math.floor(100 + Math.random() * 900)}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '-',
      address: newCustAddress.trim() || '-',
      type: newCustType,
      defaultDiscountPercent: 0,
      notes: 'Terdaftar dari Pre-Order (PO)',
    };
    if (onSaveCustomer) {
      onSaveCustomer(newCust);
    }
    handleQuickAddCustomerRow(newCust);
    setShowQuickCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  // State untuk share matrix
  const [isSharingMatrix, setIsSharingMatrix] = useState(false);

  // Share Rekap Matrix PO via WhatsApp (Kirim Dokumen PDF Saja Tanpa Kata-Kata / Teks Panjang)
  const handleShareMatrixWhatsApp = async () => {
    setIsSharingMatrix(true);
    try {
      const { doc, fileName } = createPreOrderMatrixPdf(
        activePreOrders,
        items,
        itemDemands,
        storeProfile
      );
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // 1. Coba Native Share Sheet bawaan HP (Android/iOS) dengan file PDF saja
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: fileName,
          });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }

      // 2. Fallback untuk Desktop: Unduh PDF otomatis
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      console.error('Error sharing PO matrix PDF:', err);
    } finally {
      setIsSharingMatrix(false);
    }
  };

  // Share Voucher PO Individual via WhatsApp (jika diperlukan)
  const handleSharePOWhatsApp = (po: CustomerPreOrder) => {
    const cleanPhone = formatWhatsAppPhone(po.customerPhone);
    const itemsText = po.items.length > 0 
      ? po.items.map((it, idx) => 
          `${idx + 1}. ${it.itemName} (${formatNumber(it.quantity)} ${it.unit} x ${formatCurrency(it.sellPrice)}) = ${formatCurrency(it.subtotal)}`
        ).join('\n')
      : '- Belum ada rincian item';

    const sisa = Math.max(0, po.grandTotal - (po.downPayment || 0));

    const message = 
      `*VOUCHER PRE-ORDER (PO) - ${storeProfile.name.toUpperCase()}*\n` +
      `No. PO       : ${po.poNumber}\n` +
      `Tgl Pesan    : ${formatDateTime(po.orderDate)}\n` +
      `Pelanggan    : ${po.customerName}\n` +
      `Status       : [${po.status.toUpperCase()}]\n` +
      `----------------------------------------\n` +
      `*RINCIAN PESANAN:*\n` +
      `${itemsText}\n` +
      `----------------------------------------\n` +
      `Total Pesanan: ${formatCurrency(po.grandTotal)}\n` +
      (po.downPayment > 0 ? `Uang Muka (DP): ${formatCurrency(po.downPayment)} (${po.paymentMethod || 'Tunai'})\n` : '') +
      `*Sisa Pembayaran: ${formatCurrency(sisa)}*\n` +
      (po.notes ? `*Catatan Khusus:* ${po.notes}\n` : '') +
      `----------------------------------------\n` +
      `Pesanan Anda telah tercatat. Kirimkan pesan ini saat pengambilan.\n` +
      `Terima kasih!\n` +
      `_${storeProfile.name}_`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      
      {/* 1. TOP TITLE BAR & TAB SWITCHER */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Matriks Pre-Order (PO) & Rekap Kebutuhan Item
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Input pesanan pelanggan per baris, cek kecukupan stok gudang per kolom item, dan posting langsung ke Nota Kasir.
            </p>
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap sm:flex-nowrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'matrix' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Matriks Input PO ({activePreOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-emerald-600" />
              <span>Riwayat PO Selesai ({historyPreOrders.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat PO Baru</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & QUICK ADD BAR */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama pelanggan atau No. PO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
          />
        </div>

        {/* Quick Add Baris Pelanggan Select */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium shrink-0">+ Tambah Baris Pelanggan:</span>
          <select
            onChange={(e) => {
              const custId = e.target.value;
              if (custId === '__new__') {
                setShowQuickCustomer(true);
                handleOpenCreateModal();
              } else if (custId) {
                const cust = customers.find(c => c.id === custId);
                if (cust) handleQuickAddCustomerRow(cust);
              }
              e.target.value = '';
            }}
            className="flex-1 sm:w-56 p-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold focus:outline-hidden cursor-pointer"
          >
            <option value="">-- Pilih Pelanggan --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
            <option value="__new__">+ Daftarkan Pelanggan Baru...</option>
          </select>

          {onGoToItemRegistration && (
            <button
              type="button"
              onClick={onGoToItemRegistration}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Buka menu potong ayam untuk menambah stok item"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Registrasi Stok & Potong Ayam</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. MAIN TAB CONTENT */}
      {activeTab === 'matrix' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          
          {/* MATRIX SPREADSHEET TABLE */}
          <div className="overflow-x-auto max-h-[72vh]">
            <table className="w-full text-xs border-collapse">
              {/* TABLE HEADER: ITEM NAMES COLUMNS */}
              <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-xs">
                <tr>
                  <th className="py-3 px-3 text-left font-bold border-b border-r border-slate-700 min-w-[180px] bg-slate-900 sticky left-0 z-30">
                    Pelanggan (Customer)
                  </th>
                  {items.map((it) => (
                    <th key={it.id} className="py-3 px-2 text-center font-bold border-b border-r border-slate-700 min-w-[100px] max-w-[120px]">
                      <div className="truncate text-amber-300 font-semibold text-xs" title={it.name}>{it.name}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center font-bold border-b border-slate-700 min-w-[140px]">
                    Aksi / Posting
                  </th>
                </tr>
              </thead>

              {/* TABLE BODY: STOK ITEM AT TOP, THEN CUSTOMER ROWS */}
              <tbody className="divide-y divide-slate-200">
                {/* BARIS PALING ATAS: STOK ITEM SAAT INI (POSISI DAN WARNA DISAMAKAN DENGAN TOTAL PESANAN & STOK AKHIR) */}
                <tr className="bg-slate-900 text-white font-mono font-bold border-b border-slate-700">
                  <td className="py-2.5 px-3 border-r border-slate-700 bg-slate-900 sticky left-0 z-10 text-amber-300 text-xs text-center font-bold">
                    STOK ITEM
                  </td>
                  {items.map((it) => (
                    <td key={it.id} className="py-2 px-1 text-center border-r border-slate-700 text-slate-100 bg-slate-900">
                      <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-xs block">
                        {formatNumber(it.currentStock)} {it.unit}
                      </span>
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center bg-slate-900 text-slate-400 font-sans text-[11px]">
                    Stok Gudang
                  </td>
                </tr>

                {/* CUSTOMER PO ROWS */}
                {activePreOrders.map((po) => {
                  return (
                    <tr key={po.id} className="hover:bg-amber-50/30 transition-colors group">
                      
                      {/* Customer Name Cell (Sticky Column) */}
                      <td className="py-2.5 px-3 border-r border-slate-200 bg-white group-hover:bg-amber-50/50 sticky left-0 z-10 font-medium">
                        <div>
                          <span className="font-bold text-slate-900 block text-xs truncate max-w-[150px]" title={po.customerName}>
                            {po.customerName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {po.poNumber} {po.customerType ? `• ${po.customerType}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Item Matrix Quantity Input Cells */}
                      {items.map((it) => {
                        const pi = po.items.find(i => i.itemId === it.id || i.itemName.toLowerCase() === it.name.toLowerCase());
                        const qtyVal = pi ? pi.quantity : '';

                        return (
                          <td key={it.id} className="p-1 text-center border-r border-slate-200">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="0"
                              value={qtyVal}
                              onChange={(e) => handleMatrixQtyChange(po, it, e.target.value)}
                              className={`w-full text-center py-1.5 px-1 rounded-lg border text-xs font-mono font-bold transition-all focus:ring-2 focus:ring-amber-400 focus:outline-hidden ${
                                pi && pi.quantity > 0
                                  ? 'bg-amber-100/80 border-amber-300 text-amber-950 shadow-2xs'
                                  : 'bg-slate-50/60 border-slate-200 text-slate-400 hover:bg-white'
                              }`}
                            />
                          </td>
                        );
                      })}

                      {/* Action Cell */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onProcessPreOrderToSale(po)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Proses pesanan ini langsung ke Nota Kasir"
                          >
                            <span>Posting Nota</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          {userRole === 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Hapus baris pesanan ${po.customerName}?`)) {
                                  onDeletePreOrder(po.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus Pesanan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {activePreOrders.length === 0 && (
                  <tr>
                    <td colSpan={items.length + 2} className="py-12 text-center text-slate-400">
                      <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-medium text-slate-600">Belum ada baris pesanan pelanggan aktif.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Pilih pelanggan di menu atas "+ Tambah Baris Pelanggan" untuk mulai menginput.</p>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* TABLE FOOTER SUMMARY ROWS (TOTAL PESANAN & STOK AKHIR) */}
              <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white font-mono shadow-md">
                
                {/* BOTTOM ROW 1: TOTAL PESANAN DARI SEMUA CUSTOMER */}
                <tr className="bg-slate-900 border-t-2 border-slate-700 text-amber-300">
                  <td className="py-2.5 px-3 font-bold border-r border-slate-700 sticky left-0 bg-slate-900 z-30 text-xs text-center text-amber-300">
                    TOTAL PESANAN
                  </td>
                  {items.map((it) => {
                    const totalDemand = itemDemands[it.id] || 0;
                    return (
                      <td key={it.id} className="py-2.5 px-2 text-center font-bold border-r border-slate-700 text-xs">
                        {totalDemand > 0 ? (
                          <span className="bg-amber-500/20 px-2 py-0.5 rounded-md text-amber-300 font-mono font-bold">
                            {formatNumber(totalDemand)} {it.unit}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-r border-slate-700"></td>
                </tr>

                {/* BOTTOM ROW 2: STOK AKHIR (STOK ITEM - TOTAL PESANAN) */}
                <tr className="bg-slate-900 border-t-2 border-slate-700 text-amber-300">
                  <td className="py-2.5 px-3 font-bold border-r border-slate-700 sticky left-0 bg-slate-900 z-30 text-xs text-center text-amber-300">
                    STOK AKHIR
                  </td>
                  {items.map((it) => {
                    const totalDemand = itemDemands[it.id] || 0;
                    const liveStock = it.currentStock;
                    const stokAkhir = liveStock - totalDemand;
                    const isEnough = stokAkhir >= 0;

                    return (
                      <td key={it.id} className={`py-2 px-1.5 text-center border-r border-slate-700 text-[11px]`}>
                        <div className={`p-1.5 rounded-lg border font-bold ${
                          isEnough 
                            ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300' 
                            : 'bg-rose-950/90 border-rose-700/90 text-rose-300 animate-pulse'
                        }`}>
                          <div className="font-mono text-xs">
                            {formatNumber(stokAkhir)} {it.unit}
                          </div>
                          <div className="text-[10px] font-semibold mt-0.5">
                            {isEnough ? (
                              <span className="text-emerald-400">Cukup</span>
                            ) : (
                              <span className="text-rose-300">Kurang</span>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-center text-xs text-slate-400 font-sans italic border-r border-slate-700">
                    (Stok Item - Total Pesanan)
                  </td>
                </tr>

              </tfoot>
            </table>
          </div>

          {/* BOTTOM ACTION BAR: SHARE WA / KIRIM WA */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600 font-medium">
              <span>Total Pesanan Masuk: </span>
              <strong className="text-slate-900 font-mono font-bold">{activePreOrders.length} Pelanggan</strong>
              <span className="text-slate-400 ml-2 hidden sm:inline">• Rekap otomatis format PDF siap dibagikan ke WhatsApp</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                disabled={isSharingMatrix}
                onClick={handleShareMatrixWhatsApp}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                title="Kirim dan bagikan rekap pesanan PO & kebutuhan potong ayam ke WhatsApp dalam bentuk PDF"
              >
                {isSharingMatrix ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                <span>{isSharingMatrix ? 'Membuat PDF...' : 'Kirim WA'}</span>
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* 4. HISTORY TAB (SELESAI / NOTA) */
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Riwayat Pre-Order Selesai (Sudah Diproses ke Nota)
          </h3>
          <div className="divide-y divide-slate-100">
            {historyPreOrders.map((po) => (
              <div key={po.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{po.poNumber}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                      Selesai
                    </span>
                  </div>
                  <div className="text-slate-600 font-medium mt-0.5">
                    Pelanggan: <strong>{po.customerName}</strong> • {formatDateTime(po.updatedAt)}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Item: {po.items.map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <span className="text-slate-400 text-[10px] block">Total Nota:</span>
                    <span className="font-bold text-slate-900 text-sm">{formatCurrency(po.grandTotal)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSharePOWhatsApp(po)}
                    className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl font-bold cursor-pointer flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Share WA</span>
                  </button>

                  {userRole === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Hapus riwayat PO ${po.poNumber}?`)) {
                          onDeletePreOrder(po.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Hapus PO"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {historyPreOrders.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada riwayat PO yang telah selesai diproses.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL FORM PRE-ORDER (PO) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingPO ? `Edit Pesanan ${editingPO.poNumber}` : 'Buat Pre-Order (PO) Baru'}
                </h3>
                <p className="text-xs text-slate-500">Catat detail pesanan pelanggan</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Customer Selector & Quick Add */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-700">Pilih Pelanggan:</label>
                  <button
                    type="button"
                    onClick={() => setShowQuickCustomer(!showQuickCustomer)}
                    className="text-amber-600 font-bold hover:underline cursor-pointer"
                  >
                    {showQuickCustomer ? '✕ Batal' : '+ Tambah Pelanggan Baru'}
                  </button>
                </div>

                {showQuickCustomer ? (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2 text-xs">
                    <span className="font-bold text-amber-900 block">Registrasi Cepat Pelanggan:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nama Pelanggan / Usaha *"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="No. WhatsApp / HP"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={newCustType}
                        onChange={(e) => setNewCustType(e.target.value as CustomerType)}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs flex-1"
                      >
                        <option value="Restoran / Rumah Makan">Restoran / Rumah Makan</option>
                        <option value="Langganan">Langganan</option>
                        <option value="Grosir">Grosir</option>
                        <option value="Katering">Katering</option>
                        <option value="Eceran">Eceran</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleCreateQuickCustomer}
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                      >
                        Simpan Pelanggan
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden"
                  >
                    <option value="">-- Pilih Pelanggan --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type}) {c.phone ? `- ${c.phone}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePOForm}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Simpan & Terbitkan Baris PO
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
