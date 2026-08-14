import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { PaymentModal } from '../components/payments/PaymentModal';
import { CreditCard, AlertCircle, CheckCircle2, Plus, Search, Trash2, Layers, LogOut, RefreshCw } from 'lucide-react';
import { getFocusedGroupId, clearFocusedGroupId, getSelectedGroupId, setSelectedGroupIdMemory } from '../utils/workspaceContext';
import { syncCollectionToCloud } from '../services/firebase';
import { Payment } from '../types';

import { useAuth } from '../context/AuthContext';

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const payments = useLiveQuery(() => db.payments.toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const rawGroups = useLiveQuery(() => db.groups.toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());

  const groups = rawGroups?.filter((g) => {
    if (user?.role === 'ADMIN') return true;
    return g.teacherId === user?.id || (!g.teacherId && user?.id === 't-1');
  });

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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
    const rememberedId = getSelectedGroupId();
    if (focusId && groups.some((g) => g.id === focusId)) {
      setSelectedGroupId(focusId);
    } else if (rememberedId && groups.some((g) => g.id === rememberedId)) {
      setSelectedGroupId(rememberedId);
    } else if (selectedGroupId === '') {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  if (!payments || !students || !groups || !memberships) {
    return <LoadingSpinner label="To'lovlar sahifasi yuklanmoqda..." />;
  }

  const selectedGroupObj = groups.find((g) => g.id === selectedGroupId);
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  // Generate Group Payment Rows (Ensuring EVERY student in selected group is listed as UNPAID by default)
  let displayPayments: Payment[] = [];

  if (selectedGroupId !== 'ALL') {
    const groupActiveStudentIds = memberships
      .filter((m) => m.groupId === selectedGroupId && m.status === 'ACTIVE')
      .map((m) => m.studentId);

    const existingPaymentMap = new Map(
      payments
        .filter((p) => p.groupId === selectedGroupId && p.periodMonth === selectedMonth)
        .map((p) => [p.studentId, p])
    );

    displayPayments = groupActiveStudentIds.map((sId) => {
      const existing = existingPaymentMap.get(sId);
      if (existing) return existing;

      // Default UNPAID row for group members without payment entries yet
      return {
        id: `virtual-p-${selectedGroupId}-${sId}-${selectedMonth}`,
        studentId: sId,
        groupId: selectedGroupId,
        amount: 0,
        paymentDate: '',
        periodMonth: selectedMonth,
        paymentMethod: 'CASH',
        status: 'UNPAID',
        createdAt: new Date().toISOString(),
      };
    });
  } else {
    displayPayments = payments.filter((p) => p.periodMonth === selectedMonth);
  }

  // Filter display rows by search and status
  const filteredPayments = displayPayments.filter((p) => {
    const s = studentMap.get(p.studentId);
    if (!s && studentStatusFilter !== 'ALL') return false;
    if (studentStatusFilter !== 'ALL' && s && s.status !== studentStatusFilter) return false;
    const matchesSearch = !searchQuery || (s && s.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleLeaveWorkspace = () => {
    clearFocusedGroupId();
    setFocusedGroupIdState(null);
  };

  const handleMarkAsPaid = async (payment: Payment) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const realId = payment.id.startsWith('virtual-') ? `p-${Date.now()}-${payment.studentId}` : payment.id;
    
    await db.payments.put({
      id: realId,
      studentId: payment.studentId,
      groupId: payment.groupId,
      amount: 0,
      paymentDate: todayStr,
      periodMonth: payment.periodMonth,
      paymentMethod: 'CASH',
      status: 'PAID',
      createdAt: new Date().toISOString(),
    });

    const allPayments = await db.payments.toArray();
    syncCollectionToCloud('payments', allPayments).catch(console.error);
  };

  const handleToggleStatus = async (payment: Payment) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newStatus = payment.status === 'PAID' ? 'UNPAID' : 'PAID';
    const realId = payment.id.startsWith('virtual-') ? `p-${Date.now()}-${payment.studentId}` : payment.id;

    await db.payments.put({
      id: realId,
      studentId: payment.studentId,
      groupId: payment.groupId,
      amount: 0,
      paymentDate: newStatus === 'PAID' ? todayStr : '',
      periodMonth: payment.periodMonth,
      paymentMethod: 'CASH',
      status: newStatus,
      createdAt: new Date().toISOString(),
    });

    const allPayments = await db.payments.toArray();
    syncCollectionToCloud('payments', allPayments).catch(console.error);
  };

  const handleDeletePayment = async (paymentId: string, studentName: string) => {
    if (paymentId.startsWith('virtual-')) return;
    if (confirm(`Ushbu "${studentName}" ga tegishli to'lov yozuvini o'chirmoqchimisiz?`)) {
      await db.payments.delete(paymentId);
      const allPayments = await db.payments.toArray();
      syncCollectionToCloud('payments', allPayments).catch(console.error);
    }
  };

  const handleClearAllRawHomeworkData = async () => {
    if (confirm("BARCHA eski uy vazifalar va ularga tegishli foizli ma'lumotlarni tozalashni tasdiqlaysizmi?")) {
      await db.homeworkPackages.clear();
      await db.homeworkSubmissions.clear();
      alert("Barcha eski vazifalar va foizlar muvaffaqiyatli tozalandi!");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            <span>To'lov Holatlari Nazorati</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Guruhni tanlang. Guruhdagi barcha o'quvchilar avtomatik QARZDOR deb chiqariladi, to'laganlarni "To'landi" deb belgilashingiz mumkin.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={handleClearAllRawHomeworkData}
          >
            Eski Vazifalarni Tozalash
          </Button>

          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsPaymentModalOpen(true)}
          >
            To'lov Holatini Kiritish
          </Button>
        </div>
      </div>

      {/* FOCUSED WORKSPACE BANNER */}
      {focusedGroupId && selectedGroupObj && (
        <Card className="p-4 bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-emerald-700">
            <Layers className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <div>
              <span className="font-bold text-sm">Hozirda '{selectedGroupObj.name}' guruh ishchi xonasidasiz</span>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                Ushbu guruh bilan ishlamoqdasiz. Boshqa guruhga o'tish uchun guruh ishchi xonasidan chiqishingiz mumkin.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-600" />} onClick={handleLeaveWorkspace} className="whitespace-nowrap">
            Guruh ishchi xonasidan chiqish
          </Button>
        </Card>
      )}

      {/* Control Bar: Filters */}
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Group Filter */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600">Guruh:</span>
            <select
              disabled={!!focusedGroupId}
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSelectedGroupIdMemory(e.target.value);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-56 disabled:opacity-80"
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
            <span className="text-xs font-semibold text-slate-600">O'quvchilar:</span>
            <select
              value={studentStatusFilter}
              onChange={(e) => setStudentStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="ACTIVE">Faqat Faol O'quvchilar</option>
              <option value="ALL">Barchasi</option>
            </select>
          </div>

          {/* Period Month */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600">Oyi:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
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
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </Card>

      {/* Payment Status Sheet */}
      <Card className="space-y-3 p-4 bg-white border-slate-200 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {selectedGroupObj ? selectedGroupObj.name : 'Barcha Guruhlar'} — {selectedMonth} Oyi To'lov Jadvali
          </h3>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-600 text-white">
            {filteredPayments.length} Ta O'quvchi Ro'yxatda
          </span>
        </div>

        {filteredPayments.length === 0 ? (
          <p className="text-xs text-slate-500 p-4 text-center">Ushbu oy va mezonlar uchun o'quvchilar topilmadi.</p>
        ) : (
          <table className="w-full text-xs text-left text-slate-800 border-collapse">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-3 border-r border-slate-200">O'quvchi Ismi</th>
                <th className="py-3 px-3 border-r border-slate-200">Guruh</th>
                <th className="py-3 px-3 border-r border-slate-200 text-center">To'lov Oyi</th>
                <th className="py-3 px-3 border-r border-slate-200 text-center">To'lov Holati</th>
                <th className="py-3 px-3 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredPayments.map((p) => {
                const s = studentMap.get(p.studentId);
                const g = groupMap.get(p.groupId);
                const isUnpaid = p.status === 'UNPAID';
                const studentName = s?.fullName || "O'chirilgan o'quvchi";

                return (
                  <tr key={p.id} className="hover:bg-slate-100">
                    <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-200">
                      <span>{studentName}</span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 border-r border-slate-200 font-mono text-[11px]">
                      {g?.name || 'Guruh'}
                    </td>

                    <td className="py-3 px-3 text-center border-r border-slate-200 font-mono text-[11px] text-slate-500">
                      {p.periodMonth}
                    </td>

                    {/* Status Badge: To'langan vs QARZDOR Red */}
                    <td className="py-3 px-3 text-center border-r border-slate-200">
                      <button
                        onClick={() => handleToggleStatus(p)}
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
                            className="text-[11px] py-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold"
                            onClick={() => handleMarkAsPaid(p)}
                          >
                            To'landi deb belgilash
                          </Button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold">Saqlangan</span>
                        )}

                        {!p.id.startsWith('virtual-') && (
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.id, studentName)}
                            className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
                            title="To'lov yozuvini o'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
