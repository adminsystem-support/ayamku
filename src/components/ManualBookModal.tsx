import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Lock,
  Package,
  ShoppingCart,
  ClipboardCheck,
  Users,
  Calculator,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Download,
  Printer,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { ActiveTab, UserRole } from '../types/index.ts';

interface ManualBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
  userRole?: UserRole;
}

interface ProcessGuide {
  id: string;
  tabKey?: ActiveTab;
  title: string;
  badge: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  svgPath: string;
  summary: string;
  steps: {
    num: string;
    title: string;
    desc: string;
    tips?: string;
  }[];
  adminOnly?: boolean;
}

export const ManualBookModal: React.FC<ManualBookModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  userRole = 'admin',
}) => {
  const [selectedProcessId, setSelectedProcessId] = useState<string>('login');

  if (!isOpen) return null;

  const guides: ProcessGuide[] = [
    {
      id: 'login',
      title: '1. Login Bersih, Keamanan & Kunci Layar (30 Menit Idle)',
      badge: 'Keamanan',
      color: 'amber',
      icon: Lock,
      svgPath: '/guides/01_login_lock_flow.svg',
      summary: 'Alur masuk sistem yang bersih tanpa tombol demo, sistem pemantauan aktivitas, tombol kunci cepat, dan fitur auto-kick otomatis bila tidak ada aktivitas selama 30 menit.',
      steps: [
        {
          num: '1',
          title: 'Input Username & Password di Halaman Login',
          desc: 'Tampilan login dibuat minimalis dan bersih hanya menampilkan Logo Ayam Ans Chicken Group, Nama Usaha, input username, input password, dan tombol login.',
          tips: 'Gunakan akun "admin" untuk hak akses penuh atau akun kasir yang telah didaftarkan.'
        },
        {
          num: '2',
          title: 'Sistem Deteksi Aktivitas & Timer 30 Menit',
          desc: 'Saat sistem aktif, setiap ketukan keyboard atau pergerakan mouse akan mereset timer idle 30 menit secara otomatis di latar belakang.',
        },
        {
          num: '3',
          title: 'Kunci Layar Manual (Cepat)',
          desc: 'Ketika kasir atau petugas meninggalkan meja (istirahat sholat, makan, atau ke gudang), klik tombol "Kunci Layar" di header atau sidebar.',
          tips: 'Data transaksi di kasir tidak akan hilang saat layar terkunci.'
        },
        {
          num: '4',
          title: 'Auto-Kick & Buka Kunci (Unlock)',
          desc: 'Jika komputer ditinggal selama 30 menit tanpa ada aktivitas sama sekali, sistem akan otomatis menendang keluar (auto-kick) demi mencegah manipulasi data oleh pihak tak berwenang.',
          tips: 'Cukup masukkan password kembali untuk membuka kunci layar.'
        }
      ]
    },
    {
      id: 'item',
      tabKey: 'produk',
      title: '2. Registrasi Item, Dropdown & Riwayat Semua Sumber',
      badge: 'Master Item',
      color: 'emerald',
      icon: Package,
      svgPath: '/guides/02_registrasi_item_flow.svg',
      summary: 'Cara mendaftarkan item ayam baru atau memperbarui stok item yang sudah ada menggunakan pilihan dropdown cerdas, kalkulator margin otomatis, serta log riwayat inputan yang transparan dari semua sumber.',
      steps: [
        {
          num: '1',
          title: 'Ketik Nama Item (Pilihan Dropdown Cerdas)',
          desc: 'Ketik huruf awal nama item di kolom "Nama Item". Jika item sudah pernah terdaftar, sistem langsung memunculkannya dalam daftar dropdown. Klik untuk memilih. Jika belum pernah terdaftar, Anda dapat mengetik manual nama baru.',
          tips: 'Pencegahan duplikasi nama item menjaga konsistensi stok dan laporan.'
        },
        {
          num: '2',
          title: 'Pilih Sumber Inputan',
          desc: 'Pilih apakah item berasal dari "Registrasi Manual", "Pembelian Faktur Peternak", atau "Hasil Olah Potong Karkas".'
        },
        {
          num: '3',
          title: 'Input Bobot, Harga Beli & Target Margin (%)',
          desc: 'Masukkan bobot masuk (Kg/ekor), harga beli per Kg, dan persentase keuntungan yang diinginkan. Sistem otomatis menghitung harga jual rekomendasi dan estimasi laba kotor.',
        },
        {
          num: '4',
          title: 'Pantau Tabel Riwayat Lengkap Semua Sumber',
          desc: 'Di bagian bawah form registrasi terdapat tabel "Riwayat Inputan Item" yang mencatat secara transparan semua riwayat inputan dari berbagai sumber beserta tanggal, petugas kasir, dan penambahan stoknya.'
        }
      ]
    },
    {
      id: 'pos',
      tabKey: 'pos',
      title: '3. Kasir Nota, Watermark LUNAS & Cetak/WA Rapi',
      badge: 'Kasir POS',
      color: 'blue',
      icon: ShoppingCart,
      svgPath: '/guides/03_pos_kasir_flow.svg',
      summary: 'Proses transaksi kasir timbangan unggas yang cepat, pilihan pembayaran tunai/tempo, serta nota penjualan resmi dengan watermark LUNAS tebal transparan dan kolom Total Qty yang rapi tanpa terpotong.',
      steps: [
        {
          num: '1',
          title: 'Pilih Item Ayam & Masukkan Timbangan Aktual',
          desc: 'Cari item ayam di katalog kasir. Masukkan bobot timbangan digital (misal 12.50 Kg) atau jumlah ekor. Klik "Tambah ke Keranjang".',
        },
        {
          num: '2',
          title: 'Pilih Pelanggan & Metode Pembayaran',
          desc: 'Pilih pelanggan umum atau pelanggan langganan/resto. Pilih pembayaran "Tunai (Lunas)" atau "Tempo (Piutang)". Jika tunai, masukkan nominal uang diterima.',
        },
        {
          num: '3',
          title: 'Penyelesaian Transaksi & Watermark LUNAS',
          desc: 'Saat transaksi tunai diselesaikan, sistem membuat nota dengan watermark diagonal tebal transparan bertuliskan "LUNAS" di tengah nota. Format total kuantiti dibuat satu baris rapi tanpa wrap text/terpotong.',
        },
        {
          num: '4',
          title: 'Pilihan Output: Cetak, PDF, atau Kirim WA',
          desc: 'Kasir dapat langsung menekan tombol Cetak (print thermal/inkjet langsung keluar), tombol Download PDF (arsip file), atau tombol Kirim WA (notifikasi langsung ke nomor handphone pelanggan).',
          tips: 'Semua dokumen PDF maupun cetak fisik memiliki watermark LUNAS resmi.'
        }
      ]
    },
    {
      id: 'opname',
      tabKey: 'opname',
      title: '4. Stok Opname & Persetujuan Selisih Susut Es',
      badge: 'Gudang & Stok',
      color: 'indigo',
      icon: ClipboardCheck,
      svgPath: '/guides/04_stok_opname_flow.svg',
      summary: 'Prosedur pemeriksaan fisik cold storage/chiller, penghitungan persentase susut es/cairan otomatis, dan jalur otorisasi persetujuan Admin sebelum stok disesuaikan.',
      steps: [
        {
          num: '1',
          title: 'Pilih Item Ayam di Cold Storage / Freezer',
          desc: 'Pilih item yang ingin dicocokkan. Sistem akan menampilkan angka stok saat ini yang tercatat di database komputer.',
        },
        {
          num: '2',
          title: 'Timbang Fisik Nyata & Masukkan Catatan',
          desc: 'Timbang seluruh fisik item yang ada di tempat pendingin. Ketikkan angka timbangan fisik (misal 58.80 Kg) dan tuliskan alasan selisih (misal lelehan es atau sisa lemak potong).',
        },
        {
          num: '3',
          title: 'Kalkulasi Otomatis Persentase Susut',
          desc: 'Sistem langsung menghitung selisih kilogram dan persentase susut. Jika susut wajar (di bawah 3%), sistem memberikan indikator aman.',
        },
        {
          num: '4',
          title: 'Persetujuan Otorisasi Admin / Owner',
          desc: 'Pengajuan opname masuk ke antrean "Pending". Admin/Owner memeriksa alasan lalu menekan tombol "Setujui". Setelah disetujui, stok master otomatis diperbarui dan selisih tercatat di laporan laba rugi.',
          tips: 'Menjaga transparansi antara petugas gudang dan pemilik toko.'
        }
      ]
    },
    {
      id: 'kontak',
      tabKey: 'kontak',
      title: '5. Manajemen Mitra (Pemasok, Pelanggan, Hutang & Piutang)',
      badge: 'Mitra Usaha',
      color: 'purple',
      icon: Users,
      svgPath: '/guides/05_supplier_pelanggan_flow.svg',
      summary: 'Pengelolaan daftar peternak kandang pemasok ayam, pelanggan langganan warung/resto, pencatatan faktur tempo hutang dagang, dan pelunasan piutang pelanggan.',
      steps: [
        {
          num: '1',
          title: 'Daftarkan Master Pemasok & Pelanggan',
          desc: 'Input nama mitra, nomor telepon WhatsApp, dan alamat kandang/restoran untuk mempermudah koordinasi pengiriman.',
        },
        {
          num: '2',
          title: 'Catat Faktur Pembelian Ayam dari Pemasok',
          desc: 'Saat kiriman ayam hidup datang dari peternak, catat nomor faktur, tonase/kg masuk, harga per kg, dan tanggal jatuh tempo pembayaran.',
        },
        {
          num: '3',
          title: 'Pantau Piutang Pelanggan Restoran',
          desc: 'Pelanggan yang mengambil ayam dengan nota tempo akan memiliki saldo piutang berjalan. Batas kredit (limit) mencegah piutang macet berlebihan.',
        },
        {
          num: '4',
          title: 'Pelunasan & Rekonsiliasi Kas',
          desc: 'Saat pelanggan membayar cicilan atau lunas, catat penerimaan kas masuk. Begitu juga saat membayar faktur peternak, saldo hutang berkurang dan uang kas keluar tercatat rapi.'
        }
      ]
    },
    {
      id: 'operasional',
      tabKey: 'operasional',
      title: '6. Pengeluaran Toko Harian & Gaji / Kasbon Karyawan',
      badge: 'Operasional & SDM',
      color: 'rose',
      icon: Calculator,
      svgPath: '/guides/06_operasional_gaji_flow.svg',
      summary: 'Pencatatan pengeluaran harian toko (es batu, bensin pick up, kantong kresek), absensi harian karyawan, pemotongan kasbon otomatis, dan cetak slip gaji.',
      adminOnly: true,
      steps: [
        {
          num: '1',
          title: 'Input Pengeluaran Rutin Toko',
          desc: 'Catat setiap uang yang keluar dari laci kasir: pembelian es balok untuk pendingin ayam, bensin pick up pengiriman, plastik bungkus karkas, pakan sementara, hingga token listrik.',
          tips: 'Setiap input langsung mengurangi saldo kas riil toko.'
        },
        {
          num: '2',
          title: 'Absensi Harian Karyawan',
          desc: 'Buka menu absensi dan tandai kehadiran tim: Hadir, Sakit, Izin, atau Alpha. Sistem merekap total hari kerja secara otomatis dalam sebulan.',
        },
        {
          num: '3',
          title: 'Catat Kasbon / Pinjaman Karyawan',
          desc: 'Bila karyawan mengajukan kasbon di tengah bulan, catat nominalnya. Kasbon ini akan otomatis menjadi faktor pengurang saat perhitungan gaji akhir bulan.',
        },
        {
          num: '4',
          title: 'Cetak Slip Gaji & Rekap Pengeluaran',
          desc: 'Di akhir periode gajian, sistem mengkalkulasi Gaji Pokok + Uang Makan/Lembur - Potongan Kasbon. Cetak slip gaji resmi untuk diserahkan ke karyawan dengan tanda tangan penerima.',
        }
      ]
    },
    {
      id: 'laporan',
      tabKey: 'laporan',
      title: '7. Laporan Keuangan Terpadu 1 Halaman (Owner Dashboard)',
      badge: 'Laporan Keuangan',
      color: 'emerald',
      icon: BarChart3,
      svgPath: '/guides/07_laporan_keuangan_flow.svg',
      summary: 'Seluruh kinerja keuangan bisnis dalam satu lembar tampilan terpadu: Omset uang masuk, HPP pembelian, beban toko, gaji staf, laba bersih nyata, serta saldo arus kas fisik di tangan.',
      adminOnly: true,
      steps: [
        {
          num: '1',
          title: 'Pilih Rentang Waktu (Hari Ini, Minggu Ini, Bulan Ini)',
          desc: 'Gunakan tombol filter waktu cepat untuk melihat kinerja hari ini, minggu berjalan, bulan ini, atau pilih tanggal kustom sesuai kebutuhan evaluasi.',
        },
        {
          num: '2',
          title: 'Pantau 4 Kartu KPI Keuangan Utama',
          desc: '1. Total Uang Masuk (Omset Tunai & Pelunasan Piutang), 2. HPP & Laba Kotor Dagang, 3. Total Beban Operasional & Gaji, 4. Laba Bersih Nyata (Profit).',
        },
        {
          num: '3',
          title: 'Cocokkan Saldo Kas Laci Kasir (Cash Flow)',
          desc: 'Tabel arus kas memperlihatkan Saldo Kas Awal + Total Uang Masuk - Bayar Faktur Peternak - Beban Toko = Saldo Kas Fisik Akhir. Angka ini harus cocok dengan fisik uang di laci kasir dan rekening bank toko.',
          tips: 'Mencegah kebocoran uang kas dan selisih pembukuan.'
        },
        {
          num: '4',
          title: 'Download Laporan PDF / Ekspor Excel',
          desc: 'Klik tombol "Download PDF" atau "Ekspor Excel" untuk mencetak dokumen pembukuan bulanan bagi arsip owner atau pelaporan pajak usaha.'
        }
      ]
    }
  ];

  const currentGuide = guides.find((g) => g.id === selectedProcessId) || guides[0];

  const handleGoToFeature = (tabKey?: ActiveTab) => {
    if (tabKey && onNavigateTab) {
      onNavigateTab(tabKey);
      onClose();
    }
  };

  const handlePrintCurrentGuide = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Buku Panduan &amp; Diagram Alur Pemakaian Sistem
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Visual Guide
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lengkap dengan ilustrasi diagram proses, langkah praktis kasir/admin, dan tips efisiensi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintCurrentGuide}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              title="Cetak panduan ini"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body with 2-Column Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Menu: List of 7 Processes */}
          <div className="w-full lg:w-72 bg-slate-950/60 border-r border-slate-800 p-3 overflow-y-auto space-y-1.5 shrink-0 max-h-48 lg:max-h-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
              Daftar 7 Alur Proses
            </span>

            {guides.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedProcessId === item.id;
              const isRestricted = item.adminOnly && userRole !== 'admin';

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedProcessId(item.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className={`mt-0.5 p-1 rounded-lg shrink-0 ${
                    isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{item.title}</span>
                    </div>
                    <span className={`text-[10px] block truncate ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                      {item.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Main Content: Interactive SVG Graphic & Step-by-Step Instructions */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Process Header & Quick Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {currentGuide.badge}
                  </span>
                  {currentGuide.adminOnly && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Khusus Admin/Owner
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                  {currentGuide.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  {currentGuide.summary}
                </p>
              </div>

              {currentGuide.tabKey && (
                <button
                  onClick={() => handleGoToFeature(currentGuide.tabKey)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-transform active:scale-95 shrink-0 cursor-pointer"
                >
                  <span>Buka Fitur Ini Langsung</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* VISUAL DIAGRAM / ILLUSTRATION CONTAINER */}
            <div className="rounded-2xl border border-slate-700/80 bg-slate-950/80 p-3 sm:p-4 shadow-inner">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Diagram Visual &amp; Antarmuka Sistem
                  </span>
                </div>
                <a
                  href={currentGuide.svgPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka Gambar Ukuran Penuh</span>
                </a>
              </div>

              {/* Embedded Interactive SVG Image */}
              <div className="w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-1 sm:p-2">
                <img
                  src={currentGuide.svgPath}
                  alt={currentGuide.title}
                  className="w-full h-auto max-h-[460px] object-contain rounded-lg"
                  loading="lazy"
                />
              </div>
            </div>

            {/* STEP BY STEP WALKTHROUGH CARDS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Panduan Langkah Demi Langkah Penggunaan:</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentGuide.steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center shrink-0">
                          {st.num}
                        </span>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-100">
                          {st.title}
                        </h5>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-8">
                        {st.desc}
                      </p>
                    </div>

                    {st.tips && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[11px] text-amber-300/90 flex items-center gap-1.5 pl-8">
                        <span className="font-semibold">💡 Tips:</span>
                        <span>{st.tips}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Security & Efficiency Note */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-amber-500/20 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-amber-300 block mb-0.5">
                  Standar Operasional Prosedur (SOP) Ans Chicken Group
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Semua transaksi penjualan, mutasi stok masuk/keluar, dan penyesuaian susut tersimpan secara realtime di database lokal dan ter-backup ke Cloud Firebase. Pastikan kasir selalu menekan "Kunci Layar" jika meninggalkan meja, dan mencetak nota dengan watermark LUNAS resmi untuk setiap pembayaran tunai.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <span>Sistem POS &amp; ERP Unggas Terpadu • Ans Chicken Group v2.5</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
            >
              Tutup Panduan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
