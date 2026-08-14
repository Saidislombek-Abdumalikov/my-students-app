import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, Menu } from 'lucide-react';
import { Button } from '../common/Button';

interface NavbarProps {
  onSearchClick?: () => void;
  onToggleSidebar?: () => void;
}

import { useAuth } from '../../context/AuthContext';
import { LogOut, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC<NavbarProps> = ({ onSearchClick, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('teacher_os_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.body.className = savedTheme === 'light' ? 'light-theme' : 'bg-slate-950 text-slate-100';
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('teacher_os_theme', newTheme);
    document.body.className = newTheme === 'light' ? 'light-theme' : 'bg-slate-950 text-slate-100';
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center space-x-3 flex-1 max-w-sm">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Search Input */}
        <button
          onClick={onSearchClick}
          className="w-full flex items-center space-x-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 transition-colors text-left"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="flex-1">Qidiruv...</span>
        </button>
      </div>

      {/* Right: Theme Toggle & Profile */}
      <div className="flex items-center space-x-3">
        {/* White / Dark Theme Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          leftIcon={theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
          onClick={toggleTheme}
          className="text-xs font-bold"
        >
          <span>{theme === 'dark' ? "Oq Rejim (White)" : "To'q Rejim (Dark)"}</span>
        </Button>

        {/* Profile */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center ${user?.role === 'ADMIN' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-emerald-600'}`}>
            {user?.role === 'ADMIN' ? <ShieldCheck className="w-4 h-4" /> : user?.fullName.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-slate-200 leading-tight">{user?.fullName || 'Foydalanuvchi'}</p>
            <p className="text-[10px] text-emerald-400 font-mono leading-tight">
              {user?.role === 'ADMIN' ? 'Admin (1)' : user?.username || 'user'}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Chiqish"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
