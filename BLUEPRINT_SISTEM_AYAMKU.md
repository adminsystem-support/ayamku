# BLUEPRINT SISTEM & ARSITEKTUR APLIKASI
## ANS CHICKEN GROUP — POINT OF SALE (POS) & SISTEM MANAJEMEN TOKO AYAM POTONG TERPADU

---

### DOKUMEN SPESIFIKASI RESMI SISTEM (CLIENT HANDOVER BLUEPRINT)
* **Nama Usaha / Klien**: Ans Chicken Group (Berkah Unggas Sejahtera)
* **Lokasi Operasional**: Pasar Kemis - Tangerang
* **Kontak / WhatsApp**: 0812-8648-218
* **Versi Sistem**: v2.5 Production-Ready
* **Tanggal Rilis**: 30 Oktober 2026

---

## 1. RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)

Sistem Aplikasi **Ans Chicken Group** dirancang khusus untuk memenuhi kebutuhan proses bisnis industri perdagangan ayam potong (grosir, semi-grosir, katering, resto, dan retail). 

Sistem ini mengintegrasikan seluruh alur rantai bisnis dari hulu ke hilir:
1. **Pengadaan Ayam Hidup (HPP)** dari peternak/supplier.
2. **Penjualan Kasir (POS)** dengan multi-satuan (Kg & Ekor) serta level harga fleksibel (Restoran, Warung, Umum).
3. **Pencatatan Bon / Piutang Pelanggan** lengkap dengan pengingat WhatsApp otomatis.
4. **Pengendalian Biaya Operasional Toko** (listrik freezer/cold storage, armada, kemasan, dsb) terpusat pada menu Operasional.
5. **Penggajian & Kasbon Karyawan** terintegrasi dengan absensi harian dan slip gaji.
6. **Laporan Keuangan & Laba Rugi Eksekutif** otomatis dengan filter harian, mingguan, dan bulanan yang sederhana dan akurat untuk pemilik usaha.

---

## 2. ARSITEKTUR ALUR KEUANGAN USAHA (FINANCIAL FLOW)

Sistem menggunakan formula akuntansi usaha dagang yang disesuaikan agar mudah dipahami oleh pemilik usaha namun tetap presisi:

```
+-------------------------------------------------------------+
|                     1. TOTAL PENJUALAN                      |
|      (Akumulasi seluruh transaksi penjualan POS kasir)       |
+-------------------------------------------------------------+
                               |
                               v
                     DIKURANGI DENGAN (-)
                               |
+-------------------------------------------------------------+
|                 2. MODAL BELANJA AYAM (HPP)                 |
|       (Harga pokok pembelian ayam hidup & logistik karkas)   |
+-------------------------------------------------------------+
                               |
                               v
+=============================================================+
|                      KEUNTUNGAN KOTOR                       |
|           = Total Penjualan - Modal Belanja Ayam            |
+=============================================================+
                               |
                               v
                     DIKURANGI DENGAN (-)
                               |
+-------------------------------------------------------------+
|            3. BIAYA PENGELUARAN GAJI & OPERASIONAL          |
|  a. Total Gaji       : Akumulasi upah/slip gaji karyawan    |
|  b. Total Kasbon     : Pinjaman uang karyawan (kasbon baru) |
|  c. Biaya Operasional: Seluruh pengeluaran menu Operasional  |
|  ---------------------------------------------------------  |
|  Subtotal Biaya = Total Gaji + Total Kasbon + Operasional   |
+-------------------------------------------------------------+
                               |
                               v
+=============================================================+
|                      KEUNTUNGAN BERSIH                      |
|       = Keuntungan Kotor - Biaya Gaji & Operasional         |
+=============================================================+
```

---

## 3. RINCIAN MODUL SISTEM (SYSTEM MODULES)

### MODUL 1: KASIR POINT OF SALE (POS)
* **Katalog Produk Ayam**: Karkas utuh, dada fillet, paha, sayap, ati ampela, ceker, kepala, ayam hidup.
* **Tipe Pelanggan & Skema Harga Otomatis**:
  - Pelanggan Umum / Eceran
  - Warung Makan / Katering
  - Restoran / Rumah Makan
  - Langganan Tetap / Grosir
* **Dukungan Satuan Fleksibel**: Kilogram (Kg) dan Ekor (Pcs) dengan timbangan digital atau manual.
* **Metode Pembayaran**:
  - Tunai (Cash) dengan kalkulasi otomatis uang kembalian.
  - Transfer Bank / QRIS.
  - Bon / Tempo (Hutang Pelanggan) dengan batas jatuh tempo.
* **Cetak Nota & Pengiriman WhatsApp**:
  - **Struk Thermal (80mm)**: Untuk printer kasir meja/mobile bluetooth.
  - **Nota Invoice A4**: Tampilan formal dilengkapi kop surat usaha, logo resmi, QR verifikasi, dan status lunas/bon.
  - **Kirim WhatsApp**: Mengirimkan rincian invoice dan tagihan langsung ke nomor WhatsApp pelanggan dengan satu klik.

---

### MODUL 2: PEMBELIAN & PENGADAAN (SUPPLIER & HPP)
* **Pencatatan Nota Pembelian Ayam Hidup / Karkas**: No. Faktur supplier, tanggal, armada pengangkut, timbangan bruto, tara, dan neto.
* **Perhitungan HPP Real-time**: Menghitung modal per kilogram ayam potong setelah susut potong untuk memastikan margin penjualan selalu terpantau.
* **Status Pembayaran Supplier**:
  - Lunas
  - Hutang Usaha (Bon Supplier)
* **Pencatatan Pembayaran Hutang Supplier**: Dukungan pelunasan sebagian (cicilan) atau lunas penuh, disertai pencetakan otomatis **Bukti Kas Keluar (BKK)** berstempel dan bertanda tangan.

---

### MODUL 3: OPERASIONAL & KAS TOKO (MENU OPERASIONAL)
* **Sentralisasi Biaya Operasional**: Seluruh pengeluaran non-bahan baku dicatat secara mudah di menu Operasional.
* **Kategori Pengeluaran Toko**:
  - Listrik & Air (Freezer pendingin, cold storage, pompa air potong).
  - Bahan Bakar & Kendaraan (BBM motor delivery, mobil pick-up antar ayam).
  - Plastik, Kemasan, dan Es Balok.
  - Sewa Kios / Tempat Usaha / Cold Storage.
  - Perawatan Peralatan (Asah pisau, timbangan, meja potong).
  - Biaya operasional lainnya.
* **Fitur Uang Masuk Operasional**: Mencatat tambahan modal kasir atau pemasukan non-penjualan.
* **Rekap Saldo Harian**: Memberikan ringkasan uang masuk vs uang keluar harian toko.

---

### MODUL 4: KEPEGAWAIAN, ABSENSI, KASBON & GAJI KARYAWAN
* **Data Karyawan**: Nama, NIK/Kode, bagian kerja (Penyembelih, Pemotong/Butcher, Pengemasan, Pengemudi/Kurir, Kasir), nomor HP, dan upah harian standar.
* **Absensi Harian Cepat**:
  - Status: Hadir, Setengah Hari, Lembur, Izin, Sakit, Alpa.
  - Perhitungan otomatis upah harian dan upah lembur per jam.
* **Sistem Kasbon Karyawan**:
  - Pencatatan Pinjaman Kasbon Baru (uang keluar toko ke karyawan).
  - Tracking sisa saldo kasbon per karyawan secara real-time.
  - Dua opsi pelunasan kasbon:
    1. **Potongan Otomatis pada Slip Gaji**: Saldo kasbon dipotong otomatis saat gajian.
    2. **Pelunasan Manual**: Karyawan mengembalikan tunai langsung ke kasir.
* **Penerbitan Slip Gaji Formal**:
  - Rincian hari kerja, total upah pokok, total upah lembur, uang makan/tunjangan, bonus prestasi, potongan kasbon, dan Gaji Bersih (Net Salary).
  - Cetak Slip Gaji dan tombol kirim rincian slip via WhatsApp pribadi karyawan.

---

### MODUL 5: LAPORAN KEUANGAN & LABA RUGI (FINANCIAL REPORT)
* **Tampilan Bersih & Intuitif**: Dirancang khusus tanpa istilah teknis rumit agar pemilik usaha langsung mengetahui posisi untung rugi toko dalam hitungan detik.
* **Filter Periode Lengkap**:
  - **Harian**: Melihat performa keuangan per tanggal tertentu.
  - **Mingguan**: Memantau siklus mingguan (misal per periode belanja ayam atau periode tutup buku).
  - **Bulanan**: Rekapitulasi penuh per bulan takwim.
* **4 Kartu Indikator Utama (KPI Cards)**:
  1. Total Penjualan (Omset)
  2. Modal Belanja Ayam (HPP)
  3. Keuntungan Kotor
  4. Keuntungan Bersih Toko
* **Struktur Rincian Laporan Untung Rugi**:
  - **1. Total Penjualan** (Jumlah transaksi & nilai nominal omset).
  - **2. Modal Belanja Ayam (HPP)** (Biaya belanja ayam yang terjual).
  - **KEUNTUNGAN KOTOR (PENJUALAN DIKURANGI MODAL)**.
  - **3. Biaya Pengeluaran Gaji & Operasional**:
    - **Total Gaji**: Gaji & upah karyawan periode tersebut.
    - **Total Kasbon**: Kasbon yang dipinjam karyawan pada periode tersebut.
    - **Biaya Operasional**: Total input pengeluaran toko dari menu Operasional.
    - *Subtotal Biaya Pengeluaran Toko*.
  - **KEUNTUNGAN BERSIH FINAL** (Hasil bersih yang dapat ditarik sebagai profit owner).
* **Buku Catatan Bon & Tagihan**:
  - Tab terpadu untuk monitoring faktur belum lunas dari Pelanggan (Piutang) dan Supplier (Hutang).
  - Tombol **Kirim WA Pengingat Tagihan** otomatis ke nomor pelanggan yang menunggak.

---

### MODUL 6: PRE-ORDER & PESANAN RESTORAN / KATERING
* Manajemen pesanan khusus dengan uang muka (DP), catatan jadwal kirim, jam pengiriman, dan pelunasan saat pengiriman.
* Konversi otomatis pesanan pre-order yang telah selesai menjadi faktur penjualan kasir.

---

### MODUL 7: PENGATURAN TOKO & BACKUP DATA (SECURITY & BACKUP)
* **Pengaturan Identitas Toko**: Nama usaha, alamat cabang, nomor telepon/WhatsApp, dan upload logo toko.
* **Logo Rendering Engine**: Mengonversi logo menjadi format Base64 teroptimasi untuk memastikan logo selalu muncul sempurna pada cetak nota, download PDF, dan pengiriman pesan WhatsApp.
* **Backup & Restore JSON**: Fitur download cadangan seluruh data sistem ke dalam file `.json` lokal serta pemulihan (restore) data kapan saja dengan aman.

---

## 4. MATRIKS HAK AKSES & KEAMANAN (ROLE-BASED ACCESS CONTROL)

| Fitur / Modul | Role Admin / Owner | Role Kasir / Operator |
| :--- | :---: | :---: |
| Kasir Penjualan (POS) & Cetak Nota | Ya | Ya |
| Catat Pelanggan & Bon Penjualan | Ya | Ya |
| Akses Menu Operasional (Kas & Biaya) | Ya | Ya |
| Absensi Harian Karyawan | Ya | Ya |
| Pembelian Ayam & Penerimaan Supplier | Ya | Terbatas (Input DO) |
| Pembuatan Slip Gaji & Approval Kasbon | Ya | Tidak |
| Laporan Laba Rugi & Keuntungan Bersih | Ya | Tidak |
| Buku Hutang & Piutang Menyeluruh | Ya | Terbatas (Cek Nota Kasir) |
| Pengaturan Toko & Backup Database | Ya | Tidak |

---

## 5. SPESIFIKASI TEKNOLOGI & INFRASTRUKTUR

* **User Interface**: React 19 SPA, Tailwind CSS (Modern Glassmorphism & High-Contrast Typography), Lucide Icons.
* **Bahasa Pemrograman**: TypeScript (Strict Type Safety & Zero Compilation Warnings).
* **Mesin Dokumen & Cetak**: 
  - `html2canvas` & `jspdf` dengan penanganan rasterisasi logo anti-hilang.
  - Media query `@media print` untuk format Thermal 80mm dan Lembar Kerja A4.
* **Integrasi WhatsApp**: WhatsApp Click-to-Chat API dengan formatting pesan otomatis bergaris batas rapi dan detail item transparan.
* **Penyimpanan Data**: Hybrid Cloud-Ready (Firestore Persistence + Local Offline Cache).

---

## 6. PANDUAN PENYERAHAN & REKOMENDASI KLIEN

1. **Pemisahan Pengeluaran**:
   - Seluruh biaya belanja ayam hidup/karkas dimasukkan melalui menu **Pembelian** (agar masuk HPP modal).
   - Seluruh biaya harian toko seperti listrik, es, BBM, dan plastik dicatat melalui menu **Operasional** (agar otomatis masuk ke Biaya Operasional di Laporan Keuangan).
2. **Pencatatan Kasbon**:
   - Berikan kasbon melalui tab Kepegawaian -> Kasbon agar tercatat rapi dan otomatis memotong slip gaji saat tanggal gajian.
3. **Pengecekan Rutin**:
   - Setiap akhir hari, kasir dapat mencocokkan fisik uang kas dengan laporan harian.
   - Pemilik usaha dapat memfilter Laporan Keuangan secara "Mingguan" atau "Bulanan" untuk melihat laba bersih riil yang didapatkan usaha.

---
*Dokumen ini merupakan bagian resmi dari serah terima sistem aplikasi Ans Chicken Group.*
