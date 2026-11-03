# BUKU PANDUAN PENGGUNAAN SISTEM LENGKAP DENGAN GAMBAR ALUR
## SISTEM KASIR, STOK & PEMBUKUAN OPERASIONAL AYAM POTONG ("ANS CHICKEN GROUP")
### Lokasi Operasional: Pasar Kemis - Tangerang | Telp/WA: 0812-8648-218

---

## DAFTAR ISI PANDUAN BERGAMBAR

1. **PENDAHULUAN & GAMBARAN UMUM SISTEM ANS CHICKEN GROUP**
2. **ALUR PROSES 1: AKSES MASUK, KEAMANAN & KUNCI LAYAR (30 MENIT IDLE)**
   - *[Gambar 1: Halaman Login Bersih, Kunci Layar Cepat & Proteksi Auto-Kick 30 Menit]*
3. **ALUR PROSES 2: REGISTRASI ITEM, DROPDOWN & RIWAYAT SEMUA SUMBER**
   - *[Gambar 2: Dropdown Pilihan Item Terdaftar, Kalkulator Margin HPP & Riwayat Lengkap]*
4. **ALUR PROSES 3: TRANSAKSI KASIR (POS), WATERMARK LUNAS & CETAK / WA**
   - *[Gambar 3: Kasir Timbangan, Nota Bersih dengan Watermark LUNAS & Total Qty Rapi]*
5. **ALUR PROSES 4: STOK OPNAME & PERSETUJUAN SUSUT GUDANG**
   - *[Gambar 4: Timbangan Fisik Cold Storage, Kalkulasi Susut Es & Otorisasi Admin]*
6. **ALUR PROSES 5: PEMASOK, PELANGGAN & HUTANG / PIUTANG**
   - *[Gambar 5: Faktur Pembelian Ayam Pemasok, Limit Piutang Pelanggan & Arus Kas]*
7. **ALUR PROSES 6: BEBAN OPERASIONAL TOKO & GAJI KARYAWAN**
   - *[Gambar 6: Input Beban Toko, Rekap Absensi, Pemotongan Kasbon Otomatis & Slip Gaji]*
8. **ALUR PROSES 7: LAPORAN KEUANGAN TERPADU 1 HALAMAN (OWNER DASHBOARD)**
   - *[Gambar 7: Ringkasan 4 Kartu KPI Keuangan, Rekonsiliasi Kas Laci Kasir & Ekspor]*
9. **FITUR BUKU PANDUAN INTERAKTIF DI DALAM APLIKASI**
10. **TIPS OPERASIONAL & PANDUAN PEMECAHAN MASALAH (TROUBLESHOOTING)**

---

## 1. PENDAHULUAN & GAMBARAN UMUM SISTEM ANS CHICKEN GROUP

### 1.1 Maksud & Tujuan
Sistem **Ans Chicken Group** dirancang khusus untuk memenuhi standar operasional perdagangan ayam potong segar, ayam broiler hidup, dan karkas olahan (fillet dada/paha, sayap, ati ampela, ceker, kepala) di wilayah Pasar Kemis - Tangerang dan sekitarnya. 
Sistem menggabungkan pelayanan kasir cepat, pencatatan timbangan digital, pemantauan susut es di cold storage, pengendalian biaya harian toko, serta laporan laba rugi terpadu 1 lembar yang langsung memperlihatkan keuntungan bersih usaha.

### 1.2 Struktur Hak Akses Pengguna
Sistem membedakan akses antara Administrator (Pemilik) dan Kasir Operasional demi menjaga kerahasiaan keuntungan dan data sensitif:
- **Admin / Owner Usaha (`admin`)**: Akses penuh ke seluruh menu, termasuk melihat harga beli/HPP, laba kotor, gaji karyawan, kasbon, dan laporan keuangan terpadu.
  - *Akun Default*: Username: `admin` | Password: `admin`
- **Kasir / Operasional (`user`)**: Akses difokuskan pada pelayanan penjualan kasir (Nota), pencatatan item ayam, dan stok opname. Menu rahasia (Gaji, Biaya Toko, Laba Bersih, Pengaturan Akun) dikunci secara otomatis.
  - *Akun Default*: Username: `user` | Password: `user`

---

## 2. ALUR PROSES 1: AKSES MASUK, KEAMANAN & KUNCI LAYAR (30 MENIT IDLE)

### 2.1 Diagram Alur Visual Login & Keamanan (Sesuai Tampilan Asli Sistem):
<div align="center">
  <img src="/guides/01_login_lock_flow.svg" alt="Diagram Alur Login dan Kunci Otomatis Ans Chicken Group" width="100%" />
  <p><em>Gambar 1: Halaman Login Bersih Ans Chicken Group, Kunci Layar Cepat, dan Proteksi Auto-Kick 30 Menit.</em></p>
</div>

### 2.2 Langkah-Langkah Penggunaan:
1. **Buka Aplikasi**: Akses sistem melalui browser pada Komputer Kasir, Laptop, Tablet, maupun Smartphone.
2. **Tampilan Login Bersih**: Sesuai standar keamanan, tampilan login hanya memuat:
   - Logo Ayam & Nama Usaha **Ans Chicken Group**.
   - Kolom isian **Username**.
   - Kolom isian **Password**.
   - Tombol **"Masuk ke Sistem"**.
   *(Semua tombol pintas demo telah dihilangkan agar tidak dapat disalahgunakan).*
3. **Pemberian Hak Akses Otomatis**:
   - Jika login dengan `admin`, seluruh fitur terbuka.
   - Jika login dengan kasir (`user`), akses laporan laba & gaji dikunci.
4. **Tombol "Kunci Layar" (Manual Quick Lock)**:
   - Kapanpun kasir hendak meninggalkan meja (ke kamar mandi, istirahat sholat/makan), tekan tombol **"Kunci Layar"** di pojok kanan atas Header atau bagian bawah Sidebar.
   - Layar akan langsung terkunci, dan kasir cukup memasukkan password kembali untuk melanjutkan pekerjaan tanpa kehilangan keranjang transaksi yang sedang aktif.
5. **Perlindungan Auto-Kick 30 Menit Idle**:
   - Bila kasir lupa mengunci layar dan komputer tidak disentuh selama 28 menit, sistem akan menampilkan jendela peringatan hitung mundur 2 menit.
   - Jika tetap tidak ada ketukan keyboard atau mouse hingga genap **30 menit**, sistem secara otomatis mengeluarkan sesi (Auto-Kick) untuk melindungi toko dari manipulasi nota.

---

## 3. ALUR PROSES 2: REGISTRASI ITEM, DROPDOWN & RIWAYAT SEMUA SUMBER

### 3.1 Diagram Alur Visual Registrasi & Riwayat Item (Sesuai Tampilan Asli Sistem):
<div align="center">
  <img src="/guides/02_registrasi_item_flow.svg" alt="Diagram Alur Registrasi Item dan Riwayat Ans Chicken Group" width="100%" />
  <p><em>Gambar 2: Subtab Registrasi Item, Dropdown Cerdas Mencegah Duplikasi, Kalkulator Margin HPP &amp; Log Riwayat.</em></p>
</div>

### 3.2 Langkah-Langkah Penggunaan:
1. **Buka Menu "Item"**:
2. **Ketik Nama Item (Pencarian / Dropdown Otomatis)**:
   - Ketik huruf awal nama produk pada kotak isian "Nama Item".
   - **Jika Item Sudah Terdaftar**: Pilihan item akan otomatis muncul pada dropdown beserta informasi stok saat ini dan riwayat harga belinya. Klik pilihan tersebut untuk memperbarui stok atau mengoreksi harga.
   - **Jika Item Baru**: Jika nama produk belum pernah ada di database, pilih opsi *"Daftarkan Sebagai Item Baru"* lalu ketikkan nama lengkapnya secara manual.
3. **Pilih Sumber Inputan**:
   - Pilih salah satu dari 3 sumber:
     1. *Registrasi Manual*: Pengisian stok mandiri dari lapak/kios Ans Chicken Group.
     2. *Faktur Pembelian*: Berdasarkan surat jalan kiriman ayam peternak.
     3. *Hasil Olah / Potong*: Karkas hasil pemotongan (fillet paha, dada, sayap, ceker, kepala).
4. **Kalkulator Margin & Simulasi Keuntungan**:
   - Masukkan **Bobot/Qty Masuk** (Kg atau Ekor).
   - Masukkan **Harga Beli Dasar (HPP)** per Kilogram.
   - Masukkan **Target Margin (%)** yang diinginkan (misal +15%).
   - Sistem secara otomatis menghitung **Harga Jual Rekomendasi** dan nilai rupiah keuntungan per kilogramnya.
5. **Simpan Item**: Klik tombol *"Simpan Registrasi Item & Update Stok"*. Produk langsung masuk ke katalog kasir dengan stok terbarui.
6. **Subtab Riwayat Lengkap Semua Sumber**:
   - Tab riwayat menampilkan **semua inputan yang pernah dilakukan** secara transparan, lengkap dengan tanggal, jam, petugas yang menginput, sumber transaksi, penambahan bobot, hingga harga jualnya.

---

## 4. ALUR PROSES 3: TRANSAKSI KASIR (POS), WATERMARK LUNAS & CETAK / WA

### 4.1 Diagram Alur Visual Kasir POS & Nota LUNAS (Sesuai Tampilan Asli Sistem):
<div align="center">
  <img src="/guides/03_pos_kasir_flow.svg" alt="Diagram Alur Kasir dan Watermark LUNAS Ans Chicken Group" width="100%" />
  <p><em>Gambar 3: Transaksi Kasir POS, Nota Resmi Ans Chicken Group Ber-Watermark LUNAS &amp; Total Qty Rapi.</em></p>
</div>

### 4.2 Langkah-Langkah Penggunaan:
1. **Buka Menu "Nota" (Kasir POS)**:
2. **Pilih Item Ayam dari Katalog**:
   - Cari item ayam (misal *Ayam Fillet Paha*).
   - Masukkan angka timbangan aktual dari timbangan digital (misal `12.50` Kg).
   - Klik tombol **"Tambah ke Keranjang"**.
3. **Pilih Pelanggan**:
   - Pilih pelanggan dari daftar (Resto Sambal Bakar, Warung Pecel Lele, atau *Pelanggan Umum Cash*).
4. **Pilih Metode Pembayaran**:
   - **Tunai (Lunas)**: Masukkan nominal uang yang diterima dari pembeli. Sistem langsung menghitung uang kembalian.
   - **Tempo (Piutang)**: Pembelian dicatat sebagai piutang pelanggan dengan batas jatuh tempo pelunasan.
5. **Selesaikan Transaksi**:
   - Klik **"Selesaikan Transaksi & Buat Nota"**.
6. **Tampilan Nota Bersih & Watermark LUNAS**:
   - **Kop Usaha Resmi**: Tertulis jelas **Ans Chicken Group**, *Pasar Kemis - Tangerang*, *Telp/WA: 0812-8648-218*.
   - **Watermark LUNAS**: Pada transaksi yang dibayar lunas, watermark diagonal tebal transparan bertuliskan **"L U N A S • SUDAH DIBAYAR LUNAS • DIVERIFIKASI SISTEM"** otomatis dicetak di tengah lembar nota.
   - **Total Qty Rapi**: Nilai total kuantiti (misal `17.50 Kg`) tampil dalam satu baris rapi dan tidak mengalami pemotongan/wrap-text ke bawah.
7. **Pilihan Output Resmi**:
   - **🖨️ Tombol Cetak**: Klik untuk mencetak langsung ke printer Thermal 58mm/80mm atau printer Inkjet/Laserjet A4.
   - **📥 Tombol PDF**: Klik untuk mengunduh berkas PDF nota resmi ber-watermark LUNAS ke komputer/HP.
   - **💬 Tombol WhatsApp**: Klik untuk mengirimkan nota PDF dan ringkasan transaksi langsung ke nomor WhatsApp pembeli.

---

## 5. ALUR PROSES 4: STOK OPNAME & PERSETUJUAN SUSUT GUDANG

### 5.1 Diagram Alur Visual Stok Opname & Persetujuan (Sesuai Tampilan Asli Sistem):
<div align="center">
  <img src="/guides/04_stok_opname_flow.svg" alt="Diagram Alur Stok Opname Ans Chicken Group" width="100%" />
  <p><em>Gambar 4: Pencocokan Fisik Cold Storage, Kalkulasi Susut Es Otomatis &amp; Otorisasi Persetujuan Admin.</em></p>
</div>

### 5.2 Langkah-Langkah Penggunaan:
1. **Buka Menu "Stok Opname"**:
2. **Pilih Item yang Akan Diopname**:
   - Pilih produk ayam dari daftar (misal *Ayam Fillet Dada di Cold Storage*).
   - Sistem menampilkan stok buku yang tercatat (misal `60.00 Kg`).
3. **Timbang Fisik Nyata di Gudang / Freezer**:
   - Petugas gudang menimbang seluruh sisa ayam fisik di lokasi pendingin.
   - Ketikkan angka timbangan fisik (misal `58.80 Kg`).
4. **Isi Catatan / Alasan**:
   - Tuliskan penyebab selisih (misal *Penyusutan lelehan es pendingin dan pembuangan lemak sisa*).
5. **Perhitungan Otomatis Selisih & Kerugian**:
   - Sistem langsung menghitung selisih kilogram (`-1.20 Kg`), persentase susut (`-2.0%`), dan taksiran nilai rupiahnya (`- Rp 45.600`).
6. **Jalur Persetujuan Admin (Approval Workflow)**:
   - Pengajuan opname dari kasir/gudang masuk ke status **"Pending"**.
   - Admin/Owner memeriksa data pengajuan lalu menekan tombol **"Setujui"** atau **"Tolak"**.
   - Jika disetujui, stok master sistem otomatis terkoreksi menjadi `58.80 Kg` sehingga kasir menjual stok yang riil, dan selisih tercatat di pembukuan susut barang.

---

## 6. ALUR PROSES 5: PEMASOK, PELANGGAN & HUTANG / PIUTANG

### 6.1 Diagram Alur Visual Mitra & Arus Kas (Sesuai Tampilan Asli Sistem):
<div align="center">
  <img src="/guides/05_supplier_pelanggan_flow.svg" alt="Diagram Alur Pemasok dan Pelanggan Ans Chicken Group" width="100%" />
  <p><em>Gambar 5: Faktur Pembelian Ayam Peternak, Kartu Piutang Resto &amp; Rekonsiliasi Kas Toko.</em></p>
</div>

### 6.2 Langkah-Langkah Penggunaan:
1. **Buka Menu "Supplier & Pelanggan"**:
2. **Kelola Kontak Pemasok (Peternak / Kemitraan)**:
   - Daftarkan peternak ayam rekanan beserta alamat kandang dan nomor telepon.
   - Catat setiap kiriman ayam masuk dengan menginput **Faktur Pembelian** (Nomor Faktur, Bobot Masuk, Harga Per Kg, Status Bayar Tunai / Tempo).
   - Jika berstatus Tempo, sistem memantau tanggal jatuh tempo hutang dagang peternak.
3. **Kelola Kontak Pelanggan (Resto / Langganan)**:
   - Daftarkan restoran atau warung makan yang rutin mengambil pasokan ayam dari Ans Chicken Group.
   - Atur batas kredit (limit piutang) agar langganan tidak menunggak melebihi kapasitas toko.
4. **Pencatatan Pelunasan Piutang & Pembayaran Hutang**:
   - Saat restoran menyetor uang cicilan, klik **"Catat Pembayaran Piutang"**. Uang langsung masuk ke catatan Kas Toko.
   - Saat toko membayar faktur ke peternak ayam, klik **"Bayar Hutang"**. Uang keluar tercatat otomatis mengurangi kas.

---

## 7. ALUR PROSES 6: BEBAN OPERASIONAL TOKO & GAJI KARYAWAN

### 7.1 Diagram Alur Visual Operasional & Gaji (Sesuai Tampilan Asli Sistem):
<div align="center">
  <img src="/guides/06_operasional_gaji_flow.svg" alt="Diagram Alur Operasional dan Gaji Ans Chicken Group" width="100%" />
  <p><em>Gambar 6: Form Biaya Toko, Absensi Staf, Pemotongan Kasbon Otomatis &amp; Slip Gaji Ans Chicken Group.</em></p>
</div>

### 7.2 Langkah-Langkah Penggunaan:
1. **Buka Menu "Operasional" (Khusus Admin)**:
2. **Catat Beban Rutin Harian Toko**:
   - Pilih kategori beban: *Es Balok/Batu, Bensin Armada Pick Up, Plastik Kresek Karkas, Listrik/Air, atau Pemeliharaan Cold Storage*.
   - Masukkan nominal rupiah pengeluaran. Setiap beban langsung tercatat sebagai pengeluaran kas toko hari itu.
3. **Rekap Absensi Harian Karyawan**:
   - Buka tab karyawan, pilih staf, lalu klik status kehadiran harian: **Hadir**, **Sakit**, **Izin**, atau **Alpha**.
   - Sistem mengumpulkan total hari masuk secara otomatis untuk periode penggajian.
4. **Pencatatan Pinjaman (Kasbon) Karyawan**:
   - Jika karyawan meminjam uang kasbon di tengah bulan, catat nominal dan tanggalnya.
   - Catatan kasbon aktif ini akan otomatis menjadi pengurang pada perhitungan gaji akhir bulan.
5. **Cetak Slip Gaji Resmi**:
   - Di akhir bulan, sistem otomatis menghitung: `Gaji Pokok + Uang Makan/Lembur - Potongan Kasbon = Gaji Bersih (Take Home Pay)`.
   - Cetak slip gaji resmi berlogo **Ans Chicken Group** yang dilengkapi tanda tangan penerima dan owner H. Suryanto.

---

## 8. ALUR PROSES 7: LAPORAN KEUANGAN TERPADU 1 HALAMAN (OWNER DASHBOARD)

### 8.1 Diagram Alur Visual Laporan Keuangan Terpadu (Sesuai Tampilan Asli Sistem):
<div align="center">
  <img src="/guides/07_laporan_keuangan_flow.svg" alt="Diagram Alur Laporan Keuangan Ans Chicken Group" width="100%" />
  <p><em>Gambar 7: 4 Kotak Indikator Keuangan Resmi, Rekonsiliasi Kas Laci Toko &amp; Tombol Ekspor PDF/Excel.</em></p>
</div>

### 8.2 Langkah-Langkah Penggunaan:
1. **Buka Menu "Laporan" (Khusus Admin/Owner)**:
2. **Pilih Periode Waktu Laporan**:
   - Gunakan filter tombol cepat: **Hari Ini** (evaluasi harian kasir), **Minggu Ini**, **Bulan Ini**, atau **Rentang Tanggal Kustom**.
3. **Pahami 4 Kartu Indikator Utama (KPI)**:
   - **1. Total Penjualan (Omset)**: Seluruh transaksi penjualan kasir (Tunai + Pelunasan Bon).
   - **2. Modal Belanja Ayam (HPP)**: Harga pokok pembelian ayam hidup & karkas dari peternak (Laba Kotor = Penjualan - HPP).
   - **3. Biaya Gaji & Operasional**: Akumulasi biaya es batu, plastik, bensin, dan seluruh gaji staf.
   - **4. Keuntungan Bersih Nyata (Net Profit)**: Laba bersih murni yang menjadi hak pemilik usaha setelah seluruh modal dan biaya operasional tertutupi.
4. **Pencocokan Saldo Kas Laci Kasir (Cash Flow Verification)**:
   - Tabel arus kas merinci: `Saldo Kas Awal + Penerimaan Kasir - Bayar Faktur Peternak - Beban Toko = Saldo Kas Fisik Akhir`.
   - Angka Saldo Kas Akhir harus sama persis dengan uang fisik di laci kasir dan saldo rekening BCA `0000000001` Ans Chicken Group.
5. **Ekspor Laporan**:
   - Klik **"Download PDF"** untuk mengunduh berkas laporan pembukuan siap cetak berukuran A4.
   - Klik **"Ekspor ke Excel"** untuk mengolah data lebih lanjut dalam format spreadsheet (.xlsx / .csv).

---

## 9. FITUR BUKU PANDUAN INTERAKTIF DI DALAM APLIKASI

Pengguna dapat membuka buku panduan visual ini kapan saja langsung dari dalam aplikasi:
1. Klik tombol **"Buku Panduan"** yang terdapat di:
   - **Pojok Kanan Atas Header** (tombol hijau berikon buku di samping tombol Kunci Layar).
   - **Sidebar Menu Bagian Bawah** (tombol Buku Panduan dengan badge *Visual*).
2. Jendela panduan interaktif akan terbuka di layar Anda.
3. Anda dapat memilih salah satu dari 7 Alur Proses di menu sebelah kiri.
4. Jendela ini menampilkan **gambar diagram visual beresolusi tinggi**, rangkuman langkah praktis, tips efisiensi kerja, serta tombol **"Buka Fitur Ini Langsung"** untuk langsung mempraktikkan fitur tersebut di aplikasi.
5. Tersedia juga tombol **"Cetak"** di pojok atas untuk mencetak lembar panduan bila toko memerlukan panduan cetak yang ditempel di ruang kasir.

---

## 10. TIPS OPERASIONAL & PANDUAN PEMECAHAN MASALAH (TROUBLESHOOTING)

1. **Bagaimana jika listrik padam saat kasir melayani transaksi?**
   - Sistem menggunakan teknologi *Local Storage Cache* dan *Offline-First*. Semua transaksi yang telah selesai tetap aman tersimpan di komputer kasir. Saat listrik menyala kembali dan browser dibuka, data tetap utuh.
2. **Kapan waktu terbaik melakukan sinkronisasi ke Cloud Firebase?**
   - Lakukan klik tombol **"Sinkronkan Data ke Cloud"** di menu Pengaturan Toko setiap sebelum tutup toko atau saat pergantian shift kasir untuk memastikan data di HP dan laptop selalu identik.
3. **Hasil cetak nota kasir terpotong atau kertas thermal tidak pas?**
   - Pada kotak dialog cetak browser (Ctrl + P), pastikan:
     - Printer Destination dipilih sesuai printer kasir Anda.
     - Paper Size diatur ke `58mm` atau `80mm` untuk printer struk gulung, atau `A4` untuk printer lembaran.
     - Opsi "Headers and footers" dihilangkan centangnya agar struk tercetak bersih.
4. **Lupa password login admin/user?**
   - Akun default darurat adalah `admin` dengan password `admin`. Password dapat diperbarui sewaktu-waktu di menu *Pengaturan Toko*.

---
*Manual Book Resmi Ans Chicken Group — Versi 2.5 (Edisi Visual Bergambar Asli).*
