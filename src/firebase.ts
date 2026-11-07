import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  Item, 
  Supplier, 
  Customer, 
  PurchaseTransaction, 
  SaleTransaction, 
  StockOpnameRecord, 
  Employee, 
  AttendanceRecord, 
  SalarySlip, 
  OperationalExpense, 
  OperationalTransaction,
  StoreProfile,
  AuthUser,
  CustomerPreOrder,
  EmployeeKasbonRecord
} from './types/index.ts';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Collection References
export const COLLECTIONS = {
  ITEMS: 'items',
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  PURCHASES: 'purchases',
  SALES: 'sales',
  PREORDERS: 'preorders',
  OPNAMES: 'opnames',
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  SALARY_SLIPS: 'salary_slips',
  KASBON: 'kasbon',
  EXPENSES: 'expenses',
  OPERATIONAL_TXS: 'operational_transactions',
  PROFILE: 'profile',
  USERS: 'users',
};

// Realtime subscriptions
export function subscribeCollection<T extends { id: string }>(
  collectionName: string, 
  onData: (items: T[]) => void
) {
  const colRef = collection(db, collectionName);
  return onSnapshot(colRef, (snapshot) => {
    const list: T[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as T);
    });
    onData(list);
  }, (err) => {
    console.error(`Firestore snapshot error on ${collectionName}:`, err);
  });
}

// Single Document profile listener
export function subscribeStoreProfile(onData: (profile: StoreProfile) => void) {
  const docRef = doc(db, COLLECTIONS.PROFILE, 'main');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      onData(snapshot.data() as StoreProfile);
    }
  }, (err) => {
    console.error('Firestore profile error:', err);
  });
}

// Helper to recursively strip undefined properties before writing to Firestore
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Fire-and-forget write helpers that sync with Firestore
export async function syncSaveItem(item: Item) {
  try {
    await setDoc(doc(db, COLLECTIONS.ITEMS, item.id), cleanForFirestore(item));
  } catch (err) {
    console.error('Firestore save item failed:', err);
  }
}

export async function syncDeleteItem(itemId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.ITEMS, itemId));
  } catch (err) {
    console.error('Firestore delete item failed:', err);
  }
}

export async function syncSaveSupplier(supplier: Supplier) {
  try {
    await setDoc(doc(db, COLLECTIONS.SUPPLIERS, supplier.id), cleanForFirestore(supplier));
  } catch (err) {
    console.error('Firestore save supplier failed:', err);
  }
}

export async function syncDeleteSupplier(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SUPPLIERS, id));
  } catch (err) {
    console.error('Firestore delete supplier failed:', err);
  }
}

export async function syncSaveCustomer(customer: Customer) {
  try {
    await setDoc(doc(db, COLLECTIONS.CUSTOMERS, customer.id), cleanForFirestore(customer));
  } catch (err) {
    console.error('Firestore save customer failed:', err);
  }
}

export async function syncDeleteCustomer(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, id));
  } catch (err) {
    console.error('Firestore delete customer failed:', err);
  }
}

export async function syncSavePurchase(purchase: PurchaseTransaction) {
  try {
    await setDoc(doc(db, COLLECTIONS.PURCHASES, purchase.id), cleanForFirestore(purchase));
  } catch (err) {
    console.error('Firestore save purchase failed:', err);
  }
}

export async function syncSaveSale(sale: SaleTransaction) {
  try {
    await setDoc(doc(db, COLLECTIONS.SALES, sale.id), cleanForFirestore(sale));
  } catch (err) {
    console.error('Firestore save sale failed:', err);
  }
}

export async function syncDeleteSale(saleId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SALES, saleId));
  } catch (err) {
    console.error('Firestore delete sale failed:', err);
  }
}

export async function syncSavePreOrder(po: CustomerPreOrder) {
  try {
    await setDoc(doc(db, COLLECTIONS.PREORDERS, po.id), cleanForFirestore(po));
  } catch (err) {
    console.error('Firestore save preorder failed:', err);
  }
}

export async function syncDeletePreOrder(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.PREORDERS, id));
  } catch (err) {
    console.error('Firestore delete preorder failed:', err);
  }
}

export async function syncSaveOpname(record: StockOpnameRecord) {
  try {
    await setDoc(doc(db, COLLECTIONS.OPNAMES, record.id), cleanForFirestore(record));
  } catch (err) {
    console.error('Firestore save opname failed:', err);
  }
}

export async function syncSaveEmployee(emp: Employee) {
  try {
    await setDoc(doc(db, COLLECTIONS.EMPLOYEES, emp.id), cleanForFirestore(emp));
  } catch (err) {
    console.error('Firestore save employee failed:', err);
  }
}

export async function syncSaveAttendanceRecord(record: AttendanceRecord) {
  try {
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE, record.id), cleanForFirestore(record));
  } catch (err) {
    console.error('Firestore save attendance failed:', err);
  }
}

export async function syncSaveSalarySlip(slip: SalarySlip) {
  try {
    await setDoc(doc(db, COLLECTIONS.SALARY_SLIPS, slip.id), cleanForFirestore(slip));
  } catch (err) {
    console.error('Firestore save salary slip failed:', err);
  }
}

export async function syncDeleteSalarySlip(slipId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SALARY_SLIPS, slipId));
  } catch (err) {
    console.error('Firestore delete salary slip failed:', err);
  }
}

export async function syncSaveKasbon(record: EmployeeKasbonRecord) {
  try {
    await setDoc(doc(db, COLLECTIONS.KASBON, record.id), cleanForFirestore(record));
  } catch (err) {
    console.error('Firestore save kasbon failed:', err);
  }
}

export async function syncDeleteKasbon(recordId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.KASBON, recordId));
  } catch (err) {
    console.error('Firestore delete kasbon failed:', err);
  }
}

export async function syncSaveExpense(expense: OperationalExpense) {
  try {
    await setDoc(doc(db, COLLECTIONS.EXPENSES, expense.id), cleanForFirestore(expense));
  } catch (err) {
    console.error('Firestore save expense failed:', err);
  }
}

export async function syncSaveOperationalTransaction(tx: OperationalTransaction) {
  try {
    await setDoc(doc(db, COLLECTIONS.OPERATIONAL_TXS, tx.id), cleanForFirestore(tx));
  } catch (err) {
    console.error('Firestore save operational tx failed:', err);
  }
}

export async function syncDeleteOperationalTransaction(txId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.OPERATIONAL_TXS, txId));
  } catch (err) {
    console.error('Firestore delete operational tx failed:', err);
  }
}

export async function syncSaveStoreProfile(profile: StoreProfile) {
  try {
    await setDoc(doc(db, COLLECTIONS.PROFILE, 'main'), cleanForFirestore(profile));
  } catch (err) {
    console.error('Firestore save profile failed:', err);
  }
}

export async function syncSaveUser(user: AuthUser) {
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, user.id), cleanForFirestore(user));
  } catch (err) {
    console.error('Firestore save user failed:', err);
  }
}

export async function syncDeleteUser(userId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  } catch (err) {
    console.error('Firestore delete user failed:', err);
  }
}

export interface AllSyncData {
  items?: Item[];
  suppliers?: Supplier[];
  customers?: Customer[];
  purchases?: PurchaseTransaction[];
  sales?: SaleTransaction[];
  preorders?: CustomerPreOrder[];
  opnames?: StockOpnameRecord[];
  employees?: Employee[];
  attendance?: AttendanceRecord[];
  salarySlips?: SalarySlip[];
  expenses?: OperationalExpense[];
  operationalTxs?: OperationalTransaction[];
  storeProfile?: StoreProfile;
  users?: AuthUser[];
}

export async function syncAllLocalToCloud(data: AllSyncData): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let totalSynced = 0;

    if (data.storeProfile) {
      await setDoc(doc(db, COLLECTIONS.PROFILE, 'main'), cleanForFirestore(data.storeProfile));
      totalSynced++;
    }

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        await setDoc(doc(db, COLLECTIONS.ITEMS, item.id), cleanForFirestore(item));
        totalSynced++;
      }
    }

    if (data.suppliers && data.suppliers.length > 0) {
      for (const s of data.suppliers) {
        await setDoc(doc(db, COLLECTIONS.SUPPLIERS, s.id), cleanForFirestore(s));
        totalSynced++;
      }
    }

    if (data.customers && data.customers.length > 0) {
      for (const c of data.customers) {
        await setDoc(doc(db, COLLECTIONS.CUSTOMERS, c.id), cleanForFirestore(c));
        totalSynced++;
      }
    }

    if (data.purchases && data.purchases.length > 0) {
      for (const p of data.purchases) {
        await setDoc(doc(db, COLLECTIONS.PURCHASES, p.id), cleanForFirestore(p));
        totalSynced++;
      }
    }

    if (data.sales && data.sales.length > 0) {
      for (const s of data.sales) {
        await setDoc(doc(db, COLLECTIONS.SALES, s.id), cleanForFirestore(s));
        totalSynced++;
      }
    }

    if (data.preorders && data.preorders.length > 0) {
      for (const po of data.preorders) {
        await setDoc(doc(db, COLLECTIONS.PREORDERS, po.id), cleanForFirestore(po));
        totalSynced++;
      }
    }

    if (data.opnames && data.opnames.length > 0) {
      for (const o of data.opnames) {
        await setDoc(doc(db, COLLECTIONS.OPNAMES, o.id), cleanForFirestore(o));
        totalSynced++;
      }
    }

    if (data.employees && data.employees.length > 0) {
      for (const e of data.employees) {
        await setDoc(doc(db, COLLECTIONS.EMPLOYEES, e.id), cleanForFirestore(e));
        totalSynced++;
      }
    }

    if (data.attendance && data.attendance.length > 0) {
      for (const a of data.attendance) {
        await setDoc(doc(db, COLLECTIONS.ATTENDANCE, a.id), cleanForFirestore(a));
        totalSynced++;
      }
    }

    if (data.salarySlips && data.salarySlips.length > 0) {
      for (const sl of data.salarySlips) {
        await setDoc(doc(db, COLLECTIONS.SALARY_SLIPS, sl.id), cleanForFirestore(sl));
        totalSynced++;
      }
    }

    if (data.expenses && data.expenses.length > 0) {
      for (const ex of data.expenses) {
        await setDoc(doc(db, COLLECTIONS.EXPENSES, ex.id), cleanForFirestore(ex));
        totalSynced++;
      }
    }

    if (data.operationalTxs && data.operationalTxs.length > 0) {
      for (const op of data.operationalTxs) {
        await setDoc(doc(db, COLLECTIONS.OPERATIONAL_TXS, op.id), cleanForFirestore(op));
        totalSynced++;
      }
    }

    if (data.users && data.users.length > 0) {
      for (const u of data.users) {
        await setDoc(doc(db, COLLECTIONS.USERS, u.id), cleanForFirestore(u));
        totalSynced++;
      }
    }

    return { success: true, count: totalSynced };
  } catch (err: any) {
    console.error('Failed to sync all data to Firestore:', err);
    return { success: false, count: 0, error: err?.message || 'Gagal sinkronisasi data ke Cloud' };
  }
}

