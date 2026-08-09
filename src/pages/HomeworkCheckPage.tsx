import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FileCheck, Save, ChevronLeft, ChevronRight, AlertTriangle, Plus, LogOut, Layers } from 'lucide-react';
import { getClosestLessonDate, getNextLessonDate, getPrevLessonDate, getUzbekDayName, isLessonDay } from '../utils/scheduleUtils';
import { getFocusedGroupId, clearFocusedGroupId } from '../utils/workspaceContext';

interface MultiTaskItem {
  id: string;
  name: string;
}

export const HomeworkCheckPage: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const students = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());
  const packages = useLiveQuery(() => db.homeworkPackages.toArray());
  const submissions = useLiveQuery(() => db.homeworkSubmissions.toArray());
  const lessons = useLiveQuery(() => db.lessons.toArray());

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [assignedTasks] = useState<MultiTaskItem[]>([
    { id: 't-1', name: "So'zlar yodlash (Vocabulary)" },
    { id: 't-2', name: 'WorkBook mashqlari' },
    { id: 't-3', name: "O'qib kelish (Reading)" },
  ]);

  const [studentTaskChecks, setStudentTaskChecks] = useState<Record<string, Record<string, boolean>>>({});
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
    if (focusId && groups.some((g) => g.id === focusId)) {
      setSelectedGroupId(focusId);
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

  // Load saved homework check data when date or group changes
  useEffect(() => {
    if (!selectedGroupId || !selectedDate || !submissions) return;

    const pkgId = `hp-${selectedGroupId}-${selectedDate}`;
    const savedChecks: Record<string, Record<string, boolean>> = {};

    submissions.forEach((sub) => {
      if (sub.taskId === pkgId) {
        const pct = sub.completionPercentage ?? 0;
        const totalTasks = assignedTasks.length || 1;
        const completedCount = Math.round((pct / 100) * totalTasks);

        const taskMap: Record<string, boolean> = {};
        assignedTasks.forEach((task, i) => {
          taskMap[task.id] = i < completedCount;
        });
        savedChecks[sub.studentId] = taskMap;
      }
    });

    if (Object.keys(savedChecks).length > 0) {
      setStudentTaskChecks(savedChecks);
    } else {
      setStudentTaskChecks({});
    }
  }, [selectedGroupId, selectedDate, submissions, assignedTasks]);

  if (!groups || !students || !memberships || !packages || !submissions || !lessons) {
    return <LoadingSpinner label="Bugungi vazifani tekshirish bo'limi yuklanmoqda..." />;
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const schedule = selectedGroup?.scheduleDescription || '';

  const activeStudentIds = new Set(
    memberships
      .filter((m) => m.groupId === selectedGroupId && m.status === 'ACTIVE')
      .map((m) => m.studentId)
  );

  const groupStudents = students.filter((s) => activeStudentIds.has(s.id));

  // Check if date is standard lesson day OR has extra lesson in DB
  const existingLesson = lessons.find((l) => l.groupId === selectedGroupId && l.date === selectedDate);
  const isStandardDay = isLessonDay(selectedDate, schedule);
  const isEffectiveLessonDay = isStandardDay || !!existingLesson;
  const dayName = getUzbekDayName(selectedDate);

  const toggleStudentTask = (studentId: string, taskId: string) => {
    setStudentTaskChecks((prev) => {
      const studentMap = prev[studentId] || {};
      return {
        ...prev,
        [studentId]: {
          ...studentMap,
          [taskId]: !studentMap[taskId],
        },
      };
    });
  };

  const handleLeaveWorkspace = () => {
    clearFocusedGroupId();
    setFocusedGroupIdState(null);
  };

  const handleAddExtraLesson = async () => {
    const newLessonId = `l-${selectedGroupId}-${selectedDate}`;
    await db.lessons.put({
      id: newLessonId,
      groupId: selectedGroupId,
      date: selectedDate,
      title: `Qo'shimcha dars (${selectedDate})`,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    });
    alert(`${selectedDate} (${dayName}) kungi dars kalendarga muvaffaqiyatli biriktirildi va saqlandi!`);
  };

  const handleSaveHomeworkCheck = async () => {
    setIsSaving(true);
    try {
      const pkgId = `hp-${selectedGroupId}-${selectedDate}`;
      const totalTasks = assignedTasks.length || 1;

      const submissionEntries = groupStudents.map((s) => {
        const sChecks = studentTaskChecks[s.id] || {};
        const completedCount = Object.values(sChecks).filter(Boolean).length;
        const percentage = Math.round((completedCount / totalTasks) * 100);

        let statusVal: 'COMPLETED' | 'PARTIAL' | 'MISSING' = 'MISSING';
        if (percentage === 100) statusVal = 'COMPLETED';
        else if (percentage > 0) statusVal = 'PARTIAL';

        return {
          id: `hs-${pkgId}-${s.id}`,
          taskId: pkgId,
          studentId: s.id,
          status: statusVal,
          completionPercentage: percentage,
          score: percentage,
          updatedAt: new Date().toISOString(),
        };
      });

      await db.homeworkSubmissions.bulkPut(submissionEntries);
      alert("Vazifalar va o'quvchilar foizlari saqlandi!");
    } catch (err) {
      console.error('Vazifani saqlashda xatolik:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            <span>Vazifa Tekshirish</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Darsda o'quvchilardan berilgan vazifalarni yakka-yakka tekshiring. Foizlar avtomatik hisoblanadi.
          </p>
        </div>
        <Button variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />} onClick={handleSaveHomeworkCheck}>
          Vazifa Foizlarini Saqlash
        </Button>
      </div>

      {/* FOCUSED WORKSPACE BANNER */}
      {focusedGroupId && selectedGroup && (
        <Card className="p-4 bg-emerald-950/40 border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-emerald-300">
            <Layers className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <div>
              <span className="font-bold text-sm">Hozirda '{selectedGroup.name}' guruh ishchi xonasidasiz</span>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">
                Ushbu guruh bilan ishlamoqdasiz. Boshqa guruhga o'tish uchun guruh ishchi xonasidan chiqishingiz mumkin.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-400" />} onClick={handleLeaveWorkspace} className="whitespace-nowrap">
            Guruh ishchi xonasidan chiqish
          </Button>
        </Card>
      )}

      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-300 min-w-16">Guruh:</span>
          <select disabled={!!focusedGroupId} value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-64 disabled:opacity-80">
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button onClick={() => setSelectedDate(getPrevLessonDate(selectedDate, schedule))} className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer" title="Oldingi dars kuni">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col items-center">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500" />
            <span className={`text-[10px] font-bold mt-0.5 ${isEffectiveLessonDay ? 'text-emerald-400' : 'text-rose-400'}`}>
              {dayName} {isEffectiveLessonDay ? '(Dars kuni)' : '(Dars kuni emas!)'}
            </span>
          </div>
          <button onClick={() => setSelectedDate(getNextLessonDate(selectedDate, schedule))} className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer" title="Keyingi dars kuni">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* NON-LESSON DAY WARNING & FIXING BANNER */}
      {!isEffectiveLessonDay && (
        <Card className="p-4 bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-amber-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold text-sm">Bu kunda dars mavjud emas!</span>
              <p className="text-[11px] text-amber-400/90 mt-0.5">
                Ushbu guruhning dars jadvallari bo'yicha {selectedDate} ({dayName}) dars kuni emas. Agar ushbu kunda dars o'tgan bo'lsangiz, uni kalendarga biriktirishingiz mumkin.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddExtraLesson} className="whitespace-nowrap">
            Qo'shimcha dars biriktirish
          </Button>
        </Card>
      )}

      <Card className="space-y-4 bg-slate-900 border-slate-800 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{selectedGroup?.name}</span>
            <h3 className="text-sm font-extrabold text-slate-100">Vazifani Tekshirish Varakasi</h3>
            <p className="text-xs text-slate-400 font-mono">Sana: {selectedDate} ({dayName})</p>
          </div>
          <Badge variant="brand">{assignedTasks.length} ta vazifa turi</Badge>
        </div>

        {!isEffectiveLessonDay ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto opacity-80" />
            <h3 className="text-sm font-bold text-slate-200">Ushbu kunda ({selectedDate}, {dayName}) dars yoki vazifa tekshirish mavjud emas</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {selectedGroup?.name} guruhining dars jadvali bo'yicha bu kunda dars rejalashtirilmagan.
            </p>
            <div className="pt-2">
              <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddExtraLesson}>
                + Ushbu kunga dars biriktirish
              </Button>
            </div>
          </div>
        ) : groupStudents.length === 0 ? (
          <p className="text-xs text-slate-400 p-4 text-center">Guruhda o'quvchilar topilmadi.</p>
        ) : (
          <div className="space-y-3">
            {groupStudents.map((s) => {
              const sChecks = studentTaskChecks[s.id] || {};
              const totalTasks = assignedTasks.length || 1;
              const completedCount = Object.values(sChecks).filter(Boolean).length;
              const percentage = Math.round((completedCount / totalTasks) * 100);

              const statusBadgeClass =
                percentage === 100
                  ? 'bg-emerald-600 text-white font-extrabold'
                  : percentage > 0
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-red-600 text-white font-extrabold';

              return (
                <div key={s.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-sm font-bold text-slate-100">{s.fullName}</h4>
                    <span className={`px-3 py-0.5 text-xs rounded-lg ${statusBadgeClass}`}>
                      {percentage}% ({completedCount}/{totalTasks} Bajarildi)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {assignedTasks.map((task) => {
                      const isDone = sChecks[task.id] || false;
                      return (
                        <button key={task.id} onClick={() => toggleStudentTask(s.id, task.id)} className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer border ${isDone ? 'bg-emerald-600 text-white border-emerald-500 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'}`}>
                          <span className="truncate mr-1 text-[11px]">{task.name}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded ${isDone ? 'bg-white text-emerald-700' : 'bg-rose-950 text-rose-400'}`}>
                            {isDone ? 'Bajarildi' : 'Bajarilmadi'}
                          </span>
                        </button>
                      );
                    })}
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
