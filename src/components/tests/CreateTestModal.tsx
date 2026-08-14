import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TestCategory, Test } from '../../types';

interface CreateTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedGroupId?: string;
}

export const CreateTestModal: React.FC<CreateTestModalProps> = ({
  isOpen,
  onClose,
  preselectedGroupId,
}) => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    groupId: preselectedGroupId || '',
    title: 'Mock Exam #2 — Full IELTS Simulation',
    date: todayStr,
    category: 'IELTS_OVERALL' as TestCategory,
    maxScore: 9.0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!groups) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetGroupId = formData.groupId || (groups.length > 0 ? groups[0].id : '');
    if (!targetGroupId || !formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      const newTest: Test = {
        id: `t-${Date.now()}`,
        groupId: targetGroupId,
        title: formData.title,
        date: formData.date,
        category: formData.category,
        maxScore: Number(formData.maxScore),
        createdAt: new Date().toISOString(),
      };

      await db.tests.add(newTest);
      onClose();
    } catch (err) {
      console.error('Error creating test:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Exam / Test"
      subtitle="Configure IELTS Mock Exam or General Test for a class group."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Target Class Group <span className="text-rose-600">*</span>
          </label>
          <select
            required
            value={formData.groupId}
            onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
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
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Test Title <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Monthly Progress Test #3"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => {
                const cat = e.target.value as TestCategory;
                setFormData({
                  ...formData,
                  category: cat,
                  maxScore: cat.startsWith('IELTS') ? 9.0 : 100,
                });
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
            >
              <option value="IELTS_OVERALL">IELTS Full (All Skills)</option>
              <option value="IELTS_LISTENING">IELTS Listening</option>
              <option value="IELTS_READING">IELTS Reading</option>
              <option value="IELTS_WRITING">IELTS Writing</option>
              <option value="IELTS_SPEAKING">IELTS Speaking</option>
              <option value="GENERAL">General Test / Quiz</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Max Score</label>
            <input
              type="number"
              step="0.5"
              required
              value={formData.maxScore}
              onChange={(e) => setFormData({ ...formData, maxScore: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Test
          </Button>
        </div>
      </form>
    </Modal>
  );
};
