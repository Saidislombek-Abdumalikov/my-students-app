import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { CreateHomeworkPackageModal } from '../components/homework/CreateHomeworkPackageModal';
import { HomeworkChecker } from '../components/homework/HomeworkChecker';
import { FileCheck, Plus, Layers, Calendar } from 'lucide-react';

export const HomeworkPage: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const packages = useLiveQuery(() => db.homeworkPackages.toArray());

  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (!groups || !packages) {
    return <LoadingSpinner label="Loading homework system..." />;
  }

  // Filter packages based on group selection
  const filteredPackages = selectedGroupId === 'ALL'
    ? packages
    : packages.filter((p) => p.groupId === selectedGroupId);

  // Default select first package if none selected
  React.useEffect(() => {
    if (filteredPackages.length > 0 && (!selectedPackageId || !filteredPackages.some(p => p.id === selectedPackageId))) {
      setSelectedPackageId(filteredPackages[0].id);
    }
  }, [filteredPackages, selectedPackageId]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-brand-400" />
            <span>Multi-Task Homework System</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Assign multi-task packages per lesson date and evaluate individual student submissions.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create Homework Package
        </Button>
      </div>

      {/* Selector Bar: Group & Homework Package */}
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Group Filter */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-300 min-w-16">Group:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSelectedPackageId('');
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-brand-500 w-full sm:w-56"
            >
              <option value="ALL">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Package Selector */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-300 min-w-16">Package:</span>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-brand-500 w-full sm:w-64"
            >
              {filteredPackages.length === 0 ? (
                <option value="">No packages available</option>
              ) : (
                filteredPackages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (Due: {p.deadline})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <Badge variant="brand" dot>
          Phase 6 Active
        </Badge>
      </Card>

      {/* Homework Checker Matrix Workspace */}
      {filteredPackages.length === 0 || !selectedPackageId ? (
        <Card className="p-8 text-center text-slate-400">
          <p className="text-xs">No homework packages found. Click "Create Homework Package" to assign your first package.</p>
        </Card>
      ) : (
        <HomeworkChecker packageId={selectedPackageId} />
      )}

      {/* Create Package Modal */}
      <CreateHomeworkPackageModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        preselectedGroupId={selectedGroupId !== 'ALL' ? selectedGroupId : undefined}
      />
    </div>
  );
};
