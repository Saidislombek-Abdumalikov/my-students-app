import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  FileCheck,
  PlusCircle,
  Camera,
  GraduationCap,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  Users,
  UserCheck,
  BookOpenCheck,
  CreditCard
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  // Section 1: Kunlik Darslar & Ishchi Maydon
  const dailyTeachingNavItems = [
    { label: 'Bosh Sahifa', path: '/', icon: LayoutDashboard },
    { label: 'Davomat Kiritish', path: '/attendance', icon: CalendarCheck },
    { label: 'Bugungi Vazifani Tekshirish', path: '/homework-check', icon: FileCheck },
    { label: 'Keyingi Darsga Vazifa Berish', path: '/homework-add', icon: PlusCircle },
    { label: 'Dars Rejalari', path: '/lesson-plans', icon: BookOpenCheck },
    { label: 'Baholar & Imtihonlar', path: '/tests', icon: GraduationCap },
    { label: 'Dars Jadvali', path: '/calendar', icon: Calendar },
  ];

  // Section 2: Skrinshotlar & Hisobotlar
  const reportsNavItems = [
    { label: 'Skrinshotlar Maydoni (4 ta Jadval)', path: '/screenshots', icon: Camera },
    { label: 'Haftalik Hisobot (Izohlar Bilan)', path: '/reports', icon: BarChart3 },
    { label: 'Excel Taqqoslash', path: '/files', icon: FileSpreadsheet },
  ];

  // Section 3: Boshqaruv
  const adminNavItems = [
    { label: 'Guruhlar', path: '/groups', icon: Users },
    { label: 'O\'quvchilar', path: '/students', icon: UserCheck },
    { label: 'To\'lovlar (Qarzdorlar)', path: '/payments', icon: CreditCard },
  ];

  const renderNavGroup = (title: string, items: typeof dailyTeachingNavItems) => (
    <div className="space-y-1">
      <h3 className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
        {title}
      </h3>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white font-extrabold'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 z-50 transition-transform duration-200 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header Branding */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-sm">
              TOS
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-100 tracking-tight">TEACHER OS</h2>
              <p className="text-[10px] text-slate-400 font-mono">O'qituvchi Boshqaruvi</p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {renderNavGroup("1. Kunlik Darslar & Vazifa", dailyTeachingNavItems)}
          {renderNavGroup("2. Skrinshotlar & Hisobotlar", reportsNavItems)}
          {renderNavGroup("3. Boshqaruv", adminNavItems)}
        </div>
      </aside>
    </>
  );
};
