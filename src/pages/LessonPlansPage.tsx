import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { BookOpenCheck, Save, Trash2, CheckCircle2, Clock, ChevronLeft, ChevronRight, Plus, Calendar, Layers, LogOut } from 'lucide-react';
import { LessonPlan } from '../types';
import { getNextLessonDate, getPrevLessonDate, getUzbekDayName, isLessonDay, getClosestLessonDate } from '../utils/scheduleUtils';
import { getFocusedGroupId, clearFocusedGroupId } from '../utils/workspaceContext';

export const LessonPlansPage: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const plans = useLiveQuery(() => db.lessonPlans.toArray());

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>(todayStr);

  // Form State
  const [topic, setTopic] = useState('Unit 4: Pre-Intermediate Grammar & Vocabulary');
  const [objectives, setObjectives] = useState("O'quvchilarga yangi zamon strukturasi va 20 ta so'zni o'rgatish");
  const [grammar, setGrammar] = useState('Present Perfect vs Past Simple');
  const [vocabulary, setVocabulary] = useState("Unit 4 Vocabulary Words (1-20)");
  const [activities, setActivities] = useState("1. Warm-up Quiz (10 min)\n2. Grammar Explanation (20 min)\n3. Pair Work Speaking (15 min)");
  const [plannedHomework, setPlannedHomework] = useState("WorkBook 24-bet mashq 1-5");
  const [isSaving, setIsSaving] = useState(false);

  const [focusedGroupId, setFocusedGroupIdState] = useState<string | null>(getFocusedGroupId());

  // Listen to workspace focus changes
  useEffect(() => {
    const handleStorage = () => setFocusedGroupIdState(getFocusedGroupId());
    window.addEventListener('workspace_group_changed', handleStorage);
    return () => window.removeEventListener('workspace_group_changed', handleStorage);
  }, []);

  // Set default group or locked focused group
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    const focusId = getFocusedGroupId();
    if (focusId && groups.some((g) => g.id === focusId)) {
      setSelectedGroupId(focusId);
    } else if (!selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Snap date to closest lesson day when group changes
  useEffect(() => {
    if (!groups || !selectedGroupId) return;
    const selectedGroup = groups.find((g) => g.id === selectedGroupId);
    if (selectedGroup) {
      const closestDay = getClosestLessonDate(selectedGroup.scheduleDescription);
      setTargetDate(closestDay);
    }
  }, [selectedGroupId, groups]);

  if (!groups || !plans) {
    return <LoadingSpinner label="Dars rejalari sahifasi yuklanmoqda..." />;
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const schedule = selectedGroup?.scheduleDescription || '';
  const isValidDay = isLessonDay(targetDate, schedule);
  const dayName = getUzbekDayName(targetDate);

  // Filter plans for selected group
  const groupPlans = plans.filter((p) => p.groupId === selectedGroupId || p.lessonId.includes(selectedGroupId));

  // Plans for the specific selected target date
  const selectedDatePlans = groupPlans.filter((p) => (p.targetDate || p.lessonId) === `l-${selectedGroupId}-${targetDate}` || p.targetDate === targetDate);

  const handleTogglePlanStatus = async (plan: LessonPlan) => {
    const newStatus = plan.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    await db.lessonPlans.update(plan.id, { status: newStatus });
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm("Ushbu dars rejasini o'chirmoqchimisiz?")) return;
    await db.lessonPlans.delete(planId);
  };

  const handleLeaveWorkspace = () => {
    clearFocusedGroupId();
    setFocusedGroupIdState(null);
  };

  const handleSaveLessonPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !topic.trim()) return;

    setIsSaving(true);
    try {
      const planId = `lp-${selectedGroupId}-${targetDate}-${Date.now()}`;
      const newPlan: LessonPlan = {
        id: planId,
        lessonId: `l-${selectedGroupId}-${targetDate}`,
        groupId: selectedGroupId,
        targetDate,
        topic: topic.trim(),
        objectives: objectives.trim(),
        grammar: grammar.trim(),
        vocabulary: vocabulary.trim(),
        activities: activities.trim(),
        plannedHomework: plannedHomework.trim(),
        status: 'PENDING',
      };

      await db.lessonPlans.put(newPlan);
      alert(`${targetDate} (${dayName}) kungi dars rejasi saqlandi!`);
    } catch (err) {
      console.error('Dars rejasini saqlashda xatolik:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-emerald-400" />
            <span>Dars Rejalari (Lesson Plans Manager)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Darsdan oldin yoki istalgan kunda dars rejasini tuzing va bajarilganligini belgilab boring.
          </p>
        </div>
      </div>

      {/* FOCUSED WORKSPACE BANNER */}
      {focusedGroupId && selectedGroup && (
        <Card className="p-4 bg-emerald-950/40 border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-emerald-300">
            <Layers className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <div>
              <span className="font-bold text-sm">Hozirda '{selectedGroup.name}' guruh ishchi xonasidasiz</span>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">
                Ushbu guruh bilan ishlamoqdasiz. Boshqa guruhga o'tish uchun guruh ishchi xonasidan chiqishingiz mumkin.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-400" />} onClick={handleLeaveWorkspace} className="whitespace-nowrap">
            Guruh ishchi xonasidan chiqish
          </Button>
        </Card>
      )}

      {/* Control Bar: Group & Date Selector */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-300 min-w-16">Guruh:</span>
          <select
            disabled={!!focusedGroupId}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-64 disabled:opacity-80"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule-Aware Date Selector */}
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => setTargetDate(getPrevLessonDate(targetDate, schedule))}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer"
            title="Oldingi dars kuni"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
            />
            <span className={`text-[10px] font-bold mt-0.5 ${isValidDay ? 'text-emerald-400' : 'text-rose-400'}`}>
              {dayName} {isValidDay ? '(Dars kuni)' : '(Dars kuni emas!)'}
            </span>
          </div>

          <button
            onClick={() => setTargetDate(getNextLessonDate(targetDate, schedule))}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer"
            title="Keyingi dars kuni"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Main Grid: Add Plan Form + Registered Plans List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create / Edit Plan Form */}
        <Card className="lg:col-span-2 space-y-4 bg-slate-900 border-slate-800 p-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Yangi Dars Rejasini Tuzish</h3>
              <p className="text-xs text-slate-400">Dars mavzusi, grammatika, lug'at va faoliyatlar rejasini kiriting.</p>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 text-white">
              Sana: {targetDate} ({dayName})
            </span>
          </div>

          <form onSubmit={handleSaveLessonPlan} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Dars Mavzusi (Topic)</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Masalan: Unit 4 Present Perfect Grammar"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Grammatika Mavzusi</label>
                <input
                  type="text"
                  value={grammar}
                  onChange={(e) => setGrammar(e.target.value)}
                  placeholder="Masalan: Have + V3 vs Past Simple"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Lug'at Topshirigi (Vocabulary)</label>
                <input
                  type="text"
                  value={vocabulary}
                  onChange={(e) => setVocabulary(e.target.value)}
                  placeholder="Masalan: 20 ta yangi akademik so'z"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Dars Maqsadi (Objectives)</label>
              <input
                type="text"
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="Dars yakunida o'quvchilar nimalarni bilishi kerak..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Dars Mashg'ulotlari / Mashqlar Rejasi</label>
              <textarea
                rows={3}
                value={activities}
                onChange={(e) => setActivities(e.target.value)}
                placeholder="1. Lug'at takrorlash (10 min)&#10;2. Qoida tushuntirish (20 min)..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Rejalashtirilgan Uy Vazifasi</label>
              <input
                type="text"
                value={plannedHomework}
                onChange={(e) => setPlannedHomework(e.target.value)}
                placeholder="Masalan: WorkBook 25-bet mashqlar"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Dars Rejasini Saqlash
              </Button>
            </div>
          </form>
        </Card>

        {/* Registered Plans List for Selected Date & Group */}
        <Card className="space-y-4 bg-slate-900 border-slate-800 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200">{targetDate} Kungi Rejalar</h3>
            </div>
            <Badge variant="brand">{selectedDatePlans.length} Ta Reja</Badge>
          </div>

          {selectedDatePlans.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">
              Ushbu sana ({targetDate}) uchun dars rejasi kiritilmagan.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDatePlans.map((plan) => {
                const isDone = plan.status === 'COMPLETED';
                return (
                  <div key={plan.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="font-extrabold text-slate-100 text-sm">{plan.topic}</h4>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {plan.grammar && (
                      <p className="text-[11px] text-slate-300">
                        <strong className="text-emerald-400">Grammatika:</strong> {plan.grammar}
                      </p>
                    )}

                    {plan.vocabulary && (
                      <p className="text-[11px] text-slate-300">
                        <strong className="text-emerald-400">Lug'at:</strong> {plan.vocabulary}
                      </p>
                    )}

                    {plan.activities && (
                      <div className="text-[11px] text-slate-400 whitespace-pre-line bg-slate-900/60 p-2 rounded border border-slate-850">
                        {plan.activities}
                      </div>
                    )}

                    {/* Interactive Completion Toggle Button */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                      <span className="text-[10px] text-slate-400 font-mono">Bajarilish holati:</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePlanStatus(plan)}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                          isDone
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-amber-500 text-slate-950 border-amber-400'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>✓ Bajarildi</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>⏳ Kutilmoqda</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
