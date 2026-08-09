import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface AttendanceWeeklyGridProps {
  groupId: string;
}

export const AttendanceWeeklyGrid: React.FC<AttendanceWeeklyGridProps> = ({ groupId }) => {
  const group = useLiveQuery(() => db.groups.get(groupId), [groupId]);
  const memberships = useLiveQuery(
    () => db.groupStudents.where('groupId').equals(groupId).toArray(),
    [groupId]
  );
  const allStudents = useLiveQuery(() => db.students.toArray());
  const lessons = useLiveQuery(
    () => db.lessons.where('groupId').equals(groupId).toArray(),
    [groupId]
  );
  const allAttendance = useLiveQuery(() => db.attendance.toArray());

  if (!group || !memberships || !allStudents || !lessons || !allAttendance) {
    return <LoadingSpinner label="Generating weekly attendance matrix..." />;
  }

  const activeStudentIds = new Set(
    memberships.filter((m) => m.status === 'ACTIVE').map((m) => m.studentId)
  );
  const enrolledStudents = allStudents.filter((s) => activeStudentIds.has(s.id));

  // Map lesson IDs to lessons
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));

  return (
    <Card className="space-y-4 overflow-x-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">{group.name} — Weekly Matrix</h3>
          <p className="text-xs text-slate-400">Student attendance across conducted lesson sessions.</p>
        </div>
        <Badge variant="brand">{lessons.length} Total Lessons Recorded</Badge>
      </div>

      {enrolledStudents.length === 0 ? (
        <p className="text-xs text-slate-400">No active students in group.</p>
      ) : (
        <table className="w-full text-xs text-left text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase font-semibold">
            <tr>
              <th className="py-2.5 px-3">Student Name</th>
              {lessons.slice(-5).map((l) => (
                <th key={l.id} className="py-2.5 px-3 text-center">
                  <div>{l.date}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{l.status}</div>
                </th>
              ))}
              <th className="py-2.5 px-3 text-right">Attendance %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {enrolledStudents.map((student) => {
              const studentAttendanceRecords = allAttendance.filter(
                (a) => a.studentId === student.id && lessonMap.has(a.lessonId)
              );

              const totalSessions = studentAttendanceRecords.length;
              const presentSessions = studentAttendanceRecords.filter(
                (a) => a.status === 'PRESENT' || a.status === 'LATE'
              ).length;
              const percentage =
                totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 100;

              return (
                <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{student.fullName}</td>
                  {lessons.slice(-5).map((l) => {
                    const record = allAttendance.find(
                      (a) => a.studentId === student.id && a.lessonId === l.id
                    );

                    const statusBadge = record ? (
                      record.status === 'PRESENT' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold text-[10px]">
                          P
                        </span>
                      ) : record.status === 'ABSENT' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-bold text-[10px]">
                          A
                        </span>
                      ) : record.status === 'LATE' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold text-[10px]">
                          L
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/60 font-bold text-[10px]">
                          E
                        </span>
                      )
                    ) : (
                      <span className="text-slate-600 font-mono text-[10px]">—</span>
                    );

                    return (
                      <td key={l.id} className="py-2.5 px-3 text-center">
                        {statusBadge}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 text-right">
                    <Badge variant={percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'danger'}>
                      {percentage}%
                    </Badge>
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
