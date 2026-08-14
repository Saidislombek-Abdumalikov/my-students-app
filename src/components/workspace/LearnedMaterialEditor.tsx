import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { LearnedMaterial } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { CheckCircle2, Award, Check, Save } from 'lucide-react';

interface LearnedMaterialEditorProps {
  lessonId: string;
}

export const LearnedMaterialEditor: React.FC<LearnedMaterialEditorProps> = ({ lessonId }) => {
  const existingLearned = useLiveQuery(
    () => db.learnedMaterial.where('lessonId').equals(lessonId).first(),
    [lessonId]
  );

  const [formData, setFormData] = useState<Partial<LearnedMaterial>>({
    vocabulary: 'academic, contentious, substantial, reiterate (Practiced 15 new words)',
    grammar: 'Conditionals Type 3 & Mixed Conditionals in essays',
    readingPassage: 'Cambridge 18 Test 2 Passage 3 (Questions 27-40 completed)',
    listeningActivity: 'Section 4 Academic Lecture (Average score: 32/40)',
    speakingTopic: 'Part 2 Cue Card: Describe a challenging project (Individual feedback given)',
    writingTechnique: 'Task 2 Essay Planning & 4-paragraph body paragraph development',
    examStrategy: 'Time management: max 20 minutes for Passage 3',
    customNotes: 'Group performed exceptionally well on True/False questions',
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingLearned) {
      setFormData({
        vocabulary: existingLearned.vocabulary || '',
        grammar: existingLearned.grammar || '',
        readingPassage: existingLearned.readingPassage || '',
        listeningActivity: existingLearned.listeningActivity || '',
        speakingTopic: existingLearned.speakingTopic || '',
        writingTechnique: existingLearned.writingTechnique || '',
        examStrategy: existingLearned.examStrategy || '',
        customNotes: existingLearned.customNotes || '',
      });
    }
  }, [existingLearned]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (existingLearned) {
        await db.learnedMaterial.update(existingLearned.id, {
          ...formData,
        });
      } else {
        const newLearned: LearnedMaterial = {
          id: `lm-${Date.now()}`,
          lessonId,
          ...formData,
        };
        await db.learnedMaterial.add(newLearned);
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving learned material:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="space-y-4 bg-white border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">What Was Actually Learned (ACTUALLY LEARNED)</h3>
            <p className="text-xs text-slate-500">Record the exact material, passages, and techniques taught in class today.</p>
          </div>
        </div>
        <Badge variant="success">ACTUALLY LEARNED</Badge>
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-600" /> Vocabulary Taught
            </label>
            <input
              type="text"
              value={formData.vocabulary || ''}
              onChange={(e) => setFormData({ ...formData, vocabulary: e.target.value })}
              placeholder="Exact words covered today..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Grammar Taught</label>
            <input
              type="text"
              value={formData.grammar || ''}
              onChange={(e) => setFormData({ ...formData, grammar: e.target.value })}
              placeholder="Grammar points mastered..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Reading Passage Completed</label>
            <input
              type="text"
              value={formData.readingPassage || ''}
              onChange={(e) => setFormData({ ...formData, readingPassage: e.target.value })}
              placeholder="Text/passage details..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Listening Activity Done</label>
            <input
              type="text"
              value={formData.listeningActivity || ''}
              onChange={(e) => setFormData({ ...formData, listeningActivity: e.target.value })}
              placeholder="Listening section..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Speaking Topic Discussed</label>
            <input
              type="text"
              value={formData.speakingTopic || ''}
              onChange={(e) => setFormData({ ...formData, speakingTopic: e.target.value })}
              placeholder="Speaking cards..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Writing Technique Taught</label>
            <input
              type="text"
              value={formData.writingTechnique || ''}
              onChange={(e) => setFormData({ ...formData, writingTechnique: e.target.value })}
              placeholder="Writing structure..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Exam Strategies Covered</label>
            <input
              type="text"
              value={formData.examStrategy || ''}
              onChange={(e) => setFormData({ ...formData, examStrategy: e.target.value })}
              placeholder="Exam tricks & timing..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Teacher Lesson Notes</label>
            <input
              type="text"
              value={formData.customNotes || ''}
              onChange={(e) => setFormData({ ...formData, customNotes: e.target.value })}
              placeholder="Observations on group..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <Button
            type="submit"
            size="sm"
            variant="success"
            isLoading={isSaving}
            leftIcon={isSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
          >
            {isSaved ? 'Learned Record Saved!' : 'Save Learned Record'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
