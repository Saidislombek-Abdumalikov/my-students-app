import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MessageGenerator } from '../components/communication/MessageGenerator';
import { MessageType } from '../types';
import { MessageSquare, Send, CalendarCheck, FileCheck, FileSpreadsheet, History } from 'lucide-react';

export const CommunicationsPage: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const students = useLiveQuery(() => db.students.where('status').equals('ACTIVE').toArray());
  const communicationsHistory = useLiveQuery(() => db.parentCommunications.toArray());

  const todayStr = new Date().toISOString().split('T')[0];

  const [messageType, setMessageType] = useState<MessageType>('DAILY_UPDATE');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  if (groups && groups.length > 0 && !selectedGroupId) {
    setSelectedGroupId(groups[0].id);
  }

  if (students && students.length > 0 && !selectedStudentId) {
    setSelectedStudentId(students[0].id);
  }

  if (!groups || !students || !communicationsHistory) {
    return <LoadingSpinner label="Loading parent communication workspace..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal-400" />
            <span>Parent Communication Generator</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict 5-step workflow: Generate → Preview → Edit → Confirm → Share. Nothing is sent automatically.
          </p>
        </div>

        <Badge variant="brand" dot>
          Phase 11 Active
        </Badge>
      </div>

      {/* Message Category Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { type: 'DAILY_UPDATE', label: 'Daily Lesson Update', icon: <CalendarCheck className="w-4 h-4 text-brand-400" /> },
          { type: 'HOMEWORK', label: 'Homework Notice', icon: <FileCheck className="w-4 h-4 text-emerald-400" /> },
          { type: 'TEST_RESULT', label: 'Test Result Message', icon: <FileSpreadsheet className="w-4 h-4 text-amber-400" /> },
          { type: 'MONTHLY_REPORT', label: 'Monthly Student Report', icon: <MessageSquare className="w-4 h-4 text-purple-400" /> },
        ].map((item) => (
          <Card
            key={item.type}
            hoverable
            onClick={() => setMessageType(item.type as MessageType)}
            className={`p-3.5 flex items-center space-x-3 transition-all ${
              messageType === item.type
                ? 'bg-brand-950/80 border-brand-500/60 ring-2 ring-brand-500/30'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">{item.icon}</div>
            <div>
              <h3 className="text-xs font-bold text-slate-200">{item.label}</h3>
              <p className="text-[10px] text-slate-400 font-mono">Template</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Context Selector Bar */}
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Group Selector */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-300 min-w-16">Group:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-brand-500 w-full sm:w-56"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Student Selector (for individual reports) */}
          {(messageType === 'TEST_RESULT' || messageType === 'MONTHLY_REPORT') && (
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-300 min-w-16">Student:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-brand-500 w-full sm:w-56"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Selector */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-300 min-w-14">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </Card>

      {/* Message Generator Workflow Engine */}
      {selectedGroupId && (
        <MessageGenerator
          messageType={messageType}
          groupId={selectedGroupId}
          studentId={selectedStudentId}
          dateStr={selectedDate}
        />
      )}

      {/* Communication Drafts History */}
      <Card className="space-y-3 bg-slate-900/90 border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold text-slate-200">Confirmed Message Snapshots</h3>
          </div>
          <Badge variant="brand" size="sm">{communicationsHistory.length} Saved</Badge>
        </div>

        {communicationsHistory.length === 0 ? (
          <p className="text-xs text-slate-400 p-2">No saved parent communication snapshots yet.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {communicationsHistory.slice(-4).map((c) => (
              <div key={c.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="info" size="sm">{c.messageType}</Badge>
                  <span className="text-[10px] text-slate-400 font-mono">{c.sentAt.split('T')[0]}</span>
                </div>
                <p className="text-slate-300 truncate font-mono text-[11px]">{c.messageText.slice(0, 100)}...</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
