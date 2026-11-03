import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Printer, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  User, 
  Percent, 
  Clock, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  X,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  Item, 
  Customer, 
  CustomerType,
  SaleTransaction, 
  SaleItem, 
  SalePaymentStatus,
  ItemCategory, 
  UserRole,
  StoreProfile,
  DebtPayment,
  CustomerPreOrder
} from '../types/index.ts';
import { formatCurrency, formatNumber, formatDateTime, generateInvoiceCode } from '../utils/formatters.ts';
import { PreOrderManagement } from './PreOrderManagement.tsx';

interface KasirPOSProps {
  items: Item[];
  customers: Customer[];
  onCompleteSale: (sale: SaleTransaction) => void;
  recentSales: SaleTransaction[];
  onPrintSale: (sale: SaleTransaction) => void;
  userRole: UserRole;
  storeProfile: StoreProfile;
  onSaveCustomer?: (customer: Customer) => void;
  onDeleteSale?: (saleId: string) => void;
  preorders?: CustomerPreOrder[];
  onSavePreOrder?: (order: CustomerPreOrder) => void;
  onDeletePreOrder?: (id: string) => void;
  onGoToItemRegistration?: () => void;
}

export const KasirPOS: React.FC<KasirPOSProps> = ({
  items,
  customers,
  onCompleteSale,
  recentSales,
  onPrintSale,
  userRole,
  storeProfile,
  onSaveCustomer,
  onDeleteSale,
  preorders = [],
  onSavePreOrder,
  onDeletePreOrder,
  onGoToItemRegistration,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-5'); // Default: Pelanggan Umum
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  
  // Payment states matching Pembelian
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Transfer'>('Tunai');
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus>('Lunas');
  const [amountPaidInput, setAmountPaidInput] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'po' | 'riwayat'>('pos');
  const [activeProcessingPO, setActiveProcessingPO] = useState<CustomerPreOrder | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  const activePreOrdersCount = useMemo(() => {
    return preorders.filter(po => po.status !== 'Selesai' && po.status !== 'Dibatalkan').length;
  }, [preorders]);

  // Filter & Pagination for Riwayat Penjualan
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const categories = ['Semua', 'Ayam Utuh', 'Karkas', 'Potongan', 'Jeroan', 'Lainnya'];

  // Quick Customer Registration Modal state
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustAddress, setQuickCustAddress] = useState('');
  const [quickCustType, setQuickCustType] = useState<CustomerType>('Eceran');
  const [quickCustDiscount, setQuickCustDiscount] = useState<number>(0);

  const handleOpenQuickCustomerModal = () => {
    setQuickCustName('');
    setQuickCustPhone('');
    setQuickCustAddress('');
    setQuickCustType('Eceran');
    setQuickCustDiscount(0);
    setShowQuickCustomerModal(true);
  };

  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) return;

    const nextNum = customers.length + 1;
    const newId = `cust-${Date.now()}`;
    const newCustomer: Customer = {
      id: newId,
      code: `CST-${String(nextNum).padStart(2, '0')}`,
      name: quickCustName.trim(),
      phone: quickCustPhone.trim() || '-',
      address: quickCustAddress.trim() || '-',
      type: quickCustType,
      defaultDiscountPercent: quickCustDiscount,
    };

    if (onSaveCustomer) {
      onSaveCustomer(newCustomer);
    }
    setSelectedCustomerId(newId);
    setDiscountPercent(quickCustDiscount);
    setShowQuickCustomerModal(false);
  };

  // Handle customer change and apply default customer discount
  const handleSelectCustomer = (customerId: string) => {
    if (customerId === '__NEW__') {
      handleOpenQuickCustomerModal();
      return;
    }
    setSelectedCustomerId(customerId);
    const cust = customers.find(c => c.id === customerId);
    if (cust && cust.defaultDiscountPercent > 0) {
      setDiscountPercent(cust.defaultDiscountPercent);
    } else {
      setDiscountPercent(0);
    }
  };

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0] || {
      id: 'cust-general',
      name: 'Pelanggan Umum',
      type: 'Eceran',
      phone: '-',
      address: '-',
      defaultDiscountPercent: 0,
      code: 'GEN'
    };
  }, [customers, selectedCustomerId]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = activeCategory === 'Semua' || item.category === activeCategory;
      const matchQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [items, activeCategory, searchQuery]);

  // Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (cartSubtotal * discountPercent) / 100;
  }, [cartSubtotal, discountPercent]);

  const grandTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount);
  }, [cartSubtotal, discountAmount]);

  const totalCostHPP = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.costSubtotal, 0);
  }, [cart]);

  const grossProfit = useMemo(() => {
    return grandTotal - totalCostHPP;
  }, [grandTotal, totalCostHPP]);

  const profitMarginPercent = useMemo(() => {
    return grandTotal > 0 ? (grossProfit / grandTotal) * 100 : 0;
  }, [grossProfit, grandTotal]);

  // Cart stock validation: find any item where cart quantity > available stock
  const invalidStockItems = useMemo(() => {
    return cart.filter((ci) => {
      const orig = items.find((i) => i.id === ci.itemId);
      if (!orig) return true;
      return ci.quantity > orig.currentStock;
    });
  }, [cart, items]);

  const hasInsufficientStock = invalidStockItems.length > 0;

  // Cart operations with Stock Limit Check
  const addToCart = (item: Item) => {
    if (item.currentStock <= 0) {
      setStockWarning(`Stok "${item.name}" habis (0 ${item.unit}). Tidak dapat ditambahkan ke keranjang.`);
      setTimeout(() => setStockWarning(null), 4000);
      return;
    }

    const defaultQty = item.unit === 'pcs' ? 1 : 1.0;
    const existing = cart.find((ci) => ci.itemId === item.id);
    const existingQty = existing ? existing.quantity : 0;

    if (existingQty + defaultQty > item.currentStock) {
      setStockWarning(`Stok "${item.name}" tidak mencukupi! Tersedia hanya ${formatNumber(item.currentStock)} ${item.unit} (di keranjang sudah ${formatNumber(existingQty)} ${item.unit}).`);
      setTimeout(() => setStockWarning(null), 4500);
      return;
    }

    setCart((prev) => {
      if (existing) {
        return prev.map((ci) => {
          if (ci.itemId === item.id) {
            const newQty = Number((ci.quantity + defaultQty).toFixed(2));
            const subtotal = newQty * ci.sellPrice;
            const costSubtotal = newQty * ci.baseCost;
            return {
              ...ci,
              quantity: newQty,
              subtotal,
              costSubtotal,
              itemProfit: subtotal - costSubtotal,
            };
          }
          return ci;
        });
      }
      const subtotal = defaultQty * item.sellPrice;
      const costSubtotal = defaultQty * item.baseBuyPrice;
      return [
        ...prev,
        {
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          quantity: defaultQty,
          sellPrice: item.sellPrice,
          baseCost: item.baseBuyPrice,
          subtotal,
          costSubtotal,
          itemProfit: subtotal - costSubtotal,
        },
      ];
    });
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }

    const targetItem = items.find((i) => i.id === itemId);
    const availableStock = targetItem ? targetItem.currentStock : 0;

    if (newQty > availableStock) {
      setStockWarning(`Peringatan: Kuantitas ${targetItem?.name || 'item'} (${formatNumber(newQty)} ${targetItem?.unit || ''}) melebihi stok yang tersedia (${formatNumber(availableStock)} ${targetItem?.unit || ''})!`);
      setTimeout(() => setStockWarning(null), 4500);
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          const subtotal = newQty * item.sellPrice;
          const costSubtotal = newQty * item.baseCost;
          return {
            ...item,
            quantity: newQty,
            subtotal,
            costSubtotal,
            itemProfit: subtotal - costSubtotal,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Payment calculations
  const actualAmountPaid = useMemo(() => {
    if (paymentStatus === 'Sebagian') return Math.min(grandTotal, amountPaidInput);
    return grandTotal;
  }, [paymentStatus, amountPaidInput, grandTotal]);

  const remainingReceivable = useMemo(() => {
    if (paymentStatus === 'Lunas') return 0;
    return Math.max(0, grandTotal - actualAmountPaid);
  }, [paymentStatus, grandTotal, actualAmountPaid]);

  const change = useMemo(() => {
    if (paymentStatus !== 'Lunas' || paymentMethod !== 'Tunai') return 0;
    return Math.max(0, (amountPaidInput || 0) - grandTotal);
  }, [paymentStatus, paymentMethod, amountPaidInput, grandTotal]);

  // Sales History Filtering & Pagination
  const filteredSales = useMemo(() => {
    return recentSales.filter((sale) => {
      const matchDate = !historyDateFilter || sale.date.startsWith(historyDateFilter);
      const matchQuery = !historySearchQuery || 
        sale.invoiceNumber.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        sale.customerName.toLowerCase().includes(historySearchQuery.toLowerCase());
      return matchDate && matchQuery;
    });
  }, [recentSales, historyDateFilter, historySearchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  // Set quick cash payment
  const handleQuickCash = (amount: number) => {
    setAmountPaidInput(amount);
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    if (hasInsufficientStock) {
      setStockWarning('Penjualan tidak dapat dilanjutkan karena ada item yang melebihi jumlah stok tersedia!');
      setTimeout(() => setStockWarning(null), 4500);
      return;
    }
    setPaymentStatus('Lunas');
    setPaymentMethod('Tunai');
    setAmountPaidInput(grandTotal);
    setShowCheckoutModal(true);
  };

  const handleFinalizeSale = () => {
    if (cart.length === 0 || hasInsufficientStock) return;

    // Additional safeguard check against live stock
    const isExceeding = cart.some(ci => {
      const orig = items.find(i => i.id === ci.itemId);
      return !orig || ci.quantity > orig.currentStock;
    });

    if (isExceeding) {
      setStockWarning('Stok tidak mencukupi untuk satu atau lebih item di keranjang!');
      setTimeout(() => setStockWarning(null), 4500);
      return;
    }

    const sale: SaleTransaction = {
      id: `sal-${Date.now()}`,
      invoiceNumber: generateInvoiceCode('INV'),
      date: new Date().toISOString(),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      customerType: selectedCustomer.type,
      items: [...cart],
      subtotal: cartSubtotal,
      discount: discountAmount,
      grandTotal,
      totalCostHPP,
      grossProfit,
      paymentMethod,
      paymentStatus,
      amountPaid: actualAmountPaid,
      remainingDebt: remainingReceivable,
      change,
      customerDebtPayments: actualAmountPaid > 0 && paymentStatus !== 'Lunas' ? [
        {
          id: `dp-sale-${Date.now()}`,
          date: new Date().toISOString(),
          amount: actualAmountPaid,
          paymentMethod,
          notes: 'Uang Muka (DP) Penjualan',
          recordedBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir'
        }
      ] : [],
      notes,
      createdBy: userRole === 'admin' ? 'Admin Usaha' : 'Kasir',
    };

    onCompleteSale(sale);

    if (activeProcessingPO && onSavePreOrder) {
      onSavePreOrder({
        ...activeProcessingPO,
        status: 'Selesai',
        convertedSaleId: sale.id,
        updatedAt: new Date().toISOString(),
      });
      setActiveProcessingPO(null);
    }

    setShowCheckoutModal(false);
    clearCart();
    setNotes('');
    setAmountPaidInput(0);
    // Automatically trigger print preview
    onPrintSale(sale);
  };

  const handleProcessPreOrderToSale = (po: CustomerPreOrder) => {
    const mappedCart: SaleItem[] = po.items.map(pi => {
      const origItem = items.find(i => i.id === pi.itemId || i.name.toLowerCase() === pi.itemName.toLowerCase());
      const baseCost = origItem ? origItem.baseBuyPrice : 0;
      const subtotal = pi.subtotal;
      const costSubtotal = pi.quantity * baseCost;
      return {
        itemId: pi.itemId,
        itemName: pi.itemName,
        unit: pi.unit,
        quantity: pi.quantity,
        sellPrice: pi.sellPrice,
        baseCost,
        subtotal,
        costSubtotal,
        itemProfit: subtotal - costSubtotal,
      };
    });

    setCart(mappedCart);
    setSelectedCustomerId(po.customerId);
    setDiscountPercent(po.discount > 0 && po.subtotal > 0 ? Number(((po.discount / po.subtotal) * 100).toFixed(1)) : 0);
    setNotes(po.notes ? `[Rujukan ${po.poNumber}] ${po.notes}` : `[Rujukan ${po.poNumber}]`);
    
    if (po.downPayment > 0) {
      setAmountPaidInput(po.grandTotal);
    }

    setActiveProcessingPO(po);
    setActiveSubTab('pos');
    setStockWarning(null);
  };

  return (
    <div className="space-y-4">
      {/* Floating Stock Warning Banner */}
      {stockWarning && (
        <div className="fixed top-18 right-4 z-50 bg-rose-600 text-white px-4 py-3 rounded-xl shadow-2xl border border-rose-700 flex items-center gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="w-4 h-4 text-white shrink-0" />
          <span className="font-semibold">{stockWarning}</span>
          <button
            onClick={() => setStockWarning(null)}
            className="p-1 text-rose-200 hover:text-white rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub tabs: Kasir Aktif vs Riwayat Penjualan */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('pos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'pos'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Menu Kasir & Penjualan
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('po')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'po'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <span>Pre-Order / Pesanan (PO)</span>
            {activePreOrdersCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeSubTab === 'po' ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'
              }`}>
                {activePreOrdersCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('riwayat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'riwayat'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Riwayat Penjualan ({recentSales.length})
          </button>
        </div>

        <div className="text-xs text-slate-500 hidden sm:block">
          Kasir Aktif: <span className="font-semibold text-slate-800">{userRole.toUpperCase()}</span>
        </div>
      </div>

      {activeSubTab === 'pos' ? (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT COLUMN: ITEM CATALOG (7 COLS ON DESKTOP) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Search */}
            <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama item / produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/70 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredItems.map((item) => {
                const isOutOfStock = item.currentStock <= 0;
                const isLowStock = item.currentStock > 0 && item.currentStock <= item.minStock;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(item)}
                    className={`bg-white/85 backdrop-blur-xs p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between group shadow-xs relative ${
                      isOutOfStock
                        ? 'opacity-60 cursor-not-allowed border-rose-200 bg-rose-50/20'
                        : 'border-white/80 hover:border-amber-400 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-[10px] text-slate-400 font-mono">{item.code}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          isOutOfStock 
                            ? 'bg-rose-100 text-rose-700' 
                            : isLowStock 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'text-slate-500'
                        }`}>
                          {isOutOfStock ? 'Habis (0)' : `Stok: ${formatNumber(item.currentStock)} ${item.unit}`}
                        </span>
                      </div>

                      <h4 className={`text-xs font-semibold leading-snug line-clamp-2 ${
                        isOutOfStock ? 'text-slate-500' : 'text-slate-900 group-hover:text-amber-700'
                      }`}>
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                        {formatCurrency(item.sellPrice)}
                        <span className="text-[10px] text-slate-500 font-normal">/{item.unit}</span>
                      </span>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                        isOutOfStock 
                          ? 'bg-slate-100 text-slate-400' 
                          : 'bg-amber-50 group-hover:bg-amber-500 group-hover:text-white text-amber-600'
                      }`}>
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                  <p className="text-sm font-medium">Tidak ada ayam atau produk yang cocok</p>
                  <p className="text-xs text-slate-400 mt-1">Coba ganti kata kunci pencarian atau kategori</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: CART & CHECKOUT (5 COLS ON DESKTOP) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/85 backdrop-blur-md rounded-xl border border-white/60 shadow-xs flex flex-col h-full">
              
              {/* Cart Header */}
              <div className="p-3.5 border-b border-slate-200/60 flex items-center justify-between bg-white/60 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Keranjang Penjualan</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                    {cart.length} Item
                  </span>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              {/* Customer Selector with Quick Register */}
              <div className="p-3 border-b border-slate-200/60 bg-white/40 space-y-2">
                {activeProcessingPO && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-300 rounded-xl text-xs flex items-center justify-between text-amber-950">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold block">Memproses PO: {activeProcessingPO.poNumber}</span>
                        <span className="text-[10px] text-amber-800">
                          {activeProcessingPO.customerName} {activeProcessingPO.downPayment > 0 ? `(DP: ${formatCurrency(activeProcessingPO.downPayment)})` : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveProcessingPO(null)}
                      className="text-amber-800 hover:text-amber-950 text-[10px] font-bold underline cursor-pointer"
                    >
                      Batal Tautkan
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pilih Pelanggan:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenQuickCustomerModal}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                    title="Daftarkan pelanggan baru langsung di nota ini"
                  >
                    <Plus className="w-3 h-3 text-amber-600" />
                    <span>+ Registrasi Baru</span>
                  </button>
                </div>

                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  <option value="__NEW__" className="font-bold text-amber-700 bg-amber-50">
                    ➕ + Daftarkan Pelanggan Baru...
                  </option>
                  <optgroup label="Pelanggan Terdaftar">
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type}) {c.defaultDiscountPercent > 0 ? `[Diskon ${c.defaultDiscountPercent}%]` : ''}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Tipe: <strong className="text-slate-700">{selectedCustomer.type}</strong></span>
                  {selectedCustomer.phone && selectedCustomer.phone !== '-' && (
                    <span>WA/Telp: <strong className="text-slate-700">{selectedCustomer.phone}</strong></span>
                  )}
                </div>
              </div>

              {/* Cart Items List */}
              <div className="p-3 space-y-2 flex-1 max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                {cart.map((item) => {
                  const masterItem = items.find((i) => i.id === item.itemId);
                  const availableStock = masterItem ? masterItem.currentStock : 0;
                  const isStockInsufficient = item.quantity > availableStock;

                  return (
                    <div key={item.itemId} className={`pt-2 first:pt-0 space-y-1.5 p-1 rounded-lg ${
                      isStockInsufficient ? 'bg-rose-50/70 border border-rose-200 p-2' : ''
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-semibold text-slate-900">{item.itemName}</h5>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.itemId)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        {/* Quantity input with steppers */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.itemId, Math.max(0.1, Number((item.quantity - (item.unit === 'pcs' ? 1 : 0.5)).toFixed(2))))}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded-l-lg cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            step={item.unit === 'pcs' ? '1' : '0.1'}
                            value={item.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateQuantity(item.itemId, Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-14 text-center text-xs font-mono font-semibold bg-transparent focus:outline-hidden py-1"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.itemId, Number((item.quantity + (item.unit === 'pcs' ? 1 : 0.5)).toFixed(2)))}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded-r-lg cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] text-slate-500 pr-2">{item.unit}</span>
                        </div>

                        {/* Selling price per unit input */}
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                            {formatCurrency(item.subtotal)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            @{formatNumber(item.sellPrice)}
                          </div>
                        </div>
                      </div>

                      {/* Insufficient Stock Warning under item */}
                      {isStockInsufficient && (
                        <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1 bg-white px-2 py-1 rounded border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Stok tidak cukup! Tersedia: {formatNumber(availableStock)} {item.unit} (Dijual: {formatNumber(item.quantity)})</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {cart.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Keranjang masih kosong</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Pilih ayam dari katalog di samping</p>
                  </div>
                )}
              </div>

              {/* Financial calculations & Profit Margin Indicator */}
              {cart.length > 0 && (
                <div className="p-3.5 bg-slate-50/70 border-t border-slate-200/60 rounded-b-xl space-y-2.5">
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono tabular-nums">{formatCurrency(cartSubtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span>Diskon:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercent === 0 ? '' : discountPercent}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          onChange={(e) => setDiscountPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-12 px-1 py-0.5 text-xs bg-white/90 border border-slate-200 rounded-sm text-center font-mono"
                        />
                        <span>%</span>
                      </div>
                      <span className="font-mono tabular-nums text-emerald-600">
                        -{formatCurrency(discountAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200/60">
                      <span>Total Penjualan:</span>
                      <span className="font-mono tabular-nums text-amber-700">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Insufficient Stock Warning Banner inside cart summary */}
                  {hasInsufficientStock && (
                    <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Tidak dapat melanjutkan transaksi!</span>
                        <span>Ada item yang kuantitasnya melebihi stok tersedia. Mohon kurangi jumlah item.</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={hasInsufficientStock || cart.length === 0}
                    onClick={handleOpenCheckout}
                    className={`w-full py-3 font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all ${
                      hasInsufficientStock || cart.length === 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Lanjut Pembayaran ({formatCurrency(grandTotal)})</span>
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Floating Mobile Cart & Checkout Bar */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-16 left-3 right-3 z-40 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 no-print">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {cart.length}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-300 block">Total Keranjang:</span>
                <span className="text-sm font-bold font-mono text-amber-400 block truncate">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={hasInsufficientStock}
              onClick={handleOpenCheckout}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>Bayar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        </>
      ) : activeSubTab === 'po' ? (
        <PreOrderManagement
          preorders={preorders}
          items={items}
          customers={customers}
          userRole={userRole}
          storeProfile={storeProfile}
          onSavePreOrder={onSavePreOrder || (() => {})}
          onDeletePreOrder={onDeletePreOrder || (() => {})}
          onProcessPreOrderToSale={handleProcessPreOrderToSale}
          onGoToItemRegistration={onGoToItemRegistration}
          onSaveCustomer={onSaveCustomer}
        />
      ) : (
        /* RECENT SALES LIST VIEW WITH DAILY FILTER & PAGINATION */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Daftar & Riwayat Penjualan</h3>
              <p className="text-xs text-slate-500">Filter transaksi harian dan cetak ulang nota penjualan A4 / Thermal</p>
            </div>

            {/* Daily Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
                <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-600">Filter Tanggal:</span>
                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={(e) => {
                    setHistoryDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden"
                />
                {historyDateFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryDateFilter('');
                      setCurrentPage(1);
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Tampilkan Semua Tanggal"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Cari faktur / pelanggan..."
                  value={historySearchQuery}
                  onChange={(e) => {
                    setHistorySearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* MOBILE CARD VIEW FOR RECENT SALES */}
          <div className="block sm:hidden divide-y divide-slate-100 space-y-2">
            {paginatedSales.map((sale) => {
              const remaining = sale.remainingDebt !== undefined ? sale.remainingDebt : Math.max(0, sale.grandTotal - (sale.amountPaid || 0));
              const isLunas = remaining === 0 || sale.paymentStatus === 'Lunas';

              return (
                <div key={sale.id} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className="font-mono font-bold text-slate-900 block">{sale.invoiceNumber}</span>
                      <span className="text-[10px] text-slate-400">{formatDateTime(sale.date)}</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isLunas ? 'Lunas' : `Sisa: ${formatCurrency(remaining)}`}
                      </span>
                      <span className="text-[10px] block text-slate-500">{sale.paymentMethod}</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-800">{sale.customerName}</span>
                    
                    {/* Item List Per Baris (Mobile) */}
                    <div className="mt-2 space-y-1 bg-white p-2 rounded-lg border border-slate-200/80">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] py-0.5 border-b border-slate-100 last:border-b-0">
                          <div>
                            <span className="font-medium text-slate-800">{item.itemName}</span>
                            <span className="text-slate-400 text-[10px] block font-mono">
                              {formatNumber(item.quantity)} {item.unit} @ {formatNumber(item.sellPrice)}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Penjualan:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(sale.grandTotal)}</span>
                    </div>
                    <div className="text-right flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onPrintSale(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Cetak Struk</span>
                      </button>
                      {userRole === 'admin' && onDeleteSale && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Apakah Anda yakin ingin menghapus nota penjualan ${sale.invoiceNumber}?`)) {
                              onDeleteSale(sale.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-md cursor-pointer"
                          title="Hapus Transaksi Penjualan (Khusus Admin)"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {paginatedSales.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada transaksi penjualan yang cocok dengan filter.
              </div>
            )}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                  <th className="py-2.5 px-3">No. Faktur</th>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Pelanggan</th>
                  <th className="py-2.5 px-3 min-w-[280px]">Daftar Item Terjual</th>
                  <th className="py-2.5 px-3 text-right">Total Penjualan</th>
                  <th className="py-2.5 px-3 text-center">Status / Metode</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSales.map((sale) => {
                  const remaining = sale.remainingDebt !== undefined ? sale.remainingDebt : Math.max(0, sale.grandTotal - (sale.amountPaid || 0));
                  const isLunas = remaining === 0 || sale.paymentStatus === 'Lunas';

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{sale.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{formatDateTime(sale.date)}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{sale.customerName}</td>
                      
                      {/* Item list formatted cleanly per baris */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1 py-1 max-w-sm">
                          {sale.items.map((i, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 text-[11px] bg-slate-50/90 px-2 py-1 rounded border border-slate-200/60">
                              <span className="font-semibold text-slate-800 truncate">{i.itemName}</span>
                              <div className="text-slate-500 font-mono text-[10px] shrink-0">
                                <span className="font-medium text-slate-700">{formatNumber(i.quantity)} {i.unit}</span>
                                <span className="mx-1">×</span>
                                <span>{formatCurrency(i.sellPrice)}</span>
                                <span className="mx-1">=</span>
                                <span className="font-bold text-slate-900">{formatCurrency(i.subtotal)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 text-sm">{formatCurrency(sale.grandTotal)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="space-y-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold block ${
                            isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isLunas ? 'Lunas' : `Sisa: ${formatCurrency(remaining)}`}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {sale.paymentMethod}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPrintSale(sale)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
                            title="Cetak Nota / Struk"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Struk/A4</span>
                          </button>
                          {userRole === 'admin' && onDeleteSale && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Apakah Anda yakin ingin menghapus nota penjualan ${sale.invoiceNumber}?`)) {
                                  onDeleteSale(sale.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                              title="Hapus Transaksi Penjualan (Khusus Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginatedSales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ada transaksi penjualan yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {filteredSales.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 text-xs text-slate-600">
              <div>
                Menampilkan <span className="font-bold text-slate-900">{Math.min(filteredSales.length, (currentPage - 1) * itemsPerPage + 1)}</span> - <span className="font-bold text-slate-900">{Math.min(filteredSales.length, currentPage * itemsPerPage)}</span> dari <span className="font-bold text-slate-900">{filteredSales.length}</span> nota
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                    currentPage === 1
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50 hover:border-amber-400 cursor-pointer'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === pg
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                    currentPage === totalPages
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50 hover:border-amber-400 cursor-pointer'
                  }`}
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* CHECKOUT & PAYMENT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pembayaran Kasir Penjualan</h3>
                <p className="text-xs text-slate-500">Konfirmasi metode & status pembayaran nota</p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Total tagihan */}
            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-center">
              <span className="text-xs text-amber-800 font-medium">Total Penjualan:</span>
              <div className="text-2xl font-bold font-mono text-amber-900 mt-0.5">
                {formatCurrency(grandTotal)}
              </div>
              <div className="text-[11px] text-amber-700 mt-1">
                Pelanggan: <span className="font-semibold">{selectedCustomer.name}</span>
              </div>
            </div>

            {/* Status Pembayaran (Lunas vs Sebagian saja) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Status Pembayaran:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Lunas', label: 'Lunas Penuh' },
                  { id: 'Sebagian', label: 'Pembayaran Sebagian (DP)' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setPaymentStatus(st.id as SalePaymentStatus);
                      if (st.id === 'Lunas') {
                        setAmountPaidInput(grandTotal);
                      } else if (st.id === 'Sebagian') {
                        if (amountPaidInput === 0 || amountPaidInput >= grandTotal) {
                          setAmountPaidInput(Math.round(grandTotal / 2));
                        }
                      }
                    }}
                    className={`py-2 px-2 text-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      paymentStatus === st.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Metode Pembayaran (Tunai vs Transfer saja) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Metode Pembayaran:</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Tunai', 'Transfer'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                    }}
                    className={`py-2 px-2 text-center rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {method === 'Tunai' ? '💵 Tunai' : '🏦 Transfer Bank'}
                  </button>
                ))}
              </div>
            </div>

            {/* DETAIL DATA BANKING / REKENING JIKA PEMBAYARAN TRANSFER */}
            {paymentMethod === 'Transfer' && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5 text-xs text-sky-950">
                <div className="flex items-center gap-1.5 font-bold text-sky-900">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  <span>Detail Rekening Bank Tujuan Transfer:</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-sky-200 font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Bank:</span>
                    <span className="font-bold text-slate-900">{storeProfile.bankName || 'Bank BCA'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">No. Rekening:</span>
                    <span className="font-bold text-sky-700">{storeProfile.bankAccountNo || '7820-1199-88'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Atas Nama (A/N):</span>
                    <span className="font-bold text-slate-900">{storeProfile.bankAccountName || storeProfile.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Jika Pembayaran Sebagian (DP) */}
            {paymentStatus === 'Sebagian' && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>Input Nominal Pembayaran Sebagian (DP):</span>
                </div>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Masukkan nominal DP..."
                    value={amountPaidInput === 0 ? '' : amountPaidInput.toLocaleString('id-ID')}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                      setAmountPaidInput(raw === '' ? 0 : Math.min(grandTotal, parseFloat(raw) || 0));
                    }}
                    className="w-full text-base font-mono font-bold p-2 bg-white border border-amber-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white p-2 rounded-lg border border-amber-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">DP Diterima:</span>
                      <span className="text-xs font-bold font-mono text-emerald-700">{formatCurrency(actualAmountPaid)}</span>
                    </div>
                    <div className="bg-rose-50 p-2 rounded-lg border border-rose-200">
                      <span className="text-[10px] text-rose-700 uppercase font-semibold block">Sisa Piutang:</span>
                      <span className="text-xs font-bold font-mono text-rose-700">{formatCurrency(remainingReceivable)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-0.5">
                    *Sisa piutang sebesar {formatCurrency(remainingReceivable)} akan otomatis masuk ke Laporan Hutang Piutang.
                  </p>
                </div>
              </div>
            )}

            {/* Jika Lunas Tunai: Input Uang Diterima & Kembalian */}
            {paymentStatus === 'Lunas' && paymentMethod === 'Tunai' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Jumlah Uang Tunai Diterima:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Masukkan nominal uang tunai..."
                  value={amountPaidInput === 0 ? '' : amountPaidInput.toLocaleString('id-ID')}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                    setAmountPaidInput(raw === '' ? 0 : parseFloat(raw) || 0);
                  }}
                  className="w-full text-base font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />

                {/* Quick Cash Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleQuickCash(grandTotal)}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-md font-medium text-slate-700 cursor-pointer"
                  >
                    Uang Pas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(50000)}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-md font-medium text-slate-700 cursor-pointer"
                  >
                    50.000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(100000)}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-md font-medium text-slate-700 cursor-pointer"
                  >
                    100.000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(200000)}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-md font-medium text-slate-700 cursor-pointer"
                  >
                    200.000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(500000)}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-md font-medium text-slate-700 cursor-pointer"
                  >
                    500.000
                  </button>
                </div>

                {/* Kembalian */}
                <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg mt-2">
                  <span className="text-xs font-semibold text-slate-600">Kembalian:</span>
                  <span className="text-sm font-bold font-mono text-emerald-600">
                    {formatCurrency(change)}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs text-slate-600">Catatan Nota (Opsional):</label>
              <input
                type="text"
                placeholder="Contoh: Titip di warung, diambil jam 2 siang"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg mt-1"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="w-1/3 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={hasInsufficientStock}
                onClick={handleFinalizeSale}
                className="w-2/3 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesaikan & Cetak</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CUSTOMER REGISTRATION MODAL */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Registrasi Pelanggan Baru</h3>
                  <p className="text-[11px] text-slate-500">Daftarkan & langsung pilih untuk nota ini</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Pelanggan <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Warung Bu Sri / Bpk. Rudi"
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. WA / HP:</label>
                  <input
                    type="tel"
                    placeholder="08123456789"
                    value={quickCustPhone}
                    onChange={(e) => setQuickCustPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipe Pelanggan:</label>
                  <select
                    value={quickCustType}
                    onChange={(e) => setQuickCustType(e.target.value as CustomerType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Eceran">Eceran</option>
                    <option value="Grosir">Grosir</option>
                    <option value="Restoran / Rumah Makan">Restoran / Rumah Makan</option>
                    <option value="Katering">Katering</option>
                    <option value="Langganan">Langganan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Diponegoro No. 15"
                  value={quickCustAddress}
                  onChange={(e) => setQuickCustAddress(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Diskon Khusus Pelanggan (%):</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={quickCustDiscount === 0 ? '' : quickCustDiscount}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setQuickCustDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold pr-8 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Pilih</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
