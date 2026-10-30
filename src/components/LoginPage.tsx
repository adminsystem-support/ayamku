import React, { useState } from 'react';
import { Lock, User, ArrowRight } from 'lucide-react';
import { AuthUser, StoreProfile } from '../types/index.ts';
import { StorageManager } from '../utils/storage.ts';
import poultryBg from '../assets/images/poultry_farm_ambient_bg_1793084574533.jpg';

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
  storeProfile: StoreProfile;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, storeProfile }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setErrorMsg('Username tidak boleh kosong.');
      return;
    }

    const allUsers = StorageManager.getUsers();
    const foundUser = allUsers.find(
      u => u.username.toLowerCase() === trimmedUser
    );

    if (!foundUser) {
      setErrorMsg('Username atau password tidak valid.');
      return;
    }

    const userSecret = foundUser.pin || foundUser.password || '';
    if (userSecret.trim() !== '') {
      if (trimmedPass !== userSecret.trim()) {
        setErrorMsg('Password / PIN salah.');
        return;
      }
    }

    onLogin(foundUser);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Elegant Ambient Gradient Background */}
      <div className="absolute inset-0 z-0 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-600/25 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-slate-800/50 via-transparent to-transparent" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl border border-amber-200 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50/90 border border-amber-200/80 p-1.5 shadow-lg shadow-amber-500/15 mx-auto overflow-hidden">
            <img 
              src={storeProfile.logoUrl || '/logo_unggas.svg'} 
              alt="Logo Usaha" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            {storeProfile.name || 'Berkah Unggas Sejahtera'}
          </h1>
          <p className="text-xs text-slate-500">
            Silakan masuk untuk melanjutkan
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Password / PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-600 font-semibold p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>Masuk</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
