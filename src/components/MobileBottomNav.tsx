import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Truck, 
  Package, 
  CalendarCheck, 
  BarChart3, 
  MoreHorizontal,
  ClipboardCheck,
  Users,
  Settings,
  X
} from 'lucide-react';
import { ActiveTab, UserRole } from '../types/index.ts';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  userRole,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { id: 'pos' as ActiveTab, label: 'Kasir', icon: ShoppingCart },
    { id: 'pembelian' as ActiveTab, label: 'Beli & HPP', icon: Truck },
    { id: 'produk' as ActiveTab, label: 'Stok', icon: Package },
    { id: 'kontak' as ActiveTab, label: 'Pelanggan', icon: Users },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* More Sheet for Mobile */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-2xl p-4 shadow-xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-900">Menu Lainnya</span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 py-4">
              <button
                onClick={() => handleSelectTab('opname')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  activeTab === 'opname' ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ClipboardCheck className="w-5 h-5 mb-1.5 text-emerald-600" />
                <span className="text-xs">Stok Opname</span>
              </button>

              <button
                onClick={() => handleSelectTab('operasional')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  activeTab === 'operasional' ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-5 h-5 mb-1.5 text-orange-600" />
                <span className="text-xs">Kas Operasional</span>
              </button>

              {userRole === 'admin' && (
                <>
                  <button
                    onClick={() => handleSelectTab('absensi_gaji')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      activeTab === 'absensi_gaji' ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CalendarCheck className="w-5 h-5 mb-1.5 text-blue-600" />
                    <span className="text-xs">Absensi & Gaji</span>
                  </button>

                  <button
                    onClick={() => handleSelectTab('laporan')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      activeTab === 'laporan' ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-5 h-5 mb-1.5 text-purple-600" />
                    <span className="text-xs">Laporan Laba/Rugi</span>
                  </button>

                  <button
                    onClick={() => handleSelectTab('pengaturan')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      activeTab === 'pengaturan' ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Settings className="w-5 h-5 mb-1.5 text-slate-600" />
                    <span className="text-xs">Pengaturan Toko</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg no-print">
        <div className="grid grid-cols-5 items-center h-14">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer transition-colors ${
                  isActive ? 'text-amber-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />
                <span className="text-[10px] mt-0.5 leading-tight">{tab.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer transition-colors ${
              ['kontak', 'opname', 'absensi_gaji', 'pengaturan'].includes(activeTab)
                ? 'text-amber-600 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] mt-0.5 leading-tight">Lainnya</span>
          </button>
        </div>
      </div>
    </>
  );
};
