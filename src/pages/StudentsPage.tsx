import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StudentModal } from '../components/students/StudentModal';
import { GraduationCap, Plus, Search, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentsPage: React.FC = () => {
  const students = useLiveQuery(() => db.students.toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());
  const groups = useLiveQuery(() => db.groups.toArray());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  if (!students || !memberships || !groups) {
    return <LoadingSpinner label="O'quvchilar ro'yxati yuklanmoqda..." />;
  }

  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const filteredStudents = students.filter((s) => {
    const matchesSearch = !searchQuery || s.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const sGroupIds = new Set(
      memberships.filter((m) => m.studentId === s.id && m.status === 'ACTIVE').map((m) => m.groupId)
    );
    const matchesGroup = selectedGroupId === 'ALL' || sGroupIds.has(selectedGroupId);
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-400" />
            <span>O'quvchilar Ro'yxati</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            1-2 Sinf Kids va Pre-Intermediate o'quvchilarining dars va ta'lim nazorati.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsStudentModalOpen(true)}
        >
          Yangi O'quvchi Qo'shish
        </Button>
      </div>

      {/* Control Bar: Filters */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-300">Guruh:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-56"
          >
            <option value="ALL">Barcha Guruhlar</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="O'quvchi ismini qidirish..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </Card>

      {/* Students Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredStudents.map((s) => {
          const sGroupIds = memberships
            .filter((m) => m.studentId === s.id && m.status === 'ACTIVE')
            .map((m) => m.groupId);
          const groupNames = sGroupIds.map((id) => groupMap.get(id)?.name).filter(Boolean).join(', ') || 'Guruhsiz';

          return (
            <Card key={s.id} className="p-4 bg-slate-900 border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{s.fullName}</h3>
                  <p className="text-xs text-emerald-400 font-mono mt-0.5">{groupNames}</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Faol
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <Link to={`/students/${s.id}`}>
                  <Button size="sm" variant="ghost" className="text-xs text-emerald-400">
                    Batafsil ko'rish
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
      />
    </div>
  );
};
