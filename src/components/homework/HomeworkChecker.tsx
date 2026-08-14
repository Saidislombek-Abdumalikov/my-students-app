import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { HomeworkSubmissionStatus } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { CheckCircle2, Save, Check } from 'lucide-react';

interface HomeworkCheckerProps {
  packageId: string;
}

export const HomeworkChecker: React.FC<HomeworkCheckerProps> = ({ packageId }) => {
  const pkg = useLiveQuery(() => db.homeworkPackages.get(packageId), [packageId]);
  const tasks = useLiveQuery(
    () => db.homeworkTasks.where('packageId').equals(packageId).toArray(),
    [packageId]
  );
  const memberships = useLiveQuery(
    async () => {
      if (!pkg) return [];
      return await db.groupStudents.where('groupId').equals(pkg.groupId).toArray();
    },
    [pkg?.groupId]
  );
  const allStudents = useLiveQuery(() => db.students.toArray());

  const existingSubmissions = useLiveQuery(
    async () => {
      if (!tasks || tasks.length === 0) return [];
      const taskIds = tasks.map((t) => t.id);
      return await db.homeworkSubmissions.where('taskId').anyOf(taskIds).toArray();
    },
    [tasks]
  );

  // Local state: studentId -> taskId -> { status, comment }
  const [submissionsState, setSubmissionsState] = useState<
    Record<string, Record<string, { status: HomeworkSubmissionStatus; comment: string }>>
  >({});

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!memberships || !allStudents || !tasks) return;

    const activeStudentIds = new Set(
      memberships.filter((m) => m.status === 'ACTIVE').map((m) => m.studentId)
    );

    const initialState: Record<
      string,
      Record<string, { status: HomeworkSubmissionStatus; comment: string }>
    > = {};

    activeStudentIds.forEach((sId) => {
      initialState[sId] = {};
      tasks.forEach((t) => {
        const sub = existingSubmissions?.find(
          (s) => s.studentId === sId && s.taskId === t.id
        );
        initialState[sId][t.id] = {
          status: sub ? sub.status : 'NOT_CHECKED',
          comment: sub?.comment || '',
        };
      });
    });

    setSubmissionsState(initialState);
  }, [memberships, allStudents, tasks, existingSubmissions]);

  if (!pkg || !tasks || !memberships || !allStudents) {
    return <LoadingSpinner label="Loading homework checking matrix..." />;
  }

  const activeStudentIds = new Set(
    memberships.filter((m) => m.status === 'ACTIVE').map((m) => m.studentId)
  );
  const enrolledStudents = allStudents.filter((s) => activeStudentIds.has(s.id));

  const setTaskStatus = (
    studentId: string,
    taskId: string,
    status: HomeworkSubmissionStatus
  ) => {
    setSubmissionsState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [taskId]: {
          ...prev[studentId]?.[taskId],
          status,
        },
      },
    }));
    setIsSaved(false);
  };

  const setTaskComment = (studentId: string, taskId: string, comment: string) => {
    setSubmissionsState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [taskId]: {
          ...prev[studentId]?.[taskId],
          comment,
        },
      },
    }));
    setIsSaved(false);
  };

  const handleSaveSubmissions = async () => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const entriesToSave: any[] = [];

      Object.entries(submissionsState).forEach(([studentId, taskMap]) => {
        Object.entries(taskMap).forEach(([taskId, data]) => {
          entriesToSave.push({
            id: `sub-${taskId}-${studentId}`,
            taskId,
            studentId,
            status: data.status,
            comment: data.comment,
            updatedAt: now,
          });
        });
      });

      await db.homeworkSubmissions.bulkPut(entriesToSave);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving homework submissions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Package Header Bar */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">{pkg.title}</h3>
            <Badge variant="brand" size="sm">{tasks.length} Tasks Package</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deadline: <span className="text-amber-600 font-semibold">{pkg.deadline}</span> • {pkg.description}
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          isLoading={isSaving}
          leftIcon={isSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
          onClick={handleSaveSubmissions}
        >
          {isSaved ? 'Homework Saved!' : 'Save All Homework Checks'}
        </Button>
      </Card>

      {/* Task Summary Badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        {tasks.map((t, i) => (
          <span key={t.id} className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
            <strong className="text-emerald-600">#{i + 1} [{t.taskType}]</strong>: {t.title}
          </span>
        ))}
      </div>

      {/* Granular Checking Matrix */}
      {enrolledStudents.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <p className="text-xs">No active students in group.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrolledStudents.map((student) => {
            const studentTasks = submissionsState[student.id] || {};

            return (
              <Card key={student.id} className="space-y-3 p-4 bg-white border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-sm font-bold text-slate-900">{student.fullName}</h4>
                  <span className="text-xs text-slate-500">{student.phone}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tasks.map((t, idx) => {
                    const taskData = studentTasks[t.id] || { status: 'NOT_CHECKED', comment: '' };

                    const statuses: { status: HomeworkSubmissionStatus; label: string; class: string }[] = [
                      { status: 'COMPLETED', label: 'Done', class: 'bg-emerald-600 text-white' },
                      { status: 'MISSING', label: 'Missing', class: 'bg-rose-600 text-white' },
                      { status: 'LATE', label: 'Late', class: 'bg-amber-600 text-white' },
                      { status: 'PARTIAL', label: 'Partial', class: 'bg-sky-600 text-white' },
                    ];

                    return (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">
                            Task #{idx + 1}: {t.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">[{t.taskType}]</span>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center space-x-1">
                          {statuses.map((s) => (
                            <button
                              key={s.status}
                              type="button"
                              onClick={() => setTaskStatus(student.id, t.id, s.status)}
                              className={`flex-1 py-1 px-1.5 text-[11px] font-bold rounded transition-all cursor-pointer ${
                                taskData.status === s.status
                                  ? s.class
                                  : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>

                        {/* Teacher Feedback Comment */}
                        <input
                          type="text"
                          value={taskData.comment}
                          onChange={(e) => setTaskComment(student.id, t.id, e.target.value)}
                          placeholder="Teacher feedback comment..."
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-900 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
