import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Edit3, 
  Trash2, 
  UserCheck, 
  Percent,
  CheckCircle2
} from 'lucide-react';
import { Customer, Supplier, CustomerType, UserRole } from '../types/index.ts';

interface CustomerSupplierManagementProps {
  customers: Customer[];
  suppliers: Supplier[];
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onSaveSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  userRole: UserRole;
}

export const CustomerSupplierManagement: React.FC<CustomerSupplierManagementProps> = ({
  customers,
  suppliers,
  onSaveCustomer,
  onDeleteCustomer,
  onSaveSupplier,
  onDeleteSupplier,
  userRole,
}) => {
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states for Customer
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custType, setCustType] = useState<CustomerType>('Restoran / Rumah Makan');
  const [custDiscount, setCustDiscount] = useState<number>(0);
  const [custNotes, setCustNotes] = useState('');

  // Modal states for Supplier
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supCode, setSupCode] = useState('');
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supNotes, setSupNotes] = useState('');

  // Customer handlers
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setCustCode(`CST-${String(customers.length + 1).padStart(2, '0')}`);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustType('Restoran / Rumah Makan');
    setCustDiscount(0);
    setCustNotes('');
    setShowCustomerModal(true);
  };

  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustCode(c.code);
    setCustName(c.name);
    setCustPhone(c.phone);
    setCustAddress(c.address);
    setCustType(c.type);
    setCustDiscount(c.defaultDiscountPercent);
    setCustNotes(c.notes || '');
    setShowCustomerModal(true);
  };

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    const saved: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}`,
      code: custCode.trim() || `CST-${Date.now()}`,
      name: custName.trim(),
      phone: custPhone.trim() || '-',
      address: custAddress.trim() || '-',
      type: custType,
      defaultDiscountPercent: Number(custDiscount),
      notes: custNotes.trim(),
    };

    onSaveCustomer(saved);
    setShowCustomerModal(false);
  };

  // Supplier handlers
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupCode(`PMS-${String(suppliers.length + 1).padStart(2, '0')}`);
    setSupName('');
    setSupPhone('');
    setSupAddress('');
    setSupNotes('');
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupCode(s.code);
    setSupName(s.name);
    setSupPhone(s.phone);
    setSupAddress(s.address);
    setSupNotes(s.notes || '');
    setShowSupplierModal(true);
  };

  const handleSubmitSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    const saved: Supplier = {
      id: editingSupplier ? editingSupplier.id : `sup-${Date.now()}`,
      code: supCode.trim() || `PMS-${Date.now()}`,
      name: supName.trim(),
      phone: supPhone.trim() || '-',
      address: supAddress.trim() || '-',
      notes: supNotes.trim(),
    };

    onSaveSupplier(saved);
    setShowSupplierModal(false);
  };

  // Filter lists
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery) ||
    s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Tab Switcher & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white border border-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Data Pelanggan ({customers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('supplier')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'supplier'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white border border-slate-200/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Data Supplier ({suppliers.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={activeTab === 'customer' ? handleOpenAddCustomer : handleOpenAddSupplier}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'customer' ? 'Tambah Pelanggan' : 'Tambah Supplier'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative bg-white/80 backdrop-blur-md p-3 rounded-xl border border-white/60 shadow-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-5 top-4.5" />
        <input
          type="text"
          placeholder={`Cari nama, no telp, atau alamat ${activeTab === 'customer' ? 'pelanggan' : 'supplier'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 bg-white/70 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:bg-white"
        />
      </div>

      {/* CUSTOMER TAB CONTENT */}
      {activeTab === 'customer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="bg-white/85 backdrop-blur-xs p-4 rounded-xl border border-white/80 hover:border-amber-400 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400">{cust.code}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {cust.type}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mt-1">{cust.name}</h4>

                <div className="space-y-1 mt-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{cust.phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-[11px]">{cust.address}</span>
                  </div>
                  {cust.defaultDiscountPercent > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-[11px] pt-1">
                      <Percent className="w-3.5 h-3.5" />
                      <span>Diskon Langganan Otomatis: {cust.defaultDiscountPercent}%</span>
                    </div>
                  )}
                  {cust.notes && (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100 mt-2">
                      Catatan: {cust.notes}
                    </p>
                  )}
                </div>
              </div>

              {userRole === 'admin' && (
                <div className="flex justify-end gap-1.5 pt-3 mt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEditCustomer(cust)}
                    className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {cust.id !== 'cust-5' && (
                    <button
                      onClick={() => onDeleteCustomer(cust.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredCustomers.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Tidak ada pelanggan yang cocok dengan pencarian.
            </div>
          )}
        </div>
      )}

      {/* SUPPLIER TAB CONTENT */}
      {activeTab === 'supplier' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white/85 backdrop-blur-xs p-4 rounded-xl border border-white/80 hover:border-amber-400 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400">{sup.code}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                    Mitra Suplai Ayam
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mt-1">{sup.name}</h4>

                <div className="space-y-1.5 mt-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{sup.phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-[11px]">{sup.address}</span>
                  </div>
                  {sup.notes && (
                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100 mt-2">
                      Kapasitas & Jadwal: {sup.notes}
                    </p>
                  )}
                </div>
              </div>

              {userRole === 'admin' && (
                <div className="flex justify-end gap-1.5 pt-3 mt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEditSupplier(sup)}
                    className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteSupplier(sup.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredSuppliers.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Tidak ada supplier yang cocok dengan pencarian.
            </div>
          )}
        </div>
      )}

      {/* CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 p-1">✕</button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="space-y-3 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode:</label>
                  <input
                    type="text"
                    required
                    value={custCode}
                    onChange={(e) => setCustCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipe Pelanggan:</label>
                  <select
                    value={custType}
                    onChange={(e) => setCustType(e.target.value as CustomerType)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Restoran / Rumah Makan">Restoran / Rumah Makan</option>
                    <option value="Langganan">Langganan Warung</option>
                    <option value="Grosir">Grosir / Pasar</option>
                    <option value="Katering">Katering</option>
                    <option value="Eceran">Eceran Umum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Pelanggan:</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Resto Ayam Geprek Juara"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp / HP:</label>
                  <input
                    type="text"
                    placeholder="0812-..."
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Diskon Khusus (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={custDiscount}
                    onChange={(e) => setCustDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat Pengiriman:</label>
                <input
                  type="text"
                  placeholder="Nama jalan, pasar, atau ruko"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Pesanan Rutin:</label>
                <input
                  type="text"
                  placeholder="Misal: Rutin ambil 20kg fillet jam 07.00 pagi"
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 p-1">✕</button>
            </div>

            <form onSubmit={handleSubmitSupplier} className="space-y-3 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode Supplier:</label>
                  <input
                    type="text"
                    required
                    value={supCode}
                    onChange={(e) => setSupCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. Kontak / WA:</label>
                  <input
                    type="text"
                    placeholder="0813-..."
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Supplier:</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: PT Mitra Ternak Mandiri"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat Kandang / Gudang:</label>
                <input
                  type="text"
                  placeholder="Lokasi kandang peternakan"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan / Kapasitas Panen:</label>
                <input
                  type="text"
                  placeholder="Kapasitas harian, jadwal kirim ayam"
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
