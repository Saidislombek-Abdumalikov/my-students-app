import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { BookOpenCheck, Calendar, Save, Check, FileCheck, Plus, Trash2, History } from 'lucide-react';

interface MultiTaskItem {
  id: string;
  name: string;
}

import { useAuth } from '../context/AuthContext';

export const DailyWorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const rawGroups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const students = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());
  const packages = useLiveQuery(() => db.homeworkPackages.toArray());

  const groups = (rawGroups || []).filter((g) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id) {
      return g.teacherId === user.id || g.teacherId === user.username || (user.username === 'english' && (!g.teacherId || g.teacherId === 't-1'));
    }
    return false;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Lesson Plan Form State
  const [topic, setTopic] = useState('Unit 3: Kids Vocabulary & Pre-Inter Grammar');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Assigned Homework Multi-Tasks (2, 3 or more types)
  const [assignedTasks, setAssignedTasks] = useState<MultiTaskItem[]>([
    { id: 't-1', name: 'So\'zlar yodlash (Vocabulary 15 ta)' },
    { id: 't-2', name: 'WorkBook 20-bet mashq 1-3' },
    { id: 't-3', name: 'O\'qib kelish (Reading Passage)' },
  ]);
  const [newTaskName, setNewTaskName] = useState('');

  // Per-Student Per-Task completion map: studentId -> taskId -> boolean
  const [studentTaskChecks, setStudentTaskChecks] = useState<Record<string, Record<string, boolean>>>({});

  React.useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  if (!groups || !students || !memberships || !packages) {
    return <LoadingSpinner label="Kunlik dars ishchi xonasi yuklanmoqda..." />;
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const activeStudentIds = new Set(
    memberships
      .filter((m) => m.groupId === selectedGroupId && m.status === 'ACTIVE')
      .map((m) => m.studentId)
  );

  const groupStudents = students.filter((s) => activeStudentIds.has(s.id));

  // Past saved homework packages for this group
  const groupPackages = packages.filter((p) => p.groupId === selectedGroupId);

  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    setAssignedTasks((prev) => [...prev, { id: `t-${Date.now()}`, name: newTaskName.trim() }]);
    setNewTaskName('');
  };

  const handleRemoveTask = (taskId: string) => {
    setAssignedTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

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

  const handleSaveWorkspace = async () => {
    setIsSavingPlan(true);
    try {
      let lesson = await db.lessons.where('[groupId+date]').equals([selectedGroupId, selectedDate]).first();
      if (!lesson) {
        const newLessonId = `l-${selectedGroupId}-${selectedDate}`;
        await db.lessons.add({
          id: newLessonId,
          groupId: selectedGroupId,
          date: selectedDate,
          title: topic,
          status: 'PLANNED',
          createdAt: new Date().toISOString(),
        });
        lesson = await db.lessons.get(newLessonId);
      }

      if (!lesson) return;

      // Save homework package
      const pkgId = `hp-${lesson.id}`;
      await db.homeworkPackages.put({
        id: pkgId,
        groupId: selectedGroupId,
        lessonId: lesson.id,
        title: topic,
        description: assignedTasks.map((t) => t.name).join('; '),
        deadline: selectedDate,
        createdAt: new Date().toISOString(),
      });

      // Save submissions with exact completion percentage %
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
      alert('Dars, vazifalar va o\'quvchilar foizlari saqlandi!');
    } catch (err) {
      console.error('Dars va vazifalarni saqlashda xatolik:', err);
    } finally {
      setIsSavingPlan(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-emerald-600" />
            <span>Kunlik Dars & Vazifa Boshqaruvi (Foizlar bilan)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dars ishchi maydoni — vazifalarni yakka-yakka tekshirish va avtomatik foizlar (%0-%100) hisoblash.
          </p>
        </div>

        <Button
          variant="primary"
          isLoading={isSavingPlan}
          leftIcon={<Save className="w-4 h-4" />}
          onClick={handleSaveWorkspace}
        >
          Dars & Vazifa Foizlarini Saqlash
        </Button>
      </div>

      {/* Control Bar: Group & Date Selector */}
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600 min-w-16">Guruh:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-56"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600 min-w-20">Dars Sanasi:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </Card>

      {/* Main Grid: Multi-Task Homework Assigning & Granular Checker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Assign Multi-Task Homework for Next Lesson */}
        <Card className="space-y-4 bg-white border-slate-200 p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Keyingi Darsga Vazifa Berish</span>
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white">
              {assignedTasks.length} ta vazifa
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Dars Mavzusi</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Task Items List */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-600">Beriladigan Vazifalar Turlari:</label>
              {assignedTasks.map((task, idx) => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-800">
                    {idx + 1}. {task.name}
                  </span>
                  <button
                    onClick={() => handleRemoveTask(task.id)}
                    className="text-rose-600 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Task Input */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Yangi vazifa turi..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-600" />} onClick={handleAddTask}>
                Qo'shish
              </Button>
            </div>
          </div>
        </Card>

        {/* 2. Granular Multi-Task Student Homework Checker with Automatic Percentages % */}
        <Card className="lg:col-span-2 space-y-4 bg-white border-slate-200 p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>O'quvchilar Vazifalarini Tekshirish (% Foizlar Bilan)</span>
            </h3>
            <span className="text-xs text-slate-500">Har bir vazifani belgilang</span>
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
                    ? 'bg-emerald-600 text-white'
                    : percentage > 0
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-red-600 text-white';

                return (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <h4 className="text-xs font-bold text-slate-900">{s.fullName}</h4>
                      <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded ${statusBadgeClass}`}>
                        {percentage}% ({completedCount}/{totalTasks} Bajarildi)
                      </span>
                    </div>

                    {/* Per-Task Completion Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {assignedTasks.map((task) => {
                        const isDone = sChecks[task.id] || false;

                        return (
                          <button
                            key={task.id}
                            onClick={() => toggleStudentTask(s.id, task.id)}
                            className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer border ${
                              isDone
                                ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                                : 'bg-slate-100 text-slate-500 border-slate-300 hover:text-slate-900'
                            }`}
                          >
                            <span className="truncate mr-1 text-[11px]">{task.name}</span>
                            <span className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded ${isDone ? 'bg-white text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
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

      {/* Past Saved Homeworks Drawer */}
      <Card className="space-y-3 bg-white border-slate-200 p-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800">Saqlangan O'tgan Uy Vazifalari</h3>
          </div>
          <Badge variant="brand">{groupPackages.length} Ta Saqlangan</Badge>
        </div>

        {groupPackages.length === 0 ? (
          <p className="text-xs text-slate-500 p-2">Saqlangan pastki vazifalar topilmadi.</p>
        ) : (
          <div className="space-y-2">
            {groupPackages.map((pkg) => (
              <div key={pkg.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{pkg.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{pkg.description}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-500">{pkg.createdAt.split('T')[0]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
