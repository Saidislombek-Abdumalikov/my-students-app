import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Group } from '../../types';
import { db } from '../../db';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit?: Group | null;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  groupToEdit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    courseSubject: 'General English',
    level: 'Pre-Intermediate',
    scheduleDescription: 'Dushanba / Chorshanba / Juma (08:00 - 10:00)',
    startDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE' as 'ACTIVE' | 'ARCHIVED',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (groupToEdit) {
      setFormData({
        name: groupToEdit.name,
        courseSubject: groupToEdit.courseSubject,
        level: groupToEdit.level,
        scheduleDescription: groupToEdit.scheduleDescription,
        startDate: groupToEdit.startDate,
        status: groupToEdit.status,
        notes: groupToEdit.notes || '',
      });
    } else {
      setFormData({
        name: '',
        courseSubject: 'General English',
        level: 'Pre-Intermediate',
        scheduleDescription: 'Dushanba / Chorshanba / Juma (08:00 - 10:00)',
        startDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        notes: '',
      });
    }
  }, [groupToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (groupToEdit) {
        await db.groups.update(groupToEdit.id, {
          ...formData,
        });
      } else {
        const newGroup: Group = {
          id: `g-${Date.now()}`,
          teacherId: 't-1',
          ...formData,
          createdAt: new Date().toISOString(),
        };
        await db.groups.add(newGroup);
      }
      onClose();
    } catch (err) {
      console.error('Guruhni saqlashda xatolik:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={groupToEdit ? 'Guruhni Tahrirlash' : 'Yangi Guruh Yaratish'}
      subtitle="Guruh nomi va Dushanba-Chorshanba-Juma yoki Seshonba-Payshanba-Shanba jadvalini tanlang."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Guruh Nomi <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Masalan: Pre-Intermediate 08:00 - 10:00"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Dars Kunlari va Vaqti (Jadval) <span className="text-rose-400">*</span>
          </label>
          <select
            value={formData.scheduleDescription}
            onChange={(e) => setFormData({ ...formData, scheduleDescription: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="Dushanba / Chorshanba / Juma (08:00 - 10:00)">
              Dushanba / Chorshanba / Juma (08:00 - 10:00)
            </option>
            <option value="Dushanba / Chorshanba / Juma (10:00 - 12:00)">
              Dushanba / Chorshanba / Juma (10:00 - 12:00)
            </option>
            <option value="Dushanba / Chorshanba / Juma (13:30 - 15:30)">
              Dushanba / Chorshanba / Juma (13:30 - 15:30)
            </option>
            <option value="Seshonba / Payshanba / Shanba (08:00 - 10:00)">
              Seshonba / Payshanba / Shanba (08:00 - 10:00)
            </option>
            <option value="Seshonba / Payshanba / Shanba (10:00 - 12:00)">
              Seshonba / Payshanba / Shanba (10:00 - 12:00)
            </option>
            <option value="Seshonba / Payshanba / Shanba (13:30 - 15:30)">
              Seshonba / Payshanba / Shanba (13:30 - 15:30)
            </option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kurs Yo'nalishi
            </label>
            <select
              value={formData.courseSubject}
              onChange={(e) => setFormData({ ...formData, courseSubject: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="General English">General English</option>
              <option value="Kids English">Kids English</option>
              <option value="IELTS Preparation">IELTS Preparation</option>
              <option value="CEFR B2/C1">CEFR B2/C1</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Daraja (Level)
            </label>
            <input
              type="text"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              placeholder="Masalan: Pre-Intermediate"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {groupToEdit ? 'O\'zgarishlarni Saqlash' : 'Guruhni Yaratish'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
