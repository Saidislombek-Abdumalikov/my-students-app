import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Camera, CheckCircle2, AlertCircle, Clock, Award, FileSpreadsheet, ChevronLeft, ChevronRight, AlertTriangle, Plus } from 'lucide-react';
import { getClosestLessonDate, getNextLessonDate, getPrevLessonDate, getUzbekDayName, isLessonDay } from '../utils/scheduleUtils';

export const ScreenshotHubPage: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());
  const attendanceLogs = useLiveQuery(() => db.attendance.toArray());
  const testResults = useLiveQuery(() => db.testResults.toArray());
  const payments = useLiveQuery(() => db.payments.toArray());
  const submissions = useLiveQuery(() => db.homeworkSubmissions.toArray());
  const tests = useLiveQuery(() => db.tests.toArray());
  const lessons = useLiveQuery(() => db.lessons.toArray());

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Set default group on first load
  useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Snap date to closest lesson day when group changes
  useEffect(() => {
    if (!groups || !selectedGroupId) return;
    const selectedGroup = groups.find((g) => g.id === selectedGroupId);
    if (selectedGroup) {
      const closestDay = getClosestLessonDate(selectedGroup.scheduleDescription);
      setSelectedDate(closestDay);
    }
  }, [selectedGroupId, groups]);

  if (!groups || !students || !memberships || !attendanceLogs || !testResults || !payments || !submissions || !tests || !lessons) {
    return <LoadingSpinner label="Skrinshotlar sahifasi yuklanmoqda..." />;
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const schedule = selectedGroup?.scheduleDescription || '';

  const activeStudentIds = new Set(
    memberships
      .filter((m) => m.groupId === selectedGroupId && m.status === 'ACTIVE')
      .map((m) => m.studentId)
  );

  const groupStudents = students.filter((s) => activeStudentIds.has(s.id));

  const targetLessonId = `l-${selectedGroupId}-${selectedDate}`;
  const hwPackageId = `hp-${selectedGroupId}-${selectedDate}`;

  // Check if date is standard lesson day OR has extra lesson in DB
  const existingLesson = lessons.find((l) => l.groupId === selectedGroupId && l.date === selectedDate);
  const isStandardDay = isLessonDay(selectedDate, schedule);
  const isEffectiveLessonDay = isStandardDay || !!existingLesson;
  const dayName = getUzbekDayName(selectedDate);

  const handleAddExtraLesson = async () => {
    const newLessonId = `l-${selectedGroupId}-${selectedDate}`;
    await db.lessons.put({
      id: newLessonId,
      groupId: selectedGroupId,
      date: selectedDate,
      title: `Qo'shimcha dars (${selectedDate})`,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    });
    alert(`${selectedDate} (${dayName}) kungi dars kalendarga muvaffaqiyatli biriktirildi va saqlandi!`);
  };

  // Find tests for selected date in this group
  const dateTests = tests.filter((t) => t.groupId === selectedGroupId && t.date === selectedDate);

  // Sort students Top-to-Bottom by performance on selectedDate
  const sortedStudents = [...groupStudents].sort((a, b) => {
    const aAtt = attendanceLogs.find((att) => att.studentId === a.id && att.lessonId === targetLessonId);
    const bAtt = attendanceLogs.find((att) => att.studentId === b.id && att.lessonId === targetLessonId);
    const aAttScore = aAtt?.status === 'PRESENT' ? 100 : aAtt?.status === 'LATE' ? 50 : 0;
    const bAttScore = bAtt?.status === 'PRESENT' ? 100 : bAtt?.status === 'LATE' ? 50 : 0;

    const aSub = submissions.find((sub) => sub.studentId === a.id && sub.taskId === hwPackageId);
    const bSub = submissions.find((sub) => sub.studentId === b.id && sub.taskId === hwPackageId);
    const aHwScore = aSub?.completionPercentage ?? 0;
    const bHwScore = bSub?.completionPercentage ?? 0;

    const aUnpaid = payments.some((p) => p.studentId === a.id && p.status === 'UNPAID');
    const bUnpaid = payments.some((p) => p.studentId === b.id && p.status === 'UNPAID');
    const aPayScore = aUnpaid ? 0 : 100;
    const bPayScore = bUnpaid ? 0 : 100;

    return (bAttScore + bHwScore + bPayScore) - (aAttScore + aHwScore + aPayScore);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Camera className="w-6 h-6 text-emerald-400" />
            <span>Skrinshotlar Maydoni</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Sana va guruh bo'yicha saqlangan ma'lumotlar jadvallari.</p>
        </div>
      </div>

      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-300 min-w-16">Guruh:</span>
          <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-64">
            {groups.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
          </select>
        </div>
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button onClick={() => setSelectedDate(getPrevLessonDate(selectedDate, schedule))} className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col items-center">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500" />
            <span className={`text-[10px] font-bold mt-0.5 ${isEffectiveLessonDay ? 'text-emerald-400' : 'text-rose-400'}`}>
              {dayName} {isEffectiveLessonDay ? '(Dars kuni)' : '(Dars kuni emas!)'}
            </span>
          </div>
          <button onClick={() => setSelectedDate(getNextLessonDate(selectedDate, schedule))} className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* NON-LESSON DAY WARNING & FIXING BANNER */}
      {!isEffectiveLessonDay && (
        <Card className="p-4 bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-amber-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold text-sm">Bu kunda dars mavjud emas!</span>
              <p className="text-[11px] text-amber-400/90 mt-0.5">
                Ushbu guruhning dars jadvallari bo'yicha {selectedDate} ({dayName}) dars kuni emas. Agar ushbu kunda dars o'tgan bo'lsangiz, uni kalendarga biriktirishingiz mumkin.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddExtraLesson} className="whitespace-nowrap">
            Qo'shimcha dars biriktirish
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TABLE 1: DAVOMAT */}
        <Card className="space-y-3 bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-extrabold text-slate-100">1. Davomat</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">{selectedDate} ({dayName})</span>
          </div>
          <table className="w-full text-xs text-left text-slate-200 border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2 px-2 border-r border-slate-800">#</th>
                <th className="py-2 px-2 border-r border-slate-800">O'quvchi Ismi</th>
                <th className="py-2 px-2 text-center">Davomat Holati</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedStudents.map((s, idx) => {
                const sAtt = attendanceLogs.find((a) => a.studentId === s.id && a.lessonId === targetLessonId);
                const attStatus = sAtt ? sAtt.status : null;
                const lateMin = sAtt?.lateMinutes || 0;
                return (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-2 border-r border-slate-800 font-mono text-[10px] text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2 font-bold text-slate-100 border-r border-slate-800">{s.fullName}</td>
                    <td className="py-2 px-2 text-center">
                      {attStatus === 'PRESENT' ? (<span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white">Keldi</span>)
                       : attStatus === 'LATE' ? (<span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-slate-950 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Kechikdi: {lateMin} daq</span>)
                       : attStatus === 'ABSENT' ? (<span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-red-600 text-white">Kelmadi</span>)
                       : (<span className="text-[10px] text-slate-400">&mdash;</span>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* TABLE 2: UY VAZIFASI */}
        <Card className="space-y-3 bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-extrabold text-slate-100">2. Uy Vazifasi</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">{selectedDate} ({dayName})</span>
          </div>
          <table className="w-full text-xs text-left text-slate-200 border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2 px-2 border-r border-slate-800">#</th>
                <th className="py-2 px-2 border-r border-slate-800">O'quvchi Ismi</th>
                <th className="py-2 px-2 text-center">Vazifa Foizi %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedStudents.map((s, idx) => {
                const sSub = submissions.find((sub) => sub.studentId === s.id && sub.taskId === hwPackageId);
                const hwPerc = sSub?.completionPercentage;
                return (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-2 border-r border-slate-800 font-mono text-[10px] text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2 font-bold text-slate-100 border-r border-slate-800">{s.fullName}</td>
                    <td className="py-2 px-2 text-center">
                      {hwPerc !== undefined ? (
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${hwPerc === 100 ? 'bg-emerald-600 text-white' : hwPerc > 0 ? 'bg-amber-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                          {hwPerc}% ({hwPerc === 100 ? 'Bajarildi' : hwPerc > 0 ? 'Qisman' : 'Bajarilmadi'})
                        </span>
                      ) : (<span className="text-[10px] text-slate-400">&mdash;</span>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* TABLE 3: IMTIHON NATIJALARI */}
        <Card className="space-y-3 bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-extrabold text-slate-100">3. Imtihon Natijalari</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">{selectedDate} ({dayName})</span>
          </div>
          <table className="w-full text-xs text-left text-slate-200 border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2 px-2 border-r border-slate-800">#</th>
                <th className="py-2 px-2 border-r border-slate-800">O'quvchi Ismi</th>
                <th className="py-2 px-2 text-center">Imtihon Bahosi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedStudents.map((s, idx) => {
                const dateTestIds = dateTests.map((t) => t.id);
                const sResult = testResults.find((r) => r.studentId === s.id && dateTestIds.includes(r.testId));

                let grade = '';
                let gradeClass = 'text-slate-400';
                if (sResult) {
                  const sc = sResult.score;
                  if (sc >= 90) { grade = 'Super'; gradeClass = 'bg-emerald-600 text-white font-extrabold'; }
                  else if (sc >= 80) { grade = "A'lo"; gradeClass = 'bg-emerald-600 text-white font-bold'; }
                  else if (sc >= 65) { grade = 'Yaxshi'; gradeClass = 'bg-blue-600 text-white font-bold'; }
                  else if (sc >= 50) { grade = 'Qoniqarli'; gradeClass = 'bg-amber-500 text-slate-950 font-bold'; }
                  else { grade = 'Qoniqarsiz'; gradeClass = 'bg-red-600 text-white font-extrabold'; }
                }

                return (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-2 border-r border-slate-800 font-mono text-[10px] text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2 font-bold text-slate-100 border-r border-slate-800">{s.fullName}</td>
                    <td className="py-2 px-2 text-center">
                      {sResult ? (
                        <span className={`px-2 py-0.5 text-[10px] rounded ${gradeClass}`}>{grade} ({sResult.score}%)</span>
                      ) : (<span className="text-[10px] text-slate-400">&mdash;</span>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* TABLE 4: TO'LOVLAR */}
        <Card className="space-y-3 bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <h3 className="text-xs font-extrabold text-slate-100">4. To'lov Holati</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">{selectedDate} ({dayName})</span>
          </div>
          <table className="w-full text-xs text-left text-slate-200 border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2 px-2 border-r border-slate-800">#</th>
                <th className="py-2 px-2 border-r border-slate-800">O'quvchi Ismi</th>
                <th className="py-2 px-2 text-center">To'lov Holati</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedStudents.map((s, idx) => {
                const hasUnpaid = payments.some((p) => p.studentId === s.id && p.status === 'UNPAID');
                return (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-2 border-r border-slate-800 font-mono text-[10px] text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2 font-bold text-slate-100 border-r border-slate-800">{s.fullName}</td>
                    <td className="py-2 px-2 text-center">
                      {hasUnpaid ? (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-red-600 text-white inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> QARZDOR</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> To'langan</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};
