import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FileCheck, Save, ChevronLeft, ChevronRight, AlertTriangle, Plus, LogOut, Layers } from 'lucide-react';
import { getClosestLessonDate, getNextLessonDate, getPrevLessonDate, getUzbekDayName, isLessonDay } from '../utils/scheduleUtils';
import { getFocusedGroupId, clearFocusedGroupId, getSelectedGroupId, setSelectedGroupIdMemory } from '../utils/workspaceContext';
import { syncCollectionToCloud } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

interface MultiTaskItem {
  id: string;
  name: string;
}

export const HomeworkCheckPage: React.FC = () => {
  const { user } = useAuth();
  const rawGroups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const students = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());
  const packages = useLiveQuery(() => db.homeworkPackages.toArray());
  const homeworkTasksList = useLiveQuery(() => db.homeworkTasks.toArray());
  const submissions = useLiveQuery(() => db.homeworkSubmissions.toArray());
  const lessons = useLiveQuery(() => db.lessons.toArray());

  const groups = rawGroups?.filter((g) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id) {
      return g.teacherId === user.id || g.teacherId === user.username || (user.subject === 'English' && (!g.teacherId || g.teacherId === 't-1'));
    }
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const defaultTasks: MultiTaskItem[] = [
    { id: 't-1', name: "So'zlar yodlash (Vocabulary)" },
    { id: 't-2', name: 'WorkBook mashqlari' },
    { id: 't-3', name: "O'qib kelish (Reading)" },
  ];

  // Resolve assigned tasks dynamically from DB if teacher created a package for this date/group
  const matchedPkg = packages?.find(
    (p) => p.groupId === selectedGroupId && (p.deadline === selectedDate || p.id === `hp-${selectedGroupId}-${selectedDate}`)
  );
  const matchedDbTasks = matchedPkg && homeworkTasksList
    ? homeworkTasksList.filter((t) => t.packageId === matchedPkg.id)
    : [];

  const assignedTasks: MultiTaskItem[] = matchedDbTasks.length > 0
    ? matchedDbTasks.map((t) => ({ id: t.id, name: t.title }))
    : defaultTasks;

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

  // Load saved homework check data ONLY when date, group, or matched package changes
  useEffect(() => {
    if (!selectedGroupId || !selectedDate || !submissions) return;

    const pkgId = matchedPkg?.id || `hp-${selectedGroupId}-${selectedDate}`;
    const savedChecks: Record<string, Record<string, boolean>> = {};

    submissions.forEach((sub) => {
      if (sub.taskId === pkgId || sub.taskId.startsWith(`hp-${selectedGroupId}-${selectedDate}`)) {
        const taskMap: Record<string, boolean> = {};

        if (sub.completedTaskIds && Array.isArray(sub.completedTaskIds)) {
          const completedSet = new Set(sub.completedTaskIds);
          assignedTasks.forEach((t, i) => {
            taskMap[t.id] = completedSet.has(t.id) || completedSet.has(`t-${i + 1}`) || completedSet.has(`ht-${pkgId}-${i}`);
          });
        } else {
          const pct = sub.completionPercentage ?? 0;
          const totalTasks = assignedTasks.length || 1;
          const completedCount = Math.round((pct / 100) * totalTasks);
          assignedTasks.forEach((task, i) => {
            taskMap[task.id] = i < completedCount;
          });
        }
        savedChecks[sub.studentId] = taskMap;
      }
    });

    setStudentTaskChecks(savedChecks);
  }, [selectedGroupId, selectedDate, matchedPkg?.id]);

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

  const toggleStudentTask = async (studentId: string, taskId: string) => {
    const currentMap = studentTaskChecks[studentId] || {};
    const newDoneState = !currentMap[taskId];
    const newStudentMap = {
      ...currentMap,
      [taskId]: newDoneState,
    };

    const newOverallChecks = {
      ...studentTaskChecks,
      [studentId]: newStudentMap,
    };

    setStudentTaskChecks(newOverallChecks);

    // Auto-save this student's submission instantly to Dexie & Cloud Firestore
    try {
      const pkgId = matchedPkg?.id || `hp-${selectedGroupId}-${selectedDate}`;
      const totalTasks = assignedTasks.length || 1;
      const completedTaskIds = assignedTasks
        .filter((t) => newStudentMap[t.id])
        .map((t) => t.id);

      const completedCount = completedTaskIds.length;
      const percentage = Math.round((completedCount / totalTasks) * 100);

      let statusVal: 'COMPLETED' | 'PARTIAL' | 'MISSING' = 'MISSING';
      if (percentage === 100) statusVal = 'COMPLETED';
      else if (percentage > 0) statusVal = 'PARTIAL';

      const submissionEntry = {
        id: `hs-${pkgId}-${studentId}`,
        taskId: pkgId,
        studentId,
        status: statusVal,
        completedTaskIds,
        completionPercentage: percentage,
        score: percentage,
        updatedAt: new Date().toISOString(),
      };

      await db.homeworkSubmissions.put(submissionEntry);
      const allSubmissions = await db.homeworkSubmissions.toArray();
      syncCollectionToCloud('homeworkSubmissions', allSubmissions).catch(console.error);
    } catch (err) {
      console.error('Auto-save error:', err);
    }
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
      const pkgId = matchedPkg?.id || `hp-${selectedGroupId}-${selectedDate}`;
      const totalTasks = assignedTasks.length || 1;
      const now = new Date().toISOString();

      const submissionEntries = groupStudents.map((s) => {
        const sChecks = studentTaskChecks[s.id] || {};
        const completedTaskIds = assignedTasks
          .filter((t) => sChecks[t.id])
          .map((t) => t.id);

        const completedCount = completedTaskIds.length;
        const percentage = Math.round((completedCount / totalTasks) * 100);

        let statusVal: 'COMPLETED' | 'PARTIAL' | 'MISSING' = 'MISSING';
        if (percentage === 100) statusVal = 'COMPLETED';
        else if (percentage > 0) statusVal = 'PARTIAL';

        return {
          id: `hs-${pkgId}-${s.id}`,
          taskId: pkgId,
          studentId: s.id,
          status: statusVal,
          completedTaskIds,
          completionPercentage: percentage,
          score: percentage,
          updatedAt: now,
        };
      });

      await db.homeworkSubmissions.bulkPut(submissionEntries);

      // Cloud sync
      const allSubmissions = await db.homeworkSubmissions.toArray();
      syncCollectionToCloud('homeworkSubmissions', allSubmissions).catch(console.error);

      alert("Vazifalar va o'quvchilar foizlari saqlandi!");
    } catch (err) {
      console.error('Vazifani saqlashda xatolik:', err);
      alert('Vazifalarni saqlashda xatolik yuz berdi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-emerald-600" />
            <span>Vazifa Tekshirish</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Darsda o'quvchilardan berilgan vazifalarni yakka-yakka tekshiring. Har bir vazifani ustiga bossangiz darhol saqlanadi.
          </p>
        </div>
        <Button variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />} onClick={handleSaveHomeworkCheck}>
          Vazifa Foizlarini Saqlash
        </Button>
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

      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-600 min-w-16">Guruh:</span>
          <select
            disabled={!!focusedGroupId}
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value);
              setSelectedGroupIdMemory(e.target.value);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-64 disabled:opacity-80"
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
              {dayName} {isEffectiveLessonDay ? '(Dars kuni)' : '(Dars kuni emas)'}
            </span>
          </div>
          <button onClick={() => setSelectedDate(getNextLessonDate(selectedDate, schedule))} className="p-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-600 hover:text-emerald-600 cursor-pointer" title="Keyingi dars kuni">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* NON-LESSON DAY WARNING BANNER (INFORMATIONAL ONLY, DOES NOT BLOCK MATRIX) */}
      {!isEffectiveLessonDay && (
        <Card className="p-4 bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-amber-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold text-sm">Eslatma: {selectedDate} ({dayName}) guruh dars jadvallarida dars kuni sifatida ko'rsatilmadi</span>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Vazifalarni baribir tekshirishingiz mumkin. Agar ushbu kunga rasmiy dars qo'shmoqchi bo'lsangiz, "Qo'shimcha dars biriktirish" tugmasini bosing.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddExtraLesson} className="whitespace-nowrap">
            Qo'shimcha dars biriktirish
          </Button>
        </Card>
      )}

      <Card className="space-y-4 bg-white border-slate-200 p-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{selectedGroup?.name}</span>
            <h3 className="text-sm font-extrabold text-slate-900">Vazifani Tekshirish Varakasi</h3>
            <p className="text-xs text-slate-500 font-mono">Sana: {selectedDate} ({dayName})</p>
          </div>
          <Badge variant="brand">{assignedTasks.length} ta topshiriq</Badge>
        </div>

        {groupStudents.length === 0 ? (
          <p className="text-xs text-slate-500 p-4 text-center">Guruhda o'quvchilar topilmadi.</p>
        ) : (
          <div className="space-y-3">
            {groupStudents.map((s) => {
              const sChecks = studentTaskChecks[s.id] || {};
              const totalTasks = assignedTasks.length || 1;
              const completedCount = Object.values(sChecks).filter(Boolean).length;
              const percentage = Math.round((completedCount / totalTasks) * 100);

              const statusBadgeClass =
                percentage === 100
                  ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                  : percentage > 0
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-red-600 text-white font-extrabold';

              return (
                <div key={s.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-sm font-bold text-slate-900">{s.fullName}</h4>
                    <span className={`px-3 py-0.5 text-xs rounded-lg ${statusBadgeClass}`}>
                      {percentage}% ({completedCount}/{totalTasks} Bajarildi)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {assignedTasks.map((task) => {
                      const isDone = !!sChecks[task.id];
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => toggleStudentTask(s.id, task.id)}
                          className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border select-none ${
                            isDone
                              ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-md'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:text-slate-900'
                          }`}
                        >
                          <span className="truncate mr-1 text-xs">{task.name}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md flex items-center gap-1 ${
                              isDone ? 'bg-white text-emerald-800' : 'bg-slate-100 text-rose-600 border border-rose-200'
                            }`}
                          >
                            {isDone ? '✓ Bajarildi' : '✕ Bajarilmadi'}
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
