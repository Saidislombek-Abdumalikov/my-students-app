import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  CalendarCheck,
  CreditCard,
  GraduationCap,
  FileCheck,
  FileSpreadsheet,
  Clock
} from 'lucide-react';

interface StudentTimelineProps {
  studentId: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  type: 'ENROLLMENT' | 'ATTENDANCE' | 'HOMEWORK' | 'TEST' | 'PAYMENT';
  title: string;
  description: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral';
  badgeLabel: string;
  icon: React.ReactNode;
}

export const StudentTimeline: React.FC<StudentTimelineProps> = ({ studentId }) => {
  const student = useLiveQuery(() => db.students.get(studentId), [studentId]);
  const attendanceList = useLiveQuery(() => db.attendance.where('studentId').equals(studentId).toArray(), [studentId]);
  const paymentList = useLiveQuery(() => db.payments.where('studentId').equals(studentId).toArray(), [studentId]);
  const testResultList = useLiveQuery(() => db.testResults.where('studentId').equals(studentId).toArray(), [studentId]);

  if (!student || !attendanceList || !paymentList || !testResultList) {
    return <LoadingSpinner label="Loading student timeline history..." />;
  }

  const events: TimelineEvent[] = [];

  // 1. Enrollment Event
  events.push({
    id: `ev-enroll-${student.id}`,
    date: student.enrollmentDate,
    type: 'ENROLLMENT',
    title: 'Student Enrolled',
    description: `Registered student ${student.fullName} into center database.`,
    badgeVariant: 'brand',
    badgeLabel: 'Enrollment',
    icon: <GraduationCap className="w-4 h-4 text-brand-400" />
  });

  // 2. Attendance Events
  attendanceList.forEach(att => {
    const statusVariants = {
      PRESENT: 'success',
      ABSENT: 'danger',
      LATE: 'warning',
      EXCUSED: 'info'
    } as const;

    events.push({
      id: `ev-att-${att.id}`,
      date: att.updatedAt.split('T')[0],
      type: 'ATTENDANCE',
      title: `Attendance Marked: ${att.status}`,
      description: att.note ? `Note: ${att.note}` : 'Class attendance recorded.',
      badgeVariant: statusVariants[att.status] || 'neutral',
      badgeLabel: att.status,
      icon: <CalendarCheck className="w-4 h-4 text-sky-400" />
    });
  });

  // 3. Payment Events
  paymentList.forEach(pay => {
    events.push({
      id: `ev-pay-${pay.id}`,
      date: pay.paymentDate || pay.createdAt.split('T')[0],
      type: 'PAYMENT',
      title: `Payment: ${pay.amount.toLocaleString()} UZS (${pay.status})`,
      description: `Period: ${pay.periodMonth} • Method: ${pay.paymentMethod}`,
      badgeVariant: pay.status === 'PAID' ? 'success' : 'warning',
      badgeLabel: pay.status,
      icon: <CreditCard className="w-4 h-4 text-emerald-400" />
    });
  });

  // Sort events chronologically descending (newest first)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
        <Clock className="w-4 h-4 text-brand-400" />
        <span>Chronological Activity Timeline</span>
      </h3>

      {events.length === 0 ? (
        <p className="text-xs text-slate-400">No activity recorded yet for this student.</p>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {events.map((ev) => (
            <div key={ev.id} className="relative flex items-start space-x-3 group">
              {/* Dot Icon */}
              <div className="absolute -left-6 top-0.5 p-1 rounded-full bg-slate-900 border border-slate-700 shadow-md">
                {ev.icon}
              </div>

              {/* Event Content Box */}
              <div className="flex-1 glass-panel p-3.5 rounded-xl border border-slate-800 space-y-1 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{ev.title}</span>
                  <Badge variant={ev.badgeVariant} size="sm">{ev.badgeLabel}</Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{ev.description}</p>
                <p className="text-[10px] text-slate-400 font-mono pt-1">{ev.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
