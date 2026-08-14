import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Users, GraduationCap, CalendarCheck, AlertCircle, CheckCircle2, ArrowRight, LogOut, Layers } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getFocusedGroupId, setFocusedGroupId, clearFocusedGroupId, getSelectedGroupId, setSelectedGroupIdMemory } from '../utils/workspaceContext';

import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const rawGroups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const students = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const payments = useLiveQuery(() => db.payments.toArray());
  const lessons = useLiveQuery(() => db.lessons.toArray());

  const groups = rawGroups?.filter((g) => {
    if (user?.role === 'ADMIN') return true;
    return g.teacherId === user?.id || (!g.teacherId && user?.id === 't-1');
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [focusedGroupId, setFocusedGroupIdState] = useState<string | null>(getFocusedGroupId());

  useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      const focusId = getFocusedGroupId();
      const rememberedId = getSelectedGroupId();
      if (focusId && groups.some((g) => g.id === focusId)) {
        setSelectedGroupId(focusId);
      } else if (rememberedId && groups.some((g) => g.id === rememberedId)) {
        setSelectedGroupId(rememberedId);
      } else {
        setSelectedGroupId(groups[0].id);
      }
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    const handleStorage = () => setFocusedGroupIdState(getFocusedGroupId());
    window.addEventListener('workspace_group_changed', handleStorage);
    return () => window.removeEventListener('workspace_group_changed', handleStorage);
  }, []);

  if (!groups || !students || !payments || !lessons) {
    return <LoadingSpinner label="Bosh sahifa yuklanmoqda..." />;
  }

  const focusedGroup = groups.find((g) => g.id === focusedGroupId);
  const activeStudentIds = new Set(students.filter((s) => s.status === 'ACTIVE').map((s) => s.id));
  const unpaidPayments = payments.filter((p) => p.status === 'UNPAID' && activeStudentIds.has(p.studentId));
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const handleOpenWorkspace = (gId?: string) => {
    const targetId = gId || selectedGroupId;
    if (!targetId) return;
    setFocusedGroupId(targetId);
    setFocusedGroupIdState(targetId);
    navigate('/attendance');
  };

  const handleLeaveWorkspace = () => {
    clearFocusedGroupId();
    setFocusedGroupIdState(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Bosh Sahifa — O'qituvchi Boshqaruvi</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Guruhni tanlang va ishchi xonaga kirib, barcha davomat, vazifa va imtihonlarni faqat shu guruh bo'yicha kiriting.
          </p>
        </div>

        {/* Group Selector & Workspace Entry */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value);
              setSelectedGroupIdMemory(e.target.value);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<CalendarCheck className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => handleOpenWorkspace()}
          >
            Guruh Ishchi Xonasiga Kirish
          </Button>
        </div>
      </div>

      {/* ACTIVE FOCUSED WORKSPACE BANNER */}
      {focusedGroupId && focusedGroup && (
        <Card className="p-4 bg-emerald-950/40 border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 text-emerald-300">
            <Layers className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <div>
              <span className="font-bold text-sm">Hozirda '{focusedGroup.name}' guruh ishchi xonasidasiz</span>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">
                Barcha davomat, vazifa tekshirish, va imtihonlar faqat ushbu guruh bo'yicha ishlaydi. Guruhdan chiqish uchun tugmani bosing.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="primary" onClick={() => navigate('/attendance')}>
              Davomatga O'tish
            </Button>
            <Button size="sm" variant="outline" leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-400" />} onClick={handleLeaveWorkspace} className="whitespace-nowrap">
              Guruhdan chiqish
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Students */}
        <Card className="p-4 bg-slate-900 border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Jami O'quvchilar</span>
            <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100">{students.length} nafar</p>
          <p className="text-[11px] text-slate-500 font-mono">Aktiv ta'lim olayotgan</p>
        </Card>

        {/* Active Class Groups */}
        <Card className="p-4 bg-slate-900 border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Guruhlar Soni</span>
            <div className="p-2 rounded-lg bg-sky-950 border border-sky-800 text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100">{groups.length} ta guruh</p>
          <p className="text-[11px] text-slate-500 font-mono">Dars jadvalidagi</p>
        </Card>

        {/* Unpaid Debtors Highlighted in BOLD RED */}
        <Card className="p-4 bg-red-950/40 border-red-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> To'lashi Kerak
            </span>
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-red-600 text-white">
              QARZDOR
            </span>
          </div>
          <p className="text-2xl font-extrabold text-red-500">{unpaidPayments.length} ta o'quvchi</p>
          <p className="text-[11px] font-bold text-red-400 font-mono">
            To'lovini amalga oshirishi kerak
          </p>
        </Card>

        {/* Total Lessons */}
        <Card className="p-4 bg-slate-900 border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Darslar Nazorati</span>
            <div className="p-2 rounded-lg bg-amber-950 border border-amber-800 text-amber-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100">{lessons.length} ta dars</p>
          <p className="text-[11px] text-slate-500 font-mono">Tizimga kiritilgan</p>
        </Card>
      </div>

      {/* Main Grid: Unpaid Debtor List & Quick Groups Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unpaid Debtors Red Alert Drawer */}
        <Card className="lg:col-span-2 space-y-4 bg-slate-900 border-slate-800 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">To'lov Qilishi Kerak Bo'lgan O'quvchilar</h3>
                <p className="text-xs text-slate-400">Tezkor nazorat ro'yxati.</p>
              </div>
            </div>
            <Link to="/payments">
              <Button size="sm" variant="ghost" className="text-xs text-red-400 hover:text-red-300">
                To'liq Ro'yxat
              </Button>
            </Link>
          </div>

          {unpaidPayments.length === 0 ? (
            <div className="p-6 text-center text-slate-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-emerald-400">Barcha o'quvchilar to'lovni amalga oshirgan!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {unpaidPayments.map((p) => {
                const s = studentMap.get(p.studentId);
                return (
                  <div key={p.id} className="p-3 bg-slate-950 rounded-xl border border-red-900 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{s?.fullName || 'O\'quvchi'}</h4>
                      <p className="text-[11px] text-slate-400">
                        Ota-onasi: <strong className="text-slate-200">{s?.parentName}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-3 py-1 text-xs font-extrabold rounded bg-red-600 text-white">
                        To'lashi kerak (QARZDOR)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Active Groups Overview with Direct Workspace Entry Buttons */}
        <Card className="space-y-4 bg-slate-900 border-slate-800 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100">Guruhlarim</h3>
            <Link to="/groups">
              <Button size="sm" variant="ghost" className="text-xs text-emerald-400">
                Boshqarish
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-100">{g.name}</h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {g.scheduleDescription}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">Dars jadvali: {g.scheduleDescription}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] py-1 px-2.5"
                    rightIcon={<ArrowRight className="w-3 h-3" />}
                    onClick={() => handleOpenWorkspace(g.id)}
                  >
                    Ishchi Xonaga Kirish
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
