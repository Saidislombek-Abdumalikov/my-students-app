import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { GroupModal } from '../components/groups/GroupModal';
import { Users, Plus, Search, Calendar, ChevronRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getFocusedGroupId, clearFocusedGroupId } from '../utils/workspaceContext';

import { useAuth } from '../context/AuthContext';

export const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const groups = useLiveQuery(() => db.groups.toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE'>('ACTIVE');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (!groups || !memberships) {
    return <LoadingSpinner label="Guruhlar ro'yxati yuklanmoqda..." />;
  }

  const handleDeleteGroup = async (groupId: string, groupName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Ushbu "${groupName}" guruhini va unga tegishli barcha a'zolik ma'lumotlarini o'chirib tashlashni tasdiqlaysizmi?`)) {
      await db.groups.delete(groupId);
      await db.groupStudents.where('groupId').equals(groupId).delete();
      if (getFocusedGroupId() === groupId) {
        clearFocusedGroupId();
      }
      alert(`"${groupName}" guruhi muvaffaqiyatli o'chirildi!`);
    }
  };

  // Filter groups by active teacher ownership
  const myGroups = groups.filter((g) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id) {
      return g.teacherId === user.id || g.teacherId === user.username || (user.username === 'english' && (!g.teacherId || g.teacherId === 't-1'));
    }
    return false;
  });

  const filteredGroups = myGroups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.courseSubject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>Guruhlar Boshqaruvi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dars guruhlari, darajalar, dars jadvallari va o'quvchilar tarkibini boshqarish.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Yangi Guruh Yaratish
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Guruh nomi yoki kursi bo'yicha qidirish..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Holat:</span>
          {(['ACTIVE', 'ALL'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
            >
              {status === 'ACTIVE' ? 'FAOL' : 'BARCHASI'}
            </button>
          ))}
        </div>
      </div>

      {/* Group Cards Grid */}
      {filteredGroups.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <p className="text-xs">Ushbu mezonlarga mos keladigan guruhlar topilmadi.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const memberCount = memberships.filter(
              (m) => m.groupId === group.id && m.status === 'ACTIVE'
            ).length;

            return (
              <Card
                key={group.id}
                hoverable
                className="flex flex-col justify-between space-y-4 group bg-white border-slate-200"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="info" size="sm">
                        {group.courseSubject}
                      </Badge>
                      <h3 className="text-base font-bold text-slate-900 mt-1 group-hover:text-emerald-600 transition-colors">
                        {group.name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Badge variant="success" dot>
                        FAOL
                      </Badge>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteGroup(group.id, group.name, e)}
                        className="p-1 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Guruhni o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{group.scheduleDescription}</span>
                  </p>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>Daraja: <strong className="text-slate-600">{group.level}</strong></span>
                    <span>•</span>
                    <span>O'quvchilar: <strong className="text-emerald-600">{memberCount} nafar</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-mono">Boshlangan: {group.startDate}</span>
                  <Link to={`/groups/${group.id}`}>
                    <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                      Boshqarish
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <GroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
