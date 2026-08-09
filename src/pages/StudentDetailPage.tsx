import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StudentModal } from '../components/students/StudentModal';
import { StudentTimeline } from '../components/students/StudentTimeline';
import {
  GraduationCap,
  ArrowLeft,
  Phone,
  UserCheck,
  Calendar,
  Edit,
  Trash2,
  Clock,
  Users,
  CreditCard,
  CalendarCheck
} from 'lucide-react';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const student = useLiveQuery(() => (id ? db.students.get(id) : undefined), [id]);
  const memberships = useLiveQuery(() => (id ? db.groupStudents.where('studentId').equals(id).toArray() : []), [id]);
  const groups = useLiveQuery(() => db.groups.toArray());
  const attendanceLogs = useLiveQuery(() => (id ? db.attendance.where('studentId').equals(id).toArray() : []), [id]);
  const paymentLogs = useLiveQuery(() => (id ? db.payments.where('studentId').equals(id).toArray() : []), [id]);

  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'GROUPS' | 'ATTENDANCE' | 'PAYMENTS'>('TIMELINE');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!student || !memberships || !groups || !attendanceLogs || !paymentLogs) {
    return <LoadingSpinner label="Loading student profile details..." />;
  }

  const enrolledGroupIds = new Set(
    memberships.filter(m => m.status === 'ACTIVE').map(m => m.groupId)
  );

  const enrolledGroups = groups.filter(g => enrolledGroupIds.has(g.id));

  const handleArchiveStudent = async () => {
    if (confirm(`"${student.fullName}" o'quvchisini arxivlashni tasdiqlaysizmi?`)) {
      await db.students.update(student.id, { status: 'ARCHIVED' });
      navigate('/students');
    }
  };

  const handleDeleteStudentPermanently = async () => {
    if (confirm(`Ushbu "${student.fullName}" o'quvchisini va uning barcha to'lov hamda dars yozuvlarini BUTUNLAY O'CHIRIB tashlamoqchimisiz? Qayta tiklab bo'lmaydi.`)) {
      await db.students.delete(student.id);
      await db.groupStudents.where('studentId').equals(student.id).delete();
      await db.payments.where('studentId').equals(student.id).delete();
      await db.attendance.where('studentId').equals(student.id).delete();
      await db.homeworkSubmissions.where('studentId').equals(student.id).delete();
      alert(`"${student.fullName}" o'quvchisi va uning to'lov hamda dars ma'lumotlari to'liq o'chirildi!`);
      navigate('/students');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/students')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-100">{student.fullName}</h1>
              <Badge
                variant={
                  student.status === 'ACTIVE'
                    ? 'success'
                    : student.status === 'INACTIVE'
                    ? 'warning'
                    : 'neutral'
                }
                dot
              >
                {student.status === 'ACTIVE' ? 'FAOL' : student.status === 'ARCHIVED' ? 'ARXIV' : 'NOPAO' }
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Enrolled: {student.enrollmentDate} • Student ID: {student.id}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Edit className="w-4 h-4" />}
            onClick={() => setIsEditModalOpen(true)}
          >
            Tahrirlash
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-400 hover:text-amber-300"
            onClick={handleArchiveStudent}
          >
            Arxivlash
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-400 hover:text-rose-300"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={handleDeleteStudentPermanently}
          >
            Butunlay O'chirish
          </Button>
        </div>
      </div>

      {/* Info Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="space-y-1.5">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-brand-400" />
            <span>Student Contact</span>
          </p>
          <p className="text-sm font-semibold text-slate-200">{student.phone || 'No phone recorded'}</p>
        </Card>

        <Card className="space-y-1.5">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Parent / Guardian</span>
          </p>
          <p className="text-sm font-semibold text-slate-200">{student.parentName || 'N/A'}</p>
          <p className="text-xs text-slate-400">{student.parentPhone}</p>
        </Card>

        <Card className="space-y-1.5">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Enrolled Classes</span>
          </p>
          <p className="text-sm font-semibold text-slate-200">
            {enrolledGroups.length} Active {enrolledGroups.length === 1 ? 'Group' : 'Groups'}
          </p>
        </Card>
      </div>

      {/* Teacher Notes */}
      {student.notes && (
        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <h4 className="text-xs font-bold text-slate-300 mb-1">Teacher Notes & Performance Goals</h4>
          <p className="text-xs text-slate-400 leading-relaxed">{student.notes}</p>
        </Card>
      )}

      {/* Profile Sub-Tabs Navigation */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-800 space-x-4">
          {[
            { id: 'TIMELINE', label: 'Timeline & History', icon: <Clock className="w-4 h-4" /> },
            { id: 'GROUPS', label: `Groups (${enrolledGroups.length})`, icon: <Users className="w-4 h-4" /> },
            { id: 'ATTENDANCE', label: `Attendance (${attendanceLogs.length})`, icon: <CalendarCheck className="w-4 h-4" /> },
            { id: 'PAYMENTS', label: `Payments (${paymentLogs.length})`, icon: <CreditCard className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'TIMELINE' && <StudentTimeline studentId={student.id} />}

        {activeTab === 'GROUPS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {enrolledGroups.length === 0 ? (
              <p className="text-xs text-slate-400 col-span-2">Not currently enrolled in any class group.</p>
            ) : (
              enrolledGroups.map((group) => (
                <Card key={group.id} hoverable className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-100">{group.name}</h4>
                    <Badge variant="info" size="sm">{group.courseSubject}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{group.scheduleDescription}</p>
                  <Link to={`/groups/${group.id}`}>
                    <Button variant="ghost" size="sm" className="mt-2 text-xs text-brand-400">
                      View Group →
                    </Button>
                  </Link>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'ATTENDANCE' && (
          <div className="space-y-2">
            {attendanceLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No attendance logs found.</p>
            ) : (
              attendanceLogs.map((log) => (
                <div key={log.id} className="glass-panel p-3 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">Date: {log.updatedAt.split('T')[0]}</p>
                    {log.note && <p className="text-slate-400">{log.note}</p>}
                  </div>
                  <Badge
                    variant={
                      log.status === 'PRESENT'
                        ? 'success'
                        : log.status === 'ABSENT'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {log.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'PAYMENTS' && (
          <div className="space-y-2">
            {paymentLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No payment logs found.</p>
            ) : (
              paymentLogs.map((pay) => (
                <div key={pay.id} className="glass-panel p-3 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">
                      Amount: {pay.amount.toLocaleString()} UZS
                    </p>
                    <p className="text-slate-400">
                      Period: {pay.periodMonth} • Method: {pay.paymentMethod}
                    </p>
                  </div>
                  <Badge variant={pay.status === 'PAID' ? 'success' : 'warning'}>
                    {pay.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Student Modal */}
      <StudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        studentToEdit={student}
      />
    </div>
  );
};
