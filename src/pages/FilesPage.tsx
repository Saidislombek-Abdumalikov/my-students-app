import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ExcelPerformanceMatrix } from '../components/files/ExcelPerformanceMatrix';
import { FileSpreadsheet } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export const FilesPage: React.FC = () => {
  const { user } = useAuth();
  const rawGroups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');

  const groups = (rawGroups || []).filter((g) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id) {
      return g.teacherId === user.id || g.teacherId === user.username || (user.username === 'english' && (!g.teacherId || g.teacherId === 't-1'));
    }
    return false;
  });

  if (!groups) {
    return <LoadingSpinner label="Jadval yuklanmoqda..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <span>Excel Usulidagi Taqqoslash Jadvali</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ota-onalar va o'qituvchilar uchun o'quvchilarning Davomat, Baholari va To'lovlarini yonma-yon solishtirish jadvali.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="flex items-center justify-between bg-white">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-600">Guruh:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-64"
          >
            <option value="ALL">Barcha Guruhlar</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Excel Matrix Grid */}
      <ExcelPerformanceMatrix selectedGroupId={selectedGroupId} />
    </div>
  );
};
