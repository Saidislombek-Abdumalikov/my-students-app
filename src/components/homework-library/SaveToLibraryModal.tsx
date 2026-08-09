import React, { useState } from 'react';
import { db } from '../../db';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { HomeworkLibraryItem, HomeworkTaskType } from '../../types';

interface SaveToLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaveToLibraryModal: React.FC<SaveToLibraryModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: 'Cambridge 18 Reading & Writing Package',
    courseSubject: 'IELTS Preparation',
    level: 'Upper-Intermediate',
    category: 'Cambridge Practice',
    tagsStr: 'cambridge, reading, writing, task2',
  });

  const [tasks, setTasks] = useState([
    {
      title: 'Passage 3 True/False Scanning',
      taskType: 'READING' as HomeworkTaskType,
      instructions: 'Complete passage 3 questions 27-40 in Cambridge 18.',
      linkUrl: '',
      maxScore: 40,
    },
    {
      title: 'Argumentative Essay Outlining',
      taskType: 'WRITING' as HomeworkTaskType,
      instructions: 'Outline a 4-paragraph response for Essay Topic #4.',
      linkUrl: '',
      maxScore: 9,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = formData.tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
      const newItem: HomeworkLibraryItem = {
        id: `hl-${Date.now()}`,
        title: formData.title,
        courseSubject: formData.courseSubject,
        level: formData.level,
        category: formData.category,
        tasks: tasks.map((t) => ({
          title: t.title,
          taskType: t.taskType,
          instructions: t.instructions,
          linkUrl: t.linkUrl || undefined,
          maxScore: t.maxScore,
        })),
        tags,
        createdAt: new Date().toISOString(),
      };

      await db.homeworkLibrary.add(newItem);
      onClose();
    } catch (err) {
      console.error('Error saving homework template to library:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Template to Homework Library"
      subtitle="Create a reusable homework package template for your teaching bank."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Template Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. IELTS Reading Passage 3 & Essay Structure"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
            <select
              value={formData.courseSubject}
              onChange={(e) => setFormData({ ...formData, courseSubject: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="IELTS Preparation">IELTS Preparation</option>
              <option value="General English">General English</option>
              <option value="CEFR B2/C1">CEFR B2/C1</option>
              <option value="Grammar & Vocabulary">Grammar & Vocabulary</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Level</label>
            <input
              type="text"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              placeholder="e.g. Upper-Intermediate"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g. Reading, Writing, Grammar"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Tags (comma separated)
          </label>
          <input
            type="text"
            value={formData.tagsStr}
            onChange={(e) => setFormData({ ...formData, tagsStr: e.target.value })}
            placeholder="cambridge, reading, essay"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Template
          </Button>
        </div>
      </form>
    </Modal>
  );
};
