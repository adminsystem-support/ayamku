import { pgTable, text, doublePrecision, integer, jsonb } from 'drizzle-orm/pg-core';

// 1. ITEMS / PRODUK AYAM
export const itemsTable = pgTable('items', {
  id: text('id').primaryKey(),
  code: text('code'),
  name: text('name').notNull(),
  category: text('category').notNull(),
  unit: text('unit').notNull(),
  currentStock: doublePrecision('current_stock').notNull(),
  minStock: doublePrecision('min_stock').notNull(),
  baseBuyPrice: doublePrecision('base_buy_price').notNull(), // Modal / HPP
  sellPrice: doublePrecision('sell_price').notNull(),
  description: text('description'),
  updatedAt: text('updated_at').notNull(),
});

// 2. CUSTOMERS / PELANGGAN
export const customersTable = pgTable('customers', {
  id: text('id').primaryKey(),
  code: text('code'),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  type: text('type').notNull(),
  defaultDiscountPercent: doublePrecision('default_discount_percent').default(0),
  notes: text('notes'),
});

// 3. SUPPLIERS / PEMASOK
export const suppliersTable = pgTable('suppliers', {
  id: text('id').primaryKey(),
  code: text('code'),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  notes: text('notes'),
});

// 4. SALES TRANSACTIONS / NOTA PENJUALAN
export const salesTable = pgTable('sales', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  date: text('date').notNull(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  customerType: text('customer_type').notNull(),
  items: jsonb('items').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  discount: doublePrecision('discount').notNull(),
  grandTotal: doublePrecision('grand_total').notNull(),
  totalCostHPP: doublePrecision('total_cost_hpp').notNull(),
  grossProfit: doublePrecision('gross_profit').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status'),
  amountPaid: doublePrecision('amount_paid').notNull(),
  remainingDebt: doublePrecision('remaining_debt'),
  change: doublePrecision('change'),
  customerDebtPayments: jsonb('customer_debt_payments'),
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
});

// 4b. CUSTOMER PRE-ORDERS / PESANAN PO
export const preordersTable = pgTable('preorders', {
  id: text('id').primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  orderDate: text('order_date').notNull(),
  pickupDate: text('pickup_date').notNull(),
  pickupTime: text('pickup_time'),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  customerType: text('customer_type').notNull(),
  items: jsonb('items').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  discount: doublePrecision('discount').notNull(),
  grandTotal: doublePrecision('grand_total').notNull(),
  downPayment: doublePrecision('down_payment').notNull(),
  paymentMethod: text('payment_method'),
  status: text('status').notNull(),
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
  convertedSaleId: text('converted_sale_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 5. PURCHASES / FAKTUR PEMBELIAN
export const purchasesTable = pgTable('purchases', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  date: text('date').notNull(),
  supplierId: text('supplier_id').notNull(),
  supplierName: text('supplier_name').notNull(),
  items: jsonb('items').notNull(),
  additionalCosts: jsonb('additional_costs'),
  totalItemsCost: doublePrecision('total_items_cost').notNull(),
  totalAdditionalCosts: doublePrecision('total_additional_costs').notNull(),
  grandTotal: doublePrecision('grand_total').notNull(),
  totalQuantity: doublePrecision('total_quantity').notNull(),
  averageHPPPerUnit: doublePrecision('average_hpp_per_unit').notNull(),
  targetSellingPrice: doublePrecision('target_selling_price'),
  estimatedTotalRevenue: doublePrecision('estimated_total_revenue'),
  estimatedProfit: doublePrecision('estimated_profit'),
  estimatedProfitMargin: doublePrecision('estimated_profit_margin'),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').notNull(),
  amountPaid: doublePrecision('amount_paid').notNull(),
  remainingDebt: doublePrecision('remaining_debt').notNull(),
  debtPayments: jsonb('debt_payments'),
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
});

// 6. EMPLOYEES / KARYAWAN
export const employeesTable = pgTable('employees', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  phone: text('phone'),
  dailyWage: doublePrecision('daily_wage').notNull(),
  halfDayWage: doublePrecision('half_day_wage').notNull(),
  overtimePayPerHour: doublePrecision('overtime_pay_per_hour').notNull(),
  status: text('status').notNull(),
});

// 7. ATTENDANCE / ABSENSI
export const attendanceTable = pgTable('attendance', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  employeeId: text('employee_id').notNull(),
  employeeName: text('employee_name').notNull(),
  status: text('status').notNull(),
  wageAmount: doublePrecision('wage_amount').notNull(),
  overtimeHours: doublePrecision('overtime_hours'),
  overtimePay: doublePrecision('overtime_pay'),
  bonusAmount: doublePrecision('bonus_amount'),
  notes: text('notes'),
});

// 8. SALARY SLIPS / SLIP GAJI
export const salarySlipsTable = pgTable('salary_slips', {
  id: text('id').primaryKey(),
  slipNumber: text('slip_number').notNull().unique(),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  generatedDate: text('generated_date').notNull(),
  employeeId: text('employee_id').notNull(),
  employeeName: text('employee_name').notNull(),
  employeeRole: text('employee_role').notNull(),
  daysPresent: integer('days_present').notNull(),
  daysHalf: integer('days_half').notNull(),
  daysOvertime: integer('days_overtime').notNull(),
  totalDailyWage: doublePrecision('total_daily_wage').notNull(),
  totalOvertimePay: doublePrecision('total_overtime_pay').notNull(),
  allowance: doublePrecision('allowance').notNull(),
  bonus: doublePrecision('bonus').notNull(),
  deduction: doublePrecision('deduction').notNull(),
  netSalary: doublePrecision('net_salary').notNull(),
  paymentStatus: text('payment_status').notNull(),
  notes: text('notes'),
});

// 9. OPERATIONAL TRANSACTIONS / KAS OPERASIONAL
export const operationalTransactionsTable = pgTable('operational_transactions', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  amount: doublePrecision('amount').notNull(),
  recordedBy: text('recorded_by').notNull(),
  createdAt: text('created_at').notNull(),
});

// 10. STOCK OPNAME
export const stockOpnameTable = pgTable('stock_opname', {
  id: text('id').primaryKey(),
  opnameNumber: text('opname_number').notNull(),
  date: text('date').notNull(),
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  systemStock: doublePrecision('system_stock').notNull(),
  physicalStock: doublePrecision('physical_stock').notNull(),
  difference: doublePrecision('difference').notNull(),
  unit: text('unit').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull(),
  notes: text('notes'),
  conductedBy: text('conducted_by').notNull(),
});

// 11. STORE PROFILE
export const storeProfileTable = pgTable('store_profile', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  footerNote: text('footer_note'),
  logoUrl: text('logo_url'),
  thermalWidth: text('thermal_width'),
  bankName: text('bank_name'),
  bankAccountNo: text('bank_account_no'),
  bankAccountName: text('bank_account_name'),
});
