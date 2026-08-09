import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { PaymentModal } from '../components/payments/PaymentModal';
import { CreditCard, AlertCircle, CheckCircle2, Plus, Search, Trash2 } from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const payments = useLiveQuery(() => db.payments.toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const groups = useLiveQuery(() => db.groups.toArray());

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  if (!payments || !students || !groups) {
    return <LoadingSpinner label="To'lovlar sahifasi yuklanmoqda..." />;
  }

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const filteredPayments = payments.filter((p) => {
    const s = studentMap.get(p.studentId);
    
    // If student record was completely deleted, don't show orphaned payments unless viewing ALL
    if (!s && studentStatusFilter !== 'ALL') return false;

    // Filter by student status (ACTIVE / ARCHIVED / ALL)
    if (studentStatusFilter !== 'ALL' && s && s.status !== studentStatusFilter) {
      return false;
    }

    const matchesSearch = !searchQuery || (s && s.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesGroup = selectedGroupId === 'ALL' || p.groupId === selectedGroupId;
    const matchesMonth = !selectedMonth || p.periodMonth === selectedMonth;
    return matchesSearch && matchesGroup && matchesMonth;
  });

  const handleMarkAsPaid = async (paymentId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    await db.payments.update(paymentId, {
      status: 'PAID',
      paymentDate: todayStr,
    });
  };

  const handleToggleStatus = async (paymentId: string, currentStatus: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    await db.payments.update(paymentId, {
      status: newStatus,
      paymentDate: newStatus === 'PAID' ? todayStr : '',
    });
  };

  const handleDeletePayment = async (paymentId: string, studentName: string) => {
    if (confirm(`Ushbu "${studentName}" ga tegishli to'lov yozuvini o'chirmoqchimisiz?`)) {
      await db.payments.delete(paymentId);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            <span>To'lov Holatlari Nazorati</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            O'quvchilarning to'lov qilganligi (To'langan) yoki to'lashi kerakligi (QARZDOR) nazorati.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsPaymentModalOpen(true)}
        >
          To'lov Holatini Kiritish
        </Button>
      </div>

      {/* Control Bar: Filters */}
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Group Filter */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-300">Guruh:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-48"
            >
              <option value="ALL">Barcha Guruhlar</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Student Status Filter */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-300">O'quvchilar:</span>
            <select
              value={studentStatusFilter}
              onChange={(e) => setStudentStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="ACTIVE">Faqat Faol O'quvchilar</option>
              <option value="ARCHIVED">Arxivlanganlar</option>
              <option value="ALL">Barchasi</option>
            </select>
          </div>

          {/* Period Month */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-300">Oyi:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-56">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="O'quvchidan qidirish..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </Card>

      {/* Payment Status Sheet */}
      <Card className="space-y-3 p-4 bg-slate-900 border-slate-800 overflow-x-auto">
        {filteredPayments.length === 0 ? (
          <p className="text-xs text-slate-400 p-4 text-center">Ushbu oy va mezonlar uchun to'lov yozuvlari topilmadi.</p>
        ) : (
          <table className="w-full text-xs text-left text-slate-200 border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-3 border-r border-slate-800">O'quvchi Ismi</th>
                <th className="py-3 px-3 border-r border-slate-800">Guruh</th>
                <th className="py-3 px-3 border-r border-slate-800 text-center">To'lov Oyi</th>
                <th className="py-3 px-3 border-r border-slate-800 text-center">To'lov Holati</th>
                <th className="py-3 px-3 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-sans">
              {filteredPayments.map((p) => {
                const s = studentMap.get(p.studentId);
                const g = groupMap.get(p.groupId);
                const isUnpaid = p.status === 'UNPAID';
                const studentName = s?.fullName || "O'chirilgan o'quvchi";

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-slate-100 border-r border-slate-800/80">
                      <div className="flex items-center space-x-2">
                        <span>{studentName}</span>
                        {s?.status === 'ARCHIVED' && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-400 rounded">ARXIV</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-300 border-r border-slate-800/80 font-mono text-[11px]">
                      {g?.name || 'Guruh'}
                    </td>

                    <td className="py-3 px-3 text-center border-r border-slate-800/80 font-mono text-[11px] text-slate-400">
                      {p.periodMonth}
                    </td>

                    {/* Status Badge: To'langan vs QARZDOR Red */}
                    <td className="py-3 px-3 text-center border-r border-slate-800/80">
                      <button
                        onClick={() => handleToggleStatus(p.id, p.status)}
                        className="cursor-pointer"
                        title="Bosib holatni o'zgartirish"
                      >
                        {isUnpaid ? (
                          <span className="px-3 py-1 text-xs font-extrabold rounded bg-red-600 text-white inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> QARZDOR
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-bold rounded bg-emerald-600 text-white inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> To'langan
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {isUnpaid ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] py-1 border-emerald-800 text-emerald-400 hover:bg-emerald-950 font-bold"
                            onClick={() => handleMarkAsPaid(p.id)}
                          >
                            To'landi deb belgilash
                          </Button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold">Saqlangan</span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id, studentName)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer"
                          title="To'lov yozuvini o'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Payment Entry Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </div>
  );
};
