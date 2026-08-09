import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FileRecord } from '../../types';
import { Upload, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedStudentId?: string;
  preselectedGroupId?: string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  preselectedStudentId,
  preselectedGroupId,
}) => {
  const students = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const tests = useLiveQuery(() => db.tests.toArray());

  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'IMAGE' | 'PDF' | 'DOCUMENT'>('IMAGE');
  const [url, setUrl] = useState('');
  const [studentId, setStudentId] = useState(preselectedStudentId || '');
  const [groupId, setGroupId] = useState(preselectedGroupId || '');
  const [testId, setTestId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!students || !groups || !tests) return null;

  const handleQuickPreset = (presetUrl: string, name: string) => {
    setUrl(presetUrl);
    setFileName(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim() || !url.trim()) return;

    setIsSubmitting(true);
    try {
      const newFile: FileRecord = {
        id: `f-${Date.now()}`,
        fileName,
        fileType,
        fileSize: 1024 * 350, // 350 KB
        url,
        studentId: studentId || undefined,
        groupId: groupId || undefined,
        testId: testId || undefined,
        uploadedAt: new Date().toISOString(),
      };

      await db.files.add(newFile);

      // If attached to student test result, update testResult record with screenshot URL
      if (testId && studentId) {
        const existingRes = await db.testResults
          .where('[testId+studentId]')
          .equals([testId, studentId])
          .first();

        if (existingRes) {
          await db.testResults.update(existingRes.id, { screenshotUrl: url });
        }
      }

      onClose();
    } catch (err) {
      console.error('Error uploading file record:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload & Tag Result Screenshot"
      subtitle="Attach test result screenshots, answer sheets, or documents to student profiles."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            File / Screenshot Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="e.g. Sardor_IELTS_Mock1_Result_Screenshot.png"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Screenshot / File Image URL <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <LinkIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or data:image/png..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex items-center space-x-2 mt-1.5">
            <span className="text-[10px] text-slate-400">Sample presets:</span>
            <button
              type="button"
              onClick={() => handleQuickPreset('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600', 'IELTS_Exam_Sheet.jpg')}
              className="text-[10px] text-brand-400 hover:underline cursor-pointer"
            >
              Preset 1 (Exam Sheet)
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600', 'Score_Breakdown_Screenshot.png')}
              className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
            >
              Preset 2 (Score Breakdown)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Associate Student</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="">All / General</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Associate Group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Associate Test</label>
            <select
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="">None / General</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Upload className="w-4 h-4" />}>
            Upload Screenshot
          </Button>
        </div>
      </form>
    </Modal>
  );
};
