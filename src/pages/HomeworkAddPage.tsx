import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { PlusCircle, Save, Trash2, History } from 'lucide-react';

interface MultiTaskItem {
  id: string;
  name: string;
}

export const HomeworkAddPage: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const packages = useLiveQuery(() => db.homeworkPackages.toArray());

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [title, setTitle] = useState('Unit 3: Kids Vocabulary & Pre-Inter Homework');
  const [deadline, setDeadline] = useState(todayStr);
  const [tasks, setTasks] = useState<MultiTaskItem[]>([
    { id: 't-1', name: 'So\'zlar yodlash (Vocabulary 15 ta)' },
    { id: 't-2', name: 'WorkBook 20-bet 1-3 mashqlar' },
  ]);
  const [newTaskName, setNewTaskName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  if (!groups || !packages) {
    return <LoadingSpinner label="Vazifa qo'shish sahifasi yuklanmoqda..." />;
  }

  const groupPackages = packages.filter((p) => selectedGroupId === 'ALL' || p.groupId === selectedGroupId);

  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    setTasks((prev) => [...prev, { id: `t-${Date.now()}`, name: newTaskName.trim() }]);
    setNewTaskName('');
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleSaveHomeworkPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || tasks.length === 0) return;

    setIsSaving(true);
    try {
      const pkgId = `hp-${Date.now()}`;
      await db.homeworkPackages.add({
        id: pkgId,
        groupId: selectedGroupId,
        lessonId: `l-${selectedGroupId}-${deadline}`,
        title,
        description: tasks.map((t) => t.name).join('; '),
        deadline,
        createdAt: new Date().toISOString(),
      });

      alert('Yangi uy vazifasi saqlandi!');
      setTitle('Unit ' + (groupPackages.length + 4) + ' Homework');
    } catch (err) {
      console.error('Vazifani saqlashda xatolik:', err);
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
            <span>Uy Vazifasi Qo'shish & Saqlash</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Keyingi dars uchun vazifalar topshirig'ini yaratish va saqlab qo'yish paneli.
          </p>
        </div>
      </div>

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
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
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

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Topshirish Muddat (Muddati)</label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
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
