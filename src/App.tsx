/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ActiveTab, 
  UserRole, 
  AuthUser,
  Item, 
  Supplier, 
  Customer, 
  PurchaseTransaction, 
  PurchasePaymentStatus,
  DebtPayment,
  SaleTransaction, 
  StockOpnameRecord, 
  Employee, 
  AttendanceRecord, 
  SalarySlip, 
  OperationalExpense, 
  OperationalTransaction,
  StoreProfile,
  ProcessedCalculationRecord,
  CustomerPreOrder,
  EmployeeKasbonRecord
} from './types/index.ts';
import { StorageManager, DEFAULT_USERS, SESSION_IDLE_TIMEOUT_MS, SESSION_WARNING_MS } from './utils/storage.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { KasirPOS } from './components/KasirPOS.tsx';
import { ItemManagement } from './components/ItemManagement.tsx';
import { StockOpname } from './components/StockOpname.tsx';
import { CustomerSupplierManagement } from './components/CustomerSupplierManagement.tsx';
import { AttendanceSalary } from './components/AttendanceSalary.tsx';
import { OperationalManagement } from './components/OperationalManagement.tsx';
import { FinancialReport } from './components/FinancialReport.tsx';
import { StoreSettings } from './components/StoreSettings.tsx';
import { PrintModal, PrintData } from './components/PrintModal.tsx';
import { ManualBookModal } from './components/ManualBookModal.tsx';
import { Menu, ShieldCheck, User as UserIcon, LogOut, CheckCircle2, X, Lock, Clock, AlertTriangle, BookOpen } from 'lucide-react';
import {
  COLLECTIONS,
  subscribeCollection,
  subscribeStoreProfile,
  syncSaveItem,
  syncDeleteItem,
  syncSaveSupplier,
  syncDeleteSupplier,
  syncSaveCustomer,
  syncDeleteCustomer,
  syncSavePurchase,
  syncSaveSale,
  syncDeleteSale,
  syncSavePreOrder,
  syncDeletePreOrder,
  syncSaveOpname,
  syncSaveEmployee,
  syncSaveAttendanceRecord,
  syncSaveSalarySlip,
  syncDeleteSalarySlip,
  syncSaveKasbon,
  syncDeleteKasbon,
  syncSaveExpense,
  syncSaveOperationalTransaction,
  syncDeleteOperationalTransaction,
  syncSaveStoreProfile,
  syncSaveUser,
  syncAllLocalToCloud
} from './firebase.ts';

export default function App() {
  // Authentication & Navigation
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = StorageManager.getCurrentUser();
    if (!saved) {
      const ownerUser = StorageManager.getUsers().find(u => u.role === 'owner') || DEFAULT_USERS[0];
      StorageManager.setCurrentUser(ownerUser);
      return ownerUser;
    }
    const allUsers = StorageManager.getUsers();
    const latest = allUsers.find(u => u.id === saved.id) || saved;
    // Permintaan user: "akun saya jadikan sebagai Owner"
    if (latest.role !== 'owner') {
      const promoted: AuthUser = {
        ...latest,
        role: 'owner',
        roleLabel: 'Owner (Full Hak Akses)',
      };
      StorageManager.setCurrentUser(promoted);
      StorageManager.updateUser(promoted);
      return promoted;
    }
    return latest;
  });
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [preselectedOpnameItemId, setPreselectedOpnameItemId] = useState<string | undefined>(undefined);
  const [isManualBookOpen, setIsManualBookOpen] = useState(false);

  // App State Loaded from LocalStorage & Synchronized via Realtime Firestore
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(() => StorageManager.getStoreProfile());
  const [items, setItems] = useState<Item[]>(() => StorageManager.getItems());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => StorageManager.getSuppliers());
  const [customers, setCustomers] = useState<Customer[]>(() => StorageManager.getCustomers());
  const [purchases, setPurchases] = useState<PurchaseTransaction[]>(() => StorageManager.getPurchases());
  const [sales, setSales] = useState<SaleTransaction[]>(() => StorageManager.getSales());
  const [preorders, setPreorders] = useState<CustomerPreOrder[]>(() => StorageManager.getPreOrders());
  const [opnameRecords, setOpnameRecords] = useState<StockOpnameRecord[]>(() => StorageManager.getOpnameRecords());
  const [employees, setEmployees] = useState<Employee[]>(() => StorageManager.getEmployees());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => StorageManager.getAttendance());
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>(() => StorageManager.getSalarySlips());
  const [kasbonRecords, setKasbonRecords] = useState<EmployeeKasbonRecord[]>(() => StorageManager.getKasbonRecords());
  const [expenses, setExpenses] = useState<OperationalExpense[]>(() => StorageManager.getExpenses());
  const [operationalTransactions, setOperationalTransactions] = useState<OperationalTransaction[]>(() => StorageManager.getOperationalTransactions());
  const [processedCalcs, setProcessedCalcs] = useState<ProcessedCalculationRecord[]>(() => StorageManager.getProcessedCalcs());

  const handleSaveProcessedCalc = (record: ProcessedCalculationRecord) => {
    const updated = [record, ...processedCalcs];
    setProcessedCalcs(updated);
    StorageManager.saveProcessedCalcs(updated);
    showToast(`Riwayat perhitungan keuntungan dari ${record.source} berhasil disimpan!`);
  };

  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const handleSyncToCloud = async () => {
    setIsSyncingCloud(true);
    const res = await syncAllLocalToCloud({
      items,
      suppliers,
      customers,
      purchases,
      sales,
      preorders,
      opnames: opnameRecords,
      employees,
      attendance: attendanceRecords,
      salarySlips,
      expenses,
      operationalTxs: operationalTransactions,
      storeProfile,
      users: StorageManager.getUsers(),
    });
    setIsSyncingCloud(false);
    if (res.success) {
      showToast(`Berhasil menyinkronkan ${res.count} data ke Cloud Firebase! Link share sekarang menampilkan data yang sama.`);
    } else {
      showToast(`Gagal sinkron: ${res.error}`);
    }
  };

  // Subscribe to Realtime Firestore updates across all clients
  useEffect(() => {
    const unsubItems = subscribeCollection<Item>(COLLECTIONS.ITEMS, (data) => {
      if (data && data.length > 0) {
        setItems(data);
        StorageManager.saveItems(data);
      } else {
        // If Firestore is empty, auto-upload local seed/current data so other devices receive it
        const localItems = StorageManager.getItems();
        if (localItems && localItems.length > 0) {
          syncAllLocalToCloud({
            items: localItems,
            suppliers: StorageManager.getSuppliers(),
            customers: StorageManager.getCustomers(),
            purchases: StorageManager.getPurchases(),
            sales: StorageManager.getSales(),
            opnames: StorageManager.getOpnameRecords(),
            employees: StorageManager.getEmployees(),
            attendance: StorageManager.getAttendance(),
            salarySlips: StorageManager.getSalarySlips(),
            expenses: StorageManager.getExpenses(),
            operationalTxs: StorageManager.getOperationalTransactions(),
            storeProfile: StorageManager.getStoreProfile(),
            users: StorageManager.getUsers(),
          });
        }
      }
    });

    const unsubSuppliers = subscribeCollection<Supplier>(COLLECTIONS.SUPPLIERS, (data) => {
      if (data && data.length > 0) {
        setSuppliers(data);
        StorageManager.saveSuppliers(data);
      }
    });

    const unsubCustomers = subscribeCollection<Customer>(COLLECTIONS.CUSTOMERS, (data) => {
      if (data && data.length > 0) {
        setCustomers(data);
        StorageManager.saveCustomers(data);
      }
    });

    const unsubPurchases = subscribeCollection<PurchaseTransaction>(COLLECTIONS.PURCHASES, (data) => {
      if (data && data.length > 0) {
        setPurchases(data);
        StorageManager.savePurchases(data);
      }
    });

    const unsubSales = subscribeCollection<SaleTransaction>(COLLECTIONS.SALES, (data) => {
      if (data && data.length > 0) {
        setSales(data);
        StorageManager.saveSales(data);
      }
    });

    const unsubPreorders = subscribeCollection<CustomerPreOrder>(COLLECTIONS.PREORDERS, (data) => {
      if (data && data.length > 0) {
        setPreorders(data);
        StorageManager.savePreOrders(data);
      }
    });

    const unsubOpnames = subscribeCollection<StockOpnameRecord>(COLLECTIONS.OPNAMES, (data) => {
      if (data && data.length > 0) {
        setOpnameRecords(data);
        StorageManager.saveOpnameRecords(data);
      }
    });

    const unsubEmployees = subscribeCollection<Employee>(COLLECTIONS.EMPLOYEES, (data) => {
      if (data && data.length > 0) {
        setEmployees(data);
        StorageManager.saveEmployees(data);
      }
    });

    const unsubAttendance = subscribeCollection<AttendanceRecord>(COLLECTIONS.ATTENDANCE, (data) => {
      if (data && data.length > 0) {
        setAttendanceRecords(data);
        StorageManager.saveAttendance(data);
      }
    });

    const unsubSalarySlips = subscribeCollection<SalarySlip>(COLLECTIONS.SALARY_SLIPS, (data) => {
      if (data && data.length > 0) {
        setSalarySlips(data);
        StorageManager.saveSalarySlips(data);
      }
    });

    const unsubKasbon = subscribeCollection<EmployeeKasbonRecord>(COLLECTIONS.KASBON, (data) => {
      if (data && data.length > 0) {
        setKasbonRecords(data);
        StorageManager.saveKasbonRecords(data);
      }
    });

    const unsubExpenses = subscribeCollection<OperationalExpense>(COLLECTIONS.EXPENSES, (data) => {
      if (data && data.length > 0) {
        setExpenses(data);
        StorageManager.saveExpenses(data);
      }
    });

    const unsubOperationalTxs = subscribeCollection<OperationalTransaction>(COLLECTIONS.OPERATIONAL_TXS, (data) => {
      if (data && data.length > 0) {
        setOperationalTransactions(data);
        StorageManager.saveOperationalTransactions(data);
      }
    });

    const unsubProfile = subscribeStoreProfile((data) => {
      if (data) {
        setStoreProfile(data);
        StorageManager.saveStoreProfile(data);
      }
    });

    const unsubUsers = subscribeCollection<AuthUser>(COLLECTIONS.USERS, (data) => {
      if (data && data.length > 0) {
        StorageManager.saveUsers(data);
        const currentSaved = StorageManager.getCurrentUser();
        if (currentSaved) {
          const fresh = data.find(u => u.id === currentSaved.id);
          if (fresh) {
            setCurrentUser(fresh);
            StorageManager.setCurrentUser(fresh);
          }
        }
      }
    });

    return () => {
      unsubItems();
      unsubSuppliers();
      unsubCustomers();
      unsubPurchases();
      unsubSales();
      unsubPreorders();
      unsubOpnames();
      unsubEmployees();
      unsubAttendance();
      unsubSalarySlips();
      unsubKasbon();
      unsubExpenses();
      unsubOperationalTxs();
      unsubProfile();
      unsubUsers();
    };
  }, []);

  // Background sync to PostgreSQL database
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/sql/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customers,
          suppliers,
          sales,
          purchases,
          employees,
          attendance: attendanceRecords,
          salarySlips,
          operationalTxs: operationalTransactions,
          opnames: opnameRecords,
          profile: storeProfile,
          users: StorageManager.getUsers(),
          kasbon: kasbonRecords,
        }),
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [items, customers, suppliers, sales, purchases, employees, attendanceRecords, salarySlips, operationalTransactions, opnameRecords, storeProfile, kasbonRecords]);

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<PrintData | null>(null);

  // Handle Public Nota Link (e.g. ?nota=INV-20261029-4356 from WhatsApp)
  const [publicNotaParam] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('nota');
    }
    return null;
  });

  useEffect(() => {
    if (publicNotaParam && sales.length > 0) {
      const cleanNota = publicNotaParam.trim().toLowerCase();
      const foundSale = sales.find(s => s.invoiceNumber.trim().toLowerCase() === cleanNota);
      if (foundSale) {
        setPrintData({ type: 'sale', data: foundSale });
        setIsPrintModalOpen(true);
      }
    }
  }, [publicNotaParam, sales]);

  // Floating Toast Notification System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Lock Screen & Session Actions
  const handleLockScreen = () => {
    StorageManager.clearSession();
    setCurrentUser(null);
    setIdleWarningSeconds(null);
    setSessionMessage('Layar berhasil dikunci demi keamanan kasir. Masukkan username dan password kembali untuk melanjutkan.');
  };

  const handleKeepSessionAlive = () => {
    StorageManager.updateLastActivity();
    setIdleWarningSeconds(null);
    showToast('Sesi kasir diperpanjang. Selamat melanjutkan pekerjaan!');
  };

  // Save current user on change
  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    StorageManager.setCurrentUser(user);
    syncSaveUser(user);
    setSessionMessage(null);
    setIdleWarningSeconds(null);
    setActiveTab('pos');
    showToast(`Selamat datang, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    StorageManager.clearSession();
    setIdleWarningSeconds(null);
    setSessionMessage('Anda telah keluar dari akun kasir. Silakan login kembali.');
  };

  // Inactivity Auto-Kick Tracker: 30 menit kick, 28 menit countdown warning
  useEffect(() => {
    if (!currentUser) return;

    if (!StorageManager.getLastActivity()) {
      StorageManager.updateLastActivity();
    }

    let lastThrottle = Date.now();
    const onUserActivity = () => {
      const now = Date.now();
      // Throttle update aktivitas maksimal tiap 5 detik untuk efisiensi
      if (now - lastThrottle > 5000) {
        lastThrottle = now;
        StorageManager.updateLastActivity();
        if (idleWarningSeconds !== null) {
          setIdleWarningSeconds(null);
        }
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(evt => window.addEventListener(evt, onUserActivity, { passive: true }));

    const timer = setInterval(() => {
      const lastAct = StorageManager.getLastActivity();
      if (!lastAct) return;
      const elapsed = Date.now() - lastAct;

      if (elapsed >= SESSION_IDLE_TIMEOUT_MS) {
        // Auto-kick triggered
        StorageManager.clearSession();
        setCurrentUser(null);
        setIdleWarningSeconds(null);
        setSessionMessage('Sesi Anda telah berakhir otomatis karena tidak ada aktivitas selama 30 menit. Silakan login kembali dengan username dan password demi keamanan.');
      } else if (elapsed >= SESSION_WARNING_MS) {
        const remaining = Math.max(0, Math.ceil((SESSION_IDLE_TIMEOUT_MS - elapsed) / 1000));
        setIdleWarningSeconds(remaining);
      } else {
        setIdleWarningSeconds(null);
      }
    }, 1000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, onUserActivity));
      clearInterval(timer);
    };
  }, [currentUser, idleWarningSeconds]);

  const isOwner = currentUser?.role === 'owner' || currentUser?.username?.toLowerCase() === 'owner';
  const isAdmin = isOwner || currentUser?.role === 'admin';
  const isKasir = !isAdmin;

  // Guard tabs based on user role (Owner: full, Admin: except laporan & pengaturan, Kasir: as is)
  useEffect(() => {
    if (!currentUser) return;

    if (isKasir) {
      if (['operasional', 'absensi_gaji', 'laporan', 'pengaturan'].includes(activeTab)) {
        setActiveTab('pos');
      }
    } else if (!isOwner) {
      // Admin: semua dibuka KECUALI laporan dan pengaturan
      if (['laporan', 'pengaturan'].includes(activeTab)) {
        setActiveTab('pos');
      }
    }
  }, [currentUser, activeTab, isOwner, isKasir]);

  // Pending opname count
  const pendingOpnameCount = useMemo(() => {
    return opnameRecords.filter(r => r.status === 'Pending').length;
  }, [opnameRecords]);

  // 1. Complete Sale: Deduct stock & save transaction to Firestore & LocalStorage
  const handleCompleteSale = (newSale: SaleTransaction) => {
    const updatedItems = items.map((item) => {
      const soldItem = newSale.items.find((si) => si.itemId === item.id);
      if (soldItem) {
        const remainingStock = Math.max(0, Number((item.currentStock - soldItem.quantity).toFixed(2)));
        const updated = {
          ...item,
          currentStock: remainingStock,
          updatedAt: new Date().toISOString(),
        };
        syncSaveItem(updated);
        return updated;
      }
      return item;
    });

    const updatedSales = [newSale, ...sales];
    setItems(updatedItems);
    setSales(updatedSales);
    StorageManager.saveItems(updatedItems);
    StorageManager.saveSales(updatedSales);
    syncSaveSale(newSale);

    let finalSalesList = updatedSales;
    // Jika customer membayar lunas total barang + hutang, tandai nota-nota lama sebagai lunas
    if (newSale.previousDebt && newSale.previousDebt > 0 && newSale.amountPaid >= (newSale.grandTotal + newSale.previousDebt)) {
      finalSalesList = updatedSales.map(s => {
        if (s.id !== newSale.id && (s.customerId === newSale.customerId || s.customerName.toLowerCase() === newSale.customerName.toLowerCase())) {
          if (s.remainingDebt && s.remainingDebt > 0) {
            const updatedOld = {
              ...s,
              remainingDebt: 0,
              paymentStatus: 'Lunas' as const,
            };
            syncSaveSale(updatedOld);
            return updatedOld;
          }
        }
        return s;
      });
      setSales(finalSalesList);
      StorageManager.saveSales(finalSalesList);
    }

    // Update customer deposit / tabungan balance
    if (newSale.customerId || newSale.customerName) {
      const updatedCustomers = customers.map(c => {
        const matchesId = Boolean(newSale.customerId && c.id === newSale.customerId);
        const matchesName = Boolean(newSale.customerName && c.name.toLowerCase().trim() === newSale.customerName.toLowerCase().trim());
        if (matchesId || matchesName) {
          const finalDeposit = newSale.customerDepositBalance !== undefined
            ? Math.max(0, newSale.customerDepositBalance)
            : ((c.depositBalance || 0) + (newSale.overpaymentAmount || 0));
          const updatedCust = {
            ...c,
            depositBalance: finalDeposit,
          };
          syncSaveCustomer(updatedCust);
          return updatedCust;
        }
        return c;
      });
      setCustomers(updatedCustomers);
      StorageManager.saveCustomers(updatedCustomers);
    }

    showToast(`Penjualan ${newSale.invoiceNumber} berhasil disimpan & tersinkronisasi!`);
    
    // Auto-record operational transaction
    if (newSale.amountPaid && newSale.amountPaid > 0) {
      handleSaveOperationalTransaction({
        id: `optx-${Date.now()}-sale-${newSale.invoiceNumber}`,
        date: newSale.date,
        type: 'pendapatan',
        description: `Penjualan Nota: ${newSale.invoiceNumber}`,
        amount: newSale.amountPaid,
        recordedBy: 'Sistem Kasir',
        createdAt: new Date().toISOString(),
      });
    }
  };

  // 2. Complete Purchase: Increase stock, update baseBuyPrice & sellPrice, and save transaction
  const handleCompletePurchase = (newPurchase: PurchaseTransaction) => {
    const updatedItems = items.map((item) => {
      const boughtItem = newPurchase.items.find((pi) => pi.itemId === item.id);
      if (boughtItem) {
        const addedStock = Number((item.currentStock + boughtItem.quantity).toFixed(2));
        // Otomatis update harga jual item jika harga jual diisi saat pembelian
        const updatedSellPrice = (boughtItem.targetSellPrice && boughtItem.targetSellPrice > 0)
          ? boughtItem.targetSellPrice
          : item.sellPrice;

        const updated = {
          ...item,
          currentStock: addedStock,
          baseBuyPrice: boughtItem.effectiveHPP || boughtItem.buyPrice,
          sellPrice: updatedSellPrice,
          updatedAt: new Date().toISOString(),
        };
        syncSaveItem(updated);
        return updated;
      }
      return item;
    });

    const updatedPurchases = [newPurchase, ...purchases];
    setItems(updatedItems);
    setPurchases(updatedPurchases);
    StorageManager.saveItems(updatedItems);
    StorageManager.savePurchases(updatedPurchases);
    syncSavePurchase(newPurchase);

    showToast(`Pembelian ${newPurchase.invoiceNumber} berhasil disimpan & harga jual produk diperbarui!`);
  };

  // 2b. Pay Purchase Debt / Installment
  const handlePayDebt = (purchaseId: string, payment: DebtPayment) => {
    let targetPurchase: PurchaseTransaction | undefined;
    const updatedPurchases = purchases.map((p) => {
      if (p.id === purchaseId) {
        const currentPaid = p.amountPaid !== undefined ? p.amountPaid : (p.paymentStatus === 'Lunas' ? p.grandTotal : 0);
        const currentDebt = p.remainingDebt !== undefined ? p.remainingDebt : Math.max(0, p.grandTotal - currentPaid);
        const newPaid = currentPaid + payment.amount;
        const newDebt = Math.max(0, currentDebt - payment.amount);
        const newStatus: PurchasePaymentStatus = newDebt === 0 ? 'Lunas' : 'Sebagian';
        const existingPayments = p.debtPayments || [];

        targetPurchase = {
          ...p,
          amountPaid: newPaid,
          remainingDebt: newDebt,
          paymentStatus: newStatus,
          debtPayments: [...existingPayments, payment],
        };
        return targetPurchase;
      }
      return p;
    });

    if (targetPurchase) {
      syncSavePurchase(targetPurchase);
      // Auto-record operational transaction
      handleSaveOperationalTransaction({
        id: `optx-${Date.now()}-debt-pay-${purchaseId}`,
        date: payment.date.substring(0, 10),
        type: 'pengeluaran',
        description: `Pembayaran Utang Supplier (Faktur: ${targetPurchase.invoiceNumber})`,
        amount: payment.amount,
        recordedBy: payment.recordedBy,
        createdAt: new Date().toISOString(),
      });
    }
    setPurchases(updatedPurchases);
    StorageManager.savePurchases(updatedPurchases);
    showToast(`Pembayaran utang Rp ${payment.amount.toLocaleString('id-ID')} berhasil disimpan!`);
  };

  // 2c. Pay Customer Debt / Receivable Installment
  const handlePayCustomerDebt = (saleId: string, payment: DebtPayment) => {
    let targetSale: SaleTransaction | undefined;
    const updatedSales = sales.map((s) => {
      if (s.id === saleId) {
        const currentPaid = s.amountPaid || 0;
        const newPaid = currentPaid + payment.amount;
        const newRemaining = Math.max(0, s.grandTotal - newPaid);
        const newStatus = newRemaining === 0 ? 'Lunas' : 'Sebagian';
        const existingPayments = s.customerDebtPayments || [];

        targetSale = {
          ...s,
          amountPaid: newPaid,
          remainingDebt: newRemaining,
          paymentStatus: newStatus,
          customerDebtPayments: [...existingPayments, payment],
        };
        return targetSale;
      }
      return s;
    });

    if (targetSale) {
      syncSaveSale(targetSale);
      // Auto-record operational transaction
      handleSaveOperationalTransaction({
        id: `optx-${Date.now()}-rec-pay-${saleId}`,
        date: payment.date.substring(0, 10),
        type: 'pendapatan',
        description: `Penerimaan Piutang Pelanggan (Faktur: ${targetSale.invoiceNumber})`,
        amount: payment.amount,
        recordedBy: payment.recordedBy,
        createdAt: new Date().toISOString(),
      });
    }
    setSales(updatedSales);
    StorageManager.saveSales(updatedSales);
    showToast(`Penerimaan piutang Rp ${payment.amount.toLocaleString('id-ID')} berhasil dicatat!`);
  };

  const handleDeleteSale = (saleId: string) => {
    const targetSale = sales.find((s) => s.id === saleId);
    const updatedSales = sales.filter((s) => s.id !== saleId);
    setSales(updatedSales);
    StorageManager.saveSales(updatedSales);
    syncDeleteSale(saleId);
    showToast(`Nota penjualan ${targetSale ? targetSale.invoiceNumber : ''} berhasil dihapus.`);
  };

  const handleSavePreOrder = (po: CustomerPreOrder) => {
    const exists = preorders.some((p) => p.id === po.id);
    const updated = exists ? preorders.map((p) => (p.id === po.id ? po : p)) : [po, ...preorders];
    setPreorders(updated);
    StorageManager.savePreOrders(updated);
    syncSavePreOrder(po);
    showToast(`Voucher pesanan ${po.poNumber} (${po.customerName}) berhasil disimpan!`);
  };

  const handleDeletePreOrder = (id: string) => {
    const target = preorders.find((p) => p.id === id);
    const updated = preorders.filter((p) => p.id !== id);
    setPreorders(updated);
    StorageManager.savePreOrders(updated);
    syncDeletePreOrder(id);
    showToast(`Voucher pesanan ${target ? target.poNumber : ''} berhasil dihapus.`);
  };

  // 3. Save Item (Create/Update)
  const handleSaveItem = (itemToSave: Item) => {
    const exists = items.some((i) => i.id === itemToSave.id);
    let updated: Item[];
    if (exists) {
      updated = items.map((i) => (i.id === itemToSave.id ? itemToSave : i));
    } else {
      updated = [itemToSave, ...items];
    }
    setItems(updated);
    StorageManager.saveItems(updated);
    syncSaveItem(itemToSave);
    showToast(`Data produk ${itemToSave.name} berhasil disimpan!`);
  };

  // 4. Delete Item
  const handleDeleteItem = (itemId: string) => {
    const updated = items.filter((i) => i.id !== itemId);
    setItems(updated);
    StorageManager.saveItems(updated);
    syncDeleteItem(itemId);
    showToast('Item berhasil dihapus.');
  };

  // 5. Submit Opname
  const handleSubmitOpname = (record: StockOpnameRecord) => {
    if (record.status === 'Approved') {
      const updatedItems = items.map((item) => {
        if (item.id === record.itemId) {
          const updatedItem = {
            ...item,
            currentStock: record.physicalStock,
            updatedAt: new Date().toISOString(),
          };
          syncSaveItem(updatedItem);
          return updatedItem;
        }
        return item;
      });
      setItems(updatedItems);
      StorageManager.saveItems(updatedItems);
    }

    const updatedOpnames = [record, ...opnameRecords];
    setOpnameRecords(updatedOpnames);
    StorageManager.saveOpnameRecords(updatedOpnames);
    syncSaveOpname(record);

    showToast('Stok fisik berhasil disesuaikan & tersinkronisasi!');
  };

  // 6. Customers & Suppliers
  const handleSaveCustomer = (customer: Customer) => {
    const exists = customers.some((c) => c.id === customer.id);
    const updated = exists ? customers.map((c) => (c.id === customer.id ? customer : c)) : [customer, ...customers];
    setCustomers(updated);
    StorageManager.saveCustomers(updated);
    syncSaveCustomer(customer);
    showToast(`Data pelanggan ${customer.name} berhasil disimpan!`);
  };

  const handleDeleteCustomer = (id: string) => {
    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    StorageManager.saveCustomers(updated);
    syncDeleteCustomer(id);
    showToast('Pelanggan berhasil dihapus.');
  };

  const handleSaveSupplier = (supplier: Supplier) => {
    const exists = suppliers.some((s) => s.id === supplier.id);
    const updated = exists ? suppliers.map((s) => (s.id === supplier.id ? supplier : s)) : [supplier, ...suppliers];
    setSuppliers(updated);
    StorageManager.saveSuppliers(updated);
    syncSaveSupplier(supplier);
    showToast(`Data pemasok ${supplier.name} berhasil disimpan!`);
  };

  const handleDeleteSupplier = (id: string) => {
    const updated = suppliers.filter((s) => s.id !== id);
    setSuppliers(updated);
    StorageManager.saveSuppliers(updated);
    syncDeleteSupplier(id);
    showToast('Pemasok berhasil dihapus.');
  };

  // 7. Attendance
  const handleSaveAttendance = (newDailyRecords: AttendanceRecord[]) => {
    const date = newDailyRecords[0]?.date;
    const filtered = attendanceRecords.filter((r) => r.date !== date);
    const updated = [...newDailyRecords, ...filtered];
    setAttendanceRecords(updated);
    StorageManager.saveAttendance(updated);
    newDailyRecords.forEach(r => syncSaveAttendanceRecord(r));
    showToast('Data absensi harian dan upah berhasil disimpan ke sistem!');
  };

  // 8. Weekly Salary Slip
  const handleGenerateSalarySlip = (newSlip: SalarySlip) => {
    const updated = [newSlip, ...salarySlips];
    setSalarySlips(updated);
    StorageManager.saveSalarySlips(updated);
    syncSaveSalarySlip(newSlip);
    showToast(`Slip gaji ${newSlip.slipNumber} untuk ${newSlip.employeeName} berhasil diterbitkan!`);
  };

  const handleDeleteSalarySlip = (slipId: string) => {
    const target = salarySlips.find((s) => s.id === slipId);
    const updated = salarySlips.filter((s) => s.id !== slipId);
    setSalarySlips(updated);
    StorageManager.saveSalarySlips(updated);
    syncDeleteSalarySlip(slipId);

    // If this slip had associated kasbon payment, remove that kasbon payment record too so employee active kasbon is restored!
    const relatedKasbon = kasbonRecords.filter((k) => k.salarySlipId === slipId);
    if (relatedKasbon.length > 0) {
      const updatedKasbon = kasbonRecords.filter((k) => k.salarySlipId !== slipId);
      setKasbonRecords(updatedKasbon);
      StorageManager.saveKasbonRecords(updatedKasbon);
      relatedKasbon.forEach((k) => syncDeleteKasbon(k.id));
    }

    showToast(`Slip gaji ${target ? target.slipNumber : ''} berhasil dihapus.`);
  };

  // 8b. Kasbon (Employee Loan) Handlers
  const handleSaveKasbon = (record: EmployeeKasbonRecord) => {
    const exists = kasbonRecords.some((k) => k.id === record.id);
    const updated = exists ? kasbonRecords.map((k) => (k.id === record.id ? record : k)) : [record, ...kasbonRecords];
    setKasbonRecords(updated);
    StorageManager.saveKasbonRecords(updated);
    syncSaveKasbon(record);
    showToast(`Catatan kasbon ${record.employeeName} (${record.type === 'pinjam' ? 'Pinjaman Baru' : 'Pelunasan'}) berhasil disimpan!`);
  };

  const handleDeleteKasbon = (id: string) => {
    const updated = kasbonRecords.filter((k) => k.id !== id);
    setKasbonRecords(updated);
    StorageManager.saveKasbonRecords(updated);
    syncDeleteKasbon(id);
    showToast('Catatan kasbon berhasil dihapus.');
  };

  // 9. Employee
  const handleSaveEmployee = (emp: Employee) => {
    const exists = employees.some((e) => e.id === emp.id);
    const updated = exists ? employees.map((e) => (e.id === emp.id ? emp : e)) : [emp, ...employees];
    setEmployees(updated);
    StorageManager.saveEmployees(updated);
    syncSaveEmployee(emp);
    showToast(`Data karyawan ${emp.name} berhasil disimpan!`);
  };

  // 10. Operational Expenses & Manual Cash Transactions
  const handleAddExpense = (expense: OperationalExpense) => {
    const updated = [expense, ...expenses];
    setExpenses(updated);
    StorageManager.saveExpenses(updated);
    syncSaveExpense(expense);
    showToast('Pengeluaran operasional berhasil dicatat.');
  };

  const handleSaveOperationalTransaction = (tx: OperationalTransaction) => {
    const updated = [tx, ...operationalTransactions];
    setOperationalTransactions(updated);
    StorageManager.saveOperationalTransactions(updated);
    syncSaveOperationalTransaction(tx);
    showToast(`Transaksi kas (${tx.type === 'pendapatan' ? 'Uang Masuk' : 'Uang Keluar'}) berhasil disimpan!`);
  };

  const handleDeleteOperationalTransaction = (txId: string) => {
    const updated = operationalTransactions.filter(t => t.id !== txId);
    setOperationalTransactions(updated);
    StorageManager.saveOperationalTransactions(updated);
    syncDeleteOperationalTransaction(txId);
    showToast('Pencatatan kas berhasil dihapus.');
  };

  // 11. Store Profile
  const handleUpdateStoreProfile = (profile: StoreProfile) => {
    setStoreProfile(profile);
    StorageManager.saveStoreProfile(profile);
    syncSaveStoreProfile(profile);
    showToast('Profil usaha dan logo berhasil diperbarui!');
  };

  // 12. Reset Data
  const handleResetData = () => {
    StorageManager.resetAllData();
    window.location.reload();
  };

  // Print Handlers
  const handlePrintSale = (sale: SaleTransaction) => {
    setPrintData({ type: 'sale', data: sale });
    setIsPrintModalOpen(true);
  };

  const handlePrintPurchase = (purchase: PurchaseTransaction) => {
    setPrintData({ type: 'purchase', data: purchase });
    setIsPrintModalOpen(true);
  };

  const handlePrintSalarySlip = (slip: SalarySlip) => {
    setPrintData({ type: 'salary', data: slip });
    setIsPrintModalOpen(true);
  };

  const handleGoToOpname = (itemId?: string) => {
    setPreselectedOpnameItemId(itemId);
    setActiveTab('opname');
  };

  // If user is not logged in, show clean dedicated Login page
  if (!currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
        storeProfile={storeProfile}
      />
    );
  }

  const tabTitles: Record<ActiveTab, string> = {
    pos: 'Nota',
    produk: 'Item',
    opname: 'Stok Opname',
    kontak: 'Supplier & Pelanggan',
    operasional: 'Operasional & Kas',
    absensi_gaji: 'Absensi & Gaji',
    laporan: 'Laporan Keuangan',
    pengaturan: 'Pengaturan',
  };

  return (
    <div className="min-h-screen relative flex text-slate-800 font-sans overflow-x-hidden max-w-full w-full bg-slate-100">
      
      {/* SOFT BRIGHT GLASSMORPHISM BACKGROUND */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-slate-100 via-amber-50/60 to-orange-50/40 pointer-events-none transition-all duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-200/35 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-orange-200/25 via-transparent to-transparent" />
      </div>

      {/* FLOATING IN-UI TOAST BANNER */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700/80 flex items-center gap-3 text-xs animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* IDLE WARNING MODAL (28 menit tidak aktif, 2 menit countdown sebelum kick) */}
      {idleWarningSeconds !== null && idleWarningSeconds > 0 && currentUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">Peringatan: Sesi Tidak Aktif</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tidak ada aktivitas selama 28 menit</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
              <p className="leading-relaxed">
                Demi menjaga keamanan data transaksi dan mencegah penyalahgunaan kasir oleh orang lain, sistem akan otomatis melakukan <span className="font-bold text-amber-950">Auto-Kick</span> dalam:
              </p>
              <div className="text-center py-2">
                <span className="font-mono text-3xl font-black text-amber-700 tracking-wider">
                  {idleWarningSeconds} detik
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                Klik tombol di bawah atau gerakkan kursor untuk memperpanjang sesi kerja Anda.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleLockScreen}
                className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Kunci Sekarang</span>
              </button>
              <button
                type="button"
                onClick={handleKeepSessionAlive}
                className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tetap Masuk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onLockScreen={handleLockScreen}
        onOpenManualBook={() => setIsManualBookOpen(true)}
        storeName={storeProfile.name}
        logoUrl={storeProfile.logoUrl || '/logo_unggas.svg'}
        pendingOpnameCount={pendingOpnameCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* MAIN VIEWPORT WITH LEFT PADDING FOR SIDEBAR ON DESKTOP */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 z-10 relative overflow-x-hidden max-w-full w-full">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/75 backdrop-blur-md border-b border-white/60 shadow-xs no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Buka Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <img 
                  src={storeProfile.logoUrl || '/logo_unggas.svg'} 
                  alt="Logo" 
                  className="w-7 h-7 rounded-lg object-contain bg-amber-50 p-0.5 border border-amber-200" 
                />
                <div>
                  <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-tight">
                    {tabTitles[activeTab]}
                  </h1>
                  <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                    {storeProfile.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Right Content (Tanpa tombol duplikat) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs shadow-2xs">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold truncate max-w-[150px]">{currentUser.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
          
          {/* TAB 1: KASIR POINT OF SALE (POS) */}
          {activeTab === 'pos' && (
            <KasirPOS
              items={items}
              customers={customers}
              recentSales={sales}
              onCompleteSale={handleCompleteSale}
              onPrintSale={handlePrintSale}
              userRole={currentUser.role}
              storeProfile={storeProfile}
              onSaveCustomer={handleSaveCustomer}
              onDeleteSale={handleDeleteSale}
              preorders={preorders}
              onSavePreOrder={handleSavePreOrder}
              onDeletePreOrder={handleDeletePreOrder}
              onGoToItemRegistration={() => setActiveTab('produk')}
              onPrintDocument={(data) => {
                setPrintData(data);
                setIsPrintModalOpen(true);
              }}
            />
          )}



          {/* TAB 3: MASTER DATA STOK AYAM */}
          {activeTab === 'produk' && (
            <ItemManagement
              items={items}
              suppliers={suppliers}
              processedCalcs={processedCalcs}
              onSaveItem={handleSaveItem}
              onDeleteItem={handleDeleteItem}
              onGoToOpname={handleGoToOpname}
              onSaveProcessedCalc={handleSaveProcessedCalc}
              onSaveSupplier={handleSaveSupplier}
              userRole={currentUser.role}
              userName={currentUser.name}
            />
          )}

          {/* TAB 4: STOK OPNAME */}
          {activeTab === 'opname' && (
            <StockOpname
              items={items}
              opnameRecords={opnameRecords}
              onSubmitOpname={handleSubmitOpname}
              preselectedItemId={preselectedOpnameItemId}
              userRole={currentUser.role}
              userName={currentUser.name}
            />
          )}

          {/* TAB 5: PEMASOK & CUSTOMER */}
          {activeTab === 'kontak' && (
            <CustomerSupplierManagement
              customers={customers}
              suppliers={suppliers}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onSaveSupplier={handleSaveSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              userRole={currentUser.role}
            />
          )}

          {/* TAB 6: OPERASIONAL & KAS (ADMIN ONLY) */}
          {(activeTab === 'operasional' || activeTab === 'absensi_gaji') && isAdmin && (
            <OperationalManagement
              operationalTransactions={operationalTransactions}
              onSaveTransaction={handleSaveOperationalTransaction}
              onDeleteTransaction={handleDeleteOperationalTransaction}
              employees={employees}
              attendanceRecords={attendanceRecords}
              salarySlips={salarySlips}
              kasbonRecords={kasbonRecords}
              onSaveAttendance={handleSaveAttendance}
              onGenerateSalarySlip={handleGenerateSalarySlip}
              onDeleteSalarySlip={handleDeleteSalarySlip}
              onPrintSalarySlip={handlePrintSalarySlip}
              onSaveEmployee={handleSaveEmployee}
              onSaveKasbon={handleSaveKasbon}
              onDeleteKasbon={handleDeleteKasbon}
              userRole={currentUser.role}
              storeName={storeProfile.name}
              sales={sales}
              purchases={purchases}
              onPrintDocument={(data) => {
                setPrintData(data);
                setIsPrintModalOpen(true);
              }}
            />
          )}

          {/* TAB 7: LAPORAN KEUANGAN BULANAN & HARIAN (OWNER ONLY) */}
          {activeTab === 'laporan' && isOwner && (
            <FinancialReport
              sales={sales}
              purchases={purchases}
              customers={customers}
              suppliers={suppliers}
              items={items}
              opnameRecords={opnameRecords}
              salarySlips={salarySlips}
              attendanceRecords={attendanceRecords}
              expenses={expenses}
              operationalTransactions={operationalTransactions}
              kasbonRecords={kasbonRecords}
              onAddExpense={handleAddExpense}
              onPayPurchaseDebt={handlePayDebt}
              onPayCustomerDebt={handlePayCustomerDebt}
              onPrintDocument={(data) => {
                setPrintData(data);
                setIsPrintModalOpen(true);
              }}
              storeProfile={storeProfile}
              userRole={currentUser.role}
              onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
            />
          )}
          {activeTab === 'laporan' && !isOwner && (
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-xl border border-white/60 shadow-xs text-center space-y-3 my-10 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
                🔒
              </div>
              <h3 className="text-base font-bold text-slate-900">Akses Laporan Dibatasi</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Halaman Laporan Keuangan & Hasil Omzet harian khusus hanya dapat diakses oleh <strong>Owner</strong>. Akun Admin dan Kasir tidak memiliki hak akses ke modul ini.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Kembali ke Kasir
              </button>
            </div>
          )}

          {/* TAB 8: PENGATURAN TOKO & USER (OWNER ONLY) */}
          {activeTab === 'pengaturan' && isOwner && (
            <StoreSettings
              storeProfile={storeProfile}
              onUpdateStoreProfile={handleUpdateStoreProfile}
              onResetData={handleResetData}
            />
          )}
          {activeTab === 'pengaturan' && !isOwner && (
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-xl border border-white/60 shadow-xs text-center space-y-3 my-10 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
                🔒
              </div>
              <h3 className="text-base font-bold text-slate-900">Akses Pengaturan Dibatasi</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Halaman Pengaturan Toko & Manajemen Akun khusus hanya dapat diakses oleh <strong>Owner</strong>. Akun Admin dan Kasir tidak diizinkan masuk ke halaman Pengaturan Toko.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Kembali ke Kasir
              </button>
            </div>
          )}

        </main>

      </div>

      {/* Universal Print Modal (A4 & Thermal 58mm/80mm) */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        printData={printData}
        storeProfile={storeProfile}
        customers={customers}
        suppliers={suppliers}
        employees={employees}
        attendanceRecords={attendanceRecords}
        sales={sales}
      />

      {/* Interactive Illustrated Manual Book Modal */}
      {currentUser && (
        <ManualBookModal
          isOpen={isManualBookOpen}
          onClose={() => setIsManualBookOpen(false)}
          onNavigateTab={(tab) => setActiveTab(tab)}
          userRole={currentUser.role}
        />
      )}

    </div>
  );
}
