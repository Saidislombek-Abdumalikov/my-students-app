import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { MessageType, ParentCommunication } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Copy, Check, Send, Edit3, Eye, Sparkles } from 'lucide-react';

interface MessageGeneratorProps {
  messageType: MessageType;
  groupId: string;
  studentId?: string;
  dateStr: string;
}

export const MessageGenerator: React.FC<MessageGeneratorProps> = ({
  messageType,
  groupId,
  studentId,
  dateStr,
}) => {
  const group = useLiveQuery(() => db.groups.get(groupId), [groupId]);
  const student = useLiveQuery(() => (studentId ? db.students.get(studentId) : undefined), [studentId]);
  const lesson = useLiveQuery(
    () => db.lessons.where('[groupId+date]').equals([groupId, dateStr]).first(),
    [groupId, dateStr]
  );
  const attendanceList = useLiveQuery(
    async () => {
      if (!lesson) return [];
      return await db.attendance.where('lessonId').equals(lesson.id).toArray();
    },
    [lesson?.id]
  );
  const learned = useLiveQuery(
    async () => {
      if (!lesson) return undefined;
      return await db.learnedMaterial.where('lessonId').equals(lesson.id).first();
    },
    [lesson?.id]
  );
  const packages = useLiveQuery(
    () => db.homeworkPackages.where('groupId').equals(groupId).toArray(),
    [groupId]
  );
  const latestPackage = packages && packages.length > 0 ? packages[packages.length - 1] : null;
  const packageTasks = useLiveQuery(
    async () => {
      if (!latestPackage) return [];
      return await db.homeworkTasks.where('packageId').equals(latestPackage.id).toArray();
    },
    [latestPackage?.id]
  );

  const [step, setStep] = useState<'GENERATE' | 'PREVIEW' | 'CONFIRMED'>('GENERATE');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate message text based on selected template & DB data
  const handleGenerateText = () => {
    const groupName = group ? group.name : 'IELTS Class';
    const course = group ? group.courseSubject : 'General English';
    let text = '';

    if (messageType === 'DAILY_UPDATE') {
      const presentCount = attendanceList?.filter((a) => a.status === 'PRESENT').length || 0;
      const totalCount = attendanceList?.length || 0;

      text = `📚 *DAILY LESSON UPDATE — ${groupName}*\n📅 *Date:* ${dateStr}\n\n` +
        `✅ *Attendance Summary:* ${presentCount}/${totalCount} Present\n` +
        `📖 *Today's Topic:* ${lesson?.title || 'IELTS Reading & Writing Workshop'}\n` +
        `💡 *What We Learned Today:*\n` +
        `• Vocabulary: ${learned?.vocabulary || '15 new academic collocations'}\n` +
        `• Grammar: ${learned?.grammar || 'Conditionals & Complex structures'}\n` +
        `• Reading: ${learned?.readingPassage || 'Cambridge Passage 3 Practice'}\n\n` +
        `📝 *Assigned Homework:* ${latestPackage ? latestPackage.title : 'See homework channel'}\n` +
        `⏰ *Homework Deadline:* ${latestPackage ? latestPackage.deadline : 'Next class'}\n\n` +
        `💬 *Teacher Note:* Great progress and active participation today! Keep up the hard work.`;
    } else if (messageType === 'HOMEWORK') {
      text = `📝 *HOMEWORK ASSIGNMENT — ${groupName}*\n📅 *Assigned Date:* ${dateStr}\n` +
        `⏰ *Deadline:* ${latestPackage ? latestPackage.deadline : 'Next Monday'}\n\n` +
        `📌 *Tasks Package:* ${latestPackage ? latestPackage.title : 'Weekly IELTS Package'}\n\n` +
        (packageTasks && packageTasks.length > 0
          ? packageTasks.map((t, idx) => `${idx + 1}. *[${t.taskType}]* ${t.title}\n   👉 ${t.instructions}`).join('\n\n')
          : `1. *[READING]* Cambridge 18 Passage 3\n2. *[WRITING]* 250-word Task 2 Essay`) +
        `\n\n⚠️ *Important:* Please submit your work on time for full teacher feedback.`;
    } else if (messageType === 'TEST_RESULT') {
      const studentName = student ? student.fullName : 'Sardor Rahimjonov';
      text = `📊 *EXAM RESULT NOTIFICATION*\n👤 *Student:* ${studentName}\n` +
        `🏫 *Group:* ${groupName}\n📅 *Date:* ${dateStr}\n\n` +
        `🏆 *IELTS Band Score:* 7.0 Overall (78%)\n` +
        `🎧 Listening: 7.5\n📖 Reading: 7.5\n✍️ Writing: 6.5\n🗣️ Speaking: 6.5\n\n` +
        `💬 *Teacher Comment:* Excellent reading speed and vocabulary! Work on Task 2 body paragraph transitions.`;
    } else {
      const studentName = student ? student.fullName : 'Sardor Rahimjonov';
      text = `📈 *MONTHLY PROGRESS REPORT*\n👤 *Student:* ${studentName}\n` +
        `🏫 *Group:* ${groupName}\n📅 *Month:* ${dateStr.slice(0, 7)}\n\n` +
        `✅ *Attendance Rate:* 100% (All classes attended)\n` +
        `📝 *Homework Completion:* 95%\n` +
        `📊 *Latest Exam Score:* 7.0 Band\n\n` +
        `🌟 *Strengths:* Reading scanning speed & active class participation.\n` +
        `🎯 *Target Area:* Writing Task 2 essay structure.\n\n` +
        `Thank you for supporting ${studentName}'s learning journey!`;
    }

    setMessageText(text);
    setStep('PREVIEW');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    try {
      const newComm: ParentCommunication = {
        id: `pc-${Date.now()}`,
        studentId: studentId || undefined,
        groupId: groupId || undefined,
        lessonId: lesson?.id || undefined,
        messageType,
        messageText,
        sentAt: new Date().toISOString(),
        status: 'SENT',
      };

      await db.parentCommunications.add(newComm);
      setStep('CONFIRMED');
    } catch (err) {
      console.error('Error saving communication draft:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 5-Step Workflow Status Bar */}
      <Card className="flex items-center justify-between bg-slate-900/90 border-brand-500/30 p-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span>Workflow Step:</span>
          <div className="flex items-center space-x-1.5 font-mono">
            <span className={step === 'GENERATE' ? 'text-brand-400 font-bold' : 'text-slate-500'}>1. Generate</span>
            <span className="text-slate-600">→</span>
            <span className={step === 'PREVIEW' ? 'text-brand-400 font-bold' : 'text-slate-500'}>2. Preview/Edit</span>
            <span className="text-slate-600">→</span>
            <span className={step === 'CONFIRMED' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>3. Confirm & Share</span>
          </div>
        </div>

        <Badge variant={step === 'CONFIRMED' ? 'success' : 'brand'}>
          {step === 'CONFIRMED' ? 'Confirmed & Saved' : 'Drafting Mode'}
        </Badge>
      </Card>

      {/* Action Workspace */}
      {step === 'GENERATE' && (
        <Card className="p-8 text-center space-y-4">
          <p className="text-xs text-slate-300">
            Click below to generate an formatted parent update message for <strong className="text-brand-400">{group?.name || 'Class Group'}</strong>.
          </p>
          <Button
            variant="primary"
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={handleGenerateText}
          >
            Generate Message Draft
          </Button>
        </Card>
      )}

      {(step === 'PREVIEW' || step === 'CONFIRMED') && (
        <Card className="space-y-4 bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Edit3 className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-slate-100">
                {step === 'CONFIRMED' ? 'Confirmed Parent Message' : 'Preview & Edit Message Text'}
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 italic">Teacher confirmation required before sending</span>
          </div>

          {/* Editable Text Area */}
          <div>
            <textarea
              rows={12}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              disabled={step === 'CONFIRMED'}
              className="w-full p-4 bg-slate-950 border border-slate-700/60 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-brand-500 leading-relaxed shadow-inner"
            />
          </div>

          {/* Control Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Copy className="w-4 h-4" />}
              onClick={handleCopy}
            >
              {copied ? 'Copied to Clipboard!' : 'Copy Text'}
            </Button>

            {step !== 'CONFIRMED' ? (
              <Button
                variant="success"
                isLoading={isSaving}
                leftIcon={<Check className="w-4 h-4" />}
                onClick={handleConfirmAndSave}
              >
                Confirm Message & Save Snapshot
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('PREVIEW')}
                >
                  Edit Again
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Send className="w-4 h-4" />}
                  onClick={() => {
                    const encoded = encodeURIComponent(messageText);
                    window.open(`https://t.me/share/url?url=${encoded}`, '_blank');
                  }}
                >
                  Share to Telegram
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
