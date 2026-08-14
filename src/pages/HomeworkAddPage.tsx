import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { PlusCircle, Save, Trash2, History, ChevronLeft, ChevronRight, LogOut, Layers, AlertTriangle, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getNextLessonDate, getPrevLessonDate, getUzbekDayName, isLessonDay } from '../utils/scheduleUtils';
import { getFocusedGroupId, clearFocusedGroupId } from '../utils/workspaceContext';
import { Link, useNavigate } from 'react-router-dom';

import { HomeworkPackage, HomeworkTask } from '../types';
import { syncCollectionToCloud } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

interface MultiTaskItem {
  id: string;
  name: string;
}

export const HomeworkAddPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const rawGroups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const packages = useLiveQuery(() => db.homeworkPackages.toArray());

  const groups = rawGroups?.filter((g) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id) {
      return g.teacherId === user.id || g.teacherId === user.username || (user.username === 'english' && (!g.teacherId || g.teacherId === 't-1'));
    }
    return false;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [title, setTitle] = useState("Vazifalar to'plami");
  const [deadline, setDeadline] = useState(todayStr);
  const [tasks, setTasks] = useState<MultiTaskItem[]>([
    { id: 't-1', name: "So'zlar yodlash (Vocabulary)" },
    { id: 't-2', name: 'WorkBook mashqlari' },
    { id: 't-3', name: "O'qib kelish (Reading)" },
  ]);
  const [newTaskName, setNewTaskName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [focusedGroupId, setFocusedGroupIdState] = useState<string | null>(getFocusedGroupId());
  const [prevGroupId, setPrevGroupId] = useState<string>('');

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

  // Snap deadline date to group's NEXT scheduled lesson day ONLY when group changes
  useEffect(() => {
    if (!groups || !selectedGroupId) return;
    if (selectedGroupId !== prevGroupId) {
      setPrevGroupId(selectedGroupId);
      const selectedGroup = groups.find((g) => g.id === selectedGroupId);
      if (selectedGroup) {
        const nextDay = getNextLessonDate(todayStr, selectedGroup.scheduleDescription, true);
        setDeadline(nextDay);
      }
    }
  }, [selectedGroupId, groups, todayStr, prevGroupId]);

  // Load existing package and tasks from DB if one exists for selectedGroupId + deadline
  useEffect(() => {
    if (!selectedGroupId || !deadline) return;
    const pkgId = `hp-${selectedGroupId}-${deadline}`;

    db.homeworkPackages.get(pkgId).then(async (foundPkg) => {
      if (foundPkg) {
        setTitle(foundPkg.title);
        const dbTasks = await db.homeworkTasks.where('packageId').equals(pkgId).toArray();
        if (dbTasks.length > 0) {
          setTasks(dbTasks.map((t, idx) => ({ id: t.id || `t-${idx}`, name: t.title })));
        } else if (foundPkg.description) {
          const names = foundPkg.description.split('; ').filter(Boolean);
          setTasks(names.map((n, idx) => ({ id: `t-${idx}`, name: n })));
        }
      } else {
        setTitle("Bugungi va keyingi dars vazifalari");
        setTasks([
          { id: 't-1', name: "So'zlar yodlash (Vocabulary)" },
          { id: 't-2', name: 'WorkBook mashqlari' },
          { id: 't-3', name: "O'qib kelish (Reading)" },
        ]);
      }
    });
  }, [selectedGroupId, deadline]);

  if (!groups || !packages) {
    return <LoadingSpinner label="Vazifa qo'shish sahifasi yuklanmoqda..." />;
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const schedule = selectedGroup?.scheduleDescription || '';
  const isValidDay = isLessonDay(deadline, schedule);
  const dayName = getUzbekDayName(deadline);

  // Group packages sorted by deadline (upcoming / newest first)
  const groupPackages = packages
    .filter((p) => selectedGroupId === 'ALL' || p.groupId === selectedGroupId)
    .sort((a, b) => b.deadline.localeCompare(a.deadline));

  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    setTasks((prev) => [...prev, { id: `t-${Date.now()}-${Math.random()}`, name: newTaskName.trim() }]);
    setNewTaskName('');
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleLeaveWorkspace = () => {
    clearFocusedGroupId();
    setFocusedGroupIdState(null);
  };

  const handleAddExtraLesson = async () => {
    const newLessonId = `l-${selectedGroupId}-${deadline}`;
    await db.lessons.put({
      id: newLessonId,
      groupId: selectedGroupId,
      date: deadline,
      title: `Qo'shimcha dars (${deadline})`,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    });
    alert(`${deadline} (${dayName}) kungi dars kalendarga muvaffaqiyatli biriktirildi va saqlandi!`);
  };

  const handleSelectExistingPackage = async (pkg: HomeworkPackage) => {
    setSelectedGroupId(pkg.groupId);
    setDeadline(pkg.deadline);
    setTitle(pkg.title);
    const dbTasks = await db.homeworkTasks.where('packageId').equals(pkg.id).toArray();
    if (dbTasks.length > 0) {
      setTasks(dbTasks.map((t, idx) => ({ id: t.id || `t-${idx}`, name: t.title })));
    } else if (pkg.description) {
      const names = pkg.description.split('; ').filter(Boolean);
      setTasks(names.map((n, idx) => ({ id: `t-${idx}`, name: n })));
    }
  };

  const handleDeletePackage = async (pkgId: string, pkgTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`"${pkgTitle}" vazifasini o'chirib tashlashni tasdiqlaysizmi?`)) {
      await db.homeworkPackages.delete(pkgId);
      await db.homeworkTasks.where('packageId').equals(pkgId).delete();
      const allPkgs = await db.homeworkPackages.toArray();
      const allTasks = await db.homeworkTasks.toArray();
      syncCollectionToCloud('homeworkPackages', allPkgs).catch(console.error);
      syncCollectionToCloud('homeworkTasks', allTasks).catch(console.error);
    }
  };

  const handleSaveHomeworkPackage = async (e: React.FormEvent) => {
    e.preventDefault();

    let currentTasks = [...tasks];
    if (newTaskName.trim()) {
      const pendingItem = { id: `t-${Date.now()}`, name: newTaskName.trim() };
      currentTasks.push(pendingItem);
      setTasks(currentTasks);
      setNewTaskName('');
    }

    if (!selectedGroupId || currentTasks.length === 0) {
      alert("Iltimos, kamida bitta vazifa topshirig'ini kiriting.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const pkgId = `hp-${selectedGroupId}-${deadline}`;
      const now = new Date().toISOString();

      const newPackage: HomeworkPackage = {
        id: pkgId,
        groupId: selectedGroupId,
        lessonId: `l-${selectedGroupId}-${deadline}`,
        title,
        description: currentTasks.map((t) => t.name).join('; '),
        deadline,
        createdAt: now,
      };

      // Stable task IDs based on package ID and index
      const newTasks: HomeworkTask[] = currentTasks.map((t, idx) => ({
        id: `ht-${pkgId}-${idx}`,
        packageId: pkgId,
        title: t.name,
        taskType: 'CUSTOM',
        instructions: '',
      }));

      // Atomic transaction: put package & replace tasks for this package
      await db.transaction('rw', [db.homeworkPackages, db.homeworkTasks], async () => {
        await db.homeworkPackages.put(newPackage);
        const oldTasks = await db.homeworkTasks.where('packageId').equals(pkgId).toArray();
        if (oldTasks.length > 0) {
          await db.homeworkTasks.bulkDelete(oldTasks.map((ot) => ot.id));
        }
        await db.homeworkTasks.bulkAdd(newTasks);
      });

      // Background cloud sync
      const allPkgs = await db.homeworkPackages.toArray();
      const allTasks = await db.homeworkTasks.toArray();
      syncCollectionToCloud('homeworkPackages', allPkgs).catch(console.error);
      syncCollectionToCloud('homeworkTasks', allTasks).catch(console.error);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err) {
      console.error('Vazifani saqlashda xatolik:', err);
      alert('Vazifani saqlashda xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-emerald-600" />
            <span>Keyingi Darsga Vazifa Berish</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Keyingi dars uchun vazifalar topshirig'ini yaratish va saqlab qo'yish paneli.
          </p>
        </div>
        
        <Link to="/homework-check">
          <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Vazifalarni Tekshirish Bo'limiga O'tish
          </Button>
        </Link>
      </div>

      {/* SUCCESS ALERTS BANNER */}
      {saveSuccess && (
        <Card className="p-4 bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs text-emerald-800 animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="font-extrabold text-sm">Vazifa to'plami saqlandi!</span>
              <p className="text-[11px] text-emerald-700">
                Guruh uchun vazifalar muvaffaqiyatli saqlandi. Endi "Vazifalarni Tekshirish" sahifasida o'quvchilarni baholashingiz mumkin.
              </p>
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={() => navigate('/homework-check')}>
            Tekshirishga o'tish →
          </Button>
        </Card>
      )}

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

      {/* NON-LESSON DAY WARNING & FIXING BANNER */}
      {!isValidDay && (
        <Card className="p-4 bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-amber-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold text-sm">Bu kunda dars mavjud emas!</span>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Ushbu guruhning dars jadvallari bo'yicha {deadline} ({dayName}) dars kuni emas. Agar ushbu kunda dars o'tgan bo'lsangiz, uni kalendarga biriktirishingiz mumkin.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddExtraLesson} className="whitespace-nowrap">
            Qo'shimcha dars biriktirish
          </Button>
        </Card>
      )}

      {/* Main Grid: Form + History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create New Homework Form */}
        <Card className="lg:col-span-2 space-y-4 bg-white border-slate-200 p-5">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Yangi Uy Vazifasini Kiritish</h3>
            <p className="text-xs text-slate-500">Guruh uchun keyingi dars vazifalarini shakllantirish.</p>
          </div>

          <form onSubmit={handleSaveHomeworkPackage} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Guruhni Tanlang</label>
              <select
                required
                disabled={!!focusedGroupId}
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-80"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Vazifa Sarlavhasi</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Unit 4: Vocabulary & Workbook Homework"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Schedule-Aware Next Lesson Deadline Picker */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Topshirish Muddati (Keyingi Dars Kuni)</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setDeadline(getPrevLessonDate(deadline, schedule))}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-600 hover:text-emerald-600 cursor-pointer"
                  title="Oldingi dars kuni"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5">
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="bg-transparent text-xs text-slate-900 font-semibold focus:outline-none flex-1"
                  />
                  <span className={`text-[11px] font-bold ${isValidDay ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {dayName} {isValidDay ? '(Dars kuni)' : '(Dars kuni emas!)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setDeadline(getNextLessonDate(deadline, schedule))}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-600 hover:text-emerald-600 cursor-pointer"
                  title="Keyingi dars kuni"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task Items List */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="block font-semibold text-slate-600">Vazifa Turlari Ro'yxati ({tasks.length} ta):</label>
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Vazifalar kiritilmagan. Quyidagi maydonga yozib, Qo'shish tugmasini bosing.</p>
              ) : (
                tasks.map((task, idx) => (
                  <div key={task.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800">
                      {idx + 1}. {task.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(task.id)}
                      className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Task Input with ENTER Key Support */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
                placeholder="Yangi vazifa bandini yozing (Enter bosing)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddTask}>
                Qo'shish
              </Button>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Vazifani Saqlash
              </Button>
            </div>
          </form>
        </Card>

        {/* Saved & Upcoming Homework History Drawer */}
        <Card className="space-y-3 bg-white border-slate-200 p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-800">Saqlangan Vazifalar Ro'yxati</h3>
            </div>
            <Badge variant="brand">{groupPackages.length} Ta</Badge>
          </div>

          {groupPackages.length === 0 ? (
            <p className="text-xs text-slate-500 p-2">Saqlangan vazifalar yo'q.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {groupPackages.map((pkg) => {
                const isUpcoming = pkg.deadline >= todayStr;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectExistingPackage(pkg)}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 cursor-pointer transition-all hover:border-emerald-500 ${
                      pkg.deadline === deadline ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900">{pkg.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isUpcoming ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {pkg.deadline} {isUpcoming ? "(Bo'lgusi)" : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{pkg.description}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] text-emerald-600 font-bold">Tahrirlash / Ko'rish uchun bosing →</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePackage(pkg.id, pkg.title, e)}
                        className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                        title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
