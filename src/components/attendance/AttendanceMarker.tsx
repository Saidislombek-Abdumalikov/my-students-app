import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { AttendanceStatus } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { CheckCircle2, XCircle, Clock, Info, Check, Save } from 'lucide-react';

interface AttendanceMarkerProps {
  groupId: string;
  dateStr: string; // YYYY-MM-DD
}

export const AttendanceMarker: React.FC<AttendanceMarkerProps> = ({
  groupId,
  dateStr,
}) => {
  const group = useLiveQuery(() => db.groups.get(groupId), [groupId]);
  const memberships = useLiveQuery(
    () => db.groupStudents.where('groupId').equals(groupId).toArray(),
    [groupId]
  );
  const allStudents = useLiveQuery(() => db.students.toArray());

  // Find or create lesson for this group + date
  const lesson = useLiveQuery(
    async () => {
      const existing = await db.lessons
        .where('[groupId+date]')
        .equals([groupId, dateStr])
        .first();
      return existing;
    },
    [groupId, dateStr]
  );

  const existingAttendance = useLiveQuery(
    async () => {
      if (!lesson) return [];
      return await db.attendance.where('lessonId').equals(lesson.id).toArray();
    },
    [lesson?.id]
  );

  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: AttendanceStatus; note: string }>
  >({});

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize attendance state when data loads
  useEffect(() => {
    if (!memberships || !allStudents) return;

    const activeStudentIds = new Set(
      memberships.filter((m) => m.status === 'ACTIVE').map((m) => m.studentId)
    );

    const initialState: Record<string, { status: AttendanceStatus; note: string }> = {};

    activeStudentIds.forEach((sId) => {
      const record = existingAttendance?.find((a) => a.studentId === sId);
      initialState[sId] = {
        status: record ? record.status : 'PRESENT',
        note: record?.note || '',
      };
    });

    setAttendanceState(initialState);
  }, [memberships, allStudents, existingAttendance]);

  if (!group || !memberships || !allStudents) {
    return <LoadingSpinner label="Loading group attendance sheet..." />;
  }

  const activeStudentIds = new Set(
    memberships.filter((m) => m.status === 'ACTIVE').map((m) => m.studentId)
  );
  const enrolledStudents = allStudents.filter((s) => activeStudentIds.has(s.id));

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
    setIsSaved(false);
  };

  const setNote = (studentId: string, note: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], note },
    }));
    setIsSaved(false);
  };

  const markAll = (status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sId) => {
        next[sId] = { ...next[sId], status };
      });
      return next;
    });
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let targetLessonId = lesson?.id;

      // Create lesson if it doesn't exist yet for this date
      if (!targetLessonId) {
        targetLessonId = `l-${Date.now()}`;
        await db.lessons.add({
          id: targetLessonId,
          groupId,
          date: dateStr,
          title: `Lesson — ${group.name}`,
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
        });
      }

      // Bulk update/add attendance records
      const attendanceEntries = Object.entries(attendanceState).map(
        ([studentId, data]) => ({
          id: `att-${targetLessonId}-${studentId}`,
          lessonId: targetLessonId!,
          studentId,
          status: data.status,
          note: data.note,
          updatedAt: new Date().toISOString(),
        })
      );

      await db.attendance.bulkPut(attendanceEntries);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving attendance:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Stats calculation
  const totalCount = enrolledStudents.length;
  const presentCount = Object.values(attendanceState).filter((a) => a.status === 'PRESENT').length;
  const absentCount = Object.values(attendanceState).filter((a) => a.status === 'ABSENT').length;
  const lateCount = Object.values(attendanceState).filter((a) => a.status === 'LATE').length;
  const excusedCount = Object.values(attendanceState).filter((a) => a.status === 'EXCUSED').length;

  return (
    <div className="space-y-4">
      {/* Attendance Header & Quick Actions */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">{group.name}</h3>
            <Badge variant="info" size="sm">{group.courseSubject}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Attendance Sheet for <span className="text-emerald-600 font-semibold">{dateStr}</span> ({totalCount} Enrolled)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-emerald-600 hover:bg-emerald-50"
            onClick={() => markAll('PRESENT')}
          >
            Mark All Present
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-rose-600 hover:bg-rose-50"
            onClick={() => markAll('ABSENT')}
          >
            Mark All Absent
          </Button>
          <Button
            size="sm"
            variant="primary"
            isLoading={isSaving}
            leftIcon={isSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
            onClick={handleSave}
          >
            {isSaved ? 'Attendance Saved!' : 'Save Attendance'}
          </Button>
        </div>
      </Card>

      {/* Metric Breakdown Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Present
          </span>
          <span className="text-sm font-bold text-emerald-700">{presentCount}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
          <span className="text-rose-700 font-semibold flex items-center gap-1.5">
            <XCircle className="w-4 h-4" /> Absent
          </span>
          <span className="text-sm font-bold text-rose-700">{absentCount}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <span className="text-amber-700 font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Late
          </span>
          <span className="text-sm font-bold text-amber-700">{lateCount}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
          <span className="text-blue-700 font-semibold flex items-center gap-1.5">
            <Info className="w-4 h-4" /> Excused
          </span>
          <span className="text-sm font-bold text-blue-700">{excusedCount}</span>
        </div>
      </div>

      {/* Student List Sheet */}
      {enrolledStudents.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <p className="text-xs">No active students enrolled in this group.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {enrolledStudents.map((student) => {
            const currentData = attendanceState[student.id] || { status: 'PRESENT', note: '' };

            const statusButtons: { status: AttendanceStatus; label: string; activeClass: string }[] = [
              { status: 'PRESENT', label: 'Present', activeClass: 'bg-emerald-600 text-white shadow-emerald-100' },
              { status: 'ABSENT', label: 'Absent', activeClass: 'bg-rose-600 text-white shadow-rose-100' },
              { status: 'LATE', label: 'Late', activeClass: 'bg-amber-600 text-white shadow-amber-100' },
              { status: 'EXCUSED', label: 'Excused', activeClass: 'bg-sky-600 text-white shadow-sky-100' },
            ];

            return (
              <Card
                key={student.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5"
              >
                <div className="space-y-0.5 min-w-48">
                  <h4 className="text-sm font-bold text-slate-900">{student.fullName}</h4>
                  <p className="text-xs text-slate-500">{student.phone}</p>
                </div>

                {/* Status Toggle Button Group */}
                <div className="flex items-center space-x-1.5 w-full sm:w-auto">
                  {statusButtons.map((b) => (
                    <button
                      key={b.status}
                      type="button"
                      onClick={() => setStatus(student.id, b.status)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        currentData.status === b.status
                          ? `${b.activeClass} shadow-md scale-[1.02]`
                          : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                {/* Optional Note Field */}
                <div className="w-full sm:w-48">
                  <input
                    type="text"
                    value={currentData.note}
                    onChange={(e) => setNote(student.id, e.target.value)}
                    placeholder="Add note (e.g. 10m late)"
                    className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
