import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Award, Save, Check, Image as ImageIcon, Sparkles } from 'lucide-react';

interface TestResultScorerProps {
  testId: string;
}

interface StudentScoreItem {
  score: number;
  listeningScore: number;
  readingScore: number;
  writingScore: number;
  speakingScore: number;
  comment: string;
  screenshotUrl: string;
}

import { validateAndFormatScore } from '../../utils/scoreValidation';

export const TestResultScorer: React.FC<TestResultScorerProps> = ({ testId }) => {
  const test = useLiveQuery(() => db.tests.get(testId), [testId]);
  const memberships = useLiveQuery(
    async () => {
      if (!test) return [];
      return await db.groupStudents.where('groupId').equals(test.groupId).toArray();
    },
    [test?.groupId]
  );
  const allStudents = useLiveQuery(() => db.students.toArray());
  const existingResults = useLiveQuery(
    () => db.testResults.where('testId').equals(testId).toArray(),
    [testId]
  );

  const [scoresState, setScoresState] = useState<Record<string, StudentScoreItem>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!memberships || !allStudents) return;

    const activeStudentIds = new Set(
      memberships.filter((m) => m.status === 'ACTIVE').map((m) => m.studentId)
    );

    const initialState: Record<string, StudentScoreItem> = {};

    activeStudentIds.forEach((sId) => {
      const res = existingResults?.find((r) => r.studentId === sId);
      initialState[sId] = {
        score: res ? res.score : 6.5,
        listeningScore: res?.listeningScore || 7.0,
        readingScore: res?.readingScore || 6.5,
        writingScore: res?.writingScore || 6.0,
        speakingScore: res?.speakingScore || 6.5,
        comment: res?.comment || '',
        screenshotUrl: res?.screenshotUrl || '',
      };
    });

    setScoresState(initialState);
  }, [memberships, allStudents, existingResults]);

  if (!test || !memberships || !allStudents) {
    return <LoadingSpinner label="Loading test scoring workspace..." />;
  }

  const activeStudentIds = new Set(
    memberships.filter((m) => m.status === 'ACTIVE').map((m) => m.studentId)
  );
  const enrolledStudents = allStudents.filter((s) => activeStudentIds.has(s.id));
  const isIELTS = test.category.startsWith('IELTS');

  const updateStudentScore = (studentId: string, field: keyof StudentScoreItem, val: any) => {
    setScoresState((prev) => {
      const current = prev[studentId] || {
        score: 6.5,
        listeningScore: 7.0,
        readingScore: 6.5,
        writingScore: 6.0,
        speakingScore: 6.5,
        comment: '',
        screenshotUrl: '',
      };

      const updated = { ...current, [field]: val };

      // Auto-calculate Overall Band if IELTS subskills changed
      if (isIELTS && (field === 'listeningScore' || field === 'readingScore' || field === 'writingScore' || field === 'speakingScore')) {
        const avg =
          (Number(updated.listeningScore) +
            Number(updated.readingScore) +
            Number(updated.writingScore) +
            Number(updated.speakingScore)) /
          4;
        // Round to nearest 0.5
        updated.score = Math.round(avg * 2) / 2;
      }

      return {
        ...prev,
        [studentId]: updated,
      };
    });

    setIsSaved(false);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const entriesToSave = Object.entries(scoresState).map(([studentId, data]) => {
        const validated = validateAndFormatScore(data.score, test.maxScore, test.category);
        return {
          id: `tr-${testId}-${studentId}`,
          testId,
          studentId,
          score: validated.score,
          percentage: validated.percentage,
          listeningScore: Number(data.listeningScore),
          readingScore: Number(data.readingScore),
          writingScore: Number(data.writingScore),
          speakingScore: Number(data.speakingScore),
          comment: data.comment,
          screenshotUrl: data.screenshotUrl,
          createdAt: now,
        };
      });

      await db.testResults.bulkPut(entriesToSave);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving test scores:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Test Scorer Header */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">{test.title}</h3>
            <Badge variant="brand" size="sm">{test.category}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Date: <span className="text-emerald-600 font-semibold">{test.date}</span> • Max Score: {test.maxScore}
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          isLoading={isSaving}
          leftIcon={isSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
          onClick={handleSaveAll}
        >
          {isSaved ? 'Scores Saved!' : 'Save All Test Results'}
        </Button>
      </Card>

      {/* Student Scoring Sheet */}
      {enrolledStudents.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <p className="text-xs">No active students in group.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrolledStudents.map((student) => {
            const data = scoresState[student.id] || {
              score: 6.5,
              listeningScore: 7.0,
              readingScore: 6.5,
              writingScore: 6.0,
              speakingScore: 6.5,
              comment: '',
              screenshotUrl: '',
            };

            const percentage = Math.round((data.score / test.maxScore) * 100);

            return (
              <Card key={student.id} className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{student.fullName}</h4>
                    <p className="text-xs text-slate-500">{student.phone}</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge variant={percentage >= 75 ? 'success' : percentage >= 50 ? 'warning' : 'danger'}>
                      Overall: {data.score} ({percentage}%)
                    </Badge>
                  </div>
                </div>

                {/* IELTS Subskills Grid or Raw Score */}
                {isIELTS ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500">Listening (0-9)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="9"
                        value={data.listeningScore}
                        onChange={(e) => updateStudentScore(student.id, 'listeningScore', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-emerald-700 text-sm"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500">Reading (0-9)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="9"
                        value={data.readingScore}
                        onChange={(e) => updateStudentScore(student.id, 'readingScore', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-blue-700 text-sm"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500">Writing (0-9)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="9"
                        value={data.writingScore}
                        onChange={(e) => updateStudentScore(student.id, 'writingScore', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-emerald-700 text-sm"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500">Speaking (0-9)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="9"
                        value={data.speakingScore}
                        onChange={(e) => updateStudentScore(student.id, 'speakingScore', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-amber-700 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-48 text-xs">
                    <label className="block font-semibold text-slate-500 mb-1">Score / {test.maxScore}</label>
                    <input
                      type="number"
                      step="1"
                      value={data.score}
                      onChange={(e) => updateStudentScore(student.id, 'score', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-emerald-700 text-sm"
                    />
                  </div>
                )}

                {/* Screenshot URL & Teacher Comment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <input
                      type="text"
                      value={data.comment}
                      onChange={(e) => updateStudentScore(student.id, 'comment', e.target.value)}
                      placeholder="Teacher comment (e.g. Needs work on Task 2 writing structure)..."
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="relative">
                    <ImageIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={data.screenshotUrl}
                      onChange={(e) => updateStudentScore(student.id, 'screenshotUrl', e.target.value)}
                      placeholder="Attach result screenshot URL / file link..."
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
