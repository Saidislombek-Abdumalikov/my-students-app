import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { GroupModal } from '../components/groups/GroupModal';
import { Users, Plus, Search, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const GroupsPage: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (!groups || !memberships) {
    return <LoadingSpinner label="Loading class groups..." />;
  }

  const filteredGroups = groups.filter((g) => {
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
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" />
            <span>Class Groups Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize student cohorts, course levels, schedules, and active teaching assignments.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create New Group
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search group by name or subject..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          {(['ACTIVE', 'ARCHIVED', 'ALL'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Group Cards Grid */}
      {filteredGroups.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          <p className="text-xs">No class groups found matching criteria.</p>
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
                className="flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="info" size="sm">
                        {group.courseSubject}
                      </Badge>
                      <h3 className="text-base font-bold text-slate-100 mt-1 group-hover:text-brand-400 transition-colors">
                        {group.name}
                      </h3>
                    </div>
                    <Badge variant={group.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
                      {group.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-400" />
                    <span>{group.scheduleDescription}</span>
                  </p>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Level: <strong className="text-slate-300">{group.level}</strong></span>
                    <span>•</span>
                    <span>Students: <strong className="text-emerald-400">{memberCount} Enrolled</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-slate-400 font-mono">Started {group.startDate}</span>
                  <Link to={`/groups/${group.id}`}>
                    <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                      Manage Group
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
