import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  SaleTransaction, 
  PurchaseTransaction, 
  SalarySlip, 
  StoreProfile 
} from '../types/index.ts';
import { 
  formatCurrency, 
  formatNumber, 
  formatDate, 
  formatDateTime 
} from './formatters.ts';

export type DocumentPrintData = 
  | { type: 'sale'; data: SaleTransaction }
  | { type: 'purchase'; data: PurchaseTransaction }
  | { type: 'salary'; data: SalarySlip }
  | { 
      type: 'payment_receipt'; 
      data: {
        receiptNo: string;
        title?: string;
        date: string;
        counterpartyName: string;
        invoiceNumber: string;
        totalInvoiceAmount?: number;
        paymentAmount?: number;
        amount?: number;
        grandTotal?: number;
        remainingDebt: number;
        paymentMethod: 'Tunai' | 'Transfer';
        notes?: string;
        recordedBy: string;
        receiptType?: 'BKM' | 'BKK';
        counterpartyType?: string;
      }
    };

/**
 * Membersihkan dan memformat nomor HP menjadi format standar WhatsApp internasional (628xxx)
 */
export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Menghasilkan teks ringkasan faktur/nota yang rapi & lengkap untuk WhatsApp
 */
export function generateWhatsAppMessage(
  data: DocumentPrintData, 
  store: StoreProfile,
  recipientPhone?: string
): string {
  // Untuk nota (penjualan, pembelian, kuitansi), tidak perlu menggunakan kata-kata/teks
  if (data.type === 'sale' || data.type === 'purchase' || data.type === 'payment_receipt') {
    return '';
  }

  const storeName = store.name.toUpperCase();

  if (data.type === 'salary') {
    const s = data.data;
    return (
      `*SLIP GAJI KARYAWAN - ${storeName}*\n` +
      `No. Slip   : ${s.slipNumber}\n` +
      `Nama       : ${s.employeeName} (${s.employeeRole})\n` +
      `Periode    : ${formatDate(s.periodStart)} s/d ${formatDate(s.periodEnd)}\n` +
      `----------------------------------------\n` +
      `Hari Hadir : ${s.daysPresent} Hari\n` +
      `Upah Pokok : ${formatCurrency(s.totalDailyWage)}\n` +
      (s.totalOvertimePay > 0 ? `Lembur     : +${formatCurrency(s.totalOvertimePay)}\n` : '') +
      (s.allowance > 0 ? `Tunjangan  : +${formatCurrency(s.allowance)}\n` : '') +
      (s.bonus > 0 ? `Bonus      : +${formatCurrency(s.bonus)}\n` : '') +
      (s.deduction > 0 ? `Potongan   : -${formatCurrency(s.deduction)}\n` : '') +
      `----------------------------------------\n` +
      `*TOTAL DITERIMA (THP): ${formatCurrency(s.netSalary)}*\n` +
      `Status     : [${s.paymentStatus.toUpperCase()}]\n` +
      `----------------------------------------\n` +
      `*Dokumen PDF Resmi:* Slip_Gaji_${s.slipNumber}.pdf\n` +
      `_${store.name}_`
    );
  }

  return '';
}

/**
 * Konversi URL Logo Toko (file path / HTTP / Base64) menjadi Data URL PNG agar bisa dirender sempurna di jsPDF & html2canvas
 */
export async function getStoreLogoDataUrl(logoUrl?: string): Promise<string> {
  const targetUrl = logoUrl || '/logo_unggas.svg';
  if (!targetUrl) return '';
  if (targetUrl.startsWith('data:image')) return targetUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 120;
        canvas.height = img.height || 120;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
          return;
        }
      } catch (e) {
        console.warn('Canvas toDataURL failed for store logo:', e);
      }
      resolve('');
    };
    img.onerror = () => resolve('');
    img.src = targetUrl;
  });
}

/**
 * Membuat dokumen PDF vector langsung (resmi, tajam, dan tidak pernah error)
 */
export function createDocumentPdf(
  data: DocumentPrintData,
  store: StoreProfile,
  format: 'a4' | 'thermal' = 'a4',
  logoDataUrl?: string
): { doc: jsPDF; fileName: string } {
  const isA4 = format === 'a4';
  const activeLogo = logoDataUrl || (store.logoUrl && store.logoUrl.startsWith('data:image') ? store.logoUrl : '');
  
  if (data.type === 'sale') {
    const sale = data.data;
    const pdfPreviousDebt = sale.previousDebt !== undefined ? sale.previousDebt : 0;
    const pdfRemainingDebt = sale.remainingDebt !== undefined ? sale.remainingDebt : Math.max(0, (sale.grandTotal || 0) - (sale.amountPaid || 0));
    const pdfTotalOverall = sale.totalOverall !== undefined ? sale.totalOverall : 0;
    const pdfTotalCustomerDebt = sale.totalCustomerDebt !== undefined ? sale.totalCustomerDebt : 0;

    const isLunas = (
      (sale.paymentStatus === 'Lunas' || pdfRemainingDebt === 0) &&
      pdfPreviousDebt === 0 &&
      pdfTotalOverall === 0 &&
      pdfTotalCustomerDebt === 0
    );
    const fileName = `Nota_Penjualan_${sale.invoiceNumber}.pdf`;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isA4 ? 'a4' : [80, 200]
    });

    if (isA4) {
      // 1. Header (y: 12 to 31)
      let startX = 14;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 12, 14, 14, 2, 2, 'DF');

      if (activeLogo && activeLogo.startsWith('data:image')) {
        try {
          doc.addImage(activeLogo, 'PNG', 14.5, 12.5, 13, 13);
        } catch (e) {
          doc.setFillColor(16, 185, 129);
          doc.circle(21, 19, 5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          doc.text('ACG', 21, 21.2, { align: 'center' });
        }
      } else {
        doc.setFillColor(16, 185, 129);
        doc.circle(21, 19, 5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text('ACG', 21, 21.2, { align: 'center' });
      }

      startX = 32;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text(store.name, startX, 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(store.address || 'Alamat Toko', startX, 22);
      doc.text(`Telp/WA: ${store.phone || '-'}`, startX, 26.5);

      // Top Right Invoice No
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(sale.invoiceNumber, 196, 20, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tanggal: ${formatDateTime(sale.date)}`, 196, 26, { align: 'right' });

      // Horizontal separator line
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 31, 196, 31);

      // 2. Customer Details Card Box (y: 34 to 68)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 34, 182, 19, 3, 3, 'DF');

      // Avatar Circle (x: 23, y: 43.5, r: 4.5)
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(253, 230, 138); // amber-200
      doc.circle(23, 43.5, 4.5, 'DF');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(120, 53, 15); // amber-900
      doc.text(sale.customerName.charAt(0).toUpperCase(), 23, 46.5, { align: 'center' });

      // Customer Name & Address & Phone directly underneath
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(sale.customerName, 30, 40);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const addrSnippet = sale.customerAddress ? (sale.customerAddress.length > 55 ? sale.customerAddress.substring(0, 52) + '...' : sale.customerAddress) : '-';
      doc.text(`Alamat: ${addrSnippet}`, 30, 44);
      doc.text(`No. Handphone: ${sale.customerPhone || '-'}`, 30, 48);

      // 3. Rincian Barang Table Section
      const tableRows = sale.items.map((item, idx) => [
        idx + 1,
        `${formatNumber(item.quantity)} ${item.unit}`,
        item.itemName,
        formatCurrency(item.sellPrice),
        formatCurrency(item.subtotal)
      ]);

      const qtyByUnit = sale.items.reduce((acc, item) => {
        acc[item.unit] = (acc[item.unit] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>);

      const totalQtyText = Object.entries(qtyByUnit)
        .map(([unit, qty]) => `${formatNumber(qty)} ${unit}`)
        .join(', ');

      // Header bar
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, 57, 182, 7, 1.5, 1.5, 'DF');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`RINCIAN BARANG & DETAIL DIBELI (${sale.items.length} ITEM)`, 18, 61.8);

      autoTable(doc, {
        startY: 64,
        head: [['No', 'Jumlah', 'Nama Item', 'Harga Satuan', 'Subtotal']],
        body: tableRows,
        foot: [
          [
            { content: 'Total Qty:', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold' } },
            { content: totalQtyText, colSpan: 3, styles: { halign: 'left', fontStyle: 'bold' } }
          ]
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8,
          lineWidth: 0.15,
          lineColor: [203, 213, 225]
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [15, 23, 42],
          lineWidth: 0.1,
          lineColor: [226, 232, 240]
        },
        footStyles: {
          fillColor: [254, 243, 199],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8,
          lineWidth: 0.15,
          lineColor: [203, 213, 225]
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 35, halign: 'right' },
          2: { cellWidth: 'auto', halign: 'left' },
          3: { cellWidth: 32, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      // 4. Rincian Perhitungan Nota Table Section
      const finalTableY = (doc as any).lastAutoTable?.finalY || 130;
      const calcY = finalTableY + 6;

      const previousDebt = sale.previousDebt !== undefined ? sale.previousDebt : (
        sale.totalCustomerDebt !== undefined && sale.totalCustomerDebt > Math.max(0, sale.grandTotal - sale.amountPaid)
          ? sale.totalCustomerDebt - Math.max(0, sale.grandTotal - sale.amountPaid)
          : 0
      );
      const previousSavings = sale.previousSavings !== undefined ? sale.previousSavings : (sale.customerDepositBalance || 0);

      const hasHutang = previousDebt > 0;
      const hasTabungan = !hasHutang && previousSavings > 0;

      const totalBarang = sale.totalBarang || sale.subtotal || sale.items.reduce((sum, i) => sum + i.subtotal, 0);
      const netBarang = sale.grandTotal;
      const amountPaid = sale.amountPaid || 0;

      let totalBarangPlusMinus = sale.totalBarangPlusHutang !== undefined ? sale.totalBarangPlusHutang : netBarang;
      let totalKeseluruhan = sale.totalOverall !== undefined ? sale.totalOverall : 0;
      let newSavings = sale.newSavingsRecorded || 0;

      if (sale.totalBarangPlusHutang === undefined) {
        if (hasHutang) {
          totalBarangPlusMinus = netBarang + previousDebt;
          totalKeseluruhan = Math.max(0, totalBarangPlusMinus - amountPaid);
          if (amountPaid > totalBarangPlusMinus) {
            newSavings = amountPaid - totalBarangPlusMinus;
          }
        } else if (hasTabungan) {
          totalBarangPlusMinus = Math.max(0, netBarang - previousSavings);
          totalKeseluruhan = Math.max(0, totalBarangPlusMinus - amountPaid);
          if (amountPaid > totalBarangPlusMinus) {
            newSavings = (amountPaid - totalBarangPlusMinus) + Math.max(0, previousSavings - netBarang);
          } else if (previousSavings > netBarang) {
            newSavings = previousSavings - netBarang;
          }
        } else {
          totalBarangPlusMinus = netBarang;
          totalKeseluruhan = Math.max(0, netBarang - amountPaid);
          if (amountPaid > netBarang) {
            newSavings = amountPaid - netBarang;
          }
        }
      }

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, calcY, 182, 7, 1.5, 1.5, 'DF');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('RINCIAN PERHITUNGAN NOTA', 18, calcY + 4.8);

      const summaryBody: any[] = [
        ['TOTAL BARANG:', formatCurrency(totalBarang)]
      ];

      if (sale.discountEnabled !== false && sale.discount > 0) {
        summaryBody.push(['Diskon Potongan Harga:', `-${formatCurrency(sale.discount)}`]);
      }
      if (sale.taxEnabled && sale.tax && sale.tax > 0) {
        summaryBody.push([`Pajak${sale.taxType === 'percent' ? ` (${sale.taxValue}%)` : ''}:`, `+${formatCurrency(sale.tax)}`]);
      }
      if (sale.shippingEnabled && sale.shippingCost && sale.shippingCost > 0) {
        summaryBody.push(['Ongkos Kirim:', `+${formatCurrency(sale.shippingCost)}`]);
      }
      if (sale.otherCostEnabled && sale.otherCost && sale.otherCost > 0) {
        summaryBody.push([`Biaya Lain-lain${sale.otherCostNote ? ` (${sale.otherCostNote})` : ''}:`, `+${formatCurrency(sale.otherCost)}`]);
      }

      if (hasTabungan) {
        summaryBody.push(['TABUNGAN:', formatCurrency(previousSavings)]);
        summaryBody.push(['TOTAL BARANG - TABUNGAN:', formatCurrency(totalBarangPlusMinus)]);
      } else {
        summaryBody.push(['SISA HUTANG:', formatCurrency(previousDebt || 0)]);
        summaryBody.push(['TOTAL BARANG + HUTANG:', formatCurrency(totalBarangPlusMinus)]);
      }

      summaryBody.push(['BAYAR:', formatCurrency(amountPaid)]);

      const excessSavings = newSavings || sale.overpaymentAmount || (amountPaid > totalBarangPlusMinus ? amountPaid - totalBarangPlusMinus : 0);
      if (excessSavings > 0) {
        summaryBody.push(['KELEBIHAN BAYAR (TABUNGAN):', `+${formatCurrency(excessSavings)}`]);
      }

      const summaryFoot: any[] = [
        ['TOTAL KESELURUHAN:', formatCurrency(totalKeseluruhan)]
      ];

      autoTable(doc, {
        startY: calcY + 7,
        body: summaryBody,
        foot: summaryFoot,
        theme: 'grid',
        bodyStyles: {
          fontSize: 8,
          textColor: [15, 23, 42],
          lineWidth: 0.1,
          lineColor: [226, 232, 240]
        },
        footStyles: {
          fillColor: [15, 23, 42],
          textColor: [252, 211, 77],
          fontStyle: 'bold',
          fontSize: 9.5,
          lineWidth: 0.2,
          lineColor: [15, 23, 42]
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 50, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      const finalCalcY = (doc as any).lastAutoTable?.finalY || 180;

      if (sale.notes) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Catatan: ${sale.notes}`, 14, finalCalcY + 6);
      }

      // WATERMARK LUNAS VECTOR PADA DOKUMEN A4
      if (isLunas) {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.saveGraphicsState();
          try {
            const gState = new (doc as any).GState({ opacity: 0.16 });
            doc.setGState(gState);
          } catch {
            // fallback gracefully
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(56);
          doc.setTextColor(16, 185, 129); // emerald-500
          doc.text('L U N A S', 105, 145, { align: 'center', angle: 30 });
          doc.setFontSize(13);
          doc.text('SUDAH DIBAYAR LUNAS', 105, 158, { align: 'center', angle: 30 });
          doc.restoreGraphicsState();
        }
      }
    } else {
      // Thermal 80mm format
      doc.setFont('courier', 'bold');
      doc.setFontSize(12);
      doc.text(store.name, 40, 10, { align: 'center' });
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text(store.address || '', 40, 15, { align: 'center' });
      doc.text(`WA: ${store.phone || '-'}`, 40, 19, { align: 'center' });
      doc.text('----------------------------------------', 40, 23, { align: 'center' });

      doc.setFont('courier', 'bold');
      doc.text(sale.invoiceNumber, 40, 27, { align: 'center' });
      doc.setFont('courier', 'normal');
      doc.text(`Tgl: ${formatDateTime(sale.date)}`, 6, 32);
      doc.text(`Pelanggan: ${sale.customerName}`, 6, 36);
      let curY = 40;
      if (sale.customerPhone) {
        doc.text(`Telp/WA: ${sale.customerPhone}`, 6, curY);
        curY += 4;
      }
      if (sale.customerAddress) {
        doc.text(`Alamat: ${sale.customerAddress.substring(0, 30)}`, 6, curY);
        curY += 4;
      }
      doc.text('----------------------------------------', 40, curY, { align: 'center' });
      curY += 4;

      sale.items.forEach(item => {
        doc.text(`${item.itemName}`, 6, curY);
        curY += 4;
        doc.text(`${formatNumber(item.quantity)} ${item.unit} x ${formatCurrency(item.sellPrice)}`, 10, curY);
        doc.text(formatCurrency(item.subtotal), 74, curY, { align: 'right' });
        curY += 5;
      });

      doc.text('----------------------------------------', 40, curY, { align: 'center' });
      curY += 4;

      const previousDebt = sale.previousDebt !== undefined ? sale.previousDebt : (
        sale.totalCustomerDebt !== undefined && sale.totalCustomerDebt > Math.max(0, sale.grandTotal - sale.amountPaid)
          ? sale.totalCustomerDebt - Math.max(0, sale.grandTotal - sale.amountPaid)
          : 0
      );
      const previousSavings = sale.previousSavings !== undefined ? sale.previousSavings : (sale.customerDepositBalance || 0);
      const hasHutang = previousDebt > 0;
      const hasTabungan = !hasHutang && previousSavings > 0;
      const totalBarang = sale.totalBarang || sale.subtotal || sale.items.reduce((sum, i) => sum + i.subtotal, 0);
      const netBarang = sale.grandTotal;
      const amountPaid = sale.amountPaid || 0;

      let totalBarangPlusMinus = sale.totalBarangPlusHutang !== undefined ? sale.totalBarangPlusHutang : netBarang;
      let totalKeseluruhan = sale.totalOverall !== undefined ? sale.totalOverall : 0;
      let newSavings = sale.newSavingsRecorded || 0;

      if (sale.totalBarangPlusHutang === undefined) {
        if (hasHutang) {
          totalBarangPlusMinus = netBarang + previousDebt;
          totalKeseluruhan = Math.max(0, totalBarangPlusMinus - amountPaid);
          if (amountPaid > totalBarangPlusMinus) {
            newSavings = amountPaid - totalBarangPlusMinus;
          }
        } else if (hasTabungan) {
          totalBarangPlusMinus = Math.max(0, netBarang - previousSavings);
          totalKeseluruhan = Math.max(0, totalBarangPlusMinus - amountPaid);
          if (amountPaid > totalBarangPlusMinus) {
            newSavings = (amountPaid - totalBarangPlusMinus) + Math.max(0, previousSavings - netBarang);
          } else if (previousSavings > netBarang) {
            newSavings = previousSavings - netBarang;
          }
        } else {
          totalBarangPlusMinus = netBarang;
          totalKeseluruhan = Math.max(0, netBarang - amountPaid);
          if (amountPaid > netBarang) {
            newSavings = amountPaid - netBarang;
          }
        }
      }

      doc.setFont('courier', 'bold');
      doc.text('TOTAL BARANG:', 6, curY);
      doc.text(formatCurrency(totalBarang), 74, curY, { align: 'right' });
      curY += 4;
      doc.setFont('courier', 'normal');

      if (sale.discountEnabled !== false && sale.discount > 0) {
        doc.text('Diskon:', 6, curY);
        doc.text(`-${formatCurrency(sale.discount)}`, 74, curY, { align: 'right' });
        curY += 4;
      }
      if (sale.taxEnabled && sale.tax && sale.tax > 0) {
        doc.text(`Pajak${sale.taxType === 'percent' ? ` (${sale.taxValue}%)` : ''}:`, 6, curY);
        doc.text(`+${formatCurrency(sale.tax)}`, 74, curY, { align: 'right' });
        curY += 4;
      }
      if (sale.shippingEnabled && sale.shippingCost && sale.shippingCost > 0) {
        doc.text('Ongkos Kirim:', 6, curY);
        doc.text(`+${formatCurrency(sale.shippingCost)}`, 74, curY, { align: 'right' });
        curY += 4;
      }
      if (sale.otherCostEnabled && sale.otherCost && sale.otherCost > 0) {
        doc.text('Lain-lain:', 6, curY);
        doc.text(`+${formatCurrency(sale.otherCost)}`, 74, curY, { align: 'right' });
        curY += 4;
      }

      if (hasTabungan) {
        doc.text('TABUNGAN:', 6, curY);
        doc.text(formatCurrency(previousSavings), 74, curY, { align: 'right' });
        curY += 4;
        doc.setFont('courier', 'bold');
        doc.text('TOTAL BRG - TBG:', 6, curY);
        doc.text(formatCurrency(totalBarangPlusMinus), 74, curY, { align: 'right' });
        curY += 4;
        doc.setFont('courier', 'normal');
      } else {
        doc.text('SISA HUTANG:', 6, curY);
        doc.text(formatCurrency(previousDebt || 0), 74, curY, { align: 'right' });
        curY += 4;
        doc.setFont('courier', 'bold');
        doc.text('TOTAL BRG + HTG:', 6, curY);
        doc.text(formatCurrency(totalBarangPlusMinus), 74, curY, { align: 'right' });
        curY += 4;
        doc.setFont('courier', 'normal');
      }

      doc.text(`BAYAR (${sale.paymentMethod}):`, 6, curY);
      doc.text(formatCurrency(amountPaid), 74, curY, { align: 'right' });
      curY += 5;

      const excessSavingsThermal = newSavings || sale.overpaymentAmount || (amountPaid > totalBarangPlusMinus ? amountPaid - totalBarangPlusMinus : 0);
      if (excessSavingsThermal > 0) {
        doc.text('KELEBIHAN (TABUNGAN):', 6, curY);
        doc.text(`+${formatCurrency(excessSavingsThermal)}`, 74, curY, { align: 'right' });
        curY += 4;
      }

      doc.setFont('courier', 'bold');
      doc.text('TOTAL KESELURUHAN:', 6, curY);
      doc.text(formatCurrency(totalKeseluruhan), 74, curY, { align: 'right' });
      curY += 5;
      doc.setFont('courier', 'normal');

      if (isLunas) {
        curY += 2;
        doc.setFont('courier', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('*** L U N A S ***', 40, curY, { align: 'center' });
        doc.setFontSize(7);
        curY += 3.5;
        doc.text('SUDAH DIBAYAR LUNAS', 40, curY, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        curY += 3;
      } else {
        curY += 2;
        doc.setFont('courier', 'bold');
        doc.setTextColor(225, 29, 72);
        doc.text('*** BELUM LUNAS ***', 40, curY, { align: 'center' });
        doc.setFontSize(7);
        curY += 3.5;
        doc.text(`SISA KESELURUHAN: ${formatCurrency(totalKeseluruhan)}`, 40, curY, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        curY += 3;
      }

      curY += 4;
      doc.setFont('courier', 'normal');
      doc.text('Terima Kasih', 40, curY, { align: 'center' });
    }

    return { doc, fileName };
  }

  if (data.type === 'purchase') {
    const p = data.data;
    const fileName = `Faktur_Pembelian_${p.invoiceNumber}.pdf`;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 12, 14, 14, 2, 2, 'DF');

    if (activeLogo && activeLogo.startsWith('data:image')) {
      try {
        doc.addImage(activeLogo, 'PNG', 14.5, 12.5, 13, 13);
      } catch (e) {
        doc.setFillColor(16, 185, 129);
        doc.circle(21, 19, 5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text('ACG', 21, 21.2, { align: 'center' });
      }
    } else {
      doc.setFillColor(16, 185, 129);
      doc.circle(21, 19, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('ACG', 21, 21.2, { align: 'center' });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(store.name, 32, 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(store.address || 'Alamat Toko', 32, 22);
    doc.text(`Telp/WA: ${store.phone || '-'}`, 32, 26.5);

    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(138, 12, 58, 5.5, 1, 1, 'DF');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(6, 95, 70);
    doc.text('FAKTUR PEMBELIAN SUPPLIER', 167, 15.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(p.invoiceNumber, 196, 22.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tanggal: ${formatDateTime(p.date)}`, 196, 27, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 31, 196, 31);

    // Supplier details card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 34, 182, 34, 3, 3, 'DF');

    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(253, 230, 138);
    doc.circle(23, 42, 4.5, 'DF');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 53, 15);
    doc.text(p.supplierName.charAt(0).toUpperCase(), 23, 45, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(p.supplierName, 30, 41.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Pemasok / Supplier Usaha', 30, 46);

    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(148, 37.5, 44, 6, 3, 3, 'DF');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52);
    doc.text(`Status: ${p.paymentStatus}`, 170, 41.7, { align: 'center' });

    doc.setDrawColor(241, 245, 249);
    doc.line(18, 49, 192, 49);

    const cardW = 42.5;
    const cardH = 12;
    const cardY = 52;
    const infoList = [
      { label: 'SUPPLIER:', val: p.supplierName },
      { label: 'NO. WHATSAPP SUPPLIER:', val: '-' },
      { label: 'METODE PEMBAYARAN:', val: p.paymentMethod },
      { label: 'PETUGAS / ADMIN:', val: p.createdBy }
    ];

    infoList.forEach((info, i) => {
      const cX = 18 + i * (cardW + 2.7);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cX, cardY, cardW, cardH, 1.5, 1.5, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(info.label, cX + 2.5, cardY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(info.val, cX + 2.5, cardY + 9);
    });

    // Items table
    const tableRows = p.items.map((item, idx) => [
      idx + 1,
      `${formatNumber(item.quantity)} ${item.unit}`,
      item.itemName,
      formatCurrency(item.buyPrice),
      formatCurrency(item.subtotal)
    ]);

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, 71, 182, 7, 1.5, 1.5, 'DF');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`RINCIAN ITEM BARANG DIBELI (${p.items.length} ITEM)`, 18, 75.8);

    autoTable(doc, {
      startY: 78,
      head: [['No', 'Jumlah', 'Nama Item', 'Harga Satuan', 'Subtotal']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
        lineWidth: 0.15,
        lineColor: [203, 213, 225]
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      margin: { left: 14, right: 14 }
    });

    const finalTableY = (doc as any).lastAutoTable?.finalY || 130;
    const calcY = finalTableY + 6;

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, calcY, 182, 7, 1.5, 1.5, 'DF');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('RINCIAN PEMBAYARAN SUPPLIER', 18, calcY + 4.8);

    autoTable(doc, {
      startY: calcY + 7,
      body: [
        ['Nominal Dibayar:', formatCurrency(p.amountPaid)],
        ['Sisa Hutang Ke Supplier:', formatCurrency(p.remainingDebt)]
      ],
      foot: [
        ['Total Pembelian Supplier (Grand Total):', formatCurrency(p.grandTotal)]
      ],
      theme: 'grid',
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      footStyles: {
        fillColor: [254, 243, 199],
        textColor: [6, 95, 70],
        fontStyle: 'bold',
        fontSize: 9.5,
        lineWidth: 0.2,
        lineColor: [203, 213, 225]
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 50, halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    return { doc, fileName };
  }

  if (data.type === 'salary') {
    const s = data.data;
    const fileName = `Slip_Gaji_${s.slipNumber}.pdf`;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(store.name, 14, 22);
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129); // Emerald-600
    doc.text('SLIP GAJI KARYAWAN', 196, 22, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`No: ${s.slipNumber}`, 196, 28, { align: 'right' });
    doc.text(`Karyawan: ${s.employeeName} (${s.employeeRole})`, 14, 32);

    autoTable(doc, {
      startY: 42,
      head: [['Komponen', 'Keterangan', 'Jumlah']],
      body: [
        ['Hari Kehadiran', `${s.daysPresent} Hari`, formatCurrency(s.totalDailyWage)],
        ['Lembur', `${s.totalOvertimeHours ? `${s.totalOvertimeHours} Jam (${s.daysOvertime} Hari)` : `${s.daysOvertime} Hari`}`, formatCurrency(s.totalOvertimePay)],
        ['Uang Makan / Tunjangan', '-', formatCurrency(s.allowance)],
        ['Bonus Tambahan', '-', formatCurrency(s.bonus)],
        ['Potongan / Kasbon', '-', `-${formatCurrency(s.deduction)}`],
        ['TOTAL BERSIH (THP)', 'Diterima Karyawan', formatCurrency(s.netSalary)]
      ],
      theme: 'striped',
      headStyles: { fillColor: [236, 253, 245], textColor: [6, 95, 70] },
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 120;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Dokumen Slip Gaji Elektronik ini sah diterbitkan otomatis oleh sistem ${store.name}. Valid tanpa tanda tangan basah.`,
      14,
      finalY
    );

    return { doc, fileName };
  }

  // Payment receipt
  const r = data.data;
  const payAmount = (r.paymentAmount !== undefined && r.paymentAmount !== null)
    ? r.paymentAmount
    : ((r.amount !== undefined && r.amount !== null) ? r.amount : 0);
  const invAmount = (r.totalInvoiceAmount !== undefined && r.totalInvoiceAmount !== null)
    ? r.totalInvoiceAmount
    : ((r.grandTotal !== undefined && r.grandTotal !== null) ? r.grandTotal : 0);
  const isBKK = r.receiptNo?.startsWith('BKK') || r.receiptType === 'BKK';
  const defaultTitle = isBKK 
    ? (r.remainingDebt === 0 ? 'BUKTI PELUNASAN KAS KELUAR (BKK)' : 'BUKTI PEMBAYARAN CICILAN KAS KELUAR (BKK)')
    : (r.remainingDebt === 0 ? 'BUKTI PELUNASAN KAS MASUK (BKM)' : 'BUKTI PENERIMAAN CICILAN KAS MASUK (BKM)');
  const receiptTitle = r.title || defaultTitle;

  const fileName = `Kuitansi_${r.receiptNo}.pdf`;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(store.name, 14, 22);
  doc.text(receiptTitle || 'KUITANSI PEMBAYARAN', 196, 22, { align: 'right' });
  doc.setFontSize(10);
  doc.text(`No: ${r.receiptNo}`, 196, 28, { align: 'right' });
  doc.text(`Penerima / Pembayar: ${r.counterpartyName}`, 14, 32);

  autoTable(doc, {
    startY: 42,
    head: [['Deskripsi', 'Keterangan', 'Nominal']],
    body: [
      ['No. Faktur Rujukan', r.invoiceNumber, invAmount > 0 ? formatCurrency(invAmount) : '-'],
      ['Pembayaran Diterima', `Metode: ${r.paymentMethod}`, formatCurrency(payAmount)],
      ['Sisa Tagihan Setelah Ini', '-', formatCurrency(r.remainingDebt)]
    ],
    theme: 'grid',
    margin: { left: 14, right: 14 }
  });

  return { doc, fileName };
}

/**
 * Membuat dokumen PDF untuk Matriks Pre-Order & Rekap Kebutuhan Potong Ayam
 */
export function createPreOrderMatrixPdf(
  activePreOrders: any[],
  items: any[],
  itemDemands: Record<string, number>,
  store: StoreProfile
): { doc: jsPDF; fileName: string; summaryText: string } {
  const isLandscape = items.length > 4;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const fileName = `Rekap_PO_${formatDate(new Date().toISOString().substring(0, 10)).replace(/\s+/g, '_')}.pdf`;

  // Header Top Left: Store Logo & Name (Persis seperti di Nota)
  let startX = 14;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 11, 14, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 11, 14, 14, 2, 2, 'D');

  if (store.logoUrl && store.logoUrl.startsWith('data:image')) {
    try {
      doc.addImage(store.logoUrl, 'PNG', 15, 12, 12, 12);
    } catch (e) {
      doc.setFillColor(16, 185, 129);
      doc.circle(21, 18, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('ACG', 21, 20.2, { align: 'center' });
    }
  } else {
    doc.setFillColor(16, 185, 129);
    doc.circle(21, 18, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('ACG', 21, 20.2, { align: 'center' });
  }

  startX = 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(store.name, startX, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(store.address || 'Alamat Toko', startX, 22);
  doc.text(`Telp/WA: ${store.phone || '-'}`, startX, 26);

  // Header Top Right: Document Title & Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text('REKAP PRE-ORDER & KEBUTUHAN POTONG AYAM', pageWidth - 14, 17, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Dicetak: ${formatDateTime(new Date().toISOString())}`, pageWidth - 14, 23, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 29, pageWidth - 14, 29);

  // Prepare AutoTable data
  const head = [['Pelanggan', ...items.map(it => it.name)]];

  // Row 1: STOK ITEM
  const stockRow = ['STOK ITEM', ...items.map(it => `${formatNumber(it.currentStock)} ${it.unit}`)];

  // Rows 2..N: Customer Orders
  const customerRows = activePreOrders.map(po => {
    return [
      po.customerName,
      ...items.map(it => {
        const pi = po.items.find((i: any) => i.itemId === it.id || i.itemName?.toLowerCase() === it.name?.toLowerCase());
        return pi && pi.quantity > 0 ? `${formatNumber(pi.quantity)} ${it.unit}` : '-';
      })
    ];
  });

  // Footer Row 1: TOTAL PESANAN
  const totalDemandRow = ['TOTAL PESANAN', ...items.map(it => `${formatNumber(itemDemands[it.id] || 0)} ${it.unit}`)];

  // Footer Row 2: STOK AKHIR
  const stokAkhirRow = [
    'STOK AKHIR',
    ...items.map(it => {
      const demand = itemDemands[it.id] || 0;
      const finalStock = it.currentStock - demand;
      const status = finalStock >= 0 ? 'Cukup' : 'Kurang';
      return `${formatNumber(finalStock)} ${it.unit}\n${status}`;
    })
  ];

  autoTable(doc, {
    startY: 33,
    head: head,
    body: [stockRow, ...customerRows],
    foot: [totalDemandRow, stokAkhirRow],
    theme: 'grid',
    tableLineWidth: 0.25,
    tableLineColor: [71, 85, 105],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      lineWidth: 0.25,
      lineColor: [71, 85, 105],
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      halign: 'center',
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
    },
    footStyles: {
      fillColor: [30, 41, 59],
      textColor: [253, 230, 138],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      lineWidth: 0.25,
      lineColor: [71, 85, 105],
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Pastikan border antar sel di foot dan body terarsir jelas
      if (data.section === 'foot' || (data.section === 'body' && data.row.index === 0)) {
        data.cell.styles.lineWidth = 0.25;
        data.cell.styles.lineColor = [71, 85, 105];
      }

      // STOK ITEM (row 0 di body): disamakan posisi tengah dan warnanya dengan TOTAL PESANAN & STOK AKHIR
      if (data.row.index === 0 && data.section === 'body') {
        data.cell.styles.fillColor = [30, 41, 59];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [253, 230, 138];
        data.cell.styles.halign = 'center';
      }

      // Footer Row 0: TOTAL PESANAN
      if (data.section === 'foot' && data.row.index === 0) {
        data.cell.styles.fillColor = [30, 41, 59];
        data.cell.styles.textColor = [253, 230, 138];
        data.cell.styles.halign = 'center';
        data.cell.styles.fontStyle = 'bold';
      }

      // Footer Row 1: STOK AKHIR (hijau untuk cukup, merah untuk kurang, persis tampilan di registrasi PO)
      if (data.section === 'foot' && data.row.index === 1) {
        if (data.column.index === 0) {
          data.cell.styles.fillColor = [30, 41, 59];
          data.cell.styles.textColor = [253, 230, 138];
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
        } else {
          const it = items[data.column.index - 1];
          if (it) {
            const demand = itemDemands[it.id] || 0;
            const finalStock = it.currentStock - demand;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.halign = 'center';
            if (finalStock < 0) {
              // Merah: Kurang
              data.cell.styles.fillColor = [76, 5, 25]; // Dark Rose
              data.cell.styles.textColor = [254, 202, 202]; // Rose text
              data.cell.styles.lineColor = [225, 29, 72]; // Rose border
              data.cell.styles.lineWidth = 0.35;
            } else {
              // Ijo: Cukup
              data.cell.styles.fillColor = [6, 78, 59]; // Dark Emerald
              data.cell.styles.textColor = [167, 243, 208]; // Emerald text
              data.cell.styles.lineColor = [16, 185, 129]; // Emerald border
              data.cell.styles.lineWidth = 0.35;
            }
          }
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  // Text summary for WhatsApp
  const itemStatusText = items.map(it => {
    const demand = itemDemands[it.id] || 0;
    const finalStock = it.currentStock - demand;
    const status = finalStock >= 0 ? `✓ Cukup (+${formatNumber(finalStock)} ${it.unit})` : `⚠ Kurang ${formatNumber(Math.abs(finalStock))} ${it.unit} (Perlu Dipotong)`;
    return `• *${it.name}*: Pesanan: ${formatNumber(demand)} ${it.unit} | Stok: ${formatNumber(it.currentStock)} ${it.unit} -> ${status}`;
  }).join('\n');

  const customerListText = activePreOrders.map((po, idx) => {
    const ordered = po.items.map((i: any) => `${i.itemName} (${formatNumber(i.quantity)} ${i.unit})`).join(', ');
    return `${idx + 1}. *${po.customerName}*: ${ordered || 'Belum ada item'}`;
  }).join('\n');

  const summaryText = 
    `*REKAP PRE-ORDER & KEBUTUHAN POTONG AYAM - ${store.name.toUpperCase()}*\n` +
    `Waktu: ${formatDateTime(new Date().toISOString())}\n` +
    `Total Pesanan Masuk: ${activePreOrders.length} Pelanggan\n` +
    `----------------------------------------\n` +
    `*STATUS KEBUTUHAN & KECUKUPAN STOK:* \n` +
    `${itemStatusText}\n` +
    `----------------------------------------\n` +
    `*RINCIAN PESANAN PELANGGAN:*\n` +
    `${customerListText || '- Belum ada pesanan'}\n` +
    `----------------------------------------\n` +
    `*Dokumen PDF Resmi:* ${fileName}\n` +
    `_${store.name}_`;

  return { doc, fileName, summaryText };
}

