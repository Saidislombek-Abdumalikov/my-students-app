import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { GroupModal } from '../components/groups/GroupModal';
import { AddStudentToGroupModal } from '../components/groups/AddStudentToGroupModal';
import { StudentModal } from '../components/students/StudentModal';
import {
  Users,
  ArrowLeft,
  Calendar,
  UserPlus,
  Edit,
  Trash2,
  BookOpenCheck,
  GraduationCap,
  ChevronRight
} from 'lucide-react';
import { getFocusedGroupId, clearFocusedGroupId } from '../utils/workspaceContext';

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const group = useLiveQuery(() => (id ? db.groups.get(id) : undefined), [id]);
  const memberships = useLiveQuery(() => (id ? db.groupStudents.where('groupId').equals(id).toArray() : []), [id]);
  const allStudents = useLiveQuery(() => db.students.toArray());

  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isRegisterStudentOpen, setIsRegisterStudentOpen] = useState(false);

  if (!group || !memberships || !allStudents) {
    return <LoadingSpinner label="Loading class group details..." />;
  }

  // Filter students who are active members of this group
  const activeStudentIds = new Set(
    memberships.filter(m => m.status === 'ACTIVE').map(m => m.studentId)
  );

  const enrolledStudents = allStudents.filter(s => activeStudentIds.has(s.id));

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (confirm(`Remove ${studentName} from this group? Historical records will remain intact.`)) {
      const membership = memberships.find(m => m.studentId === studentId && m.status === 'ACTIVE');
      if (membership) {
        await db.groupStudents.update(membership.id, { status: 'LEFT' });
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (confirm(`Ushbu "${group.name}" guruhini BUTUNLAY O'CHIRIB tashlamoqchimisiz? Qayta tiklab bo'lmaydi.`)) {
      await db.groups.delete(group.id);
      await db.groupStudents.where('groupId').equals(group.id).delete();
      if (getFocusedGroupId() === group.id) {
        clearFocusedGroupId();
      }
      alert(`"${group.name}" guruhi muvaffaqiyatli o'chirildi!`);
      navigate('/groups');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/groups')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
              <Badge variant="success" dot>
                FAOL
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {group.courseSubject} • Level: {group.level}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Edit className="w-4 h-4" />}
            onClick={() => setIsEditGroupOpen(true)}
          >
            Tahrirlash
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:text-rose-600"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={handleDeleteGroup}
          >
            O'chirish
          </Button>
        </div>
      </div>

      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">Schedule</p>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>{group.scheduleDescription}</span>
          </p>
          <p className="text-[11px] text-slate-500 font-mono">Started: {group.startDate}</p>
        </Card>

        <Card className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">Enrolled Students</p>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>{enrolledStudents.length} Active Members</span>
          </p>
          <p className="text-[11px] text-slate-500">Class capacity target: 12</p>
        </Card>

        <Card className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">Quick Workspace</p>
          <Link to="/workspace">
            <Button size="sm" variant="primary" className="mt-1 w-full justify-center" leftIcon={<BookOpenCheck className="w-4 h-4" />}>
              Open Group Workspace
            </Button>
          </Link>
        </Card>
      </div>

      {/* Teacher Notes */}
      {group.notes && (
        <Card className="bg-slate-50 border-slate-200 p-4">
          <h4 className="text-xs font-bold text-slate-600 mb-1">Group Notes & Exam Targets</h4>
          <p className="text-xs text-slate-500 leading-relaxed">{group.notes}</p>
        </Card>
      )}

      {/* Enrolled Students Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            <span>Enrolled Students ({enrolledStudents.length})</span>
          </h2>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsAddStudentOpen(true)}
            >
              Enroll Existing Student
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsRegisterStudentOpen(true)}
            >
              Register & Add New
            </Button>
          </div>
        </div>

        {enrolledStudents.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <p className="text-xs">No students currently enrolled in this group.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrolledStudents.map((student) => (
              <Card key={student.id} hoverable className="flex items-center justify-between">
                <Link to={`/students/${student.id}`} className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors">
                      {student.fullName}
                    </h3>
                    <Badge variant="success" size="sm">{student.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{student.phone}</p>
                  <p className="text-[11px] text-slate-500">Parent: {student.parentName} ({student.parentPhone})</p>
                </Link>

                <div className="flex items-center space-x-2">
                  <Link to={`/students/${student.id}`}>
                    <Button variant="ghost" size="sm" className="p-1.5 text-slate-500 hover:text-slate-900">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1.5 text-rose-600 hover:text-rose-600"
                    title="Remove from group"
                    onClick={() => handleRemoveStudent(student.id, student.fullName)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <GroupModal
        isOpen={isEditGroupOpen}
        onClose={() => setIsEditGroupOpen(false)}
        groupToEdit={group}
      />
      <AddStudentToGroupModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        groupId={group.id}
        groupName={group.name}
      />
      <StudentModal
        isOpen={isRegisterStudentOpen}
        onClose={() => setIsRegisterStudentOpen(false)}
        groupIdToAssign={group.id}
      />
    </div>
  );
};
