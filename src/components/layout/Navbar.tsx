import React from 'react';
import { Menu, LogOut, ShieldCheck, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 border-b border-slate-200 bg-white sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between shadow-sm">
      {/* Left: Mobile Sidebar Toggle & App Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors"
          title="Menyu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-sm font-extrabold text-slate-900 tracking-tight hidden sm:inline">
            O'quv Markaz Tizimi
          </span>
        </div>
      </div>

      {/* Right: User Profile Badge & Logout */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
          <div
            className={`w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shadow-sm ${
              user?.role === 'ADMIN'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-emerald-600'
            }`}
          >
            {user?.role === 'ADMIN' ? (
              <ShieldCheck className="w-4 h-4 text-slate-950" />
            ) : (
              user?.fullName.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-extrabold text-slate-900 leading-tight">
              {user?.fullName || 'Foydalanuvchi'}
            </p>
            <p className="text-[10px] text-emerald-600 font-mono font-bold leading-tight">
              {user?.role === 'ADMIN' ? 'Admin (1)' : `@${user?.username || 'user'}`}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
            title="Tizimdan chiqish"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
