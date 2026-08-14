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
  Users,
  UserCheck,
  CreditCard,
  LogOut,
  ShieldCheck,
  UserCog,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, logout } = useAuth();

  // Section 1: Kunlik Darslar & Ishchi Maydon
  const dailyTeachingNavItems = [
    { label: 'Bosh Sahifa', path: '/', icon: LayoutDashboard },
    { label: 'Davomat Kiritish', path: '/attendance', icon: CalendarCheck },
    { label: 'Bugungi Vazifani Tekshirish', path: '/homework-check', icon: FileCheck },
    { label: 'Keyingi Darsga Vazifa Berish', path: '/homework-add', icon: PlusCircle },
    { label: 'Baholar & Imtihonlar', path: '/tests', icon: GraduationCap },
    { label: 'Dars Jadvali', path: '/calendar', icon: Calendar },
  ];

  // Section 2: Skrinshotlar Maydoni
  const reportsNavItems = [
    { label: 'Skrinshotlar Maydoni (4 ta Jadval)', path: '/screenshots', icon: Camera },
  ];

  // Section 3: Boshqaruv
  const adminNavItems = [
    { label: 'Guruhlar', path: '/groups', icon: Users },
    { label: 'O\'quvchilar', path: '/students', icon: UserCheck },
    { label: 'To\'lovlar (Qarzdorlar)', path: '/payments', icon: CreditCard },
  ];

  if (user?.role === 'ADMIN') {
    adminNavItems.push({
      label: 'Foydalanuvchilar (Login/Parol)',
      path: '/users',
      icon: UserCog,
    });
  }

  const renderNavGroup = (title: string, items: typeof dailyTeachingNavItems) => (
    <div className="space-y-1">
      <h3 className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
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
                `flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-200 flex flex-col shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header Branding */}
        <div className="h-16 flex items-center px-4 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">TEACHER OS</h2>
              <p className="text-[10px] text-slate-500 font-mono">O'qituvchi Boshqaruvi</p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {renderNavGroup("1. Kunlik Darslar & Vazifa", dailyTeachingNavItems)}
          {renderNavGroup("2. Skrinshotlar Maydoni", reportsNavItems)}
          {renderNavGroup("3. Boshqaruv", adminNavItems)}
        </div>

        {/* Footer User Profile & Logout */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-2 truncate">
              <div
                className={`w-7 h-7 rounded-lg text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 ${
                  user?.role === 'ADMIN' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600'
                }`}
              >
                {user?.role === 'ADMIN' ? (
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                ) : (
                  user?.fullName.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName || 'Foydalanuvchi'}
                </p>
                <p className="text-[10px] text-emerald-600 font-mono font-bold">
                  {user?.role === 'ADMIN' ? 'Admin (1)' : `@${user?.username || 'user'}`}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
