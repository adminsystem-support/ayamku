import React, { useState } from 'react';
import { 
  Settings, 
  Store, 
  Printer, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  Save,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Check,
  UserPlus,
  Users,
  ShieldCheck,
  UserCheck,
  Key,
  Pencil,
  X,
  Lock,
  ShieldAlert,
  Database,
  Server,
  RefreshCw
} from 'lucide-react';
import { StoreProfile, AuthUser, UserRole } from '../types/index.ts';
import { StorageManager } from '../utils/storage.ts';
import { syncSaveUser, syncDeleteUser } from '../firebase.ts';

interface StoreSettingsProps {
  storeProfile: StoreProfile;
  onUpdateStoreProfile: (profile: StoreProfile) => void;
  onResetData: () => void;
}



export const StoreSettings: React.FC<StoreSettingsProps> = ({
  storeProfile,
  onUpdateStoreProfile,
  onResetData,
}) => {
  const [name, setName] = useState(storeProfile.name);
  const [phone, setPhone] = useState(storeProfile.phone);
  const [address, setAddress] = useState(storeProfile.address);
  const [footerNote, setFooterNote] = useState(storeProfile.footerNote);
  const [logoUrl, setLogoUrl] = useState<string>(storeProfile.logoUrl || '/logo_unggas.svg');
  const [thermalWidth, setThermalWidth] = useState<'58mm' | '80mm'>(storeProfile.thermalWidth || '58mm');
  const [bankName, setBankName] = useState(storeProfile.bankName || 'Bank BCA');
  const [bankAccountNo, setBankAccountNo] = useState(storeProfile.bankAccountNo || '7820-1199-88');
  const [bankAccountName, setBankAccountName] = useState(storeProfile.bankAccountName || 'Berkah Unggas Sejahtera (H. Suryanto)');
  const [savedMessage, setSavedMessage] = useState(false);

  // Sync state if storeProfile changes from parent or Firestore
  React.useEffect(() => {
    setName(storeProfile.name);
    setPhone(storeProfile.phone);
    setAddress(storeProfile.address);
    setFooterNote(storeProfile.footerNote);
    setLogoUrl(storeProfile.logoUrl || '/logo_unggas.svg');
    setThermalWidth(storeProfile.thermalWidth || '58mm');
    setBankName(storeProfile.bankName || 'Bank BCA');
    setBankAccountNo(storeProfile.bankAccountNo || '7820-1199-88');
    setBankAccountName(storeProfile.bankAccountName || 'Berkah Unggas Sejahtera (H. Suryanto)');
  }, [storeProfile]);

  // User Management State
  const [users, setUsers] = useState<AuthUser[]>(() => StorageManager.getUsers());
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);

  // Listen to storage events to re-render users
  React.useEffect(() => {
    const handleStorageUpdate = () => {
      setUsers(StorageManager.getUsers());
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('user');
  const [formPin, setFormPin] = useState('');

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormRole('user');
    setFormPin('');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: AuthUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormUsername(u.username);
    setFormRole(u.role);
    setFormPin(u.pin || u.password || '');
    setIsUserModalOpen(true);
  };

  const handleSaveUserForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUsername.trim()) return;

    const roleLabel = formRole === 'admin' 
      ? 'Administrator Usaha (Full Akses)' 
      : 'User Operasional (Kasir / Gudang)';

    let savedUser: AuthUser;
    if (editingUser) {
      savedUser = {
        ...editingUser,
        name: formName.trim(),
        username: formUsername.trim().toLowerCase(),
        role: formRole,
        roleLabel,
        pin: formPin.trim(),
      };
      StorageManager.updateUser(savedUser);
    } else {
      savedUser = StorageManager.addUser({
        name: formName.trim(),
        username: formUsername.trim().toLowerCase(),
        role: formRole,
        roleLabel,
        pin: formPin.trim(),
      });
    }

    // Persist to Firestore immediately
    syncSaveUser(savedUser);

    setUsers(StorageManager.getUsers());
    window.dispatchEvent(new Event('storage'));
    setIsUserModalOpen(false);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    const target = users.find(u => u.id === userId);
    if (target && (target.username.toLowerCase() === 'admin' || target.id === 'user-admin')) {
      alert('Akun Admin (Owner Utama) tidak dapat dihapus.');
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus akun user "${userName}"?`)) {
      const ok = StorageManager.deleteUser(userId);
      if (!ok) {
        alert('Gagal menghapus user. Minimal harus terdapat 1 akun Admin di sistem.');
        return;
      }
      syncDeleteUser(userId);
      setUsers(StorageManager.getUsers());
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Handle custom image upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file logo maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreProfile = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      footerNote: footerNote.trim(),
      logoUrl: logoUrl.trim(),
      thermalWidth,
      bankName: bankName.trim(),
      bankAccountNo: bankAccountNo.trim(),
      bankAccountName: bankAccountName.trim(),
    };
    onUpdateStoreProfile(updated);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const handleDownloadBackup = () => {
    const jsonStr = StorageManager.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_ayampro_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = StorageManager.importBackup(content);
        if (success) {
          alert('Data berhasil dipulihkan dari backup!');
          window.location.reload();
        } else {
          alert('Format file backup tidak valid.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = () => {
    if (window.confirm('Apakah Anda yakin ingin mereset seluruh data kembali ke data contoh bawaan?')) {
      onResetData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-600" />
            <span>Pengaturan Toko, Logo Dokumen & Printer</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi logo usaha pada faktur/struk cetak, alamat, printer kasir, dan backup data
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="bg-emerald-50/90 backdrop-blur-xs border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Pengaturan profil usaha dan logo cetak berhasil disimpan ke sistem!</span>
        </div>
      )}

      {/* Profile & Logo Settings Form */}
      <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-white/60 shadow-xs space-y-5">
        
        {/* LOGO SECTION */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-600" />
            <span>1. Logo Resmi Usaha Ayam (Akan Tampil di Struk & Faktur A4)</span>
          </h3>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Live Preview Box */}
            <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase mb-2">Pratinjau Logo di Dokumen:</span>
              <div className="w-24 h-24 rounded-xl bg-white border border-slate-300 shadow-xs flex items-center justify-center overflow-hidden p-2">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Usaha" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Store className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">{name || 'Nama Usaha Anda'}</span>
              <span className="text-[10px] text-slate-500">Muncul di nota kasir & PO</span>
            </div>

            {/* Upload Only */}
            <div className="md:col-span-8 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Unggah Logo Toko / Usaha (PNG / JPG / SVG):</label>
                <div className="flex items-center gap-2">
                  <label className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2 shadow-xs">
                    <Upload className="w-4 h-4" />
                    <span>Upload Logo Baru</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Logo</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Logo yang diunggah akan otomatis dipasang pada kepala nota struk thermal, faktur cetak A4, dan dokumen PDF resmi. Format disarankan: PNG atau JPG resolusi tajam.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PROFILE INFORMATION SECTION */}
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
          <Store className="w-4 h-4 text-slate-600" />
          <span>2. Informasi Usaha & Kop Dokumen</span>
        </h3>

        <form onSubmit={handleSubmitProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Usaha / Kios Ayam:</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                placeholder="Contoh: Berkah Unggas Sejahtera"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">No. Telepon / WhatsApp:</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                placeholder="0812-..."
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Alamat Kios / Rumah Potong:</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
              placeholder="Alamat lengkap usaha ayam"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pesan Penutup di Struk Thermal:</label>
              <input
                type="text"
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                placeholder="Terima kasih telah berbelanja..."
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-amber-600" />
                <span>Lebar Kertas Printer Thermal Default:</span>
              </label>
              <select
                value={thermalWidth}
                onChange={(e) => setThermalWidth(e.target.value as '58mm' | '80mm')}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
              >
                <option value="58mm">58 mm (Printer Struk Bluetooth Mini / Mobile)</option>
                <option value="80mm">80 mm (Printer Struk Kasir Desktop Lebar)</option>
              </select>
            </div>
          </div>

          {/* BANKING DATA SETUP FOR TRANSFER PAYMENT METHOD */}
          <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-xl space-y-3">
            <span className="font-bold text-sky-900 text-xs block">
              🏦 Setup Data Banking & Rekening Usaha (Untuk Metode Pembayaran Transfer)
            </span>
            <p className="text-[11px] text-sky-700">
              Data rekening ini akan otomatis dimunculkan di layar kasir & nota saat pelanggan/pemasok memilih pembayaran via Transfer.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Bank:</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900"
                  placeholder="Misal: Bank BCA"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">No. Rekening:</label>
                <input
                  type="text"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                  placeholder="Misal: 7820-1199-88"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Pemilik Rekening (A/N):</label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                  placeholder="Misal: Berkah Unggas Sejahtera"
                />
              </div>
            </div>
          </div>



          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil & Logo Usaha</span>
            </button>
          </div>
        </form>
      </div>

      {/* USER MANAGEMENT & ACCESS RIGHTS SECTION */}
      <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-white/60 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              <span>3. Manajemen Akun User & Hak Akses Kasir / Staff</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tambah, ubah, dan atur peran hak akses (Admin vs Kasir) untuk login ke sistem
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddUser}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Akun User</span>
          </button>
        </div>

        {/* User Account Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-2.5 px-3">Nama Pengguna</th>
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Peran / Role</th>
                <th className="py-2.5 px-3">Hak Akses Modul</th>
                <th className="py-2.5 px-3">PIN / Sandi</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {users.map((u) => {
                const isOwnerAccount = u.username.toLowerCase() === 'admin' || u.id === 'user-admin';
                const isAdminRole = u.role === 'admin';
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          isOwnerAccount ? 'bg-amber-600' : isAdminRole ? 'bg-amber-500' : 'bg-slate-700'
                        }`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isOwnerAccount && (
                              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[9px] font-extrabold uppercase shadow-2xs">
                                Owner Utama
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">{u.roleLabel}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      @{u.username}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isOwnerAccount
                          ? 'bg-amber-100 text-amber-950 border border-amber-400'
                          : isAdminRole 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'bg-slate-100 text-slate-800 border border-slate-300'
                      }`}>
                        {isAdminRole ? <ShieldCheck className="w-3 h-3 text-amber-600" /> : <UserCheck className="w-3 h-3 text-slate-600" />}
                        <span>{isOwnerAccount ? 'ADMIN (OWNER UTAMA)' : isAdminRole ? 'ADMIN' : 'USER (KASIR)'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      {isOwnerAccount ? (
                        <span className="text-emerald-700 font-bold">✓ Full Akses Pengaturan Toko, Gaji, Laporan & User</span>
                      ) : isAdminRole ? (
                        <span className="text-amber-800 font-semibold">✓ Akses Gaji, Operasional & Laporan (Tanpa Pengaturan)</span>
                      ) : (
                        <span className="text-slate-600">✓ Kasir POS, Pembelian Stok, Data Ayam & Opname</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                      {u.pin || u.password ? (
                        <span className="flex items-center gap-1 text-slate-700">
                          <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>••••</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Tanpa PIN (Bebas)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditUser(u)}
                        className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit User"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {isOwnerAccount ? (
                        <button
                          type="button"
                          disabled
                          className="p-1.5 text-slate-300 cursor-not-allowed opacity-50"
                          title="Akun Admin (Owner Utama) tidak dapat dihapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ACCESS CONTROL MATRIX EXPLANATION CARD */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Matriks Rincian Hak Akses Sistem:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-1">
              <span className="font-bold text-amber-900 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>HAK AKSES ROLE ADMIN (OWNER UTAMA):</span>
              </span>
              <ul className="list-disc list-inside text-slate-700 space-y-0.5 pl-1">
                <li>Dapat mengakses <strong>seluruh modul sistem termasuk Pengaturan Toko & User</strong>.</li>
                <li>Dapat mengelola master data produk, HPP, dan harga jual.</li>
                <li>Dapat mengisi, menghitung, dan mencetak <strong>Absensi & Slip Gaji Mingguan</strong> karyawan.</li>
                <li>Dapat melihat <strong>Laporan Keuangan Bulanan, Laba/Rugi, & Kas Operasional</strong>.</li>
                <li>Dapat mengelola <strong>Profil Usaha, Logo Cetak, Backup, dan Akun Pengguna</strong>.</li>
              </ul>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>HAK AKSES ROLE ADMIN NON-OWNER & KASIR:</span>
              </span>
              <ul className="list-disc list-inside text-slate-700 space-y-0.5 pl-1">
                <li>Admin non-owner dapat mengakses Laporan & Operasional (Tetapi <strong>Dilarang Masuk Pengaturan Toko</strong>).</li>
                <li>User / Kasir bertransaksi di <strong>Kasir POS & Cetak Nota</strong>.</li>
                <li>User / Kasir mencatat Pembelian Barang & Stok Opname Timbangan.</li>
                <li className="text-slate-500 italic">
                  Menu Pengaturan Toko khusus dikunci untuk Owner Utama.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>


      {/* USER ADD/EDIT MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-600" />
                <span>{editingUser ? 'Edit Akun Pengguna' : 'Tambah Akun User Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserForm} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Lengkap Pengguna:
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Siti Rohimah (Kasir 1)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Username Login:
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Contoh: kasir1 / kasir_pagi"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Peran / Hak Akses (Role):
                </label>
                {editingUser && (editingUser.username.toLowerCase() === 'admin' || editingUser.id === 'user-admin') ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg font-bold text-amber-950 flex items-center justify-between">
                    <span>Admin (Owner Utama)</span>
                    <span className="text-[10px] text-amber-800 bg-amber-200 px-2 py-0.5 rounded font-extrabold">Terkunci</span>
                  </div>
                ) : (
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="user">User / Kasir Operasional (Kasir POS, Pembelian, Stok & Opname)</option>
                    <option value="admin">Admin (Akses Gaji & Laporan)</option>
                  </select>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>PIN / Sandi Pengaman (Opsional):</span>
                </label>
                <input
                  type="password"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value)}
                  placeholder="Masukkan PIN / Sandi angka (opsional)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Buat Akun User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
