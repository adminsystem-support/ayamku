import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  Receipt, 
  Check, 
  Building2, 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  Truck,
  ShieldCheck,
  QrCode,
  Store,
  MessageSquare,
  Share2,
  Download,
  Loader2,
  CheckCircle2,
  Copy,
  Mail,
  Send,
  History,
  Image as ImageIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { 
  SaleTransaction, 
  PurchaseTransaction, 
  SalarySlip, 
  StoreProfile,
  Customer,
  Supplier,
  Employee,
  AttendanceRecord,
  CustomerPreOrder,
  Item,
  DailyFinancialReportData
} from '../types/index.ts';
import { formatCurrency, formatNumber, formatDate, formatDateTime, generateWhatsAppSalaryMessage } from '../utils/formatters.ts';
import { createDocumentPdf, formatWhatsAppPhone, generateWhatsAppMessage, getStoreLogoDataUrl } from '../utils/documentPdf.ts';

export type PrintData = 
  | { type: 'sale'; data: SaleTransaction }
  | { type: 'purchase'; data: PurchaseTransaction }
  | { type: 'salary'; data: SalarySlip }
  | { type: 'preorder_single'; data: CustomerPreOrder }
  | { 
      type: 'preorder_rekap'; 
      data: {
        preorders: CustomerPreOrder[];
        items: Item[];
      };
    }
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
    }
  | {
      type: 'daily_financial_report';
      data: DailyFinancialReportData;
    };

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  printData: PrintData | null;
  storeProfile: StoreProfile;
  customers?: Customer[];
  suppliers?: Supplier[];
  employees?: Employee[];
  attendanceRecords?: AttendanceRecord[];
  sales?: SaleTransaction[];
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  printData,
  storeProfile,
  customers = [],
  suppliers = [],
  employees = [],
  attendanceRecords = [],
  sales = [],
}) => {
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('thermal');
  const [thermalSize, setThermalSize] = useState<'58mm' | '80mm'>(storeProfile.thermalWidth || '58mm');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingJpg, setIsGeneratingJpg] = useState(false);
  const [waGuideAlert, setWaGuideAlert] = useState<{ show: boolean; fileName: string; phone?: string; format?: 'PDF' | 'JPG' } | null>(null);
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [showShareMenuModal, setShowShareMenuModal] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Automatically lookup and populate customer/supplier/employee phone number
  React.useEffect(() => {
    if (!printData) {
      setRecipientPhone('');
      return;
    }
    let detectedPhone = '';
    if (printData.type === 'sale') {
      const sale = printData.data;
      if (sale.customerPhone) {
        detectedPhone = sale.customerPhone;
      } else {
        const found = customers.find(c => c.id === sale.customerId || c.name.toLowerCase() === sale.customerName?.toLowerCase());
        detectedPhone = found?.phone || '';
      }
    } else if (printData.type === 'purchase') {
      const p = printData.data;
      const found = suppliers.find(s => s.id === p.supplierId || s.name.toLowerCase() === p.supplierName?.toLowerCase());
      detectedPhone = found?.phone || '';
    } else if (printData.type === 'salary') {
      const s = printData.data;
      const found = employees.find(e => e.id === s.employeeId || e.name.toLowerCase() === s.employeeName?.toLowerCase());
      detectedPhone = found?.phone || '';
    } else if (printData.type === 'payment_receipt') {
      const r = printData.data;
      const foundCust = customers.find(c => c.name.toLowerCase() === r.counterpartyName?.toLowerCase());
      if (foundCust?.phone) {
        detectedPhone = foundCust.phone;
      } else {
        const foundSupp = suppliers.find(s => s.name.toLowerCase() === r.counterpartyName?.toLowerCase());
        detectedPhone = foundSupp?.phone || '';
      }
    }
    setRecipientPhone(detectedPhone || '');
  }, [printData, isOpen, customers, suppliers, employees]);

  // Customer debt and deposit calculations for sale invoice
  const saleCustomerInfo = React.useMemo(() => {
    if (printData?.type !== 'sale') return null;
    const sale = printData.data;
    const cust = customers.find(c => c.id === sale.customerId || c.name.toLowerCase() === sale.customerName?.toLowerCase());
    
    const customerPhone = sale.customerPhone || cust?.phone || '-';
    const customerAddress = sale.customerAddress || cust?.address || '-';

    // Sisa piutang pada nota ini
    const noteRemainingDebt = sale.remainingDebt !== undefined ? sale.remainingDebt : Math.max(0, (sale.grandTotal || 0) - (sale.amountPaid || 0));

    // Sisa piutang nota-nota lainnya dari customer ini
    const otherNotesDebt = sales
      ? sales
          .filter(s => s.id !== sale.id && (s.customerId === sale.customerId || s.customerName.toLowerCase() === sale.customerName.toLowerCase()))
          .reduce((sum, s) => {
            const rem = s.remainingDebt !== undefined ? s.remainingDebt : Math.max(0, s.grandTotal - (s.amountPaid || 0));
            return sum + rem;
          }, 0)
      : 0;

    const previousDebt = Math.max(sale.previousDebt || 0, otherNotesDebt);

    let previousSavings = sale.previousSavings !== undefined ? sale.previousSavings : (cust?.depositBalance || 0);
    if (!previousSavings && sales) {
      const earlierSales = sales
        .filter(s => s.id !== sale.id && (s.customerId === sale.customerId || s.customerName.toLowerCase() === sale.customerName.toLowerCase()))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (earlierSales.length > 0) {
        if (earlierSales[0].customerDepositBalance && earlierSales[0].customerDepositBalance > 0) {
          previousSavings = earlierSales[0].customerDepositBalance;
        } else if (earlierSales[0].newSavingsRecorded && earlierSales[0].newSavingsRecorded > 0) {
          previousSavings = earlierSales[0].newSavingsRecorded;
        } else if (earlierSales[0].overpaymentAmount && earlierSales[0].overpaymentAmount > 0) {
          previousSavings = earlierSales[0].overpaymentAmount;
        }
      }
    }

    const hasHutang = previousDebt > 0;
    const hasTabungan = !hasHutang && previousSavings > 0;

    const itemSubtotal = sale.subtotal || sale.items.reduce((sum, i) => sum + i.subtotal, 0);
    const netBarang = sale.grandTotal;
    const amountPaid = sale.amountPaid || 0;

    let totalBarangPlusMinus = netBarang;
    let totalKeseluruhan = 0;
    let newSavings = 0;

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

    if (sale.newSavingsRecorded && sale.newSavingsRecorded > 0) {
      newSavings = Math.max(newSavings, sale.newSavingsRecorded);
    }

    const totalAllDebt = sale.totalCustomerDebt !== undefined 
      ? sale.totalCustomerDebt 
      : totalKeseluruhan;

    const overpayment = sale.overpaymentAmount || newSavings;
    const depositBalance = sale.customerDepositBalance !== undefined 
      ? sale.customerDepositBalance 
      : (cust?.depositBalance || newSavings);

    const isFullyLunas = (
      !hasHutang &&
      previousDebt === 0 &&
      otherNotesDebt === 0 &&
      noteRemainingDebt === 0 &&
      totalKeseluruhan === 0 &&
      totalAllDebt === 0 &&
      sale.paymentStatus === 'Lunas'
    );

    return {
      customerPhone,
      customerAddress,
      noteRemainingDebt,
      otherNotesDebt,
      previousDebt,
      previousSavings,
      hasHutang,
      hasTabungan,
      itemSubtotal,
      netBarang,
      totalBarangPlusMinus,
      totalKeseluruhan,
      newSavings,
      totalAllDebt,
      overpayment,
      depositBalance,
      isFullyLunas,
    };
  }, [printData, customers, sales]);

  // Auto-switch to A4 format and add landscape body class when viewing rekap PO
  React.useEffect(() => {
    if (printData?.type === 'preorder_rekap') {
      setPrintFormat('a4');
    }
  }, [printData]);

  React.useEffect(() => {
    if (isOpen && printData?.type === 'preorder_rekap') {
      document.body.classList.add('print-landscape');
      return () => {
        document.body.classList.remove('print-landscape');
      };
    }
  }, [isOpen, printData]);

  if (!isOpen || !printData) return null;

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('window.print() error:', e);
      try {
        window.focus();
        window.print();
      } catch (err) {
        alert('Gagal membuka dialog cetak browser. Silakan gunakan fungsi cetak browser Anda.');
      }
    }
  };

  const downloadBlobAsFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const generatePdfBlob = async (): Promise<{ blob: Blob; fileName: string; summaryText: string } | null> => {
    let fileName = `Dokumen_${Date.now()}.pdf`;
    if (printData.type === 'sale') fileName = `Nota_Penjualan_${printData.data.invoiceNumber}.pdf`;
    else if (printData.type === 'purchase') fileName = `Faktur_Pembelian_${printData.data.invoiceNumber}.pdf`;
    else if (printData.type === 'salary') fileName = `Slip_Gaji_${printData.data.slipNumber}.pdf`;
    else if (printData.type === 'payment_receipt') fileName = `Kuitansi_${printData.data.receiptNo}.pdf`;
    else if (printData.type === 'preorder_rekap') fileName = `Rekap_PO_${new Date().toISOString().substring(0, 10)}.pdf`;
    else if (printData.type === 'daily_financial_report') fileName = `Laporan_Keuangan_${printData.data.reportDate}.pdf`;

    const summaryText = generateWhatsAppMessage(printData, storeProfile, recipientPhone);

    // Pre-load store logo as Base64 Data URL so html2canvas and jsPDF vector render it 100% reliably
    const logoDataUrl = await getStoreLogoDataUrl(storeProfile.logoUrl || '/logo_unggas.svg');

    const el = document.getElementById('printable-document');
    if (el) {
      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            if (logoDataUrl) {
              const imgs = clonedDoc.querySelectorAll('img');
              imgs.forEach(img => {
                img.crossOrigin = 'anonymous';
                img.src = logoDataUrl;
              });
            }
          }
        });

        const imgData = canvas.toDataURL('image/png');
        const isLandscape = printData.type === 'preorder_rekap';
        const isThermal = printFormat === 'thermal' && !isLandscape;

        const pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: isThermal
            ? (thermalSize === '58mm' ? [58, Math.max(90, (canvas.height * 58) / canvas.width)] : [80, Math.max(120, (canvas.height * 80) / canvas.width)])
            : 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        const pageHeight = pdf.internal.pageSize.getHeight();

        if (isThermal || pdfHeight <= pageHeight) {
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        } else {
          let heightLeft = pdfHeight;
          let position = 0;

          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position = heightLeft - pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
          }
        }

        const blob = pdf.output('blob');
        return { blob, fileName, summaryText };
      } catch (err) {
        console.warn('html2canvas rendering fallback:', err);
      }
    }

    // Fallback to jsPDF vector with loaded logo
    const { doc } = createDocumentPdf(printData, storeProfile, printFormat, logoDataUrl);
    const blob = doc.output('blob');
    return { blob, fileName, summaryText };
  };

  const handleSharePdfWhatsApp = async () => {
    setIsGeneratingPdf(true);
    const cleanPhone = formatWhatsAppPhone(recipientPhone);

    try {
      const res = await generatePdfBlob();
      if (!res) return;

      // Auto-download PDF for easy attachment
      downloadBlobAsFile(res.blob, res.fileName);
      setWaGuideAlert({ show: true, fileName: res.fileName, phone: recipientPhone });

      // Check if mobile Web Share API with files is supported (Android/iOS)
      const file = new File([res.blob], res.fileName, { type: 'application/pdf' });
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: res.fileName,
          });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }

      // Open WhatsApp directly without pre-filled text for nota
      const waText = res.summaryText ? encodeURIComponent(res.summaryText) : '';
      const waUrl = cleanPhone 
        ? (waText ? `https://wa.me/${cleanPhone}?text=${waText}` : `https://wa.me/${cleanPhone}`)
        : (waText ? `https://wa.me/?text=${waText}` : `https://wa.me/`);

      window.open(waUrl, '_blank');
    } catch (e: any) {
      console.error('Error generating/sharing PDF:', e);
      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}`
        : `https://wa.me/`;
      window.open(waUrl, '_blank');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await generatePdfBlob();
      if (!res) return;
      downloadBlobAsFile(res.blob, res.fileName);
    } catch (e) {
      console.error('Error downloading PDF:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleUniversalSharePdf = async () => {
    setIsGeneratingPdf(true);
    const cleanPhone = formatWhatsAppPhone(recipientPhone);
    try {
      const res = await generatePdfBlob();
      if (!res) return;

      const file = new File([res.blob], res.fileName, { type: 'application/pdf' });

      // 1. Try Native OS Share Sheet with PDF file (Android / iOS)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: res.fileName,
          });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }

      // 2. Direct WhatsApp Web/App redirect with auto-downloaded PDF
      downloadBlobAsFile(res.blob, res.fileName);
      setWaGuideAlert({ show: true, fileName: res.fileName, phone: recipientPhone, format: 'PDF' });

      const waText = res.summaryText ? encodeURIComponent(res.summaryText) : '';
      const waUrl = cleanPhone 
        ? (waText ? `https://wa.me/${cleanPhone}?text=${waText}` : `https://wa.me/${cleanPhone}`)
        : (waText ? `https://wa.me/?text=${waText}` : `https://wa.me/`);

      window.open(waUrl, '_blank');
    } catch (e) {
      console.error('Error in universal share:', e);
      setShowShareMenuModal(true);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const generateJpgBlob = async (): Promise<{ blob: Blob; fileName: string; summaryText: string } | null> => {
    let baseName = `Dokumen_${Date.now()}`;
    if (printData.type === 'sale') baseName = `Nota_Penjualan_${printData.data.invoiceNumber}`;
    else if (printData.type === 'purchase') baseName = `Faktur_Pembelian_${printData.data.invoiceNumber}`;
    else if (printData.type === 'salary') baseName = `Slip_Gaji_${printData.data.slipNumber}`;
    else if (printData.type === 'payment_receipt') baseName = `Kuitansi_${printData.data.receiptNo}`;
    else if (printData.type === 'daily_financial_report') baseName = `Laporan_Keuangan_${printData.data.reportDate}`;

    const fileName = `${baseName}.jpg`;
    const summaryText = generateWhatsAppMessage(printData, storeProfile, recipientPhone);
    const logoDataUrl = await getStoreLogoDataUrl(storeProfile.logoUrl || '/logo_unggas.svg');

    const el = document.getElementById('printable-document');
    if (!el) return null;

    try {
      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          if (logoDataUrl) {
            const imgs = clonedDoc.querySelectorAll('img');
            imgs.forEach((img) => {
              img.crossOrigin = 'anonymous';
              img.src = logoDataUrl;
            });
          }
        },
      });

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, fileName, summaryText });
            } else {
              resolve(null);
            }
          },
          'image/jpeg',
          0.95
        );
      });
    } catch (err) {
      console.error('Error generating JPG:', err);
      return null;
    }
  };

  const handleDownloadJpg = async () => {
    setIsGeneratingJpg(true);
    try {
      const res = await generateJpgBlob();
      if (!res) return;
      downloadBlobAsFile(res.blob, res.fileName);
    } catch (e) {
      console.error('Error downloading JPG:', e);
    } finally {
      setIsGeneratingJpg(false);
    }
  };

  const handleUniversalShareJpg = async () => {
    setIsGeneratingJpg(true);
    const cleanPhone = formatWhatsAppPhone(recipientPhone);
    try {
      const res = await generateJpgBlob();
      if (!res) return;

      const file = new File([res.blob], res.fileName, { type: 'image/jpeg' });

      // 1. Try Native OS Share Sheet with JPG image (Android / iOS)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: res.fileName,
          });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }

      // 2. Direct WhatsApp Web/App redirect with auto-downloaded JPG image
      downloadBlobAsFile(res.blob, res.fileName);
      setWaGuideAlert({ show: true, fileName: res.fileName, phone: recipientPhone, format: 'JPG' });

      const waText = res.summaryText ? encodeURIComponent(res.summaryText) : '';
      const waUrl = cleanPhone 
        ? (waText ? `https://wa.me/${cleanPhone}?text=${waText}` : `https://wa.me/${cleanPhone}`)
        : (waText ? `https://wa.me/?text=${waText}` : `https://wa.me/`);

      window.open(waUrl, '_blank');
    } catch (e) {
      console.error('Error in universal share JPG:', e);
      setShowShareMenuModal(true);
    } finally {
      setIsGeneratingJpg(false);
    }
  };

  const handleCopySummaryText = () => {
    if (!printData) return;
    const text = generateWhatsAppMessage(printData, storeProfile, recipientPhone);
    navigator.clipboard.writeText(decodeURIComponent(text));
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const handleSendEmail = () => {
    if (!printData) return;
    const summary = generateWhatsAppMessage(printData, storeProfile, recipientPhone);
    const subject = encodeURIComponent(`Dokumen Nota - ${storeProfile.name}`);
    const body = encodeURIComponent(decodeURIComponent(summary));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 no-print-overlay">
      <div className={`bg-white rounded-2xl shadow-2xl ${printData?.type === 'preorder_rekap' ? 'max-w-6xl' : 'max-w-4xl'} w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200`}>
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Cetak Dokumen: {
                  printData.type === 'sale' ? 'Nota Penjualan Elektronik' : 
                  printData.type === 'purchase' ? 'Faktur Pembelian Supplier' : 
                  printData.type === 'salary' ? 'Slip Gaji Karyawan' :
                  printData.type === 'preorder_single' ? 'Dokumen Pre-Order (PO)' :
                  printData.type === 'preorder_rekap' ? 'Rekap Pre-Order Keseluruhan' :
                  printData.type === 'daily_financial_report' ? 'Laporan Keuangan Harian' :
                  'Kuitansi Pembayaran'
                }
              </h2>
              <p className="text-xs text-slate-500">Pilih format cetak A4 atau Struk Thermal</p>
            </div>
          </div>

          {/* Format Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  printFormat === 'thermal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Thermal ({thermalSize})</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  printFormat === 'a4'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Format A4</span>
              </button>
            </div>

            {printFormat === 'thermal' && (
              <select
                aria-label="Pilih Lebar Kertas Thermal"
                value={thermalSize}
                onChange={(e) => setThermalSize(e.target.value as '58mm' | '80mm')}
                className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 focus:outline-hidden"
              >
                <option value="58mm">58 mm</option>
                <option value="80mm">80 mm</option>
              </select>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors ml-2 cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center">
          
          {/* WA Guide Alert Banner */}
          {waGuideAlert && (
            <div className="w-full max-w-[760px] mb-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-start justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 no-print">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-900 text-xs">
                    {waGuideAlert.format === 'JPG' ? 'Gambar Nota (JPG)' : 'Dokumen Nota (PDF)'} "{waGuideAlert.fileName}" Siap Dikirim!
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    {waGuideAlert.phone ? (
                      <>Chat WhatsApp ke nomor tujuan <strong>{waGuideAlert.phone}</strong> telah dibuka langsung. </>
                    ) : (
                      <>WhatsApp telah dibuka. </>
                    )}
                    File {waGuideAlert.format === 'JPG' ? 'gambar JPG' : 'PDF resmi'} berdesain seragam dengan tampilan cetak sudah otomatis terunduh. Silakan lampirkan file tersebut melalui ikon klip/galeri di WhatsApp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaGuideAlert(null)}
                className="text-emerald-500 hover:text-emerald-900 font-bold p-1 cursor-pointer"
                title="Tutup Pesan"
              >
                ✕
              </button>
            </div>
          )}

          {/* Print container with dynamic styles */}
          <div 
            id="printable-document" 
            className={`bg-white shadow-sm transition-all text-slate-900 mx-auto ${
              printFormat === 'a4' 
                ? (printData.type === 'preorder_rekap'
                    ? 'w-full max-w-[1020px] p-8 border border-slate-200 rounded-xl print:p-0 print:border-none print:shadow-none print:max-w-full print:w-full'
                    : 'w-full max-w-[760px] p-8 border border-slate-200 rounded-xl print:p-0 print:border-none print:shadow-none print:max-w-full print:w-full')
                : thermalSize === '58mm'
                  ? 'w-[280px] p-4 text-[11px] font-mono border border-slate-300 rounded-lg print:p-0 print:border-none print:shadow-none print:w-[58mm] print:max-w-[58mm]'
                  : 'w-[360px] p-5 text-[12px] font-mono border border-slate-300 rounded-lg print:p-0 print:border-none print:shadow-none print:w-[80mm] print:max-w-[80mm]'
            }`}
          >
            {/* 1. SALE TRANSACTION TEMPLATE (STRUK SIMPEL SOLARIA STYLE) */}
            {printData.type === 'sale' && (
              <div className={`mx-auto p-4 sm:p-6 bg-white font-mono text-xs text-slate-900 space-y-3 ${printFormat === 'a4' ? 'max-w-[440px] border border-slate-300 rounded-xl' : 'w-full'}`}>
                {/* Header with Store Logo */}
                <div className="text-center space-y-1">
                  <div className="flex justify-center mb-1">
                    <img 
                      src={storeProfile.logoUrl || '/logo_unggas.svg'} 
                      alt="Logo" 
                      className="w-12 h-12 object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo_unggas.svg'; }} 
                    />
                  </div>
                  <div className="font-bold text-sm sm:text-base tracking-tight">{storeProfile.name}</div>
                  <div className="text-[10px] leading-tight text-slate-600">{storeProfile.address}</div>
                  <div className="text-[10px] text-slate-600">Telp: {storeProfile.phone}</div>
                </div>

                <div className="border-b border-dashed border-slate-400 my-2"></div>

                {/* Header Meta Info */}
                <div className="text-left text-[11px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>DATE:</span>
                    <span>{formatDateTime(printData.data.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Receipt No :</span>
                    <span className="font-bold">{printData.data.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CHASIER :</span>
                    <span className="font-bold">{printData.data.createdBy || 'Admin'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelanggan :</span>
                    <span className="font-bold truncate max-w-[170px]">{printData.data.customerName}</span>
                  </div>
                  {saleCustomerInfo?.customerPhone && (
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>No. HP :</span>
                      <span>{saleCustomerInfo.customerPhone}</span>
                    </div>
                  )}
                  {saleCustomerInfo?.customerAddress && (
                    <div className="flex justify-between items-start text-slate-600 text-[10px]">
                      <span className="shrink-0 mr-2">Alamat :</span>
                      <span className="text-right truncate max-w-[200px]">{saleCustomerInfo.customerAddress}</span>
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-slate-400 my-2"></div>

                {/* Items List (Solaria Style) */}
                <div className="text-left space-y-2 text-[11px]">
                  {printData.data.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold text-slate-900">{item.itemName}</div>
                      <div className="flex justify-between text-slate-700">
                        <span>
                          {formatNumber(item.quantity)} {item.unit} x {formatNumber(item.sellPrice)}
                        </span>
                        <span className="font-bold text-slate-900">{formatCurrency(item.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Separated Units Total Qty Breakdown (Stacked directly under Total Qty label, left aligned) */}
                {(() => {
                  const unitBreakdown = printData.data.items.reduce((acc, item) => {
                    const u = item.unit || 'Kg';
                    acc[u] = (acc[u] || 0) + (Number(item.quantity) || 0);
                    return acc;
                  }, {} as Record<string, number>);

                  const entries = Object.entries(unitBreakdown);

                  return (
                    <div className="text-[11px] font-mono text-slate-700 pt-1 pb-0.5 border-t border-dashed border-slate-300 space-y-0.5 text-left">
                      <div className="font-semibold text-slate-900">Total Qty :</div>
                      <div className="font-bold text-slate-900 flex flex-col items-start space-y-0.5">
                        {entries.length > 0 ? (
                          entries.map(([unit, qty], i) => (
                            <span key={i}>{formatNumber(qty)} {unit}</span>
                          ))
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="border-b border-dashed border-slate-400 my-2"></div>

                {/* Calculations Breakdown */}
                {(() => {
                  const totalBarang = saleCustomerInfo?.netBarang ?? printData.data.grandTotal;
                  const sisaHutang = saleCustomerInfo?.previousDebt || 0;
                  const tabunganLama = saleCustomerInfo?.previousSavings || 0;
                  const hasTabungan = tabunganLama > 0;

                  // Total barang + hutang atau barang - tabungan
                  const totalBarangPlusMinus = hasTabungan 
                    ? Math.max(0, totalBarang - tabunganLama)
                    : totalBarang + sisaHutang;

                  const bayar = printData.data.amountPaid || 0;
                  const totalKeseluruhan = Math.max(0, totalBarangPlusMinus - bayar);
                  const kelebihanBayar = bayar > totalBarangPlusMinus ? bayar - totalBarangPlusMinus : 0;

                  return (
                    <>
                      <div className="text-left space-y-1.5 text-[11px] font-mono">
                        {printData.data.discountEnabled !== false && printData.data.discount > 0 && (
                          <div className="flex justify-between text-rose-600 text-[10px]">
                            <span>Diskon Potongan:</span>
                            <span>-{formatCurrency(printData.data.discount)}</span>
                          </div>
                        )}

                        {printData.data.taxEnabled && printData.data.tax && printData.data.tax > 0 && (
                          <div className="flex justify-between text-slate-700 text-[10px]">
                            <span>Pajak ({printData.data.taxValue}%):</span>
                            <span>+{formatCurrency(printData.data.tax)}</span>
                          </div>
                        )}

                        {printData.data.shippingEnabled && printData.data.shippingCost && printData.data.shippingCost > 0 && (
                          <div className="flex justify-between text-slate-700 text-[10px]">
                            <span>Ongkos Kirim:</span>
                            <span>+{formatCurrency(printData.data.shippingCost)}</span>
                          </div>
                        )}

                        <div className="border-t border-dashed border-slate-300 pt-1"></div>

                        {/* Total Barang */}
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>TOTAL BARANG</span>
                          <span className="text-right">{formatCurrency(totalBarang)}</span>
                        </div>

                        {/* Kondisi Hutang atau Tabungan */}
                        {hasTabungan ? (
                          <>
                            <div className="flex justify-between font-bold text-emerald-700">
                              <span>TABUNGAN</span>
                              <span>{formatCurrency(tabunganLama)}</span>
                            </div>
                            <div className="flex justify-between font-extrabold text-slate-900 text-xs py-0.5">
                              <span>TOTAL BARANG - TABUNGAN</span>
                              <span>{formatCurrency(totalBarangPlusMinus)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between font-bold text-rose-700">
                              <span>SISA HUTANG</span>
                              <span>{formatCurrency(sisaHutang)}</span>
                            </div>
                            <div className="flex justify-between font-extrabold text-slate-900 text-xs py-0.5">
                              <span>TOTAL BARANG + HUTANG</span>
                              <span>{formatCurrency(totalBarangPlusMinus)}</span>
                            </div>
                          </>
                        )}

                        {/* BAYAR */}
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>BAYAR</span>
                          <span>{formatCurrency(bayar)}</span>
                        </div>

                        {/* TOTAL KESELURUHAN */}
                        <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-slate-900 text-slate-900">
                          <span>TOTAL KESELURUHAN</span>
                          <span>{formatCurrency(totalKeseluruhan)}</span>
                        </div>

                        {/* Kelebihan / Tabungan Baru */}
                        {(kelebihanBayar > 0 || (saleCustomerInfo?.newSavings && saleCustomerInfo.newSavings > 0)) && (
                          <div className="flex justify-between text-emerald-700 font-bold text-[10px] pt-0.5">
                            <span>KELEBIHAN (TABUNGAN BARU):</span>
                            <span>+{formatCurrency(kelebihanBayar || saleCustomerInfo?.newSavings || 0)}</span>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="my-2 text-center">
                        {totalKeseluruhan === 0 ? (
                          <span className="font-bold text-xs text-emerald-800 tracking-wider">
                            *** L U N A S ***
                          </span>
                        ) : (
                          <span className="font-bold text-xs text-rose-700 tracking-wider">
                            *** BELUM LUNAS ***
                          </span>
                        )}
                      </div>

                      <div className="border-b border-dashed border-slate-400 my-2"></div>

                      {/* Footer Section: Catatan & Ucapan Terima Kasih (Tanpa Tanda Tangan) */}
                      <div className="text-[11px] font-mono space-y-2 text-center">
                        {printData.data.notes && (
                          <div className="text-[10px] text-slate-800 bg-slate-50 p-2 rounded border border-slate-200 text-left">
                            <div className="font-bold uppercase text-[9px] text-slate-500 mb-0.5">CATATAN:</div>
                            <div>{printData.data.notes}</div>
                          </div>
                        )}

                        <div className="pt-1 text-[11px] font-bold text-slate-900 tracking-wide">
                          TERIMA KASIH
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 2. PURCHASE TRANSACTION TEMPLATE (BUKTI PEMBELIAN) */}
            {printData.type === 'purchase' && (
              printFormat === 'a4' ? (
                // A4 Purchase Invoice styled like Salary Slip
                <div className="space-y-5">
                  {/* Header with Store Logo */}
                  <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                        <img src={storeProfile.logoUrl || '/logo_unggas.svg'} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{storeProfile.name}</h1>
                        <p className="text-xs text-slate-600 mt-0.5 max-w-sm">{storeProfile.address}</p>
                        <p className="text-xs text-slate-600 mt-0.5">Telp/WA: {storeProfile.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        FAKTUR PEMBELIAN SUPPLIER
                      </span>
                      <h2 className="text-sm font-bold font-mono text-slate-900 mt-1">{printData.data.invoiceNumber}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tanggal: {formatDateTime(printData.data.date)}
                      </p>
                    </div>
                  </div>

                  {/* Supplier Details & Info Grid Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-base border border-amber-200/80 shrink-0">
                          {printData.data.supplierName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{printData.data.supplierName}</h3>
                          <p className="text-[11px] font-medium text-slate-500">Pemasok / Supplier Usaha</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        printData.data.paymentStatus === 'Lunas' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        Status: {printData.data.paymentStatus}
                      </span>
                    </div>

                    {/* 4 Info Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">SUPPLIER:</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{printData.data.supplierName}</span>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">NO. WHATSAPP SUPPLIER:</span>
                        <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600 inline shrink-0" />
                          {(() => {
                            const found = suppliers.find(s => s.id === printData.data.supplierId || s.name.toLowerCase() === printData.data.supplierName?.toLowerCase());
                            return found?.phone || '-';
                          })()}
                        </span>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">METODE PEMBAYARAN:</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{printData.data.paymentMethod}</span>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">PETUGAS / ADMIN:</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{printData.data.createdBy}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items Table Section */}
                  <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
                    <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-600" />
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                          RINCIAN ITEM BARANG DIBELI ({printData.data.items.length} ITEM)
                        </h4>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                          <tr>
                            <th className="py-2.5 px-3 border-r border-slate-300 w-10 text-center">No</th>
                            <th className="py-2.5 px-3 text-right border-r border-slate-300 w-28">Jumlah</th>
                            <th className="py-2.5 px-3 border-r border-slate-300">Nama Item</th>
                            <th className="py-2.5 px-3 text-right border-r border-slate-300 w-32">Harga Satuan</th>
                            <th className="py-2.5 px-3 text-right w-36">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-xs">
                          {printData.data.items.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="py-2 px-3 text-slate-500 border-r border-slate-200 text-center">{idx + 1}</td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-slate-200 font-semibold text-slate-900">
                                {formatNumber(item.quantity)} {item.unit}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-800 border-r border-slate-200">{item.itemName}</td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-slate-200 text-slate-700">{formatCurrency(item.targetSellPrice || 0)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-900">{formatCurrency(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-amber-50/80 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                          <tr>
                            <td colSpan={2} className="py-2.5 px-4 text-left font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                              Total Qty
                            </td>
                            <td colSpan={3} className="py-2.5 px-4 text-left font-mono font-bold text-slate-900 whitespace-nowrap">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap">
                                {Object.entries(
                                  printData.data.items.reduce((acc, item) => {
                                    acc[item.unit] = (acc[item.unit] || 0) + item.quantity;
                                    return acc;
                                  }, {} as Record<string, number>)
                                ).map(([unit, qty]) => (
                                  <span key={unit} className="whitespace-nowrap font-mono text-slate-900 font-bold">
                                    {formatNumber(qty)} {unit}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Calculations Breakdown Box */}
                  <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs text-xs">
                    <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                        RINCIAN MODAL & TOTAL PEMBELIAN
                      </h4>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <tbody className="divide-y divide-slate-200 font-medium text-xs">
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3.5 text-slate-800 border-r border-slate-200">Total Nilai Modal Pembelian:</td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-900">{formatCurrency(printData.data.grandTotal)}</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3.5 text-slate-800 border-r border-slate-200">Nominal Telah Dibayar:</td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(printData.data.amountPaid || 0)}</td>
                          </tr>
                          {(printData.data.paymentStatus === 'Sebagian' || (printData.data.remainingDebt || 0) > 0) && (
                            <tr className="bg-rose-50/70 text-rose-900 font-semibold">
                              <td className="py-2.5 px-3.5 border-r border-rose-200">Sisa Hutang Ke Supplier:</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-700">
                                {formatCurrency(printData.data.remainingDebt !== undefined ? printData.data.remainingDebt : Math.max(0, printData.data.grandTotal - (printData.data.amountPaid || 0)))}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-emerald-50/50 text-emerald-900">
                            <td className="py-2.5 px-3.5 border-r border-slate-200 font-semibold">Estimasi Total Proyeksi Keuntungan:</td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-700">
                              +{formatCurrency(printData.data.items.reduce((sum, item) => sum + (item.profit || 0), 0))}
                            </td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-amber-50/80 font-bold border-t-2 border-slate-300 text-slate-900 text-xs sm:text-sm">
                          <tr>
                            <td className="py-3 px-3.5 text-slate-900 font-bold border-r border-slate-300">Total Pembelian Supplier (Grand Total):</td>
                            <td className="py-3 px-3.5 text-right font-mono text-emerald-800 text-sm sm:text-base font-bold">{formatCurrency(printData.data.grandTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {printData.data.notes && (
                    <p className="text-xs text-slate-500 italic">Catatan: {printData.data.notes}</p>
                  )}
                </div>
              ) : (
                // Thermal Purchase Receipt
                <div className="text-center space-y-2">
                  <div className="flex justify-center mb-1">
                    <img 
                      src={storeProfile.logoUrl || '/logo_unggas.svg'} 
                      alt="Logo" 
                      className="w-10 h-10 object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo_unggas.svg'; }} 
                    />
                  </div>
                  <div className="font-bold text-sm tracking-tight">{storeProfile.name}</div>
                  <div className="text-[10px] leading-tight text-slate-700">{storeProfile.address}</div>
                  <div className="text-[10px] text-slate-700">Telp: {storeProfile.phone}</div>
                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="text-left text-[10px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>No:</span>
                      <span className="font-bold">{printData.data.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tgl:</span>
                      <span>{formatDateTime(printData.data.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Supplier:</span>
                      <span className="truncate max-w-[150px]">{printData.data.supplierName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-bold">{printData.data.paymentStatus}</span>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  {/* Items in thermal list */}
                  <div className="text-left space-y-2 text-[10px]">
                    {printData.data.items.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-medium">{item.itemName}</div>
                        <div className="flex justify-between text-slate-600">
                          <span>
                            {formatNumber(item.quantity)} {item.unit} x {formatNumber(item.buyPrice)}
                          </span>
                          <span className="font-bold text-slate-900">{formatCurrency(item.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Qty in thermal */}
                  <div className="text-left text-[10px] py-1 border-t border-dashed border-slate-300 space-y-0.5">
                    <span className="font-semibold text-slate-600 block">Total Qty:</span>
                    <div className="font-bold text-slate-900 text-left flex flex-col items-start space-y-0.5">
                      {Object.entries(
                        printData.data.items.reduce((acc, item) => {
                          acc[item.unit] = (acc[item.unit] || 0) + item.quantity;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([unit, qty]) => (
                        <span key={unit}>{formatNumber(qty)} {unit}</span>
                      ))}
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="text-left space-y-1 text-[10px]">
                    <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                      <span>TOTAL:</span>
                      <span>{formatCurrency(printData.data.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span>Dibayar:</span>
                      <span>{formatCurrency(printData.data.amountPaid || 0)}</span>
                    </div>
                    {(printData.data.remainingDebt || 0) > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Total Hutang:</span>
                        <span>{formatCurrency(printData.data.remainingDebt || 0)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2.5"></div>
                  <div className="text-[10px] italic text-slate-600 leading-tight">
                    {printData.data.notes || storeProfile.footerNote}
                  </div>
                </div>
              )
            )}

            {/* 3. SALARY SLIP TEMPLATE (SIMPLE NOTA STYLE) */}
            {printData.type === 'salary' && (() => {
              const s = printData.data;
              const emp = employees.find(e => e.id === s.employeeId);
              const empCode = emp?.code || 'EMP-1';
              const empRole = s.employeeRole || emp?.role || '-';
              const empPhone = emp?.phone || '-';
              const tambahan = (s.bonus || 0) || (s.totalOvertimePay || 0);
              const periodeStr = s.periodStart === s.periodEnd
                ? formatDate(s.periodStart)
                : `${formatDate(s.periodStart)} s/d ${formatDate(s.periodEnd)}`;

              return (
                <div className={`mx-auto p-4 sm:p-6 bg-white font-mono text-xs text-slate-900 space-y-3 ${printFormat === 'a4' ? 'max-w-[440px] border border-slate-300 rounded-xl' : 'w-full'}`}>
                  {/* Header with Store Logo */}
                  <div className="text-center space-y-1">
                    <div className="flex justify-center mb-1">
                      <img
                        src={storeProfile.logoUrl || '/logo_unggas.svg'}
                        alt="Logo"
                        className="w-12 h-12 object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo_unggas.svg'; }}
                      />
                    </div>
                    <div className="font-bold text-sm sm:text-base tracking-tight">{storeProfile.name}</div>
                    <div className="text-[10px] leading-tight text-slate-600">{storeProfile.address}</div>
                    <div className="text-[10px] text-slate-600">Telp: {storeProfile.phone}</div>
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="text-center font-bold text-xs tracking-wider uppercase text-slate-900">
                    SLIP GAJI KARYAWAN
                  </div>

                  {/* Meta Info */}
                  <div className="text-left text-[11px] space-y-0.5">
                    <div className="flex justify-between gap-2">
                      <span>No. Slip :</span>
                      <span className="font-bold text-right">{s.slipNumber}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Periode :</span>
                      <span className="font-bold text-right">{periodeStr}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Karyawan :</span>
                      <span className="font-bold truncate max-w-[180px] text-right">{s.employeeName}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Bagian :</span>
                      <span className="text-right">{empRole} ({empCode})</span>
                    </div>
                    {empPhone && empPhone !== '-' && (
                      <div className="flex justify-between gap-2 text-slate-600 text-[10px]">
                        <span>No. HP :</span>
                        <span>{empPhone}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span>Hadir :</span>
                      <span className="font-bold text-right">{s.daysPresent || 1} Hari</span>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  {/* Breakdown */}
                  <div className="text-left space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span>GAJI POKOK</span>
                      <span className="font-bold">{formatCurrency(s.totalDailyWage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TAMBAHAN</span>
                      <span className="font-bold text-blue-700">+{formatCurrency(tambahan)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>KASBON</span>
                      <span className="font-bold">-{formatCurrency(s.deduction || 0)}</span>
                    </div>

                    <div className="flex justify-between font-extrabold text-xs pt-1.5 border-t border-slate-900 text-slate-900">
                      <span>TOTAL GAJI BERSIH</span>
                      <span>{formatCurrency(s.netSalary)}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="my-2 text-center">
                    <span className="font-bold text-xs text-emerald-800 tracking-wider">
                      *** {s.paymentStatus.toUpperCase()} ***
                    </span>
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  {/* Footer */}
                  <div className="text-[11px] font-mono space-y-2 text-center">
                    {s.notes && (
                      <div className="text-[10px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 text-left">
                        <div className="font-bold uppercase text-[9px] text-slate-500 mb-0.5">CATATAN:</div>
                        <div>{s.notes}</div>
                      </div>
                    )}
                    <div className="pt-1 text-[11px] font-bold text-slate-900 tracking-wide">
                      TERIMA KASIH
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. PAYMENT RECEIPT TEMPLATE (BUKTI KAS MASUK / KAS KELUAR - NOTA PENERIMAAN / PELUNASAN) */}
            {printData.type === 'payment_receipt' && (() => {
              const r = printData.data;
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

              return printFormat === 'a4' ? (
                // A4 Payment Receipt / Kwitansi
                <div className="space-y-6">
                  {/* Header with Store Logo */}
                  <div className="flex justify-between items-start border-b border-slate-300 pb-5">
                    <div className="flex items-start gap-3.5">
                      <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                        <img src={storeProfile.logoUrl || '/logo_unggas.svg'} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{storeProfile.name}</h1>
                        <p className="text-xs text-slate-600 mt-1 max-w-sm">{storeProfile.address}</p>
                        <p className="text-xs text-slate-600 mt-0.5">Telp/WA: {storeProfile.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {receiptTitle}
                      </span>
                      <h2 className="text-base font-bold font-mono text-slate-900 mt-1.5">{r.receiptNo}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Tanggal: {formatDateTime(r.date)}</p>
                    </div>
                  </div>

                  {/* Receipt Details Table */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden bg-white text-xs">
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-slate-50">
                          <td className="py-2.5 px-3.5 text-slate-600 font-medium border-r border-slate-200 w-1/2">Pihak Terkait / Customer / Supplier</td>
                          <td className="py-2.5 px-3.5 text-sm font-bold text-slate-900">{r.counterpartyName}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3.5 text-slate-600 font-medium border-r border-slate-200">Referensi Dokumen Utama</td>
                          <td className="py-2.5 px-3.5 text-sm font-mono font-bold text-amber-700">
                            {r.invoiceNumber}
                            {invAmount > 0 && (
                              <span className="text-[11px] text-slate-500 font-normal ml-2">(Nilai Faktur: {formatCurrency(invAmount)})</span>
                            )}
                          </td>
                        </tr>
                        <tr className="bg-emerald-50/70 font-bold">
                          <td className="py-2.5 px-3.5 text-slate-800 border-r border-emerald-200">Nominal Pembayaran / Diterima</td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-800 text-base">{formatCurrency(payAmount)}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3.5 text-slate-600 font-medium border-r border-slate-200">Metode Pembayaran</td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-800">{r.paymentMethod}</td>
                        </tr>
                        {r.notes && (
                          <tr>
                            <td className="py-2.5 px-3.5 text-slate-600 font-medium border-r border-slate-200">Catatan / Keterangan</td>
                            <td className="py-2.5 px-3.5 font-medium text-slate-800 italic">{r.notes}</td>
                          </tr>
                        )}
                        <tr className="bg-rose-50/70 font-bold text-rose-800">
                          <td className="py-2.5 px-3.5 border-r border-rose-200">Sisa Hutang / Piutang Setelah Pembayaran Ini</td>
                          <td className="py-2.5 px-3.5 font-mono text-base">{formatCurrency(r.remainingDebt)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures */}
                  <div className="pt-8 border-t border-slate-200">
                    <div className="grid grid-cols-2 text-center text-xs text-slate-600">
                      <div>
                        <p>Diterima / Penyetor,</p>
                        <div className="h-16"></div>
                        <p className="font-medium text-slate-800">( {r.counterpartyName} )</p>
                      </div>
                      <div>
                        <p>Petugas / Admin Usaha,</p>
                        <div className="h-16"></div>
                        <p className="font-medium text-slate-800">( {r.recordedBy || 'Admin Usaha'} )</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Thermal Receipt Format
                <div className="text-center space-y-2 text-[10px]">
                  <div className="flex justify-center mb-1">
                    <img src={storeProfile.logoUrl || '/logo_unggas.svg'} alt="Logo" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="font-bold text-sm tracking-tight">{storeProfile.name}</div>
                  <div className="text-[10px] leading-tight text-slate-700">{storeProfile.address}</div>
                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="font-bold uppercase tracking-wider text-[11px] text-slate-900">{receiptTitle}</div>
                  <div className="font-mono font-bold text-slate-800">{r.receiptNo}</div>
                  <div className="text-slate-500">{formatDateTime(r.date)}</div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="text-left space-y-1">
                    <div className="flex justify-between">
                      <span>Pihak:</span>
                      <span className="font-bold truncate max-w-[140px]">{r.counterpartyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ref Faktur:</span>
                      <span className="font-mono font-bold">{r.invoiceNumber}</span>
                    </div>
                    {invAmount > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Total Faktur:</span>
                        <span className="font-mono">{formatCurrency(invAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-xs">
                      <span>BAYAR / TERIMA:</span>
                      <span className="font-mono">{formatCurrency(payAmount)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700 font-bold border-t border-dashed border-slate-300 pt-1">
                      <span>SISA HUTANG:</span>
                      <span className="font-mono">{formatCurrency(r.remainingDebt)}</span>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>
                  <div className="text-slate-600 italic">{r.notes || 'Bukti Pembayaran / Pelunasan Sah'}</div>
                </div>
              );
            })()}

            {/* 5. PRE-ORDER INDIVIDUAL PER CUSTOMER TEMPLATE (SOLARIA TICKET STYLE - NO PRICES!) */}
            {printData.type === 'preorder_single' && (() => {
              const po = printData.data;
              const custObj = customers.find(c => c.id === po.customerId || c.name.toLowerCase() === po.customerName.toLowerCase());
              const displayPhone = po.customerPhone || custObj?.phone || '-';
              const displayAddress = po.customerAddress || custObj?.address || '-';
              const totalQty = po.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
              const primaryUnit = po.items[0]?.unit || 'Kg';

              return printFormat === 'a4' ? (
                <div className="space-y-4 max-w-xl mx-auto p-4 border border-slate-300 font-mono text-slate-900 bg-white">
                  {/* Solaria Style PO Header (A4) */}
                  <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
                    {storeProfile.logoUrl && (
                      <img src={storeProfile.logoUrl} alt="Logo" className="w-12 h-12 mx-auto object-contain mb-1" />
                    )}
                    <h1 className="text-lg font-bold tracking-tight uppercase">{storeProfile.name}</h1>
                    <p className="text-xs text-slate-600 leading-tight">{storeProfile.address}</p>
                    <p className="text-xs text-slate-600">Telp/WA: {storeProfile.phone}</p>
                    <div className="pt-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                      *** DOKUMEN PRE-ORDER (PO) ***
                    </div>
                  </div>

                  {/* Header Details */}
                  <div className="text-xs space-y-1 pb-3 border-b border-dashed border-slate-400">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date:</span>
                      <span className="font-bold">{formatDateTime(po.orderDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">PO No:</span>
                      <span className="font-bold">{po.poNumber}</span>
                    </div>
                    {po.pickupDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tgl Pengambilan:</span>
                        <span className="font-bold">{formatDate(po.pickupDate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">Pelanggan:</span>
                      <span className="font-bold">{po.customerName}</span>
                    </div>
                    {displayPhone !== '-' && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">No. HP:</span>
                        <span>{displayPhone}</span>
                      </div>
                    )}
                    {displayAddress !== '-' && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Alamat:</span>
                        <span className="max-w-[280px] text-right truncate">{displayAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Items List (Solaria Ticket Format - NO PRICES) */}
                  <div className="space-y-2 py-2 border-b border-dashed border-slate-400 text-sm">
                    <div className="font-bold text-xs uppercase text-slate-500 mb-2">RINCIAN PESANAN BARANG:</div>
                    {po.items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-bold text-slate-900 flex justify-between">
                          <span>{formatNumber(it.quantity)} {it.unit} x {it.itemName}</span>
                        </div>
                        {(it as any).notes || (it as any).itemNote ? (
                          <div className="text-xs text-slate-600 pl-4 font-sans italic">
                            - {(it as any).notes || (it as any).itemNote}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {po.items.length === 0 && (
                      <div className="text-xs text-slate-400 italic">Belum ada item rincian pesanan.</div>
                    )}
                  </div>

                  {/* Total & Summary Footer */}
                  <div className="text-xs space-y-1 pb-3 border-b border-dashed border-slate-400 font-bold">
                    <div className="flex justify-between">
                      <span>TOTAL ITEM:</span>
                      <span>{po.items.length} Jenis</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>TOTAL QTY:</span>
                      <span>{formatNumber(totalQty)} {primaryUnit}</span>
                    </div>
                    {po.notes && (
                      <div className="pt-2 text-xs font-normal text-slate-600 font-sans">
                        <span className="font-bold">Catatan PO:</span> {po.notes}
                      </div>
                    )}
                  </div>

                  {/* Footer Message */}
                  <div className="text-center text-xs text-slate-600 space-y-0.5 pt-2">
                    <p className="font-bold">Terima Kasih</p>
                    <p>Atas Pesanan Anda</p>
                  </div>
                </div>
              ) : (
                /* Thermal format for single PO (Solaria Ticket Style - NO PRICES) */
                <div className="text-left space-y-2 font-mono text-[11px] text-slate-900 leading-tight">
                  {/* Solaria Logo & Store Name */}
                  <div className="text-center space-y-0.5">
                    {storeProfile.logoUrl && (
                      <img src={storeProfile.logoUrl} alt="Logo" className="w-10 h-10 mx-auto object-contain mb-1" />
                    )}
                    <div className="font-bold text-sm uppercase tracking-tight">{storeProfile.name}</div>
                    <div className="text-[10px] text-slate-600 leading-tight">{storeProfile.address}</div>
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  {/* PO Info Header */}
                  <div className="space-y-0.5 text-[10px]">
                    <div>Date: {formatDateTime(po.orderDate)}</div>
                    <div>PO No: {po.poNumber}</div>
                    {po.pickupDate && <div>Tgl Ambil: {formatDate(po.pickupDate)}</div>}
                    <div>Pelanggan: <span className="font-bold">{po.customerName}</span></div>
                    {displayPhone !== '-' && <div>No. HP: {displayPhone}</div>}
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  {/* Solaria Order Ticket Item List: [Qty] [Unit] x [Nama Barang] */}
                  <div className="space-y-1 py-1">
                    {po.items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-bold text-[11px] leading-snug">
                          {formatNumber(it.quantity)} {it.unit} x {it.itemName}
                        </div>
                        {(it as any).notes || (it as any).itemNote ? (
                          <div className="text-[10px] text-slate-600 pl-3">
                            - {(it as any).notes || (it as any).itemNote}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  {/* Summary Footer */}
                  <div className="space-y-0.5 text-[10px] font-bold">
                    <div className="flex justify-between">
                      <span>ITEMS:</span>
                      <span>{po.items.length}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>TOTAL QTY:</span>
                      <span>{formatNumber(totalQty)} {primaryUnit}</span>
                    </div>
                    {po.notes && (
                      <div className="pt-1 text-[10px] font-normal text-slate-600">
                        Catatan: {po.notes}
                      </div>
                    )}
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  {/* Solaria Footer Text */}
                  <div className="text-center text-[10px] space-y-0.5 text-slate-700">
                    <div className="font-bold">Terima Kasih</div>
                    <div>Atas Pesanan Anda</div>
                  </div>
                </div>
              );
            })()}

            {/* 6. REKAP PRE-ORDER KESELURUHAN SEMUA CUSTOMER TEMPLATE (NO PRICES!) */}
            {printData.type === 'preorder_rekap' && (() => {
              const { preorders: poList, items: itemList } = printData.data;

              // Calculate demand totals per item across all preorders in the list
              const demandMap: Record<string, { name: string; unit: string; totalQty: number }> = {};
              itemList.forEach(it => {
                demandMap[it.id] = { name: it.name, unit: it.unit, totalQty: 0 };
              });

              poList.forEach(po => {
                po.items.forEach(pi => {
                  if (pi.itemId && demandMap[pi.itemId]) {
                    demandMap[pi.itemId].totalQty += (Number(pi.quantity) || 0);
                  } else {
                    const found = itemList.find(i => i.name.toLowerCase() === pi.itemName.toLowerCase());
                    if (found && demandMap[found.id]) {
                      demandMap[found.id].totalQty += (Number(pi.quantity) || 0);
                    }
                  }
                });
              });

              const activeDemands = Object.values(demandMap).filter(d => d.totalQty > 0);

              return printFormat === 'a4' ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                        <img src={storeProfile.logoUrl || '/logo_unggas.svg'} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{storeProfile.name}</h1>
                        <p className="text-xs text-slate-600 mt-0.5 max-w-sm">{storeProfile.address}</p>
                        <p className="text-xs text-slate-600 mt-0.5">Telp/WA: {storeProfile.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        REKAP PRE-ORDER KESELURUHAN
                      </span>
                      <h2 className="text-sm font-bold font-mono text-slate-900 mt-1">REKAP-PO-{new Date().toISOString().substring(0, 10).replace(/-/g, '')}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cetak: {formatDateTime(new Date().toISOString())}
                      </p>
                    </div>
                  </div>

                  {/* MATRIKS SPREADSHEET PESANAN CUSTOMER (TRANSPOSED PORTRAIT A4) */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden bg-white text-xs shadow-2xs">
                    <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between">
                      <h4 className="font-bold text-xs uppercase tracking-wide text-amber-300">
                        MATRIKS KEBUTUHAN ITEM & PESANAN PELANGGAN ({poList.length} PELANGGAN)
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-900 text-white font-bold border-b border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3 border-r border-slate-700 w-10 text-center">No</th>
                            <th className="py-2.5 px-3 border-r border-slate-700 font-bold min-w-[160px]">
                              Nama Barang / Potongan Ayam
                            </th>
                            {poList.map((po) => (
                              <th key={po.id} className="py-2.5 px-2 text-center border-r border-slate-700 font-bold text-amber-300 min-w-[90px]">
                                <div>{po.customerName}</div>
                                <div className="text-[9px] font-mono text-slate-400 font-normal">{po.poNumber}</div>
                              </th>
                            ))}
                            <th className="py-2.5 px-3 text-center font-bold text-amber-400 min-w-[100px] bg-slate-950 border-r border-slate-700">
                              TOTAL KEBUTUHAN
                            </th>
                            <th className="py-2.5 px-3 text-center font-bold text-sky-400 min-w-[100px] bg-slate-950 border-r border-slate-700">
                              STOK SAAT INI
                            </th>
                            <th className="py-2.5 px-3 text-center font-bold text-emerald-400 min-w-[130px] bg-slate-950">
                              STOK AKHIR / KEBUTUHAN POTONG
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {itemList.map((it, idx) => {
                            const totalItemDemand = poList.reduce((sum, po) => {
                              const pi = po.items.find(i => i.itemId === it.id || i.itemName.toLowerCase() === it.name.toLowerCase());
                              return sum + (pi ? Number(pi.quantity) || 0 : 0);
                            }, 0);

                            const liveStock = it.currentStock || 0;
                            const stokAkhir = liveStock - totalItemDemand;
                            const isCukup = stokAkhir >= 0;

                            return (
                              <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-500">{idx + 1}</td>
                                <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-900">
                                  {it.name}
                                </td>
                                {poList.map((po) => {
                                  const pi = po.items.find(i => i.itemId === it.id || i.itemName.toLowerCase() === it.name.toLowerCase());
                                  const qty = pi ? Number(pi.quantity) || 0 : 0;
                                  return (
                                    <td key={po.id} className="py-2 px-2 text-center border-r border-slate-200 font-mono font-bold">
                                      {qty > 0 ? (
                                        <span className="text-amber-950 bg-amber-100/90 px-2 py-0.5 rounded text-[11px] inline-block">
                                          {formatNumber(qty)} {it.unit}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                  );
                                })}
                                {/* TOTAL KEBUTUHAN */}
                                <td className="py-2 px-3 text-center border-r border-slate-300 font-mono font-extrabold bg-amber-50/70 text-amber-900">
                                  {totalItemDemand > 0 ? (
                                    <span className="bg-amber-500/20 text-amber-950 px-2 py-0.5 rounded text-xs font-bold inline-block border border-amber-300/80">
                                      {formatNumber(totalItemDemand)} {it.unit}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>
                                {/* STOK SAAT INI */}
                                <td className="py-2 px-3 text-center border-r border-slate-300 font-mono font-bold bg-slate-50 text-slate-800">
                                  <span className="px-2 py-0.5 rounded text-xs font-bold inline-block border border-slate-300 bg-white text-slate-900">
                                    {formatNumber(liveStock)} {it.unit}
                                  </span>
                                </td>
                                {/* STOK AKHIR / KEBUTUHAN POTONG */}
                                <td className={`py-2 px-3 text-center font-mono font-bold ${
                                  isCukup ? 'bg-emerald-50/70' : 'bg-rose-50/90'
                                }`}>
                                  <span className={`px-2 py-0.5 rounded text-xs font-extrabold inline-block border ${
                                    isCukup 
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                                      : 'bg-rose-100 text-rose-900 border-rose-400 font-black'
                                  }`}>
                                    {isCukup ? (
                                      <span>+{formatNumber(stokAkhir)} {it.unit} (Cukup)</span>
                                    ) : (
                                      <span>-{formatNumber(Math.abs(stokAkhir))} {it.unit} (Kurang)</span>
                                    )}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {itemList.length === 0 && (
                            <tr>
                              <td colSpan={poList.length + 5} className="py-6 text-center text-slate-400">Belum ada item catalog terdaftar.</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white font-mono font-bold border-t-2 border-slate-700">
                          <tr className="text-amber-300">
                            <td colSpan={2} className="py-2.5 px-3 border-r border-slate-700 font-bold text-right text-xs">
                              TOTAL PESANAN PER PELANGGAN:
                            </td>
                            {poList.map((po) => {
                              const totalCustQty = po.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
                              return (
                                <td key={po.id} className="py-2.5 px-2 text-center border-r border-slate-700 text-xs font-extrabold text-amber-300">
                                  {totalCustQty > 0 ? `${formatNumber(totalCustQty)} Item` : '0'}
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-3 text-center font-extrabold text-xs text-amber-400 bg-slate-950 border-r border-slate-700">
                              {formatNumber(poList.reduce((sum, po) => sum + po.items.reduce((isum, i) => isum + (Number(i.quantity) || 0), 0), 0))} Total Qty
                            </td>
                            <td className="py-2.5 px-3 text-center font-extrabold text-xs text-sky-300 bg-slate-950 border-r border-slate-700">
                              {formatNumber(itemList.reduce((sum, it) => sum + (it.currentStock || 0), 0))} Total Stok
                            </td>
                            <td className="py-2.5 px-3 text-center font-extrabold text-xs bg-slate-950">
                              {(() => {
                                const deficitCount = itemList.filter(it => {
                                  const demand = poList.reduce((sum, po) => {
                                    const pi = po.items.find(i => i.itemId === it.id || i.itemName.toLowerCase() === it.name.toLowerCase());
                                    return sum + (pi ? Number(pi.quantity) || 0 : 0);
                                  }, 0);
                                  return (it.currentStock || 0) < demand;
                                }).length;

                                return deficitCount > 0 ? (
                                  <span className="text-rose-400 font-black">{deficitCount} Item Kurang</span>
                                ) : (
                                  <span className="text-emerald-400 font-bold">Semua Cukup</span>
                                );
                              })()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* Thermal format for Rekap PO (No prices) */
                <div className="text-center space-y-2 text-[10px]">
                  <div className="flex justify-center mb-1">
                    <img src={storeProfile.logoUrl || '/logo_unggas.svg'} alt="Logo" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="font-bold text-sm tracking-tight">{storeProfile.name}</div>
                  <div className="text-[10px] leading-tight text-slate-700">{storeProfile.address}</div>
                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="font-bold uppercase tracking-wider text-[11px] text-slate-900">REKAP PRE-ORDER KESELURUHAN</div>
                  <div className="text-slate-500">{formatDateTime(new Date().toISOString())}</div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="text-left space-y-1">
                    <div className="font-bold border-b border-slate-200 pb-1">TOTAL KEBUTUHAN & ANALISIS STOK:</div>
                    {itemList.map((it, idx) => {
                      const totalDemand = poList.reduce((sum, po) => {
                        const pi = po.items.find(i => i.itemId === it.id || i.itemName.toLowerCase() === it.name.toLowerCase());
                        return sum + (pi ? Number(pi.quantity) || 0 : 0);
                      }, 0);
                      if (totalDemand === 0 && (it.currentStock || 0) === 0) return null;
                      const stokAkhir = (it.currentStock || 0) - totalDemand;
                      const isCukup = stokAkhir >= 0;
                      return (
                        <div key={idx} className="border-b border-slate-100 py-1 text-[10px]">
                          <div className="font-bold flex justify-between">
                            <span>{it.name}</span>
                            <span className="font-mono text-amber-900">{formatNumber(totalDemand)} {it.unit}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 text-[9px] pt-0.5">
                            <span>Stok Gudang: {formatNumber(it.currentStock || 0)} {it.unit}</span>
                            <span className={isCukup ? 'text-emerald-700 font-bold' : 'text-rose-700 font-black'}>
                              {isCukup ? `Cukup (+${formatNumber(stokAkhir)})` : `Kurang (-${formatNumber(Math.abs(stokAkhir))})`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="text-left space-y-1.5">
                    <div className="font-bold border-b border-slate-200 pb-1">RINCIAN PER CUSTOMER ({poList.length}):</div>
                    {poList.map((po, idx) => (
                      <div key={idx} className="border-b border-slate-100 pb-1">
                        <div className="font-bold text-slate-900">{idx + 1}. {po.customerName} ({po.poNumber})</div>
                        <div className="text-slate-700 pl-3">
                          {po.items.map(i => `${i.itemName} ${formatNumber(i.quantity)}${i.unit}`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 7. DAILY FINANCIAL REPORT TEMPLATE (SESUAI BUKU CATATAN LAPORAN) */}
            {printData.type === 'daily_financial_report' && (() => {
              const r = printData.data;

              return printFormat === 'a4' ? (
                <div className="space-y-6">
                  {/* Header with Logo */}
                  <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                        <img src={storeProfile.logoUrl || '/logo_unggas.svg'} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{storeProfile.name}</h1>
                        <p className="text-xs text-slate-600 mt-0.5 max-w-sm">{storeProfile.address}</p>
                        <p className="text-xs text-slate-600 mt-0.5">Telp/WA: {storeProfile.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        LAPORAN
                      </span>
                      <h2 className="text-sm font-bold font-mono text-slate-900 mt-1">LAP-HARIAN-{r.reportDate.replace(/-/g, '')}</h2>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">
                        Tanggal: <strong>{formatDate(r.reportDate)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Main Report Journal Card (Exact recreation of handwritten sheet) */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden bg-white text-xs shadow-2xs">
                    <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                      <h4 className="font-bold text-xs uppercase tracking-wide text-amber-300">
                        LAPORAN HARIAN KEUANGAN & OMZET OPERASIONAL
                      </h4>
                      <span className="text-[11px] font-mono text-slate-300">
                        {formatDate(r.reportDate)}
                      </span>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4 font-sans text-xs">
                      {/* STEP 1 & 2: OUTPUT */}
                      <div className="space-y-2">
                        {/* 1. Tagihan Per Hari (Nota) */}
                        <div className="flex items-start justify-between py-2 border-b border-slate-100">
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                              <span>TAGIHAN PER HARI (NOTA)</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium pl-6.5">
                              (TANPA SISA HUTANG & KEMBALIAN / TABUNGAN)
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-900 text-sm sm:text-base text-right">
                            {formatCurrency(r.tagihanPerHari)}
                          </div>
                        </div>

                        {/* 2. Stok Opname Per Hari */}
                        <div className="flex items-start justify-between py-2">
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                              <span>STOK OPNAME PER HARI</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium pl-6.5">
                              (Aset Fisik Stok Akhir Hari Ini)
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-900 text-sm sm:text-base text-right">
                            {formatCurrency(r.stokOpnameHariIni)}
                          </div>
                        </div>

                        {/* TOTAL (1 + 2) (+) */}
                        <div className="border-t-2 border-slate-400 pt-2 flex items-center justify-between bg-amber-50/70 p-3 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                            <span className="text-amber-800 uppercase tracking-wide">(TOTAL)</span>
                            <span className="text-xs text-slate-500 font-normal">① + ②</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-slate-900 text-sm sm:text-base">
                              {formatCurrency(r.totalOutput)}
                            </span>
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                              (+)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* STEP 3, 4, 5: INPUTS & OPERASIONAL */}
                      <div className="space-y-2 pt-2">
                        {/* 3. Stok Opname Kemarin */}
                        <div className="flex items-start justify-between py-2 border-b border-slate-100">
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0">3</span>
                              <span>STOK OPNAME KEMARIN</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium pl-6.5">
                              (Aset Fisik Stok Awal H-1 Kemarin)
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-800 text-sm sm:text-base text-right">
                            {formatCurrency(r.stokOpnameKemarin)}
                          </div>
                        </div>

                        {/* 4. Operasional Per Hari */}
                        <div className="flex items-start justify-between py-2 border-b border-slate-100">
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0">4</span>
                              <span>OPERASIONAL PER HARI</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium pl-6.5">
                              (Biaya Operasional + Gaji / Upah Hari Ini)
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-800 text-sm sm:text-base text-right">
                            {formatCurrency(r.operasionalPerHari)}
                          </div>
                        </div>

                        {/* 5. Modal Suplaier */}
                        <div className="flex items-start justify-between py-2">
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0">5</span>
                              <span>MODAL SUPLAIER</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium pl-6.5">
                              (Pembelian Ayam / Bahan Masuk dari Supplier)
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-800 text-sm sm:text-base text-right">
                            {formatCurrency(r.modalSuplaier)}
                          </div>
                        </div>

                        {/* HASIL LAPORAN HARIAN / OMZET BERSIH (-) */}
                        <div className="border-t-2 border-slate-400 pt-2 flex items-center justify-between bg-blue-50/80 p-3 rounded-lg border border-blue-200">
                          <div>
                            <div className="font-bold text-blue-950 text-xs sm:text-sm uppercase tracking-wide">
                              (HASIL LAPORAN HARIAN / OMZET BERSIH)
                            </div>
                            <div className="text-[10px] text-blue-800">
                              (TOTAL) - ③ Stok Kemarin - ④ Operasional - ⑤ Modal Suplaier
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-blue-950 text-base sm:text-lg">
                              {formatCurrency(r.hasilLaporanHarian)}
                            </span>
                            <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                              (-)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* STEP 6: SISA HUTANG COSTUMER */}
                      <div className="space-y-2 pt-2">
                        {/* 6. Sisa Hutang Costumer */}
                        <div className="flex items-start justify-between py-2">
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">6</span>
                              <span>SISA HUTANG COSTUMER</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium pl-6.5">
                              (Piutang / Sisa Tagihan Pelanggan Belum Bayar)
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-900 text-sm sm:text-base text-right">
                            {formatCurrency(r.sisaHutangCostumer)}
                          </div>
                        </div>

                        {/* TOTAL (Hasil + Hutang) (+) */}
                        <div className="border-t-2 border-slate-400 pt-2 flex items-center justify-between bg-amber-50/70 p-3 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                            <span className="text-amber-800 uppercase tracking-wide">(TOTAL)</span>
                            <span className="text-xs text-slate-500 font-normal">Hasil Omzet Bersih + ⑥ Sisa Hutang</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-slate-900 text-sm sm:text-base">
                              {formatCurrency(r.totalSetelahHutang)}
                            </span>
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                              (+)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* STEP 7: KEMBALIAN / TABUNGAN COSTUMER */}
                      <div className="space-y-2 pt-2">
                        {/* 7. Kembalian / Tabungan Costumer */}
                        <div className="flex items-start justify-between py-2">
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0">7</span>
                              <span>KEMBALIAN / TABUNGAN COSTUMER</span>
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">(-)</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium pl-6.5">
                              (Deposit / Tabungan Pelanggan & Kelebihan Bayar)
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-800 text-sm sm:text-base text-right">
                            {formatCurrency(r.kembalianTabunganCostumer)}
                          </div>
                        </div>

                        {/* FINAL RESULT: (TOTAL KEUANGAN) ✓ */}
                        <div className="border-t-4 border-emerald-600 pt-3 flex items-center justify-between bg-emerald-950 text-white p-4 sm:p-5 rounded-xl shadow-md">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white text-base sm:text-lg uppercase tracking-wider">
                                (TOTAL KEUANGAN)
                              </span>
                              <span className="w-6 h-6 rounded-full bg-emerald-500 text-emerald-950 font-black flex items-center justify-center text-sm shadow-xs">
                                ✓
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-200 mt-0.5">
                              (TOTAL) - ⑦ Kembalian / Tabungan Costumer
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-amber-300 text-xl sm:text-2xl drop-shadow-xs">
                              {formatCurrency(r.totalKeuangan)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Thermal Receipt format for Daily Financial Report */
                <div className="text-center space-y-2 text-[10px]">
                  <div className="flex justify-center mb-1">
                    <img src={storeProfile.logoUrl || '/logo_unggas.svg'} alt="Logo" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="font-bold text-sm tracking-tight">{storeProfile.name}</div>
                  <div className="text-[10px] leading-tight text-slate-700">{storeProfile.address}</div>
                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="font-bold uppercase tracking-wider text-[11px] text-slate-900">LAPORAN KEUANGAN HARIAN</div>
                  <div className="text-slate-500">{formatDate(r.reportDate)}</div>
                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="text-left space-y-1">
                    <div className="flex justify-between">
                      <span>1. TAGIHAN PER HARI (NOTA):</span>
                      <span className="font-mono font-bold">{formatCurrency(r.tagihanPerHari)}</span>
                    </div>
                    <div className="text-[9px] text-slate-500">(Tanpa Sisa Hutang & Tabungan)</div>

                    <div className="flex justify-between pt-1">
                      <span>2. STOK OPNAME PER HARI:</span>
                      <span className="font-mono font-bold">{formatCurrency(r.stokOpnameHariIni)}</span>
                    </div>

                    <div className="border-b border-dashed border-slate-300 my-1"></div>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>(TOTAL) (+):</span>
                      <span className="font-mono">{formatCurrency(r.totalOutput)}</span>
                    </div>

                    <div className="border-b border-dashed border-slate-300 my-1"></div>
                    <div className="flex justify-between">
                      <span>3. STOK OPNAME KEMARIN:</span>
                      <span className="font-mono font-bold">{formatCurrency(r.stokOpnameKemarin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>4. OPERASIONAL PER HARI:</span>
                      <span className="font-mono font-bold">{formatCurrency(r.operasionalPerHari)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>5. MODAL SUPLAIER:</span>
                      <span className="font-mono font-bold">{formatCurrency(r.modalSuplaier)}</span>
                    </div>

                    <div className="border-b border-dashed border-slate-300 my-1"></div>
                    <div className="flex justify-between font-bold text-blue-900">
                      <span>(HASIL OMZET BERSIH) (-):</span>
                      <span className="font-mono">{formatCurrency(r.hasilLaporanHarian)}</span>
                    </div>

                    <div className="border-b border-dashed border-slate-300 my-1"></div>
                    <div className="flex justify-between">
                      <span>6. SISA HUTANG COSTUMER:</span>
                      <span className="font-mono font-bold">{formatCurrency(r.sisaHutangCostumer)}</span>
                    </div>

                    <div className="border-b border-dashed border-slate-300 my-1"></div>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>(TOTAL) (+):</span>
                      <span className="font-mono">{formatCurrency(r.totalSetelahHutang)}</span>
                    </div>

                    <div className="border-b border-dashed border-slate-300 my-1"></div>
                    <div className="flex justify-between">
                      <span>7. KEMBALIAN/TABUNGAN (-):</span>
                      <span className="font-mono font-bold">{formatCurrency(r.kembalianTabunganCostumer)}</span>
                    </div>

                    <div className="border-b-2 border-slate-900 my-1.5"></div>
                    <div className="flex justify-between font-extrabold text-xs text-slate-950 pt-0.5">
                      <span>(TOTAL KEUANGAN) ✓:</span>
                      <span className="font-mono">{formatCurrency(r.totalKeuangan)}</span>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>
                  <div className="text-[10px] italic text-slate-600">Dicetak Otomatis dari Sistem {storeProfile.name}</div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-3 no-print">
          
          {/* Target Phone Field with auto-detected badge */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs w-full sm:w-auto">
              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-700 shrink-0">Tujuan WA:</span>
              <input
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="text-xs text-slate-900 font-mono font-medium focus:outline-hidden w-28 sm:w-36 bg-transparent"
                title="Nomor WhatsApp penerima dokumen (otomatis terisi dari data pelanggan)"
              />
              {recipientPhone ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md shrink-0">
                  +{formatWhatsAppPhone(recipientPhone)}
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium shrink-0">
                  (Belum ada nomor)
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
            {/* Kirim WA (Format JPG Gambar) */}
            <button
              type="button"
              disabled={isGeneratingPdf || isGeneratingJpg}
              onClick={handleUniversalShareJpg}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="Kirim dokumen nota dalam format Gambar JPG via WhatsApp"
            >
              {isGeneratingJpg ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              <span>{isGeneratingJpg ? 'Membuat JPG...' : 'Kirim WA (JPG)'}</span>
            </button>

            {/* Kirim WA (Format PDF Resmi) */}
            <button
              type="button"
              disabled={isGeneratingPdf || isGeneratingJpg}
              onClick={handleUniversalSharePdf}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="Kirim dokumen nota dalam format PDF via WhatsApp"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Kirim WA (PDF)'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              disabled={isGeneratingPdf || isGeneratingJpg}
              onClick={handlePrint}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>Cetak</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200/70 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>

      {/* SHARE OPTIONS MODAL OVERLAY */}
      {showShareMenuModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Share2 className="w-4 h-4 text-amber-600" />
                <span>Pilih Format & Metode Berbagi Dokumen</span>
              </div>
              <button
                type="button"
                onClick={() => setShowShareMenuModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {/* Option 1: WhatsApp Image JPG */}
              <button
                type="button"
                onClick={() => {
                  setShowShareMenuModal(false);
                  handleUniversalShareJpg();
                }}
                className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-semibold rounded-xl border border-emerald-300 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Kirim Gambar (JPG) ke WhatsApp</div>
                    <div className="text-[10px] text-emerald-800">Format gambar langsung terlihat di chat WA</div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">JPG</span>
              </button>

              {/* Option 2: WhatsApp PDF */}
              <button
                type="button"
                onClick={() => {
                  setShowShareMenuModal(false);
                  handleUniversalSharePdf();
                }}
                className="w-full p-3 bg-teal-50 hover:bg-teal-100 text-teal-950 font-semibold rounded-xl border border-teal-300 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4 text-teal-600 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Kirim Dokumen (PDF) ke WhatsApp</div>
                    <div className="text-[10px] text-teal-800">Format file dokumen resmi (.pdf)</div>
                  </div>
                </div>
                <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-bold">PDF</span>
              </button>

              {/* Option 3: Email Client */}
              <button
                type="button"
                onClick={() => {
                  setShowShareMenuModal(false);
                  handleSendEmail();
                }}
                className="w-full p-3 bg-sky-50 hover:bg-sky-100 text-sky-950 font-semibold rounded-xl border border-sky-200 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-sky-600 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Kirim via Email / Gmail</div>
                    <div className="text-[10px] text-sky-800">Lampirkan ringkasan nota ke aplikasi email</div>
                  </div>
                </div>
                <span className="text-[10px] bg-sky-600 text-white px-2 py-0.5 rounded-full font-bold">Email</span>
              </button>

              {/* Option 6: Copy Text */}
              <button
                type="button"
                onClick={handleCopySummaryText}
                className="w-full p-3 bg-amber-50 hover:bg-amber-100 text-amber-950 font-semibold rounded-xl border border-amber-200 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {copiedNotice ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Copy className="w-4 h-4 text-amber-600 shrink-0" />}
                  <div className="text-left">
                    <div className="font-bold">{copiedNotice ? 'Teks Berhasil Disalin!' : 'Salin Teks Ringkasan'}</div>
                    <div className="text-[10px] text-amber-800">Paste di mana saja (Telegram, SMS, Catatan)</div>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">
                  {copiedNotice ? 'Tersalin' : 'Copy'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
