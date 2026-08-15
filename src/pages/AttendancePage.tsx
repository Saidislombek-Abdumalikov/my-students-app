import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { CalendarCheck, Check, X, Clock, ChevronLeft, ChevronRight, AlertTriangle, Plus, LogOut, Layers } from 'lucide-react';
import { AttendanceStatus } from '../types';
import { getClosestLessonDate, getNextLessonDate, getPrevLessonDate, getUzbekDayName, isLessonDay } from '../utils/scheduleUtils';
import { getFocusedGroupId, clearFocusedGroupId, getSelectedGroupId, setSelectedGroupIdMemory } from '../utils/workspaceContext';

import { syncCollectionToCloud } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const rawGroups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const students = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());
  const attendanceList = useLiveQuery(() => db.attendance.toArray());
  const lessons = useLiveQuery(() => db.lessons.toArray());

  const groups = rawGroups?.filter((g) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id) {
      return g.teacherId === user.id || g.teacherId === user.username || (user.username === 'english' && (!g.teacherId || g.teacherId === 't-1'));
    }
    return false;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});
  const [lateMinutesState, setLateMinutesState] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [focusedGroupId, setFocusedGroupIdState] = useState<string | null>(getFocusedGroupId());

  // Listen to workspace focus changes
  useEffect(() => {
    const handleStorage = () => setFocusedGroupIdState(getFocusedGroupId());
    window.addEventListener('workspace_group_changed', handleStorage);
    return () => window.removeEventListener('workspace_group_changed', handleStorage);
  }, []);

  // Set default group or locked focused group
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    const focusId = getFocusedGroupId();
    const rememberedId = getSelectedGroupId();
    if (focusId && groups.some((g) => g.id === focusId)) {
      setSelectedGroupId(focusId);
    } else if (rememberedId && groups.some((g) => g.id === rememberedId)) {
      setSelectedGroupId(rememberedId);
    } else if (!selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Snap date to closest lesson day when group changes
  useEffect(() => {
    if (!groups || !selectedGroupId) return;
    const selectedGroup = groups.find((g) => g.id === selectedGroupId);
    if (selectedGroup) {
      const closestDay = getClosestLessonDate(selectedGroup.scheduleDescription);
      setSelectedDate(closestDay);
    }
  }, [selectedGroupId, groups]);

  // Load saved attendance data when date or group changes
  useEffect(() => {
    if (!selectedGroupId || !selectedDate || !attendanceList || !lessons) return;

    const targetLesson = lessons.find((l) => l.groupId === selectedGroupId && l.date === selectedDate);
    const targetLessonId = targetLesson?.id || `l-${selectedGroupId}-${selectedDate}`;

    const savedAtt: Record<string, AttendanceStatus> = {};
    const savedLate: Record<string, number> = {};

    attendanceList.forEach((a) => {
      if (a.lessonId === targetLessonId || a.lessonId === `l-${selectedGroupId}-${selectedDate}` || a.id.includes(`-${selectedGroupId}-${selectedDate}-`)) {
        savedAtt[a.studentId] = a.status;
        if (a.lateMinutes) savedLate[a.studentId] = a.lateMinutes;
      }
    });

    if (Object.keys(savedAtt).length > 0) {
      setAttendanceState(savedAtt);
      setLateMinutesState(savedLate);
    } else {
      setAttendanceState({});
      setLateMinutesState({});
    }
  }, [selectedGroupId, selectedDate, lessons, attendanceList]);

  if (!groups || !students || !memberships || !attendanceList || !lessons) {
    return <LoadingSpinner label="Davomat sahifasi yuklanmoqda..." />;
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const schedule = selectedGroup?.scheduleDescription || '';

  const activeStudentIds = new Set(
    memberships
      .filter((m) => m.groupId === selectedGroupId && m.status === 'ACTIVE')
      .map((m) => m.studentId)
  );

  const groupStudents = students.filter((s) => activeStudentIds.has(s.id));

  // Check if date is a standard lesson day OR has a custom lesson in DB
  const existingLesson = lessons.find((l) => l.groupId === selectedGroupId && l.date === selectedDate);
  const isStandardDay = isLessonDay(selectedDate, schedule);
  const isEffectiveLessonDay = isStandardDay || !!existingLesson;
  const dayName = getUzbekDayName(selectedDate);

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    groupStudents.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceState(updated);
  };

  const handleLeaveWorkspace = () => {
    clearFocusedGroupId();
    setFocusedGroupIdState(null);
  };

  const handleAddExtraLesson = async () => {
    const newLessonId = `l-${selectedGroupId}-${selectedDate}`;
    const newLesson = {
      id: newLessonId,
      groupId: selectedGroupId,
      date: selectedDate,
      title: `Qo'shimcha dars (${selectedDate})`,
      status: 'COMPLETED' as 'COMPLETED',
      createdAt: new Date().toISOString(),
    };
    await db.lessons.put(newLesson);
    const allLessons = await db.lessons.toArray();
    syncCollectionToCloud('lessons', allLessons).catch(console.error);
    alert(`${selectedDate} (${dayName}) kungi dars kalendarga muvaffaqiyatli biriktirildi va saqlandi!`);
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      let lesson = await db.lessons.where('[groupId+date]').equals([selectedGroupId, selectedDate]).first();
      if (!lesson) {
        const newLessonId = `l-${selectedGroupId}-${selectedDate}`;
        const newLesson = {
          id: newLessonId,
          groupId: selectedGroupId,
          date: selectedDate,
          title: `Dars (${selectedDate})`,
          status: 'COMPLETED' as 'COMPLETED',
          createdAt: new Date().toISOString(),
        };
        await db.lessons.put(newLesson);
        const allLessons = await db.lessons.toArray();
        syncCollectionToCloud('lessons', allLessons).catch(console.error);
        lesson = newLesson;
      }

      if (!lesson) return;

      const entries = Object.entries(attendanceState).map(([sId, status]) => ({
        id: `att-${lesson!.id}-${sId}`,
        lessonId: lesson!.id,
        studentId: sId,
        status,
        lateMinutes: status === 'LATE' ? lateMinutesState[sId] || 10 : undefined,
        updatedAt: new Date().toISOString(),
      }));

      await db.attendance.bulkPut(entries);
      const allAttendance = await db.attendance.toArray();
      syncCollectionToCloud('attendance', allAttendance).catch(console.error);
      alert('Davomat saqlandi!');
    } catch (err) {
      console.error('Davomatni saqlashda xatolik:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Object.values(attendanceState).filter((s) => s === 'PRESENT').length;
  const absentCount = Object.values(attendanceState).filter((s) => s === 'ABSENT').length;
  const lateCount = Object.values(attendanceState).filter((s) => s === 'LATE').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-emerald-600" />
            <span>Davomat Kiritish</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Darsda o'quvchilar qatnashishi hamda kechikish daqiqalarini kiritish paneli.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="primary" isLoading={isSaving} leftIcon={<Check className="w-4 h-4" />} onClick={handleSaveAttendance}>
            Davomatni Saqlash
          </Button>
        </div>
      </div>

      {/* FOCUSED WORKSPACE BANNER */}
      {focusedGroupId && selectedGroup && (
        <Card className="p-4 bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-emerald-700">
            <Layers className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <div>
              <span className="font-bold text-sm">Hozirda '{selectedGroup.name}' guruh ishchi xonasidasiz</span>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                Ushbu guruh bilan ishlamoqdasiz. Boshqa guruhga o'tish uchun guruh ishchi xonasidan chiqishingiz mumkin.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-600" />} onClick={handleLeaveWorkspace} className="whitespace-nowrap">
            Guruh ishchi xonasidan chiqish
          </Button>
        </Card>
      )}

      {/* Control Bar: Group & Date Selector */}
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600 min-w-16">Guruh:</span>
            <select
              disabled={!!focusedGroupId}
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSelectedGroupIdMemory(e.target.value);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-56 disabled:opacity-80"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <button onClick={() => setSelectedDate(getPrevLessonDate(selectedDate, schedule))} className="p-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-600 hover:text-emerald-600 cursor-pointer" title="Oldingi dars kuni">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500" />
              <span className={`text-[10px] font-bold mt-0.5 ${isEffectiveLessonDay ? 'text-emerald-600' : 'text-rose-600'}`}>
                {dayName} {isEffectiveLessonDay ? '(Dars kuni)' : '(Dars kuni emas!)'}
              </span>
            </div>
            <button onClick={() => setSelectedDate(getNextLessonDate(selectedDate, schedule))} className="p-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-600 hover:text-emerald-600 cursor-pointer" title="Keyingi dars kuni">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" className="text-xs text-emerald-600" onClick={() => handleMarkAll('PRESENT')}>Barchasi Keldi</Button>
          <Button size="sm" variant="ghost" className="text-xs text-rose-600" onClick={() => handleMarkAll('ABSENT')}>Barchasi Kelmadi</Button>
        </div>
      </Card>

      {/* NON-LESSON DAY WARNING & FIXING BANNER */}
      {!isEffectiveLessonDay && (
        <Card className="p-4 bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-amber-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold text-sm">Bu kunda dars mavjud emas!</span>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Ushbu guruhning dars jadvallari bo'yicha {selectedDate} ({dayName}) dars kuni emas. Agar ushbu kunda dars o'tgan bo'lsangiz, uni kalendarga biriktirishingiz mumkin.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddExtraLesson} className="whitespace-nowrap">
            Qo'shimcha dars biriktirish
          </Button>
        </Card>
      )}

      {/* Attendance Sheet */}
      <Card className="space-y-4 bg-white border-slate-200 p-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Guruh Davomati</span>
            <h2 className="text-base font-extrabold text-slate-900">{selectedGroup?.name}</h2>
            <p className="text-xs text-slate-500 font-mono">Dars Sanasi: {selectedDate} ({dayName})</p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">Keldi: {presentCount}</span>
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200">Kechikdi: {lateCount}</span>
            <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200">Kelmadi: {absentCount}</span>
          </div>
        </div>

        {!isEffectiveLessonDay ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto opacity-80" />
            <h3 className="text-sm font-bold text-slate-800">Ushbu kunda ({selectedDate}, {dayName}) dars mavjud emas</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {selectedGroup?.name} guruhining dars jadvali bo'yicha bu kunda dars rejalashtirilmagan.
            </p>
            <div className="pt-2">
              <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddExtraLesson}>
                + Ushbu kunga dars biriktirish
              </Button>
            </div>
          </div>
        ) : groupStudents.length === 0 ? (
          <p className="text-xs text-slate-500 p-4 text-center">Ushbu guruhda o'quvchilar mavjud emas.</p>
        ) : (
          <div className="space-y-2">
            {groupStudents.map((s, idx) => {
              const currentStatus = attendanceState[s.id] || 'PRESENT';
              const currentMinutes = lateMinutesState[s.id] || 10;
              return (
                <div key={s.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-sm hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center font-mono border border-slate-200">{idx + 1}</span>
                    <h4 className="text-sm font-bold text-slate-900">{s.fullName}</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setAttendanceState((prev) => ({ ...prev, [s.id]: 'PRESENT' }))} className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center space-x-1 cursor-pointer transition-all ${currentStatus === 'PRESENT' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100'}`}>
                      <Check className="w-3.5 h-3.5" /><span>Keldi</span>
                    </button>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => setAttendanceState((prev) => ({ ...prev, [s.id]: 'LATE' }))} className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center space-x-1 cursor-pointer transition-all ${currentStatus === 'LATE' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100'}`}>
                        <Clock className="w-3.5 h-3.5" /><span>Kechikdi</span>
                      </button>
                      {currentStatus === 'LATE' && (
                        <div className="flex items-center space-x-1 bg-white border border-amber-300 rounded-lg px-2 py-0.5">
                          <input type="number" min="1" max="120" value={currentMinutes} onChange={(e) => setLateMinutesState((prev) => ({ ...prev, [s.id]: Number(e.target.value) }))} className="w-10 bg-transparent text-xs font-bold text-amber-600 text-center focus:outline-none" />
                          <span className="text-[10px] text-amber-600 font-bold">daq</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => setAttendanceState((prev) => ({ ...prev, [s.id]: 'ABSENT' }))} className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center space-x-1 cursor-pointer transition-all ${currentStatus === 'ABSENT' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100'}`}>
                      <X className="w-3.5 h-3.5" /><span>Kelmadi</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
