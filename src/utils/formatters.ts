export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, decimalDigits: number = 2): string {
  if (isNaN(value) || value === null || value === undefined) return '0';
  // If it's a whole number, don't show trailing .00
  if (value % 1 === 0) {
    return value.toLocaleString('id-ID');
  }
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalDigits,
  });
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthYearKey(dateString: string): string {
  if (!dateString) return '';
  return dateString.substring(0, 7); // "YYYY-MM"
}

export function generateInvoiceCode(prefix: 'INV' | 'PO' | 'SLIP' | 'OPN' | 'BKM' | 'BKK' | string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yyyy}${mm}${dd}-${random}`;
}

export function formatPhoneNumberForWhatsApp(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62') && cleaned.length > 0) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function generateWhatsAppSalaryMessage(slip: any, storeName: string): string {
  const lines = [
    `*SLIP GAJI KARYAWAN - ${storeName.toUpperCase()}*`,
    `================================`,
    `*No. Slip :* ${slip.slipNumber}`,
    `*Nama     :* ${slip.employeeName} (${slip.employeeRole})`,
    `*Periode  :* ${formatDate(slip.periodStart)} s/d ${formatDate(slip.periodEnd)}`,
    `*Tanggal  :* ${formatDate(slip.generatedDate)}`,
    `--------------------------------`,
    `*REKAPITULASI KEHADIRAN:*`,
    `• Hari Kerja Hadir : ${slip.daysPresent} Hari`,
    slip.daysHalf > 0 ? `• Setengah Hari    : ${slip.daysHalf} Hari` : null,
    slip.daysOvertime > 0 ? `• Lembur           : ${slip.daysOvertime} Hari` : null,
    `--------------------------------`,
    `*RINCIAN GAJI & POTONGAN:*`,
    `• Upah Pokok       : ${formatCurrency(slip.totalDailyWage)}`,
    slip.totalOvertimePay > 0 ? `• Upah Lembur      : +${formatCurrency(slip.totalOvertimePay)}` : null,
    slip.allowance > 0 ? `• Tunjangan/Makan : +${formatCurrency(slip.allowance)}` : null,
    slip.bonus > 0 ? `• Bonus            : +${formatCurrency(slip.bonus)}` : null,
    slip.deduction > 0 ? `• Potongan Kasbon  : -${formatCurrency(slip.deduction)}` : null,
    slip.kasbonRemainingAfter !== undefined && slip.kasbonRemainingAfter > 0 
      ? `• Sisa Saldo Kasbon: ${formatCurrency(slip.kasbonRemainingAfter)}` 
      : null,
    `--------------------------------`,
    `*TOTAL GAJI BERSIH (THP):* ${formatCurrency(slip.netSalary)}`,
    `*Status:* ${slip.paymentStatus}`,
    slip.notes ? `*Catatan:* ${slip.notes}` : null,
  ].filter(Boolean);

  return encodeURIComponent(lines.join('\n'));
}

export function generateWhatsAppDebtReminderMessage(
  customerName: string,
  invoiceNumber: string,
  invoiceDate: string,
  grandTotal: number,
  amountPaid: number,
  remainingDebt: number,
  storeName: string
): string {
  const lines = [
    `Halo *${customerName}*,`,
    ``,
    `Mengingatkan informasi tagihan belanja ayam di *${storeName}*:`,
    `================================`,
    `*No. Nota:* ${invoiceNumber}`,
    `*Tanggal:* ${formatDate(invoiceDate)}`,
    `*Total Belanja:* ${formatCurrency(grandTotal)}`,
    `*Uang Sudah Masuk:* ${formatCurrency(amountPaid)}`,
    `--------------------------------`,
    `👉 *SISA TAGIHAN:* *${formatCurrency(remainingDebt)}*`,
    `================================`,
    ``,
    `Mohon disiapkan untuk pelunasannya ya Kak. Terima kasih banyak atas kerjasamanya! 🙏`,
    `_${storeName}_`
  ];

  return encodeURIComponent(lines.join('\n'));
}

/**
 * Format angka dengan pemisah titik ribuan langsung untuk input form (misal 50000 -> "50.000")
 */
export function formatNumberWithDots(val: number | string | undefined | null): string {
  if (val === '' || val === null || val === undefined) return '';
  const num = typeof val === 'number' ? val : parseFormattedNumber(val);
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('id-ID');
}

/**
 * Parse string yang memiliki pemisah titik ribuan kembali menjadi number murni
 */
export function parseFormattedNumber(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/\./g, '').replace(/,/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.max(0, num);
}

