import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { AlertTriangle, TrendingUp, Users, CalendarCheck } from 'lucide-react';

interface AttendanceMonthlySummaryProps {
  groupId: string;
}

export const AttendanceMonthlySummary: React.FC<AttendanceMonthlySummaryProps> = ({ groupId }) => {
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
    return <LoadingSpinner label="Calculating monthly group attendance statistics..." />;
  }

  const activeStudentIds = new Set(
    memberships.filter((m) => m.status === 'ACTIVE').map((m) => m.studentId)
  );
  const enrolledStudents = allStudents.filter((s) => activeStudentIds.has(s.id));
  const lessonIds = new Set(lessons.map((l) => l.id));

  // Compute attendance stats per student
  const studentStats = enrolledStudents.map((student) => {
    const studentRecords = allAttendance.filter(
      (a) => a.studentId === student.id && lessonIds.has(a.lessonId)
    );

    const total = studentRecords.length;
    const present = studentRecords.filter((a) => a.status === 'PRESENT').length;
    const late = studentRecords.filter((a) => a.status === 'LATE').length;
    const absent = studentRecords.filter((a) => a.status === 'ABSENT').length;
    const excused = studentRecords.filter((a) => a.status === 'EXCUSED').length;

    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    return {
      student,
      total,
      present,
      late,
      absent,
      excused,
      rate,
    };
  });

  const overallAvgRate =
    studentStats.length > 0
      ? Math.round(studentStats.reduce((acc, s) => acc + s.rate, 0) / studentStats.length)
      : 100;

  const atRiskStudents = studentStats.filter((s) => s.rate < 75);

  return (
    <div className="space-y-6">
      {/* Monthly Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Group Average Presence</p>
            <h3 className="text-xl font-bold text-slate-900">{overallAvgRate}%</h3>
            <p className="text-[10px] text-emerald-600 font-medium">Target: &gt; 85%</p>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Lessons Held</p>
            <h3 className="text-xl font-bold text-slate-900">{lessons.length}</h3>
            <p className="text-[10px] text-slate-500">Lessons Completed</p>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Students At Risk (&lt;75%)</p>
            <h3 className="text-xl font-bold text-slate-900">{atRiskStudents.length}</h3>
            <p className="text-[10px] text-rose-600 font-medium">Needs Teacher Follow-up</p>
          </div>
        </Card>
      </div>

      {/* At-Risk Warning Box */}
      {atRiskStudents.length > 0 && (
        <Card className="bg-rose-50 border-rose-200 p-4 space-y-2">
          <div className="flex items-center space-x-2 text-rose-600 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Low Attendance Warning</span>
          </div>
          <p className="text-xs text-slate-600">
            The following students have attendance rates below 75% and may require parent contact:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {atRiskStudents.map((s) => (
              <Badge key={s.student.id} variant="danger">
                {s.student.fullName} ({s.rate}%)
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Student Attendance Breakdown Table */}
      <Card className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Student Attendance Distribution</h3>
        <div className="space-y-2">
          {studentStats.map((item) => (
            <div
              key={item.student.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800">{item.student.fullName}</h4>
                <p className="text-[11px] text-slate-500">
                  Present: <span className="text-emerald-600 font-semibold">{item.present}</span> • Late: <span className="text-amber-600 font-semibold">{item.late}</span> • Absent: <span className="text-rose-600 font-semibold">{item.absent}</span> • Excused: <span className="text-blue-600 font-semibold">{item.excused}</span>
                </p>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-48">
                <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.rate >= 80 ? 'bg-emerald-500' : item.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-800 w-10 text-right">{item.rate}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
