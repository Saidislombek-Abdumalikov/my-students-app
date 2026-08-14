import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { HomeworkTaskType } from '../../types';
import { Plus, Trash2, FileCheck, Link as LinkIcon, Paperclip } from 'lucide-react';

interface CreateHomeworkPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedGroupId?: string;
}

interface NewTaskItem {
  title: string;
  taskType: HomeworkTaskType;
  instructions: string;
  linkUrl: string;
  maxScore: number;
}

export const CreateHomeworkPackageModal: React.FC<CreateHomeworkPackageModalProps> = ({
  isOpen,
  onClose,
  preselectedGroupId,
}) => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());

  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [groupId, setGroupId] = useState(preselectedGroupId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(nextWeekStr);

  const [tasks, setTasks] = useState<NewTaskItem[]>([
    {
      title: 'Reading Passage 3 Practice',
      taskType: 'READING',
      instructions: 'Complete Cambridge 18 Test 2 Passage 3 and check answers.',
      linkUrl: '',
      maxScore: 40,
    },
    {
      title: 'Task 2 Essay Writing',
      taskType: 'WRITING',
      instructions: 'Write a 250-word essay on Technology in Education.',
      linkUrl: '',
      maxScore: 9,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!groups) return null;

  const handleAddTask = () => {
    setTasks([
      ...tasks,
      {
        title: 'New Homework Task',
        taskType: 'VOCABULARY',
        instructions: '',
        linkUrl: '',
        maxScore: 10,
      },
    ]);
  };

  const handleRemoveTask = (index: number) => {
    if (tasks.length === 1) return;
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleTaskChange = (index: number, field: keyof NewTaskItem, value: any) => {
    const next = [...tasks];
    next[index] = { ...next[index], [field]: value };
    setTasks(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetGroupId = groupId || (groups.length > 0 ? groups[0].id : '');
    if (!targetGroupId || !title.trim()) return;

    setIsSubmitting(true);
    try {
      const packageId = `hp-${Date.now()}`;
      const now = new Date().toISOString();

      // Find or create lesson
      const lesson = await db.lessons
        .where('[groupId+date]')
        .equals([targetGroupId, todayStr])
        .first();

      const lessonId = lesson?.id || `l-${Date.now()}`;

      if (!lesson) {
        await db.lessons.add({
          id: lessonId,
          groupId: targetGroupId,
          date: todayStr,
          title: title,
          status: 'COMPLETED',
          createdAt: now,
        });
      }

      // Add Package
      await db.homeworkPackages.add({
        id: packageId,
        groupId: targetGroupId,
        lessonId,
        title,
        description,
        deadline,
        createdAt: now,
      });

      // Add Tasks
      const taskEntries = tasks.map((t, idx) => ({
        id: `ht-${Date.now()}-${idx}`,
        packageId,
        title: t.title,
        taskType: t.taskType,
        instructions: t.instructions,
        linkUrl: t.linkUrl || undefined,
        maxScore: t.maxScore,
      }));

      await db.homeworkTasks.bulkAdd(taskEntries);

      onClose();
    } catch (err) {
      console.error('Error creating homework package:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Multi-Task Homework Package"
      subtitle="A lesson homework package contains multiple distinct tasks (Reading, Writing, Vocab, etc.)."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Target Class Group <span className="text-rose-600">*</span>
            </label>
            <select
              required
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-brand-500"
            >
              <option value="">Select Group...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.courseSubject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Submission Deadline <span className="text-rose-600">*</span>
            </label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Package Title <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lesson 12: IELTS Cambridge 18 Prep Package"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            General Instructions / Overview
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Complete all tasks by next Monday before 18:00"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Dynamic Homework Tasks Builder */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Homework Tasks ({tasks.length})</span>
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleAddTask}
            >
              Add Task
            </Button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">
                    Task #{idx + 1}
                  </span>
                  {tasks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-1 text-rose-600 hover:text-rose-600"
                      onClick={() => handleRemoveTask(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      value={task.title}
                      onChange={(e) => handleTaskChange(idx, 'title', e.target.value)}
                      placeholder="Task Title (e.g. Reading Passage 3)"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <select
                      value={task.taskType}
                      onChange={(e) => handleTaskChange(idx, 'taskType', e.target.value as HomeworkTaskType)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                    >
                      <option value="READING">READING</option>
                      <option value="LISTENING">LISTENING</option>
                      <option value="WRITING">WRITING</option>
                      <option value="SPEAKING">SPEAKING</option>
                      <option value="VOCABULARY">VOCABULARY</option>
                      <option value="GRAMMAR">GRAMMAR</option>
                      <option value="FILE">FILE</option>
                      <option value="LINK">LINK</option>
                      <option value="CUSTOM">CUSTOM</option>
                    </select>
                  </div>
                </div>

                <input
                  type="text"
                  value={task.instructions}
                  onChange={(e) => handleTaskChange(idx, 'instructions', e.target.value)}
                  placeholder="Task instructions (e.g. Answer questions 27-40)..."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Publish Homework Package
          </Button>
        </div>
      </form>
    </Modal>
  );
};
