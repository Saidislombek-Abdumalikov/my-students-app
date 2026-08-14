import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Bell, CalendarCheck, FileCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TeacherNotificationCenter: React.FC = () => {
  const todayLessons = useLiveQuery(() => db.lessons.toArray());
  const unpaidPayments = useLiveQuery(() => db.payments.where('status').equals('UNPAID').toArray());
  const packages = useLiveQuery(() => db.homeworkPackages.toArray());

  if (!todayLessons || !unpaidPayments || !packages) return null;

  return (
    <Card className="space-y-4 bg-white border-slate-200 p-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">O'qituvchi Bildirishnomalari</h3>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white">
          Eslatmalar
        </span>
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Scheduled Lessons Alert */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" /> Rejalashtirilgan Darslar
            </p>
            <p className="text-slate-500 text-[11px]">
              {todayLessons.length} ta dars jadvalda mavjud.
            </p>
          </div>
          <Link to="/attendance">
            <Button size="sm" variant="ghost" className="p-1 text-emerald-600">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Homework Packages Alert */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-amber-600" /> Vazifalarni Tekshirish
            </p>
            <p className="text-slate-500 text-[11px]">
              {packages.length} ta vazifa to'plami kiritilgan.
            </p>
          </div>
          <Link to="/homework-check">
            <Button size="sm" variant="ghost" className="p-1 text-amber-600">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Overdue Payments Alert */}
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="font-extrabold text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> QARZDOR O'quvchilar
            </p>
            <p className="text-rose-700 font-bold text-[11px]">
              {unpaidPayments.length} ta o'quvchi to'lashi kerak.
            </p>
          </div>
          <Link to="/payments">
            <Button size="sm" variant="ghost" className="p-1 text-rose-600">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
