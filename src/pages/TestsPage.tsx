import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Award, Plus, Play, Save, Edit, Trash2 } from 'lucide-react';
import { Test } from '../types';

import { validateAndFormatScore } from '../utils/scoreValidation';

import { useAuth } from '../context/AuthContext';

export const TestsPage: React.FC = () => {
  const { user } = useAuth();
  const rawGroups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const students = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const memberships = useLiveQuery(() => db.groupStudents.toArray());
  const tests = useLiveQuery(() => db.tests.toArray());
  const testResults = useLiveQuery(() => db.testResults.toArray());

  const groups = rawGroups?.filter((g) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id) {
      return g.teacherId === user.id || g.teacherId === user.username || (user.username === 'english' && (!g.teacherId || g.teacherId === 't-1'));
    }
    return false;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'DAILY' | 'WEEKLY'>('ALL');

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [formTitle, setFormTitle] = useState('Vocabulary & Quick Quiz');
  const [formType, setFormType] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [formDate, setFormDate] = useState(todayStr);
  const [formMaxScore, setFormMaxScore] = useState(100);

  // Scores State: studentId -> { score: number; comment: string }
  const [scoresState, setScoresState] = useState<Record<string, { score: number; comment: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  if (!groups || !students || !memberships || !tests || !testResults) {
    return <LoadingSpinner label="Imtihonlar sahifasi yuklanmoqda..." />;
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const activeStudentIds = new Set(
    memberships
      .filter((m) => m.groupId === selectedGroupId && m.status === 'ACTIVE')
      .map((m) => m.studentId)
  );

  const groupStudents = students.filter((s) => activeStudentIds.has(s.id));

  // Filtered Tests
  const groupTests = tests.filter((t) => {
    const matchesGroup = t.groupId === selectedGroupId;
    const isWeekly = t.title.toLowerCase().includes('haftalik') || t.title.toLowerCase().includes('weekly') || t.category === 'IELTS_OVERALL';
    if (filterType === 'DAILY') return matchesGroup && !isWeekly;
    if (filterType === 'WEEKLY') return matchesGroup && isWeekly;
    return matchesGroup;
  });

  const handleOpenCreateModal = () => {
    setEditingTest(null);
    setFormTitle("Kunlik Lug'at Quiz #1");
    setFormType('DAILY');
    setFormDate(todayStr);
    setFormMaxScore(100);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (test: Test) => {
    setEditingTest(test);
    setFormTitle(test.title);
    setFormType(test.title.toLowerCase().includes('haftalik') ? 'WEEKLY' : 'DAILY');
    setFormDate(test.date);
    setFormMaxScore(test.maxScore);
    setIsModalOpen(true);
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm("Ushbu imtihon va barcha natijalari o'chirilsinmi?")) return;
    try {
      await db.tests.delete(testId);
      const resultsToDelete = testResults.filter((r) => r.testId === testId).map((r) => r.id);
      await db.testResults.bulkDelete(resultsToDelete);
      if (activeTest?.id === testId) setActiveTest(null);
    } catch (err) {
      console.error("Testni o'chirishda xatolik:", err);
    }
  };

  const handleSaveTestForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !formTitle.trim()) return;

    try {
      const finalTitle = formType === 'WEEKLY' && !formTitle.includes('Haftalik') ? `Haftalik Imtihon: ${formTitle}` : formTitle;

      if (editingTest) {
        await db.tests.update(editingTest.id, {
          title: finalTitle,
          date: formDate,
          maxScore: formMaxScore,
        });
      } else {
        const testId = `t-${Date.now()}`;
        const newTest: Test = {
          id: testId,
          groupId: selectedGroupId,
          title: finalTitle,
          date: formDate,
          category: formType === 'WEEKLY' ? 'IELTS_OVERALL' : 'GENERAL',
          maxScore: formMaxScore,
          createdAt: new Date().toISOString(),
        };

        await db.tests.add(newTest);
        handleStartTest(newTest); // Open scoring mode automatically with clean state
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Testni saqlashda xatolik:', err);
    }
  };

  const handleStartTest = (test: Test) => {
    setActiveTest(test);
    const existingMap: Record<string, { score: number; comment: string }> = {};
    const existingResults = testResults.filter((r) => r.testId === test.id);
    existingResults.forEach((r) => {
      existingMap[r.studentId] = { score: r.score, comment: r.comment || '' };
    });
    setScoresState(existingMap);
  };

  const updateScore = (studentId: string, rawVal: number) => {
    if (!activeTest) return;
    const validated = validateAndFormatScore(rawVal, activeTest.maxScore, activeTest.category);
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        score: validated.score,
        comment: prev[studentId]?.comment || '',
      },
    }));
  };

  const updateComment = (studentId: string, commentVal: string) => {
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        score: prev[studentId]?.score ?? activeTest?.maxScore ?? 100,
        comment: commentVal,
      },
    }));
  };

  const handleSaveResults = async () => {
    if (!activeTest) return;
    setIsSaving(true);
    try {
      const resultEntries = groupStudents.map((s) => {
        const data = scoresState[s.id] || { score: activeTest.maxScore, comment: '' };
        const validated = validateAndFormatScore(data.score, activeTest.maxScore, activeTest.category);
        return {
          id: `tr-${activeTest.id}-${s.id}`,
          testId: activeTest.id,
          studentId: s.id,
          score: validated.score,
          percentage: validated.percentage,
          comment: data.comment,
          createdAt: new Date().toISOString(),
        };
      });

      await db.testResults.bulkPut(resultEntries);
      alert('Imtihon natijalari saqlandi!');
    } catch (err) {
      console.error('Baholarni saqlashda xatolik:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-600" />
            <span>Kunlik Quiz va Haftalik Imtihonlar Boshqaruvi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kunlik dars lug'at quizlari va har 4 darsda o'tkaziladigan haftalik nazorat imtihonlari.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          Yangi Imtihon / Quiz Yaratish
        </Button>
      </div>

      {/* Control Bar: Group & Type Filter */}
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-600 min-w-16">Guruh:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 w-full sm:w-64"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">
          {[
            { id: 'ALL', label: 'Barcha Testlar' },
            { id: 'DAILY', label: 'Kunlik Quizlar' },
            { id: 'WEEKLY', label: 'Haftalik Imtihonlar (Har 4 dars)' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id as any)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filterType === item.id
                  ? 'bg-emerald-600 text-white font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Created Tests List */}
      <Card className="space-y-3 bg-white border-slate-200 p-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            {selectedGroup?.name} — Imtihonlar & Quizlar Ro'yxati
          </h3>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-600 text-white">
            {groupTests.length} ta mavjud
          </span>
        </div>

        {groupTests.length === 0 ? (
          <p className="text-xs text-slate-500 p-4 text-center">Ushbu guruh yoki tanlangan kunda imtihon o'tkazilmagan.</p>
        ) : (
          <div className="space-y-2">
            {groupTests.map((test) => {
              const isWeekly = test.title.toLowerCase().includes('haftalik') || test.category === 'IELTS_OVERALL';

              return (
                <div key={test.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-900">{test.title}</h4>
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${isWeekly ? 'bg-amber-500 text-slate-950' : 'bg-sky-600 text-white'}`}>
                        {isWeekly ? 'Haftalik Imtihon' : 'Kunlik Quiz'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">Sana: {test.date} | Maksimal ball: {test.maxScore}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant={activeTest?.id === test.id ? 'primary' : 'outline'}
                      leftIcon={<Play className="w-3.5 h-3.5 text-emerald-600" />}
                      onClick={() => handleStartTest(test)}
                    >
                      {activeTest?.id === test.id ? 'Aktiv Mode' : 'Start (Boshlash)'}
                    </Button>

                    <button
                      onClick={() => handleOpenEditModal(test)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded bg-slate-100 border border-slate-300 cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteTest(test.id)}
                      className="p-1.5 text-rose-600 hover:text-rose-600 rounded bg-slate-100 border border-slate-300 cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* LIVE SCORING SHEET FOR ACTIVE TEST */}
      {activeTest && (
        <Card className="space-y-4 bg-white border-slate-200 p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">
                Baholash Varakasi (Start Mode)
              </span>
              <h2 className="text-base font-extrabold text-slate-900">{activeTest.title}</h2>
              <p className="text-xs text-slate-500 font-mono">Sana: {activeTest.date}</p>
            </div>

            <Button
              variant="primary"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSaveResults}
            >
              Natijalarni Saqlash
            </Button>
          </div>

          {groupStudents.length === 0 ? (
            <p className="text-xs text-slate-500 p-4 text-center">Guruhda o'quvchilar topilmadi.</p>
          ) : (
            <div className="space-y-3">
              {groupStudents.map((s, idx) => {
                const current = scoresState[s.id] || { score: activeTest.maxScore, comment: '' };
                const validated = validateAndFormatScore(current.score, activeTest.maxScore, activeTest.category);

                let grade = "A'lo";
                let gradeBadgeClass = "bg-emerald-600 text-white font-extrabold";
                if (validated.percentage >= 90) grade = "Super";
                else if (validated.percentage >= 80) grade = "A'lo";
                else if (validated.percentage >= 65) grade = "Yaxshi";
                else if (validated.percentage >= 50) grade = "Qoniqarli";
                else grade = "Qoniqarsiz";

                return (
                  <div key={s.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{s.fullName}</h4>
                      </div>

                      <span className={`px-3 py-0.5 text-xs rounded-lg ${gradeBadgeClass}`}>
                        Baho: {grade} ({validated.score} / {activeTest.maxScore} — {validated.percentage}%)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Ball (0 - {activeTest.maxScore})
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={activeTest.maxScore}
                          value={current.score}
                          onChange={(e) => updateScore(s.id, Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">O'qituvchi Izohi</label>
                        <input
                          type="text"
                          value={current.comment}
                          onChange={(e) => updateComment(s.id, e.target.value)}
                          placeholder="Imtihon natijasi bo'yicha izoh..."
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* CREATE / EDIT TEST MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTest ? "Imtihonni Tahrirlash" : "Yangi Imtihon / Quiz Yaratish"}
        subtitle="Kunlik Quiz yoki Har 4 darsdagi Haftalik Imtihon turini belgilang."
      >
        <form onSubmit={handleSaveTestForm} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Imtihon / Quiz Turi</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormType('DAILY')}
                className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                  formType === 'DAILY' ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-100 text-slate-500 border-slate-300'
                }`}
              >
                Kunlik Quiz (Lug'at)
              </button>
              <button
                type="button"
                onClick={() => setFormType('WEEKLY')}
                className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                  formType === 'WEEKLY' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-100 text-slate-500 border-slate-300'
                }`}
              >
                Haftalik Imtihon (Har 4 darsda)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Imtihon Sarlavhasi</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Masalan: Unit 3 Vocabulary Quiz"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Imtihon Sanasi</label>
            <input
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Maksimal Ball</label>
            <input
              type="number"
              required
              min="1"
              value={formMaxScore}
              onChange={(e) => setFormMaxScore(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" variant="primary" leftIcon={<Play className="w-3.5 h-3.5" />}>
              {editingTest ? "Saqlash" : "Yaratish & Start"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
