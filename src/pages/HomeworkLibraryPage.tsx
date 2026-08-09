import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { SaveToLibraryModal } from '../components/homework-library/SaveToLibraryModal';
import { AssignLibraryItemModal } from '../components/homework-library/AssignLibraryItemModal';
import { HomeworkLibraryItem } from '../types';
import { Library, Plus, Search, Eye, Send, Tag, BookOpen } from 'lucide-react';

export const HomeworkLibraryPage: React.FC = () => {
  const libraryItems = useLiveQuery(() => db.homeworkLibrary.toArray());

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [itemToAssign, setItemToAssign] = useState<HomeworkLibraryItem | null>(null);
  const [itemToPreview, setItemToPreview] = useState<HomeworkLibraryItem | null>(null);

  // Seed sample library items if library is empty
  useEffect(() => {
    async function seedLibrary() {
      const count = await db.homeworkLibrary.count();
      if (count > 0) return;

      const seeds: HomeworkLibraryItem[] = [
        {
          id: 'hl-1',
          title: 'IELTS Cambridge 18 Reading & Task 2 Package',
          courseSubject: 'IELTS Preparation',
          level: 'Upper-Intermediate',
          category: 'Cambridge Practice',
          tasks: [
            {
              title: 'Reading Passage 3 Scanning',
              taskType: 'READING',
              instructions: 'Complete Cambridge 18 Test 2 Passage 3 questions 27-40.',
              maxScore: 40,
            },
            {
              title: 'Task 2 Essay Brainstorming',
              taskType: 'WRITING',
              instructions: 'Outline 2 body paragraphs for Essay Prompt #4.',
              maxScore: 9,
            },
            {
              title: 'Academic Vocabulary Bank',
              taskType: 'VOCABULARY',
              instructions: 'Memorize 20 high-frequency academic collocations.',
              maxScore: 20,
            },
          ],
          tags: ['cambridge', 'reading', 'writing', 'task2'],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'hl-2',
          title: 'General English B2 Grammar & Listening Suite',
          courseSubject: 'General English',
          level: 'Intermediate',
          category: 'Grammar',
          tasks: [
            {
              title: 'Conditionals Type 2 & 3 Worksheet',
              taskType: 'GRAMMAR',
              instructions: 'Complete exercise 1-15 on page 42.',
              maxScore: 15,
            },
            {
              title: 'BBC Podcast Listening Task',
              taskType: 'LISTENING',
              instructions: 'Listen to 6-minute English and answer 5 comprehension questions.',
              maxScore: 10,
            },
          ],
          tags: ['b2', 'grammar', 'conditionals', 'listening'],
          createdAt: new Date().toISOString(),
        },
      ];

      await db.homeworkLibrary.bulkAdd(seeds);
    }

    seedLibrary().catch(console.error);
  }, []);

  if (!libraryItems) {
    return <LoadingSpinner label="Loading homework library bank..." />;
  }

  const filteredItems = libraryItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = subjectFilter === 'ALL' || item.courseSubject === subjectFilter;

    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Library className="w-6 h-6 text-purple-400" />
            <span>Reusable Homework Library</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Teaching bank of reusable homework packages. Preview, search, and assign to any class group with 1 click.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsSaveModalOpen(true)}
        >
          Create Library Template
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel p-3 rounded-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, tag, or category..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs text-slate-400 font-medium">Subject:</span>
          {['ALL', 'IELTS Preparation', 'General English', 'Grammar & Vocabulary'].map(
            (subject) => (
              <button
                key={subject}
                onClick={() => setSubjectFilter(subject)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  subjectFilter === subject
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {subject}
              </button>
            )
          )}
        </div>
      </div>

      {/* Library Cards Grid */}
      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          <p className="text-xs">No homework templates found matching criteria.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} hoverable className="flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="info" size="sm">{item.courseSubject}</Badge>
                    <h3 className="text-base font-bold text-slate-100 mt-1 group-hover:text-purple-400 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                  <Badge variant="brand" size="sm">{item.tasks.length} Tasks</Badge>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                  <span className="font-semibold text-slate-300">Included Tasks:</span>
                  {item.tasks.map((t, idx) => (
                    <p key={idx} className="text-slate-400 text-[11px] truncate">
                      • <strong className="text-brand-400">[{t.taskType}]</strong> {t.title}
                    </p>
                  ))}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-950/60 text-purple-300 border border-purple-800/50 flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => setItemToPreview(item)}
                >
                  Preview
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  onClick={() => setItemToAssign(item)}
                >
                  Assign to Group
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Save Template Modal */}
      <SaveToLibraryModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />

      {/* Assign Template Modal */}
      <AssignLibraryItemModal
        isOpen={!!itemToAssign}
        onClose={() => setItemToAssign(null)}
        libraryItem={itemToAssign}
      />

      {/* Preview Modal */}
      {itemToPreview && (
        <Modal
          isOpen={!!itemToPreview}
          onClose={() => setItemToPreview(null)}
          title={`Preview: ${itemToPreview.title}`}
          subtitle={`${itemToPreview.courseSubject} • Level: ${itemToPreview.level}`}
        >
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-slate-200">Tasks Breakdown ({itemToPreview.tasks.length}):</h4>
            {itemToPreview.tasks.map((t, idx) => (
              <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <p className="font-bold text-slate-100">
                  Task #{idx + 1}: {t.title} <span className="text-brand-400">[{t.taskType}]</span>
                </p>
                <p className="text-slate-400">{t.instructions}</p>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setItemToPreview(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
