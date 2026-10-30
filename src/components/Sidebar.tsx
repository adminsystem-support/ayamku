import React from 'react';
import { 
  ShoppingCart, 
  Truck, 
  Package, 
  ClipboardCheck, 
  Users, 
  CalendarCheck, 
  Calculator,
  BarChart3, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  User, 
  X,
  ChevronRight,
  Clock
} from 'lucide-react';
import { ActiveTab, AuthUser } from '../types/index.ts';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: AuthUser;
  onLogout: () => void;
  storeName: string;
  logoUrl?: string;
  pendingOpnameCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  storeName,
  logoUrl,
  pendingOpnameCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isOwner = currentUser.role === 'admin' && (currentUser.username.toLowerCase() === 'admin' || currentUser.id === 'user-admin');

  const menuItems: { 
    id: ActiveTab; 
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    adminOnly?: boolean;
    ownerOnly?: boolean;
    badge?: number;
  }[] = [
    { id: 'pos', label: 'Nota', icon: ShoppingCart },
    { id: 'produk', label: 'Item', icon: Package },
    { 
      id: 'opname', 
      label: 'Stok Opname', 
      icon: ClipboardCheck, 
      badge: isAdmin ? pendingOpnameCount : undefined 
    },
    { id: 'kontak', label: 'Supplier & Pelanggan', icon: Users },
    { id: 'operasional', label: 'Operasional', icon: Calculator, adminOnly: true },
    { id: 'laporan', label: 'Laporan', icon: BarChart3, adminOnly: true },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings, ownerOnly: true },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container (Fixed on Left for Desktop, Slide-over on Mobile) */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900/80 backdrop-blur-xl text-white border-r border-amber-500/20 shadow-2xl flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        isOpenMobile ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Brand Header */}
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/95 p-1 border border-amber-500/30 flex items-center justify-center shadow-md shadow-amber-500/10 shrink-0 overflow-hidden">
                <img 
                  src={logoUrl || '/logo_unggas.svg'} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold tracking-tight text-white truncate leading-tight">
                  {storeName || 'Berkah Unggas Sejahtera'}
                </h1>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Badge */}
          <div className="p-3 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                  isAdmin ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-200'
                }`}>
                  {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className="truncate">
                  <span className="text-xs font-semibold text-slate-100 block truncate">
                    {currentUser.name}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-sm inline-block ${
                    isOwner ? 'bg-amber-500/20 text-amber-300 font-bold' : isAdmin ? 'bg-amber-500/10 text-amber-200' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {isOwner ? 'Admin (Owner Utama)' : isAdmin ? 'Admin' : 'User Operasional'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links (Left Menu) */}
          <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 block">
              Menu Utama
            </span>

            {menuItems.map((item) => {
              // Hide admin-only items if user is not admin
              if (!isAdmin && item.adminOnly) return null;
              // Hide owner-only items if user is not the main owner admin
              if (!isOwner && item.ownerOnly) return null;

              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {/* Pending notification badge for Opname */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer & Logout */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {!isAdmin && (
            <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[10px] text-slate-400">
              ℹ️ Akun User: Akses Gaji & Laporan dikunci oleh Admin.
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Ganti Akun / Logout</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          </button>
        </div>

      </aside>
    </>
  );
};
