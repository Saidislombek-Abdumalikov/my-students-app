import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { AlertCircle, CheckCircle2, Phone } from 'lucide-react';

interface OverdueStudentsListProps {
  onMarkPaidClick: (studentId: string, groupId: string) => void;
}

export const OverdueStudentsList: React.FC<OverdueStudentsListProps> = ({ onMarkPaidClick }) => {
  const payments = useLiveQuery(() => db.payments.toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const groups = useLiveQuery(() => db.groups.toArray());

  if (!payments || !students || !groups) return null;

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const unpaidRecords = payments.filter((p) => p.status === 'UNPAID' || p.status === 'PARTIAL');

  const handleQuickMarkPaid = async (paymentId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    await db.payments.update(paymentId, {
      status: 'PAID',
      paymentDate: todayStr,
    });
  };

  return (
    <Card className="bg-rose-50 border-rose-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <h3 className="text-sm font-bold text-rose-900">
            Overdue Tuition Balances ({unpaidRecords.length})
          </h3>
        </div>
        <Badge variant="danger">{unpaidRecords.length} Unpaid</Badge>
      </div>

      {unpaidRecords.length === 0 ? (
        <p className="text-xs text-slate-500">All students have cleared their monthly tuition payments!</p>
      ) : (
        <div className="space-y-2">
          {unpaidRecords.map((pay) => {
            const student = studentMap.get(pay.studentId);
            const group = groupMap.get(pay.groupId);

            if (!student) return null;

            return (
              <div
                key={pay.id}
                className="bg-white p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-rose-200 shadow-sm"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-slate-900">{student.fullName}</h4>
                    <span className="text-[10px] text-slate-500">({group?.name || 'Class'})</span>
                  </div>
                  <p className="text-xs text-rose-700 font-semibold">
                    Balance: {pay.amount.toLocaleString()} UZS • Period: {pay.periodMonth}
                  </p>
                  <p className="text-[11px] text-slate-600 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Parent: {student.parentName} ({student.parentPhone})</span>
                  </p>
                  {pay.notes && <p className="text-[10px] text-amber-700 italic">Note: {pay.notes}</p>}
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <Button
                    size="sm"
                    variant="success"
                    className="text-xs py-1 px-2.5"
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => handleQuickMarkPaid(pay.id)}
                  >
                    Quick Mark Paid
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
