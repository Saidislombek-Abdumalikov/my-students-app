import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { db } from '../../db';
import { UserPlus, CheckCircle2 } from 'lucide-react';

interface AddStudentToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

export const AddStudentToGroupModal: React.FC<AddStudentToGroupModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
}) => {
  const allStudents = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const currentMemberships = useLiveQuery(() => 
    db.groupStudents.where('groupId').equals(groupId).toArray()
  );

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!allStudents || !currentMemberships) return null;

  const currentEnrolledStudentIds = new Set(
    currentMemberships.filter(m => m.status === 'ACTIVE').map(m => m.studentId)
  );

  // Available students not yet enrolled in this group
  const availableStudents = allStudents.filter(s => !currentEnrolledStudentIds.has(s.id));

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleEnroll = async () => {
    if (selectedStudentIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString().split('T')[0];
      const newEntries = selectedStudentIds.map(studentId => ({
        id: `gs-${Date.now()}-${studentId}`,
        groupId,
        studentId,
        joinedAt: now,
        status: 'ACTIVE' as const,
      }));

      await db.groupStudents.bulkAdd(newEntries);
      setSelectedStudentIds([]);
      onClose();
    } catch (err) {
      console.error('Error adding students to group:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Enroll Students in ${groupName}`}
      subtitle="Select active students from center registry to add to this class group."
    >
      <div className="space-y-4">
        {availableStudents.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs">All active students are already enrolled in this group.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {availableStudents.map((student) => {
              const isSelected = selectedStudentIds.includes(student.id);
              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 text-slate-900'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold">{student.fullName}</p>
                    <p className="text-xs text-slate-500">{student.phone} • Parent: {student.parentName}</p>
                  </div>
                  <div>
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-300" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <Badge variant="brand">{selectedStudentIds.length} Selected</Badge>
          <div className="flex space-x-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={selectedStudentIds.length === 0}
              isLoading={isSubmitting}
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={handleEnroll}
            >
              Add Selected Students
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
