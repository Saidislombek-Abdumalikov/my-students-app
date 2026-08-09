import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { HomeworkLibraryItem } from '../../types';
import { Send } from 'lucide-react';

interface AssignLibraryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraryItem: HomeworkLibraryItem | null;
}

export const AssignLibraryItemModal: React.FC<AssignLibraryItemModalProps> = ({
  isOpen,
  onClose,
  libraryItem,
}) => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());

  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [groupId, setGroupId] = useState('');
  const [deadline, setDeadline] = useState(nextWeekStr);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!libraryItem || !groups) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetGroupId = groupId || (groups.length > 0 ? groups[0].id : '');
    if (!targetGroupId) return;

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
          title: libraryItem.title,
          status: 'COMPLETED',
          createdAt: now,
        });
      }

      // Add Package
      await db.homeworkPackages.add({
        id: packageId,
        groupId: targetGroupId,
        lessonId,
        title: libraryItem.title,
        description: `Imported from Library: ${libraryItem.category}`,
        deadline,
        createdAt: now,
      });

      // Add Tasks
      const taskEntries = libraryItem.tasks.map((t, idx) => ({
        id: `ht-${Date.now()}-${idx}`,
        packageId,
        title: t.title,
        taskType: t.taskType,
        instructions: t.instructions,
        linkUrl: t.linkUrl,
        maxScore: t.maxScore,
      }));

      await db.homeworkTasks.bulkAdd(taskEntries);

      alert(`Homework Package "${libraryItem.title}" assigned successfully!`);
      onClose();
    } catch (err) {
      console.error('Error assigning homework template:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign "${libraryItem.title}" to Class`}
      subtitle={`Import this template containing ${libraryItem.tasks.length} tasks into a live homework package.`}
    >
      <form onSubmit={handleAssign} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Target Class Group <span className="text-rose-400">*</span>
          </label>
          <select
            required
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
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
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Submission Deadline <span className="text-rose-400">*</span>
          </label>
          <input
            type="date"
            required
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 text-xs">
          <h4 className="font-bold text-brand-400">Included Tasks Preview ({libraryItem.tasks.length})</h4>
          {libraryItem.tasks.map((t, i) => (
            <p key={i} className="text-slate-300">
              #{i + 1} <strong>[{t.taskType}]</strong> {t.title}
            </p>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Assign Package Now
          </Button>
        </div>
      </form>
    </Modal>
  );
};
