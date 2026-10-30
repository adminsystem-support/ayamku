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
  Send
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  SaleTransaction, 
  PurchaseTransaction, 
  SalarySlip, 
  StoreProfile,
  Customer,
  Supplier,
  Employee,
  AttendanceRecord
} from '../types/index.ts';
import { formatCurrency, formatNumber, formatDate, formatDateTime, generateWhatsAppSalaryMessage } from '../utils/formatters.ts';
import { createDocumentPdf, formatWhatsAppPhone, generateWhatsAppMessage } from '../utils/documentPdf.ts';

export type PrintData = 
  | { type: 'sale'; data: SaleTransaction }
  | { type: 'purchase'; data: PurchaseTransaction }
  | { type: 'salary'; data: SalarySlip }
  | { 
      type: 'payment_receipt'; 
      data: {
        receiptNo: string;
        title: string;
        date: string;
        counterpartyName: string;
        invoiceNumber: string;
        totalInvoiceAmount: number;
        paymentAmount: number;
        remainingDebt: number;
        paymentMethod: 'Tunai' | 'Transfer';
        notes?: string;
        recordedBy: string;
      }
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
}) => {
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('thermal');
  const [thermalSize, setThermalSize] = useState<'58mm' | '80mm'>(storeProfile.thermalWidth || '58mm');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [waGuideAlert, setWaGuideAlert] = useState<{ show: boolean; fileName: string; phone?: string } | null>(null);
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

  if (!isOpen || !printData) return null;

  const handlePrint = () => {
    window.print();
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
    try {
      // 1. Vector PDF generation via jsPDF & autoTable (100% reliable, zero CSS crashes)
      const { doc, fileName } = createDocumentPdf(printData, storeProfile, printFormat);
      const blob = doc.output('blob');
      const summaryText = generateWhatsAppMessage(printData, storeProfile, recipientPhone);
      return { blob, fileName, summaryText };
    } catch (err) {
      console.warn('Vector PDF generation fallback, trying html2canvas:', err);
      // Fallback to html2canvas if needed
      const el = document.getElementById('printable-document');
      if (!el) return null;

      const canvas = await html2canvas(el, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const isThermal = printFormat === 'thermal';

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isThermal
          ? (thermalSize === '58mm' ? [58, Math.max(90, (canvas.height * 58) / canvas.width)] : [80, Math.max(120, (canvas.height * 80) / canvas.width)])
          : 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName = `Dokumen_${Date.now()}.pdf`;
      const summaryText = generateWhatsAppMessage(printData, storeProfile, recipientPhone);
      const blob = pdf.output('blob');
      return { blob, fileName, summaryText };
    }
  };

  const handleSharePdfWhatsApp = async () => {
    setIsGeneratingPdf(true);
    const cleanPhone = formatWhatsAppPhone(recipientPhone);
    const summaryText = generateWhatsAppMessage(printData, storeProfile, recipientPhone);

    try {
      const res = await generatePdfBlob();
      if (!res) return;

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

      // Open WhatsApp directly targeting the registered phone number!
      const waText = encodeURIComponent(res.summaryText);
      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${waText}`
        : `https://wa.me/?text=${waText}`;

      window.open(waUrl, '_blank');
    } catch (e: any) {
      console.error('Error generating/sharing PDF:', e);
      const waText = encodeURIComponent(summaryText);
      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${waText}`
        : `https://wa.me/?text=${waText}`;
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
            text: res.summaryText,
          });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }

      // 2. Direct WhatsApp Web/App redirect with auto-downloaded PDF
      downloadBlobAsFile(res.blob, res.fileName);
      setWaGuideAlert({ show: true, fileName: res.fileName, phone: recipientPhone });

      const waText = encodeURIComponent(res.summaryText);
      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${waText}`
        : `https://wa.me/?text=${waText}`;

      window.open(waUrl, '_blank');
    } catch (e) {
      console.error('Error in universal share:', e);
      setShowShareMenuModal(true);
    } finally {
      setIsGeneratingPdf(false);
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Cetak Dokumen: {printData.type === 'sale' ? 'Nota Penjualan Elektronik' : printData.type === 'purchase' ? 'Faktur Pembelian Supplier' : 'Slip Gaji Karyawan'}
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
                    Dokumen Nota PDF "{waGuideAlert.fileName}" Siap Dikirim!
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    {waGuideAlert.phone ? (
                      <>Chat WhatsApp ke nomor tujuan <strong>{waGuideAlert.phone}</strong> telah dibuka langsung. </>
                    ) : (
                      <>WhatsApp telah dibuka. </>
                    )}
                    Ringkasan rincian belanja dan tautan E-Nota PDF resmi sudah otomatis terisi di kolom pesan.
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
                ? 'w-full max-w-[760px] p-8 border border-slate-200 rounded-xl print:p-0 print:border-none print:shadow-none print:max-w-full print:w-full' 
                : thermalSize === '58mm'
                  ? 'w-[280px] p-4 text-[11px] font-mono border border-slate-300 rounded-lg print:p-0 print:border-none print:shadow-none print:w-[58mm] print:max-w-[58mm]'
                  : 'w-[360px] p-5 text-[12px] font-mono border border-slate-300 rounded-lg print:p-0 print:border-none print:shadow-none print:w-[80mm] print:max-w-[80mm]'
            }`}
          >
            {/* 1. SALE TRANSACTION TEMPLATE (BUKTI TRANSAKSI ELEKTRONIK SAH TANPA TTD BASAH) */}
            {printData.type === 'sale' && (
              printFormat === 'a4' ? (
                // A4 Sale Invoice styled like Salary Slip
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
                        NOTA PENJUALAN ELEKTRONIK
                      </span>
                      <h2 className="text-sm font-bold font-mono text-slate-900 mt-1">{printData.data.invoiceNumber}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tanggal: {formatDateTime(printData.data.date)}
                      </p>
                    </div>
                  </div>

                  {/* Customer Details & Info Grid Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-base border border-amber-200/80 shrink-0">
                          {printData.data.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{printData.data.customerName}</h3>
                          <p className="text-[11px] font-medium text-slate-500">Tipe Pelanggan: {printData.data.customerType || 'Pelanggan Usaha'}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        printData.data.amountPaid >= printData.data.grandTotal 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        Status: {printData.data.amountPaid >= printData.data.grandTotal ? 'Lunas' : `Hutang (Sisa ${formatCurrency(printData.data.grandTotal - printData.data.amountPaid)})`}
                      </span>
                    </div>

                    {/* 4 Info Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">DITUJUKAN KEPADA:</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{printData.data.customerName}</span>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">NO. WHATSAPP PELANGGAN:</span>
                        <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600 inline shrink-0" />
                          {printData.data.customerPhone || (() => {
                            const found = customers.find(c => c.id === printData.data.customerId || c.name.toLowerCase() === printData.data.customerName?.toLowerCase());
                            return found?.phone || '-';
                          })()}
                        </span>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">METODE PEMBAYARAN:</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{printData.data.paymentMethod}</span>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">KASIR / PETUGAS:</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{printData.data.createdBy}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items Table Section */}
                  <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
                    <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                          RINCIAN BARANG & DETAIL DIBELI ({printData.data.items.length} ITEM)
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
                              <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-slate-200 text-slate-700">{formatCurrency(item.sellPrice)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-900">{formatCurrency(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-amber-50/80 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                          <tr>
                            <td className="py-2.5 px-3 text-left text-slate-800 align-top border-r border-slate-200">Total Qty</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900 align-top leading-snug border-r border-slate-200">
                              <div className="flex flex-col items-end gap-0.5">
                                {Object.entries(
                                  printData.data.items.reduce((acc, item) => {
                                    acc[item.unit] = (acc[item.unit] || 0) + item.quantity;
                                    return acc;
                                  }, {} as Record<string, number>)
                                ).map(([unit, qty]) => (
                                  <div key={unit}>{formatNumber(qty)} {unit}</div>
                                ))}
                              </div>
                            </td>
                            <td colSpan={3} className="py-2.5 px-3 text-right text-slate-600 font-normal italic">
                              Total jenis item: {printData.data.items.length} macam
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Income & Calculation Breakdown Box */}
                  <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs text-xs">
                    <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                        RINCIAN PEMBAYARAN & TOTAL PENJUALAN
                      </h4>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <tbody className="divide-y divide-slate-200 font-medium text-xs">
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3.5 text-slate-800 border-r border-slate-200">Subtotal Harga Barang:</td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-900">{formatCurrency(printData.data.subtotal)}</td>
                          </tr>
                          {printData.data.discount > 0 && (
                            <tr className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3.5 text-rose-700 font-semibold border-r border-slate-200">Diskon Potongan Harga:</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-600">-{formatCurrency(printData.data.discount)}</td>
                            </tr>
                          )}
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3.5 text-slate-800 border-r border-slate-200">Nominal Dibayar Customer:</td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(printData.data.amountPaid)}</td>
                          </tr>
                          {printData.data.amountPaid < printData.data.grandTotal ? (
                            <tr className="bg-rose-50/70 text-rose-900 font-semibold">
                              <td className="py-2.5 px-3.5 border-r border-rose-200">Total Sisa Hutang (Piutang Usaha):</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-700">{formatCurrency(printData.data.grandTotal - printData.data.amountPaid)}</td>
                            </tr>
                          ) : (
                            <tr className="bg-slate-50/70 text-slate-900">
                              <td className="py-2.5 px-3.5 border-r border-slate-200">Uang Kembalian:</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-semibold">{formatCurrency(printData.data.change)}</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-amber-50/80 font-bold border-t-2 border-slate-300 text-slate-900 text-xs sm:text-sm">
                          <tr>
                            <td className="py-3 px-3.5 text-slate-900 font-bold border-r border-slate-300">Total Penjualan (Grand Total):</td>
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
                // Thermal Sale Receipt (58mm / 80mm)
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
                      <span>Pelanggan:</span>
                      <span className="truncate max-w-[150px]">{printData.data.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kasir:</span>
                      <span>{printData.data.createdBy}</span>
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
                            {formatNumber(item.quantity)} {item.unit} x {formatNumber(item.sellPrice)}
                          </span>
                          <span className="font-bold text-slate-900">{formatCurrency(item.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Qty in thermal */}
                  <div className="text-left text-[10px] py-1 border-t border-dashed border-slate-300 flex justify-between items-start">
                    <span className="font-semibold text-slate-600">Total Qty:</span>
                    <div className="font-bold text-slate-900 text-right flex flex-col items-end">
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

                  {/* Calculations */}
                  <div className="text-left space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(printData.data.subtotal)}</span>
                    </div>
                    {printData.data.discount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Diskon:</span>
                        <span>-{formatCurrency(printData.data.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                      <span>TOTAL:</span>
                      <span>{formatCurrency(printData.data.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span>Bayar ({printData.data.paymentMethod}):</span>
                      <span>{formatCurrency(printData.data.amountPaid)}</span>
                    </div>
                    {printData.data.amountPaid < printData.data.grandTotal ? (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Total Hutang:</span>
                        <span>{formatCurrency(printData.data.grandTotal - printData.data.amountPaid)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span>Kembali:</span>
                        <span>{formatCurrency(printData.data.change)}</span>
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
                            <td className="py-2.5 px-3 text-left text-slate-800 align-top border-r border-slate-200">Total Qty</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900 align-top leading-snug border-r border-slate-200">
                              <div className="flex flex-col items-end gap-0.5">
                                {Object.entries(
                                  printData.data.items.reduce((acc, item) => {
                                    acc[item.unit] = (acc[item.unit] || 0) + item.quantity;
                                    return acc;
                                  }, {} as Record<string, number>)
                                ).map(([unit, qty]) => (
                                  <div key={unit}>{formatNumber(qty)} {unit}</div>
                                ))}
                              </div>
                            </td>
                            <td colSpan={3} className="py-2.5 px-3 text-right text-slate-600 font-normal italic">
                              Total jenis item: {printData.data.items.length} macam
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
                  <div className="text-left text-[10px] py-1 border-t border-dashed border-slate-300 flex justify-between items-start">
                    <span className="font-semibold text-slate-600">Total Qty:</span>
                    <div className="font-bold text-slate-900 text-right flex flex-col items-end">
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

            {/* 3. SALARY SLIP TEMPLATE */}
            {printData.type === 'salary' && (() => {
              const s = printData.data;
              const emp = employees.find(e => e.id === s.employeeId);
              const empCode = emp?.code || 'EMP-1';
              const empRole = s.employeeRole || emp?.role || '-';
              const empPhone = emp?.phone || '-';
              const dailyWageRate = emp?.dailyWage || (s.daysPresent > 0 ? Math.round(s.totalDailyWage / s.daysPresent) : 100000);
              const overtimeRate = emp?.standardOvertimeRate || 20000;
              const empStatus = emp?.status || 'Aktif';

              const hrsOvertime = s.totalOvertimeHours !== undefined && s.totalOvertimeHours > 0
                ? s.totalOvertimeHours
                : (s.totalOvertimePay > 0 ? Math.round(s.totalOvertimePay / overtimeRate) : s.daysOvertime);

              // Filter actual attendance records for this period
              const periodRecords = (attendanceRecords || [])
                .filter(r => r.employeeId === s.employeeId && r.date >= s.periodStart && r.date <= s.periodEnd)
                .sort((a, b) => a.date.localeCompare(b.date));

              // Fallback daily rows if periodRecords is empty
              const dailyRowsToRender = periodRecords.length > 0 ? periodRecords : (() => {
                const rows = [];
                let cur = new Date(s.periodStart);
                const end = new Date(s.periodEnd);
                while (cur <= end) {
                  const dateStr = cur.toISOString().split('T')[0];
                  rows.push({
                    id: `synth-${dateStr}`,
                    date: dateStr,
                    employeeId: s.employeeId,
                    employeeName: s.employeeName,
                    role: empRole,
                    status: 'Hadir' as const,
                    wageAmount: dailyWageRate,
                    overtimeHours: s.daysOvertime > 0 ? Math.round(hrsOvertime / Math.max(1, s.daysOvertime)) : 0,
                    overtimePay: s.daysOvertime > 0 ? Math.round(s.totalOvertimePay / Math.max(1, s.daysOvertime)) : 0,
                  });
                  cur.setDate(cur.getDate() + 1);
                }
                return rows;
              })();

              return (
                <div className="space-y-5">
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
                      <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        SLIP GAJI KARYAWAN
                      </span>
                      <h2 className="text-sm font-bold font-mono text-slate-900 mt-1">{s.slipNumber}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Periode: {formatDate(s.periodStart)} s/d {formatDate(s.periodEnd)}
                      </p>
                    </div>
                  </div>

                  {/* Employee Details & Info Grid Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-base border border-amber-200/80 shrink-0">
                          {s.employeeName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{s.employeeName}</h3>
                          <p className="text-[11px] font-mono text-slate-500">Kode ID: {empCode}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${empStatus === 'Aktif' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-300'}`}>
                        Status: {empStatus}
                      </span>
                    </div>

                    {/* 4 Info Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">POSISI / BAGIAN:</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{empRole}</span>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">NO. WHATSAPP KARYAWAN:</span>
                        <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600 inline shrink-0" />
                          {empPhone}
                        </span>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">TARIF UPAH HARIAN:</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{formatCurrency(dailyWageRate)} <span className="text-[10px] font-normal text-slate-500">/hari</span></span>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">STANDAR TARIF LEMBUR:</span>
                        <span className="font-bold text-blue-700 mt-0.5 block">{formatCurrency(overtimeRate)} <span className="text-[10px] font-normal text-slate-500">/jam</span></span>
                      </div>
                    </div>

                    {/* Period Row */}
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 block mb-1">Dari Tanggal (Awal Periode):</span>
                        <div className="bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-medium text-slate-900 flex justify-between items-center text-xs">
                          <span>{formatDate(s.periodStart)}</span>
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 block mb-1">Sampai Tanggal (Akhir Periode):</span>
                        <div className="bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-medium text-slate-900 flex justify-between items-center text-xs">
                          <span>{formatDate(s.periodEnd)}</span>
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily Attendance & Pay Calculation Breakdown Table */}
                  <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
                    <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                          RINCIAN ABSENSI & HITUNGAN HARIAN ({formatDate(s.periodStart)} S/D {formatDate(s.periodEnd)})
                        </h4>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                          <tr>
                            <th className="py-2.5 px-3 border-r border-slate-300">Tanggal</th>
                            <th className="py-2.5 px-3 border-r border-slate-300">Status</th>
                            <th className="py-2.5 px-3 text-right border-r border-slate-300">Upah Pokok</th>
                            <th className="py-2.5 px-3 text-center border-r border-slate-300">Jam Lembur</th>
                            <th className="py-2.5 px-3 text-right border-r border-slate-300">Upah Lembur</th>
                            <th className="py-2.5 px-3 text-right">Subtotal Hari Ini</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-xs">
                          {dailyRowsToRender.map((rec, idx) => {
                            const otHrs = rec.overtimeHours ? `${rec.overtimeHours} Jam` : (rec.overtimePay ? `${Math.round(rec.overtimePay / overtimeRate)} Jam` : '0 Jam');
                            const subtotalDay = rec.wageAmount + (rec.overtimePay || 0);
                            return (
                              <tr key={rec.id || rec.date} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="py-2 px-3 text-slate-900 font-semibold border-r border-slate-200">{formatDate(rec.date)}</td>
                                <td className="py-2 px-3 border-r border-slate-200">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {rec.status}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-800 border-r border-slate-200">{formatCurrency(rec.wageAmount)}</td>
                                <td className="py-2 px-3 text-center font-semibold text-slate-700 border-r border-slate-200">{otHrs}</td>
                                <td className="py-2 px-3 text-right font-mono text-blue-700 border-r border-slate-200">
                                  {rec.overtimePay && rec.overtimePay > 0 ? `+${formatCurrency(rec.overtimePay)}` : 'Rp 0'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(subtotalDay)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-amber-50/80 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                          <tr>
                            <td colSpan={2} className="py-2.5 px-3 text-slate-900 font-bold border-r border-slate-200">Total Akumulasi Periode:</td>
                            <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200">{formatCurrency(s.totalDailyWage)}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-800 border-r border-slate-200">
                              {hrsOvertime} Jam ({s.daysOvertime} Hari)
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 border-r border-slate-200">+{formatCurrency(s.totalOvertimePay)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-xs font-bold">
                              {formatCurrency(s.totalDailyWage + s.totalOvertimePay)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Income & Deductions Summary Box with Clean Table Lines */}
                  <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs text-xs">
                    <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                        RINCIAN PENGHASILAN & POTONGAN
                      </h4>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <tbody className="divide-y divide-slate-200 font-medium text-xs">
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3.5 text-slate-800 border-r border-slate-200">Total Upah Harian Pokok:</td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-900">{formatCurrency(s.totalDailyWage)}</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3.5 text-slate-800 border-r border-slate-200">
                              Total Upah Lembur ({hrsOvertime} Jam / {s.daysOvertime} Hari):
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-700">+{formatCurrency(s.totalOvertimePay)}</td>
                          </tr>
                          {s.allowance > 0 && (
                            <tr className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3.5 text-slate-800 border-r border-slate-200">Uang Makan & Tunjangan:</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">+{formatCurrency(s.allowance)}</td>
                            </tr>
                          )}
                          {s.bonus > 0 && (
                            <tr className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3.5 text-emerald-800 font-semibold border-r border-slate-200">Bonus Khusus Tambahan:</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-700">+{formatCurrency(s.bonus)}</td>
                            </tr>
                          )}
                          {s.deduction > 0 && (
                            <tr className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3.5 text-rose-700 font-semibold border-r border-slate-200">Potongan Kasbon / Pinjaman:</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-600">-{formatCurrency(s.deduction)}</td>
                            </tr>
                          )}
                          {s.kasbonRemainingAfter !== undefined && s.kasbonRemainingAfter > 0 && (
                            <tr className="bg-amber-50/70 text-amber-900 font-semibold">
                              <td className="py-2.5 px-3.5 border-r border-amber-200">Sisa Saldo Kasbon Karyawan:</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold">{formatCurrency(s.kasbonRemainingAfter)}</td>
                            </tr>
                          )}
                          {s.kasbonRemainingAfter !== undefined && s.kasbonRemainingAfter === 0 && (s.kasbonOutstandingBefore || 0) > 0 && (
                            <tr className="bg-emerald-50/70 text-emerald-900 font-semibold">
                              <td className="py-2.5 px-3.5 border-r border-emerald-200">Status Kasbon:</td>
                              <td className="py-2.5 px-3.5 text-right font-bold">Lunas (Sisa Rp 0)</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-amber-50/80 font-bold border-t-2 border-slate-300 text-slate-900 text-xs sm:text-sm">
                          <tr>
                            <td className="py-3 px-3.5 text-slate-900 font-bold border-r border-slate-300">Total Gaji Bersih (Take Home Pay):</td>
                            <td className="py-3 px-3.5 text-right font-mono text-emerald-800 text-sm sm:text-base font-bold">{formatCurrency(s.netSalary)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {s.notes && (
                    <p className="text-xs text-slate-500 italic">Catatan: {s.notes}</p>
                  )}

                  {/* Official Electronic Verification Notice (No Manual Signature Lines) */}
                  <div className="pt-3 border-t border-slate-200 text-center">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-w-lg mx-auto space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>DOKUMEN BUKTI GAJI ELEKTRONIK SAH</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">
                        Dokumen Slip Gaji ini diterbitkan secara otomatis oleh sistem operasional <strong>{storeProfile.name}</strong>. Berkas ini sah dan berlaku sebagai bukti resmi penerimaan upah tanpa memerlukan tanda tangan basah.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. PAYMENT RECEIPT TEMPLATE (BUKTI KAS MASUK / KAS KELUAR - NOTA PENERIMAAN / PELUNASAN) */}
            {printData.type === 'payment_receipt' && (
              printFormat === 'a4' ? (
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
                        {printData.data.title}
                      </span>
                      <h2 className="text-base font-bold font-mono text-slate-900 mt-1.5">{printData.data.receiptNo}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Tanggal: {formatDateTime(printData.data.date)}</p>
                    </div>
                  </div>

                  {/* Receipt Details Table */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden bg-white text-xs">
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-slate-50">
                          <td className="py-2.5 px-3.5 text-slate-600 font-medium border-r border-slate-200 w-1/2">Pihak Terkait / Customer / Supplier</td>
                          <td className="py-2.5 px-3.5 text-sm font-bold text-slate-900">{printData.data.counterpartyName}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3.5 text-slate-600 font-medium border-r border-slate-200">Referensi Dokumen Utama</td>
                          <td className="py-2.5 px-3.5 text-sm font-mono font-bold text-amber-700">
                            {printData.data.invoiceNumber}
                            <span className="text-[11px] text-slate-500 font-normal ml-2">(Nilai Faktur: {formatCurrency(printData.data.totalInvoiceAmount)})</span>
                          </td>
                        </tr>
                        <tr className="bg-emerald-50/70 font-bold">
                          <td className="py-2.5 px-3.5 text-slate-800 border-r border-emerald-200">Nominal Pembayaran / Diterima</td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-800 text-base">{formatCurrency(printData.data.paymentAmount)}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3.5 text-slate-600 font-medium border-r border-slate-200">Metode Pembayaran</td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-800">{printData.data.paymentMethod}</td>
                        </tr>
                        {printData.data.notes && (
                          <tr>
                            <td className="py-2.5 px-3.5 text-slate-600 font-medium border-r border-slate-200">Catatan / Keterangan</td>
                            <td className="py-2.5 px-3.5 font-medium text-slate-800 italic">{printData.data.notes}</td>
                          </tr>
                        )}
                        <tr className="bg-rose-50/70 font-bold text-rose-800">
                          <td className="py-2.5 px-3.5 border-r border-rose-200">Sisa Hutang / Piutang Setelah Pembayaran Ini</td>
                          <td className="py-2.5 px-3.5 font-mono text-base">{formatCurrency(printData.data.remainingDebt)}</td>
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
                        <p className="font-medium text-slate-800">( {printData.data.counterpartyName} )</p>
                      </div>
                      <div>
                        <p>Petugas / Admin Usaha,</p>
                        <div className="h-16"></div>
                        <p className="font-medium text-slate-800">( {printData.data.recordedBy || 'Admin Usaha'} )</p>
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

                  <div className="font-bold uppercase tracking-wider text-[11px] text-slate-900">{printData.data.title}</div>
                  <div className="font-mono font-bold text-slate-800">{printData.data.receiptNo}</div>
                  <div className="text-slate-500">{formatDateTime(printData.data.date)}</div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>

                  <div className="text-left space-y-1">
                    <div className="flex justify-between">
                      <span>Pihak:</span>
                      <span className="font-bold truncate max-w-[140px]">{printData.data.counterpartyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ref Faktur:</span>
                      <span className="font-mono font-bold">{printData.data.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-xs">
                      <span>BAYAR:</span>
                      <span className="font-mono">{formatCurrency(printData.data.paymentAmount)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700 font-bold border-t border-dashed border-slate-300 pt-1">
                      <span>SISA HUTANG:</span>
                      <span className="font-mono">{formatCurrency(printData.data.remainingDebt)}</span>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-400 my-2"></div>
                  <div className="text-slate-600 italic">{printData.data.notes || 'Bukti Pembayaran / Pelunasan Sah'}</div>
                </div>
              )
            )}

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
            {/* Kirim WA (Format PDF Resmi via Native Share / WhatsApp Direct) */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleUniversalSharePdf}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="Kirim dokumen nota dalam bentuk PDF resmi via WhatsApp atau Share"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Kirim WA'}</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="Unduh file dokumen format PDF ke memori perangkat"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh PDF</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200/70 rounded-xl text-xs font-semibold cursor-pointer"
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
                <span>Pilih Aplikasi / Metode Berbagi Dokumen</span>
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
              {/* Option 1: WhatsApp Direct */}
              <button
                type="button"
                onClick={() => {
                  setShowShareMenuModal(false);
                  handleSharePdfWhatsApp();
                }}
                className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-semibold rounded-xl border border-emerald-300 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Kirim Chat WhatsApp</div>
                    <div className="text-[10px] text-emerald-800">
                      {recipientPhone ? `Ke nomor +${formatWhatsAppPhone(recipientPhone)}` : 'Buka WhatsApp Messenger'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">Buka</span>
              </button>

              {/* Option 2: Email Client */}
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

              {/* Option 3: Copy Text */}
              <button
                type="button"
                onClick={handleCopySummaryText}
                className="w-full p-3 bg-amber-50 hover:bg-amber-100 text-amber-950 font-semibold rounded-xl border border-amber-200 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {copiedNotice ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Copy className="w-4 h-4 text-amber-600 shrink-0" />}
                  <div className="text-left">
                    <div className="font-bold">{copiedNotice ? 'Teks Berhasil Disalin!' : 'Salin Teks Ringkasan Nota'}</div>
                    <div className="text-[10px] text-amber-800">Paste di mana saja (Telegram, SMS, Catatan)</div>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">
                  {copiedNotice ? 'Tersalin' : 'Copy'}
                </span>
              </button>

              {/* Option 4: Download PDF */}
              <button
                type="button"
                onClick={() => {
                  setShowShareMenuModal(false);
                  handleDownloadPdf();
                }}
                className="w-full p-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-xl border border-slate-300 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-slate-700 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Unduh File Dokumen PDF</div>
                    <div className="text-[10px] text-slate-600">Simpan file .pdf resmi ke folder Download</div>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-full font-bold">PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
