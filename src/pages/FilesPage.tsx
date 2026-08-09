import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ExcelPerformanceMatrix } from '../components/files/ExcelPerformanceMatrix';
import { FileSpreadsheet } from 'lucide-react';

export const FilesPage: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');

  if (!groups) {
    return <LoadingSpinner label="Jadval yuklanmoqda..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>Excel Usulidagi Taqqoslash Jadvali</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ota-onalar va o'qituvchilar uchun o'quvchilarning Davomat, Baholari va To'lovlarini yonma-yon solishtirish jadvali.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="flex items-center justify-between bg-slate-900">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-300">Guruh:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-64"
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
