import express from 'express';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import { 
  itemsTable, 
  customersTable, 
  suppliersTable, 
  salesTable, 
  purchasesTable, 
  employeesTable, 
  attendanceTable, 
  salarySlipsTable, 
  operationalTransactionsTable, 
  stockOpnameTable, 
  storeProfileTable 
} from './src/db/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

// API: Status koneksi database PostgreSQL
app.get('/api/sql/status', async (req, res) => {
  try {
    const items = await db.select().from(itemsTable);
    const customers = await db.select().from(customersTable);
    const sales = await db.select().from(salesTable);
    res.json({
      status: 'connected',
      engine: 'PostgreSQL (Cloud SQL)',
      counts: {
        items: items.length,
        customers: customers.length,
        sales: sales.length,
      }
    });
  } catch (err: any) {
    res.json({
      status: 'error',
      message: err.message
    });
  }
});

// API: Migrasi / Sync seluruh data aplikasi ke PostgreSQL
app.post('/api/sql/migrate', async (req, res) => {
  try {
    const { items, customers, suppliers, sales, purchases, employees, attendance, salarySlips, operationalTxs, opnames, profile } = req.body;
    let counts = { items: 0, customers: 0, suppliers: 0, sales: 0 };

    // 1. Items
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await db.insert(itemsTable).values({
          id: item.id,
          code: item.code || null,
          name: item.name,
          category: item.category,
          unit: item.unit,
          currentStock: Number(item.currentStock) || 0,
          minStock: Number(item.minStock) || 0,
          baseBuyPrice: Number(item.baseBuyPrice) || 0,
          sellPrice: Number(item.sellPrice) || 0,
          description: item.description || null,
          updatedAt: item.updatedAt || new Date().toISOString()
        }).onConflictDoUpdate({
          target: itemsTable.id,
          set: {
            name: item.name,
            currentStock: Number(item.currentStock) || 0,
            baseBuyPrice: Number(item.baseBuyPrice) || 0,
            sellPrice: Number(item.sellPrice) || 0,
            updatedAt: item.updatedAt || new Date().toISOString()
          }
        });
        counts.items++;
      }
    }

    // 2. Customers
    if (Array.isArray(customers) && customers.length > 0) {
      for (const cust of customers) {
        await db.insert(customersTable).values({
          id: cust.id,
          code: cust.code || null,
          name: cust.name,
          phone: cust.phone,
          address: cust.address,
          type: cust.type,
          defaultDiscountPercent: Number(cust.defaultDiscountPercent) || 0,
          notes: cust.notes || null
        }).onConflictDoUpdate({
          target: customersTable.id,
          set: {
            name: cust.name,
            phone: cust.phone,
            address: cust.address,
            type: cust.type
          }
        });
        counts.customers++;
      }
    }

    // 3. Suppliers
    if (Array.isArray(suppliers) && suppliers.length > 0) {
      for (const supp of suppliers) {
        await db.insert(suppliersTable).values({
          id: supp.id,
          code: supp.code || null,
          name: supp.name,
          phone: supp.phone,
          address: supp.address,
          notes: supp.notes || null
        }).onConflictDoUpdate({
          target: suppliersTable.id,
          set: {
            name: supp.name,
            phone: supp.phone,
            address: supp.address
          }
        });
        counts.suppliers++;
      }
    }

    // 4. Sales Transactions
    if (Array.isArray(sales) && sales.length > 0) {
      for (const sale of sales) {
        await db.insert(salesTable).values({
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          date: sale.date,
          customerId: sale.customerId,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone || null,
          customerType: sale.customerType,
          items: sale.items,
          subtotal: Number(sale.subtotal) || 0,
          discount: Number(sale.discount) || 0,
          grandTotal: Number(sale.grandTotal) || 0,
          totalCostHPP: Number(sale.totalCostHPP) || 0,
          grossProfit: Number(sale.grossProfit) || 0,
          paymentMethod: sale.paymentMethod,
          paymentStatus: sale.paymentStatus || 'Lunas',
          amountPaid: Number(sale.amountPaid) || 0,
          remainingDebt: Number(sale.remainingDebt) || 0,
          change: Number(sale.change) || 0,
          customerDebtPayments: sale.customerDebtPayments || null,
          notes: sale.notes || null,
          createdBy: sale.createdBy || 'Admin'
        }).onConflictDoNothing();
        counts.sales++;
      }
    }

    // 5. Store Profile
    if (profile) {
      await db.insert(storeProfileTable).values({
        id: 'default',
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        footerNote: profile.footerNote || null,
        logoUrl: profile.logoUrl || null,
        thermalWidth: profile.thermalWidth || '58mm',
        bankName: profile.bankName || null,
        bankAccountNo: profile.bankAccountNo || null,
        bankAccountName: profile.bankAccountName || null,
      }).onConflictDoUpdate({
        target: storeProfileTable.id,
        set: {
          name: profile.name,
          phone: profile.phone,
          address: profile.address
        }
      });
    }

    res.json({ 
      success: true, 
      message: `Berhasil migrasi ${counts.items} produk ayam, ${counts.customers} pelanggan, ${counts.suppliers} pemasok, dan ${counts.sales} nota penjualan ke PostgreSQL!`,
      counts
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Ekspor SQL Dump (.sql) untuk diimpor ke website / PostgreSQL mandiri
app.get('/api/sql/export', async (req, res) => {
  try {
    const items = await db.select().from(itemsTable);
    const customers = await db.select().from(customersTable);
    const suppliers = await db.select().from(suppliersTable);
    const sales = await db.select().from(salesTable);

    let sqlDump = `-- ==========================================================\n`;
    sqlDump += `-- EXPORT DATABASE AYAMKU (POSTGRESQL)\n`;
    sqlDump += `-- Format: SQL Standar (Kompatibel dengan PostgreSQL 14 / 15 / 16)\n`;
    sqlDump += `-- Tanggal Ekspor: ${new Date().toISOString()}\n`;
    sqlDump += `-- ==========================================================\n\n`;

    // 1. Skema Tabel Items
    sqlDump += `-- 1. TABEL PRODUK AYAM (ITEMS)\n`;
    sqlDump += `CREATE TABLE IF NOT EXISTS items (\n` +
      `  id TEXT PRIMARY KEY,\n` +
      `  code TEXT,\n` +
      `  name TEXT NOT NULL,\n` +
      `  category TEXT NOT NULL,\n` +
      `  unit TEXT NOT NULL,\n` +
      `  current_stock DOUBLE PRECISION NOT NULL,\n` +
      `  min_stock DOUBLE PRECISION NOT NULL,\n` +
      `  base_buy_price DOUBLE PRECISION NOT NULL,\n` +
      `  sell_price DOUBLE PRECISION NOT NULL,\n` +
      `  description TEXT,\n` +
      `  updated_at TEXT NOT NULL\n` +
      `);\n\n`;

    // 2. Skema Tabel Pelanggan
    sqlDump += `-- 2. TABEL PELANGGAN (CUSTOMERS)\n`;
    sqlDump += `CREATE TABLE IF NOT EXISTS customers (\n` +
      `  id TEXT PRIMARY KEY,\n` +
      `  code TEXT,\n` +
      `  name TEXT NOT NULL,\n` +
      `  phone TEXT NOT NULL,\n` +
      `  address TEXT NOT NULL,\n` +
      `  type TEXT NOT NULL,\n` +
      `  default_discount_percent DOUBLE PRECISION DEFAULT 0,\n` +
      `  notes TEXT\n` +
      `);\n\n`;

    // 3. Skema Tabel Pemasok
    sqlDump += `-- 3. TABEL PEMASOK (SUPPLIERS)\n`;
    sqlDump += `CREATE TABLE IF NOT EXISTS suppliers (\n` +
      `  id TEXT PRIMARY KEY,\n` +
      `  code TEXT,\n` +
      `  name TEXT NOT NULL,\n` +
      `  phone TEXT NOT NULL,\n` +
      `  address TEXT NOT NULL,\n` +
      `  notes TEXT\n` +
      `);\n\n`;

    // 4. Skema Tabel Penjualan
    sqlDump += `-- 4. TABEL PENJUALAN (SALES)\n`;
    sqlDump += `CREATE TABLE IF NOT EXISTS sales (\n` +
      `  id TEXT PRIMARY KEY,\n` +
      `  invoice_number TEXT UNIQUE NOT NULL,\n` +
      `  date TEXT NOT NULL,\n` +
      `  customer_id TEXT NOT NULL,\n` +
      `  customer_name TEXT NOT NULL,\n` +
      `  customer_phone TEXT,\n` +
      `  customer_type TEXT NOT NULL,\n` +
      `  items JSONB NOT NULL,\n` +
      `  subtotal DOUBLE PRECISION NOT NULL,\n` +
      `  discount DOUBLE PRECISION NOT NULL,\n` +
      `  grand_total DOUBLE PRECISION NOT NULL,\n` +
      `  total_cost_hpp DOUBLE PRECISION NOT NULL,\n` +
      `  gross_profit DOUBLE PRECISION NOT NULL,\n` +
      `  payment_method TEXT NOT NULL,\n` +
      `  payment_status TEXT,\n` +
      `  amount_paid DOUBLE PRECISION NOT NULL,\n` +
      `  remaining_debt DOUBLE PRECISION,\n` +
      `  change DOUBLE PRECISION,\n` +
      `  customer_debt_payments JSONB,\n` +
      `  notes TEXT,\n` +
      `  created_by TEXT NOT NULL\n` +
      `);\n\n`;

    // Data Items
    if (items.length > 0) {
      sqlDump += `-- DATA PRODUK AYAM --\n`;
      items.forEach(i => {
        sqlDump += `INSERT INTO items (id, code, name, category, unit, current_stock, min_stock, base_buy_price, sell_price, description, updated_at) VALUES ('${i.id}', ${i.code ? `'${i.code}'` : 'NULL'}, '${i.name.replace(/'/g, "''")}', '${i.category}', '${i.unit}', ${i.currentStock}, ${i.minStock}, ${i.baseBuyPrice}, ${i.sellPrice}, ${i.description ? `'${i.description.replace(/'/g, "''")}'` : 'NULL'}, '${i.updatedAt}') ON CONFLICT (id) DO UPDATE SET current_stock = EXCLUDED.current_stock, sell_price = EXCLUDED.sell_price, base_buy_price = EXCLUDED.base_buy_price;\n`;
      });
      sqlDump += `\n`;
    }

    // Data Pelanggan
    if (customers.length > 0) {
      sqlDump += `-- DATA PELANGGAN --\n`;
      customers.forEach(c => {
        sqlDump += `INSERT INTO customers (id, code, name, phone, address, type, default_discount_percent, notes) VALUES ('${c.id}', ${c.code ? `'${c.code}'` : 'NULL'}, '${c.name.replace(/'/g, "''")}', '${c.phone}', '${c.address.replace(/'/g, "''")}', '${c.type}', ${c.defaultDiscountPercent || 0}, ${c.notes ? `'${c.notes.replace(/'/g, "''")}'` : 'NULL'}) ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, address = EXCLUDED.address;\n`;
      });
      sqlDump += `\n`;
    }

    // Data Pemasok
    if (suppliers.length > 0) {
      sqlDump += `-- DATA PEMASOK --\n`;
      suppliers.forEach(s => {
        sqlDump += `INSERT INTO suppliers (id, code, name, phone, address, notes) VALUES ('${s.id}', ${s.code ? `'${s.code}'` : 'NULL'}, '${s.name.replace(/'/g, "''")}', '${s.phone}', '${s.address.replace(/'/g, "''")}', ${s.notes ? `'${s.notes.replace(/'/g, "''")}'` : 'NULL'}) ON CONFLICT (id) DO NOTHING;\n`;
      });
      sqlDump += `\n`;
    }

    // Data Penjualan
    if (sales.length > 0) {
      sqlDump += `-- DATA PENJUALAN --\n`;
      sales.forEach(s => {
        const itemsJson = JSON.stringify(s.items).replace(/'/g, "''");
        sqlDump += `INSERT INTO sales (id, invoice_number, date, customer_id, customer_name, customer_phone, customer_type, items, subtotal, discount, grand_total, total_cost_hpp, gross_profit, payment_method, payment_status, amount_paid, remaining_debt, change, notes, created_by) VALUES ('${s.id}', '${s.invoiceNumber}', '${s.date}', '${s.customerId}', '${s.customerName.replace(/'/g, "''")}', ${s.customerPhone ? `'${s.customerPhone}'` : 'NULL'}, '${s.customerType}', '${itemsJson}'::jsonb, ${s.subtotal}, ${s.discount}, ${s.grandTotal}, ${s.totalCostHPP}, ${s.grossProfit}, '${s.paymentMethod}', '${s.paymentStatus || 'Lunas'}', ${s.amountPaid}, ${s.remainingDebt || 0}, ${s.change || 0}, ${s.notes ? `'${s.notes.replace(/'/g, "''")}'` : 'NULL'}, '${s.createdBy}') ON CONFLICT (invoice_number) DO NOTHING;\n`;
      });
      sqlDump += `\n`;
    }

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', 'attachment; filename="ayamku_database_postgresql.sql"');
    res.send(sqlDump);
  } catch (err: any) {
    console.error('Export SQL error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware & SPA serving
const isProd = process.env.NODE_ENV === 'production';
const port = 3000;

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Express server running on http://0.0.0.0:${port}`);
  });
}

startServer();
