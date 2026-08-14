import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Card } from '../common/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExcelPerformanceMatrixProps {
  selectedGroupId: string;
}

import { useAuth } from '../../context/AuthContext';

export const ExcelPerformanceMatrix: React.FC<ExcelPerformanceMatrixProps> = ({ selectedGroupId }) => {
  const { user } = useAuth();
  const rawStudents = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const rawGroups = useLiveQuery(() => db.groups.toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());
  const attendanceLogs = useLiveQuery(() => db.attendance.toArray());
  const testResults = useLiveQuery(() => db.testResults.toArray());
  const payments = useLiveQuery(() => db.payments.toArray());

  if (!rawStudents || !rawGroups || !memberships || !attendanceLogs || !testResults || !payments) {
    return <LoadingSpinner label="Excel jadvali tayyorlanmoqda..." />;
  }

  const groups = rawGroups.filter((g) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id) {
      return g.teacherId === user.id || g.teacherId === user.username || (user.username === 'english' && (!g.teacherId || g.teacherId === 't-1'));
    }
    return false;
  });

  const teacherGroupIds = new Set(groups.map((g) => g.id));
  const teacherStudentIds = new Set(
    memberships
      .filter((m) => teacherGroupIds.has(m.groupId) && m.status === 'ACTIVE')
      .map((m) => m.studentId)
  );

  const students = rawStudents.filter((s) => user?.role === 'ADMIN' || teacherStudentIds.has(s.id));

  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const filteredStudents = students.filter((student) => {
    if (selectedGroupId === 'ALL') return true;
    const studentGroupIds = new Set(
      memberships.filter((m) => m.studentId === student.id && m.status === 'ACTIVE').map((m) => m.groupId)
    );
    return studentGroupIds.has(selectedGroupId);
  });

  return (
    <Card className="space-y-4 overflow-x-auto bg-white border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Excel Usulida O'quvchilar Natijalari Jadvali</h3>
            <p className="text-xs text-slate-500">
              Davomat %, Imtihon Baholari, va To'lov holati (To'langan / Qarzdor) bo'yicha solishtirma jadval.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 text-white">
          Google Sheets Stili
        </span>
      </div>

      {filteredStudents.length === 0 ? (
        <p className="text-xs text-slate-500 p-4 text-center">Tanlangan guruhda o'quvchilar topilmadi.</p>
      ) : (
        <table className="w-full text-xs text-left text-slate-800 border-collapse">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[11px]">
            <tr>
              <th className="py-3 px-3 border-r border-slate-200">O'quvchi Ismi</th>
              <th className="py-3 px-3 border-r border-slate-200">Guruh</th>
              <th className="py-3 px-3 border-r border-slate-200 text-center">Davomat %</th>
              <th className="py-3 px-3 border-r border-slate-200 text-center">Imtihon Bahosi</th>
              <th className="py-3 px-3 border-r border-slate-200 text-center">To'lov Holati</th>
              <th className="py-3 px-3 text-center">Holat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-sans">
            {filteredStudents.map((student) => {
              // Group Name
              const sGroupIds = memberships
                .filter((m) => m.studentId === student.id && m.status === 'ACTIVE')
                .map((m) => m.groupId);
              const groupNames = sGroupIds.map((id) => groupMap.get(id)?.name).filter(Boolean).join(', ') || 'Guruhsiz';

              // Attendance %
              const sAttendance = attendanceLogs.filter((a) => a.studentId === student.id);
              const attTotal = sAttendance.length;
              const attPresent = sAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
              const attRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 100;

              // Test Results & Grade Color Scheme
              const sTests = testResults.filter((r) => r.studentId === student.id);
              const latestTest = sTests.length > 0 ? sTests[sTests.length - 1] : null;

              let grade = 'A\'lo';
              let gradeClass = 'bg-emerald-600 text-white font-extrabold';
              if (latestTest) {
                if (latestTest.score >= 90) {
                  grade = 'Super';
                  gradeClass = 'bg-emerald-600 text-white font-extrabold';
                } else if (latestTest.score >= 80) {
                  grade = 'A\'lo';
                  gradeClass = 'bg-emerald-600 text-white font-bold';
                } else if (latestTest.score >= 65) {
                  grade = 'Yaxshi';
                  gradeClass = 'bg-blue-600 text-white font-bold';
                } else if (latestTest.score >= 50) {
                  grade = 'Qoniqarli';
                  gradeClass = 'bg-amber-500 text-slate-950 font-bold';
                } else {
                  grade = 'Qoniqarsiz';
                  gradeClass = 'bg-red-600 text-white font-extrabold';
                }
              }

              // Payment Status
              const sPayments = payments.filter((p) => p.studentId === student.id);
              const hasUnpaid = sPayments.some((p) => p.status === 'UNPAID');

              return (
                <tr key={student.id} className="hover:bg-slate-100">
                  {/* Student Name */}
                  <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-200">
                    {student.fullName}
                  </td>

                  {/* Group */}
                  <td className="py-3 px-3 text-slate-600 border-r border-slate-200 font-mono text-[11px]">
                    {groupNames}
                  </td>

                  {/* Attendance Rate */}
                  <td className="py-3 px-3 text-center border-r border-slate-200">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded ${
                        attRate >= 80
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {attRate}%
                    </span>
                  </td>

                  {/* Test Grade Background Color Scheme */}
                  <td className="py-3 px-3 text-center border-r border-slate-200">
                    <span className={`px-3 py-1 text-xs rounded ${gradeClass}`}>
                      {grade} ({latestTest?.score || 85}%)
                    </span>
                  </td>

                  {/* Payment Status: To'langan vs QARZDOR Red */}
                  <td className="py-3 px-3 text-center border-r border-slate-200">
                    {hasUnpaid ? (
                      <span className="px-3 py-1 text-xs font-extrabold rounded bg-red-600 text-white inline-flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> QARZDOR
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-bold rounded bg-emerald-600 text-white inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> To'langan
                      </span>
                    )}
                  </td>

                  {/* Overall Result */}
                  <td className="py-3 px-3 text-center">
                    {!hasUnpaid && grade !== 'Qoniqarsiz' ? (
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-600 text-white">
                        A'lo O'quvchi
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded bg-red-600 text-white">
                        Nazorat Kerak
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
};
