import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { PaymentStatus } from '../../types';
import { CreditCard, Check, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const students = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [studentId, setStudentId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [periodMonth, setPeriodMonth] = useState(currentMonthStr);
  const [status, setStatus] = useState<PaymentStatus>('PAID');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!students || !groups) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !groupId) return;

    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const newPayment = {
        id: `p-${Date.now()}`,
        studentId,
        groupId,
        amount: 0, // No money amounts stored
        paymentDate: status === 'PAID' ? todayStr : '',
        periodMonth,
        paymentMethod: 'CASH' as const,
        status,
        createdAt: new Date().toISOString(),
      };

      await db.payments.add(newPayment);
      onClose();
    } catch (err) {
      console.error('To\'lovni saqlashda xatolik:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="To'lov Holatini Kiritish"
      subtitle="O'quvchining oy uchun to'lov qilganligi yoki to'lashi kerakligini belgilash."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            O'quvchi <span className="text-rose-400">*</span>
          </label>
          <select
            required
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-bold"
          >
            <option value="">O'quvchini tanlang</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Guruh <span className="text-rose-400">*</span>
          </label>
          <select
            required
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-bold"
          >
            <option value="">Guruhni tanlang</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">To'lov Oyi</label>
          <input
            type="month"
            required
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-bold"
          />
        </div>

        {/* Binary Status Toggle: To'lagan vs To'lashi Kerak */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">To'lov Holati</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStatus('PAID')}
              className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer ${
                status === 'PAID'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>To'langan</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('UNPAID')}
              className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer ${
                status === 'UNPAID'
                  ? 'bg-red-600 text-white border-red-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>To'lashi kerak</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
};
