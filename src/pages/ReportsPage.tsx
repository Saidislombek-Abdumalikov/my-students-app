import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToCSV } from '../components/reports/ReportExporter';
import { BarChart3, Download, Clock, AlertCircle } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());
  const attendanceLogs = useLiveQuery(() => db.attendance.toArray());
  const testResults = useLiveQuery(() => db.testResults.toArray());
  const payments = useLiveQuery(() => db.payments.toArray());
  const submissions = useLiveQuery(() => db.homeworkSubmissions.toArray());

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [reportTitle, setReportTitle] = useState('Haftalik O\'quv & Imtihon Natijalari');
  const [teacherComments, setTeacherComments] = useState<Record<string, string>>({
    's-101': 'Juda faol, darslarni o\'z vaqtida bajarmoqda.',
    's-102': 'Vazifalarni yaxshiroq bajarishi kerak.',
  });

  React.useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  if (!groups || !students || !memberships || !attendanceLogs || !testResults || !payments || !submissions) {
    return <LoadingSpinner label="Hisobotlar yuklanmoqda..." />;
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const activeStudentIds = new Set(
    memberships
      .filter((m) => (selectedGroupId === 'ALL' || m.groupId === selectedGroupId) && m.status === 'ACTIVE')
      .map((m) => m.studentId)
  );

  const groupStudents = students.filter((s) => activeStudentIds.has(s.id));

  // Sort students Top-to-Bottom by overall performance score
  const sortedStudents = [...groupStudents].sort((a, b) => {
    const aAtt = attendanceLogs.find((att) => att.studentId === a.id);
    const bAtt = attendanceLogs.find((att) => att.studentId === b.id);
    const aAttScore = aAtt?.status === 'PRESENT' ? 100 : aAtt?.status === 'LATE' ? 50 : 0;
    const bAttScore = bAtt?.status === 'PRESENT' ? 100 : bAtt?.status === 'LATE' ? 50 : 0;

    const aSub = submissions.find((sub) => sub.studentId === a.id);
    const bSub = submissions.find((sub) => sub.studentId === b.id);
    const aHwScore = aSub?.completionPercentage ?? 100;
    const bHwScore = bSub?.completionPercentage ?? 100;

    const aUnpaid = payments.some((p) => p.studentId === a.id && p.status === 'UNPAID');
    const bUnpaid = payments.some((p) => p.studentId === b.id && p.status === 'UNPAID');
    const aPayScore = aUnpaid ? 0 : 100;
    const bPayScore = bUnpaid ? 0 : 100;

    const totalA = aAttScore + aHwScore + aPayScore;
    const totalB = bAttScore + bHwScore + bPayScore;

    return totalB - totalA;
  });

  // Export Selected Group CSV with actual dynamic data
  const handleExportSelectedGroup = () => {
    const headers = ["O'quvchi Ismi", 'Guruh', 'Davomat', 'Uy Vazifasi %', 'Imtihon Bahosi', 'To\'lov Holati', 'O\'qituvchi Izohi'];
    const rows = sortedStudents.map((s) => {
      const sAtt = attendanceLogs.find((a) => a.studentId === s.id);
      const attText = sAtt?.status === 'PRESENT' ? 'Keldi' : sAtt?.status === 'LATE' ? `Kechikdi (${sAtt.lateMinutes || 10} daq)` : sAtt?.status === 'ABSENT' ? 'Kelmadi' : 'Keldi';

      const sSub = submissions.find((sub) => sub.studentId === s.id);
      const hwText = sSub?.completionPercentage !== undefined ? `${sSub.completionPercentage}%` : '100%';

      const sTests = testResults.filter((r) => r.studentId === s.id);
      const latestTest = sTests.length > 0 ? sTests[sTests.length - 1] : null;
      let grade = "A'lo";
      if (latestTest) {
        if (latestTest.score >= 90) grade = "Super";
        else if (latestTest.score >= 80) grade = "A'lo";
        else if (latestTest.score >= 65) grade = "Yaxshi";
        else if (latestTest.score >= 50) grade = "Qoniqarli";
        else grade = "Qoniqarsiz";
      }

      const hasUnpaid = payments.some((p) => p.studentId === s.id && p.status === 'UNPAID');
      const paymentStatus = hasUnpaid ? 'QARZDOR' : "To'langan";
      const comment = teacherComments[s.id] || "Yaxshi ko'rsatkich";

      return [s.fullName, selectedGroup?.name || 'Guruh', attText, hwText, grade, paymentStatus, comment];
    });
    exportToCSV(`TeacherOS_Guruh_Hisoboti_${selectedGroup?.name || 'Guruh'}_${selectedMonth}`, headers, rows);
  };

  // Export ALL Groups at Once CSV with actual dynamic data
  const handleExportAllGroups = () => {
    const headers = ["O'quvchi Ismi", 'Guruh Nomi', 'Davomat', 'Uy Vazifasi %', 'Imtihon Bahosi', 'To\'lov Holati', 'O\'qituvchi Izohi'];
    const rows = students.map((s) => {
      const sGroupIds = memberships.filter((m) => m.studentId === s.id && m.status === 'ACTIVE').map((m) => m.groupId);
      const gNames = sGroupIds.map((id) => groupMap.get(id)?.name).filter(Boolean).join(', ') || 'Guruhsiz';

      const sAtt = attendanceLogs.find((a) => a.studentId === s.id);
      const attText = sAtt?.status === 'PRESENT' ? 'Keldi' : sAtt?.status === 'LATE' ? `Kechikdi (${sAtt.lateMinutes || 10} daq)` : sAtt?.status === 'ABSENT' ? 'Kelmadi' : 'Keldi';

      const sSub = submissions.find((sub) => sub.studentId === s.id);
      const hwText = sSub?.completionPercentage !== undefined ? `${sSub.completionPercentage}%` : '100%';

      const sTests = testResults.filter((r) => r.studentId === s.id);
      const latestTest = sTests.length > 0 ? sTests[sTests.length - 1] : null;
      let grade = "A'lo";
      if (latestTest) {
        if (latestTest.score >= 90) grade = "Super";
        else if (latestTest.score >= 80) grade = "A'lo";
        else if (latestTest.score >= 65) grade = "Yaxshi";
        else if (latestTest.score >= 50) grade = "Qoniqarli";
        else grade = "Qoniqarsiz";
      }

      const hasUnpaid = payments.some((p) => p.studentId === s.id && p.status === 'UNPAID');
      const paymentStatus = hasUnpaid ? 'QARZDOR' : "To'langan";
      const comment = teacherComments[s.id] || "Yaxshi ko'rsatkich";

      return [s.fullName, gNames, attText, hwText, grade, paymentStatus, comment];
    });
    exportToCSV(`TeacherOS_BARCHA_GURUHLAR_HISOBOTI_${selectedMonth}`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            <span>To'liq Hisobotlar & Yuklab Olish (Izohlar Bilan)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bitta guruh yoki barcha guruhlar ma'lumotlarini o'qituvchi izohlari bilan Excel (CSV) faylda yuklab oling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4 text-emerald-400" />}
            onClick={handleExportSelectedGroup}
          >
            Tanlangan Guruh (CSV)
          </Button>

          <Button
            variant="primary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportAllGroups}
          >
            BARCHA Guruhlar (Birga CSV)
          </Button>
        </div>
      </div>

      {/* Control Bar: Group Selector */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-300 min-w-16">Guruh:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-64"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-300 min-w-24">Hisobot Nomi:</span>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-64"
          />
        </div>
      </Card>

      {/* FULL REPORT SHEET WITH TEACHER COMMENTS */}
      <Card className="space-y-4 bg-slate-900 border-slate-800 p-5 max-w-5xl mx-auto">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
              Guruh Natijalari (A'lo O'quvchilar Yuqorida)
            </span>
            <h2 className="text-base font-extrabold text-slate-100">{selectedGroup?.name}</h2>
            <p className="text-xs text-slate-400 font-mono">{reportTitle}</p>
          </div>

          <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 text-white">
            Yuklab Olishga Tayyor
          </span>
        </div>

        {sortedStudents.length === 0 ? (
          <p className="text-xs text-slate-400 p-4 text-center">Guruhda o'quvchilar topilmadi.</p>
        ) : (
          <table className="w-full text-xs text-left text-slate-200 border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-800">#</th>
                <th className="py-2.5 px-3 border-r border-slate-800">O'quvchi Ismi</th>
                <th className="py-2.5 px-3 border-r border-slate-800 text-center">Davomat</th>
                <th className="py-2.5 px-3 border-r border-slate-800 text-center">Vazifa %</th>
                <th className="py-2.5 px-3 border-r border-slate-800 text-center">Imtihon</th>
                <th className="py-2.5 px-3 border-r border-slate-800 text-center">To'lov</th>
                <th className="py-2.5 px-3">O'qituvchi Izohi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-sans">
              {sortedStudents.map((s, idx) => {
                const sAtt = attendanceLogs.find((a) => a.studentId === s.id);
                const attStatus = sAtt ? sAtt.status : 'PRESENT';
                const lateMin = sAtt?.lateMinutes || 10;

                const sSub = submissions.find((sub) => sub.studentId === s.id);
                const hwPerc = sSub?.completionPercentage !== undefined ? sSub.completionPercentage : 100;

                const sTests = testResults.filter((r) => r.studentId === s.id);
                const latestTest = sTests.length > 0 ? sTests[sTests.length - 1] : null;

                let grade = "A'lo";
                let gradeClass = "bg-emerald-600 text-white font-extrabold";
                if (latestTest) {
                  if (latestTest.score >= 90) grade = "Super";
                  else if (latestTest.score >= 80) grade = "A'lo";
                  else if (latestTest.score >= 65) grade = "Yaxshi";
                  else if (latestTest.score >= 50) grade = "Qoniqarli";
                  else grade = "Qoniqarsiz";
                }

                const hasUnpaid = payments.some((p) => p.studentId === s.id && p.status === 'UNPAID');

                return (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 border-r border-slate-800 font-mono text-[11px] text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-3 font-bold text-slate-100 border-r border-slate-800">
                      {s.fullName}
                    </td>

                    <td className="py-2.5 px-3 text-center border-r border-slate-800">
                      {attStatus === 'PRESENT' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white">
                          Keldi
                        </span>
                      ) : attStatus === 'LATE' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-slate-950 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Kechikdi: {lateMin} daq
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-red-600 text-white">
                          Kelmadi
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center border-r border-slate-800">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${hwPerc === 100 ? 'bg-emerald-600 text-white' : hwPerc > 0 ? 'bg-amber-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                        {hwPerc}%
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center border-r border-slate-800">
                      <span className={`px-2 py-0.5 text-[10px] rounded ${gradeClass}`}>
                        {grade}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center border-r border-slate-800">
                      {hasUnpaid ? (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-red-600 text-white inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> QARZDOR
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white">
                          To'langan
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={teacherComments[s.id] || ''}
                        onChange={(e) => setTeacherComments((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder="O'qituvchi izohi..."
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
