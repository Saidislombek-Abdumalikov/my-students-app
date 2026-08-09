import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, Menu } from 'lucide-react';
import { Button } from '../common/Button';

interface NavbarProps {
  onSearchClick?: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearchClick, onToggleSidebar }) => {
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
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
            O'
          </div>
          <p className="text-xs font-bold text-slate-200">O'qituvchi</p>
        </div>
      </div>
    </header>
  );
};
