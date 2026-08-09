import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { LessonPlan } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { BookOpen, Target, FileText, Check, Save } from 'lucide-react';

interface LessonPlanEditorProps {
  lessonId: string;
}

export const LessonPlanEditor: React.FC<LessonPlanEditorProps> = ({ lessonId }) => {
  const existingPlan = useLiveQuery(
    () => db.lessonPlans.where('lessonId').equals(lessonId).first(),
    [lessonId]
  );

  const [formData, setFormData] = useState<Partial<LessonPlan>>({
    topic: 'Reading Passage 3 Strategies & Task 2 Argumentative Essays',
    objectives: 'Master True/False/Not Given scanning and structure 4-paragraph essays.',
    vocabulary: 'academic, contentious, substantial, reiterate',
    grammar: 'Complex sentences & conditional clauses (If... Type 3)',
    reading: 'Cambridge 18 Test 2 Passage 3',
    listening: 'Section 4 Academic Lecture',
    speaking: 'Part 2 Cue Card: Describe a challenging project',
    writing: 'Task 2 Essay Planning & Hook sentences',
    activities: 'Group brainstorming & peer review of essay introductions',
    materials: 'Handouts & audio track 14',
    plannedHomework: 'Write 250-word Task 2 essay and memorize 15 vocabulary words',
    teacherNotes: 'Focus on time management during reading passage 3',
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingPlan) {
      setFormData({
        topic: existingPlan.topic || '',
        objectives: existingPlan.objectives || '',
        vocabulary: existingPlan.vocabulary || '',
        grammar: existingPlan.grammar || '',
        reading: existingPlan.reading || '',
        listening: existingPlan.listening || '',
        speaking: existingPlan.speaking || '',
        writing: existingPlan.writing || '',
        activities: existingPlan.activities || '',
        materials: existingPlan.materials || '',
        plannedHomework: existingPlan.plannedHomework || '',
        teacherNotes: existingPlan.teacherNotes || '',
      });
    }
  }, [existingPlan]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (existingPlan) {
        await db.lessonPlans.update(existingPlan.id, {
          ...formData,
        });
      } else {
        const newPlan: LessonPlan = {
          id: `lp-${Date.now()}`,
          lessonId,
          topic: formData.topic || '',
          objectives: formData.objectives || '',
          ...formData,
        };
        await db.lessonPlans.add(newPlan);
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving lesson plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="space-y-4 bg-slate-900/90 border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-brand-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">Planned Lesson Syllabus (PLANNED)</h3>
            <p className="text-xs text-slate-400">Target objectives and planned materials for this lesson session.</p>
          </div>
        </div>
        <Badge variant="info">PLANNED</Badge>
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-brand-400" /> Lesson Topic
            </label>
            <input
              type="text"
              value={formData.topic || ''}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g. IELTS Reading Passage 3 & Essay Structure"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/60 rounded-lg text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Learning Objectives
            </label>
            <input
              type="text"
              value={formData.objectives || ''}
              onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              placeholder="e.g. Students will learn scanning strategies and essay outlines"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/60 rounded-lg text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Target Vocabulary</label>
            <input
              type="text"
              value={formData.vocabulary || ''}
              onChange={(e) => setFormData({ ...formData, vocabulary: e.target.value })}
              placeholder="Word list..."
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Grammar Focus</label>
            <input
              type="text"
              value={formData.grammar || ''}
              onChange={(e) => setFormData({ ...formData, grammar: e.target.value })}
              placeholder="Grammar topics..."
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Reading Passage</label>
            <input
              type="text"
              value={formData.reading || ''}
              onChange={(e) => setFormData({ ...formData, reading: e.target.value })}
              placeholder="Reading text..."
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Listening Task</label>
            <input
              type="text"
              value={formData.listening || ''}
              onChange={(e) => setFormData({ ...formData, listening: e.target.value })}
              placeholder="Listening audio..."
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Speaking Cards</label>
            <input
              type="text"
              value={formData.speaking || ''}
              onChange={(e) => setFormData({ ...formData, speaking: e.target.value })}
              placeholder="Speaking topics..."
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Writing Prompt</label>
            <input
              type="text"
              value={formData.writing || ''}
              onChange={(e) => setFormData({ ...formData, writing: e.target.value })}
              placeholder="Writing task..."
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-brand-400" /> Planned Homework
          </label>
          <input
            type="text"
            value={formData.plannedHomework || ''}
            onChange={(e) => setFormData({ ...formData, plannedHomework: e.target.value })}
            placeholder="Intended homework for students..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700/60 rounded-lg text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <Button
            type="submit"
            size="sm"
            variant="primary"
            isLoading={isSaving}
            leftIcon={isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          >
            {isSaved ? 'Lesson Plan Saved!' : 'Save Lesson Plan'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
