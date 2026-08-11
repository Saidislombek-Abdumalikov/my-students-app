import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { PlusCircle, Save, Trash2, History, ChevronLeft, ChevronRight, LogOut, Layers, AlertTriangle, Plus } from 'lucide-react';
import { getNextLessonDate, getPrevLessonDate, getUzbekDayName, isLessonDay } from '../utils/scheduleUtils';
import { getFocusedGroupId, clearFocusedGroupId } from '../utils/workspaceContext';

import { HomeworkPackage, HomeworkTask } from '../types';
import { syncCollectionToCloud } from '../services/firebase';

interface MultiTaskItem {
  id: string;
  name: string;
}

export const HomeworkAddPage: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const packages = useLiveQuery(() => db.homeworkPackages.toArray());

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [title, setTitle] = useState('Unit 3: Vocabulary & Workbook Homework');
  const [deadline, setDeadline] = useState(todayStr);
  const [tasks, setTasks] = useState<MultiTaskItem[]>([
    { id: 't-1', name: "So'zlar yodlash (Vocabulary 15 ta)" },
    { id: 't-2', name: 'WorkBook 20-bet 1-3 mashqlar' },
  ]);
  const [newTaskName, setNewTaskName] = useState('');
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

  // Snap deadline date to group's NEXT scheduled lesson day when group changes
  useEffect(() => {
    if (!groups || !selectedGroupId) return;
    const selectedGroup = groups.find((g) => g.id === selectedGroupId);
    if (selectedGroup) {
      const nextDay = getNextLessonDate(todayStr, selectedGroup.scheduleDescription, true);
      setDeadline(nextDay);
    }
  }, [selectedGroupId, groups, todayStr]);

  if (!groups || !packages) {
    return <LoadingSpinner label="Vazifa qo'shish sahifasi yuklanmoqda..." />;
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const schedule = selectedGroup?.scheduleDescription || '';
  const isValidDay = isLessonDay(deadline, schedule);
  const dayName = getUzbekDayName(deadline);

  const groupPackages = packages.filter((p) => selectedGroupId === 'ALL' || p.groupId === selectedGroupId);

  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    setTasks((prev) => [...prev, { id: `t-${Date.now()}`, name: newTaskName.trim() }]);
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

  const handleSaveHomeworkPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || tasks.length === 0) {
      alert("Iltimos, kamida bitta vazifa topshirig'ini kiriting.");
      return;
    }

    setIsSaving(true);
    try {
      const pkgId = `hp-${selectedGroupId}-${deadline}`;
      const now = new Date().toISOString();

      const newPackage: HomeworkPackage = {
        id: pkgId,
        groupId: selectedGroupId,
        lessonId: `l-${selectedGroupId}-${deadline}`,
        title,
        description: tasks.map((t) => t.name).join('; '),
        deadline,
        createdAt: now,
      };

      const newTasks: HomeworkTask[] = tasks.map((t, idx) => ({
        id: `ht-${pkgId}-${idx}-${Date.now()}`,
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

      alert(`"${title}" muvaffaqiyatli saqlandi! (${newTasks.length} ta topshiriq bilan)`);
      setTitle(`Unit ${groupPackages.length + 2}: Homework Package`);
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
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-emerald-400" />
            <span>Keyingi Darsga Vazifa Berish</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Keyingi dars uchun vazifalar topshirig'ini yaratish va saqlab qo'yish paneli.
          </p>
        </div>
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

      {/* NON-LESSON DAY WARNING & FIXING BANNER */}
      {!isValidDay && (
        <Card className="p-4 bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-amber-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold text-sm">Bu kunda dars mavjud emas!</span>
              <p className="text-[11px] text-amber-400/90 mt-0.5">
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
        <Card className="lg:col-span-2 space-y-4 bg-slate-900 border-slate-800 p-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100">Yangi Uy Vazifasini Kiritish</h3>
            <p className="text-xs text-slate-400">Guruh uchun keyingi dars vazifalarini shakllantirish.</p>
          </div>

          <form onSubmit={handleSaveHomeworkPackage} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Guruhni Tanlang</label>
              <select
                required
                disabled={!!focusedGroupId}
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-80"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Vazifa Sarlavhasi</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Schedule-Aware Next Lesson Deadline Picker */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Topshirish Muddati (Keyingi Dars Kuni)</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setDeadline(getPrevLessonDate(deadline, schedule))}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer"
                  title="Oldingi dars kuni"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center space-x-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5">
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="bg-transparent text-xs text-slate-100 font-semibold focus:outline-none flex-1"
                  />
                  <span className={`text-[11px] font-bold ${isValidDay ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {dayName} {isValidDay ? '(Dars kuni)' : '(Dars kuni emas!)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setDeadline(getNextLessonDate(deadline, schedule))}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer"
                  title="Keyingi dars kuni"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task Items List */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block font-semibold text-slate-300">Vazifa Turlari Ro'yxati:</label>
              {tasks.map((task, idx) => (
                <div key={task.id} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="font-bold text-slate-200">
                    {idx + 1}. {task.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(task.id)}
                    className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Task Input */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Yangi vazifa bandini yozing..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddTask}>
                Qo'shish
              </Button>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Vazifani Saqlash
              </Button>
            </div>
          </form>
        </Card>

        {/* Saved Homework History Drawer */}
        <Card className="space-y-3 bg-slate-900 border-slate-800 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200">Saqlangan Vazifalar</h3>
            </div>
            <Badge variant="brand">{groupPackages.length} Ta</Badge>
          </div>

          {groupPackages.length === 0 ? (
            <p className="text-xs text-slate-400 p-2">Saqlangan vazifalar yo'q.</p>
          ) : (
            <div className="space-y-2">
              {groupPackages.map((pkg) => (
                <div key={pkg.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-100">{pkg.title}</h4>
                    <span className="text-[10px] font-mono text-slate-500">{pkg.deadline}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{pkg.description}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
