import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CalendarGrid, CalendarEvent } from '../components/calendar/CalendarGrid';
import { TeacherNotificationCenter } from '../components/calendar/TeacherNotificationCenter';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth());
  const [eventFilter, setEventFilter] = useState<'ALL' | 'LESSON' | 'HOMEWORK' | 'TEST' | 'PAYMENT'>('ALL');

  const rawLessons = useLiveQuery(() => db.lessons.toArray());
  const rawPackages = useLiveQuery(() => db.homeworkPackages.toArray());
  const rawTests = useLiveQuery(() => db.tests.toArray());
  const rawPayments = useLiveQuery(() => db.payments.toArray());
  const rawGroups = useLiveQuery(() => db.groups.toArray());

  if (!rawLessons || !rawPackages || !rawTests || !rawPayments || !rawGroups) {
    return <LoadingSpinner label="Dars jadvali yuklanmoqda..." />;
  }

  const groups = rawGroups.filter((g) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id) {
      return g.teacherId === user.id || g.teacherId === user.username || (user.username === 'english' && (!g.teacherId || g.teacherId === 't-1'));
    }
    return false;
  });

  const teacherGroupIds = new Set(groups.map((g) => g.id));

  const lessons = rawLessons.filter((l) => user?.role === 'ADMIN' || teacherGroupIds.has(l.groupId));
  const packages = rawPackages.filter((p) => user?.role === 'ADMIN' || teacherGroupIds.has(p.groupId));
  const tests = rawTests.filter((t) => user?.role === 'ADMIN' || teacherGroupIds.has(t.groupId));
  const payments = rawPayments.filter((p) => user?.role === 'ADMIN' || teacherGroupIds.has(p.groupId));

  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const calendarEvents: CalendarEvent[] = [];

  // Lessons
  lessons.forEach((l) => {
    const g = groupMap.get(l.groupId);
    calendarEvents.push({
      id: `ev-l-${l.id}`,
      date: l.date,
      type: 'LESSON',
      title: `Dars: ${g?.name || 'Guruh'}`,
      targetUrl: '/attendance',
    });
  });

  // Homework
  packages.forEach((p) => {
    const g = groupMap.get(p.groupId);
    calendarEvents.push({
      id: `ev-hp-${p.id}`,
      date: p.deadline,
      type: 'HOMEWORK',
      title: `Vazifa: ${p.title}`,
      targetUrl: '/homework-check',
    });
  });

  // Tests
  tests.forEach((t) => {
    calendarEvents.push({
      id: `ev-t-${t.id}`,
      date: t.date,
      type: 'TEST',
      title: `Imtihon: ${t.title}`,
      targetUrl: '/tests',
    });
  });

  // Payments Overdue
  payments.forEach((p) => {
    if (p.status === 'UNPAID') {
      calendarEvents.push({
        id: `ev-p-${p.id}`,
        date: p.paymentDate || p.createdAt.split('T')[0],
        type: 'PAYMENT',
        title: `QARZDOR To'lov`,
        targetUrl: '/payments',
      });
    }
  });

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleToday = () => {
    setYear(currentDate.getFullYear());
    setMonth(currentDate.getMonth());
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            <span>Dars va Mashg'ulotlar Jadvali</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kunlik darslar, vazifa muddatlari va imtihon kunlari taqvimi.
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Button variant="secondary" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="font-bold">
            Bugun
          </Button>
          <Button variant="secondary" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Event Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">
          {[
            { id: 'ALL', label: 'Barchasi' },
            { id: 'LESSON', label: 'Darslar' },
            { id: 'HOMEWORK', label: 'Vazifalar' },
            { id: 'TEST', label: 'Imtihonlar' },
            { id: 'PAYMENT', label: 'Qarzdorlar' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setEventFilter(item.id as any)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                eventFilter === item.id
                  ? 'bg-emerald-600 text-white font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Grid + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <CalendarGrid
            year={year}
            month={month}
            events={calendarEvents}
            eventFilter={eventFilter}
          />
        </div>

        <div>
          <TeacherNotificationCenter />
        </div>
      </div>
    </div>
  );
};
