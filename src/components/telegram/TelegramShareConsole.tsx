import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Copy, Send, ExternalLink, Sparkles, Check, Link as LinkIcon } from 'lucide-react';
import { TelegramGroupLinkModal } from './TelegramGroupLinkModal';

export const TelegramShareConsole: React.FC = () => {
  const groups = useLiveQuery(() => db.groups.where('status').equals('ACTIVE').toArray());
  const recentCommunications = useLiveQuery(() => db.parentCommunications.toArray());

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [messageText, setMessageText] = useState(
    `📚 *DAILY LESSON & HOMEWORK UPDATE*\n` +
      `🏫 *Class Group:* IELTS Intensive 6.5\n` +
      `📅 *Date:* 2026-08-08\n\n` +
      `✅ *Attendance:* 100% Present\n` +
      `📖 *Today's Topic:* Reading Passage 3 Strategies & Task 2 Argumentative Essays\n\n` +
      `📝 *Assigned Homework:* Cambridge 18 Test 2 Passage 3 + 250-word Task 2 Essay\n` +
      `⏰ *Deadline:* August 15, 2026\n\n` +
      `💬 *Teacher Note:* Great progress today! Please check answer sheets attached.`
  );

  const [copied, setCopied] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  if (groups && groups.length > 0 && !selectedGroupId) {
    setSelectedGroupId(groups[0].id);
  }

  if (!groups) return null;

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenTelegramWeb = () => {
    const encoded = encodeURIComponent(messageText);
    window.open(`https://t.me/share/url?url=${encoded}`, '_blank');
  };

  const handleOpenTelegramApp = () => {
    const encoded = encodeURIComponent(messageText);
    window.open(`tg://msg?text=${encoded}`, '_self');
  };

  return (
    <div className="space-y-4">
      {/* Group & Quick Controls Bar */}
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Send className="w-5 h-5 text-sky-400" />
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-300">Target Group:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700/60 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-brand-500"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<LinkIcon className="w-3.5 h-3.5 text-sky-400" />}
            onClick={() => setIsLinkModalOpen(true)}
          >
            Configure Group Telegram Link
          </Button>
        </div>
      </Card>

      {/* Live Formatted Telegram Message Editor */}
      <Card className="space-y-4 bg-slate-900/90 border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">Telegram Formatted Message Workspace</h3>
          </div>
          <Badge variant="info">Markdown & Emojis Formatted</Badge>
        </div>

        <textarea
          rows={11}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type or paste your formatted Telegram update message here..."
          className="w-full p-4 bg-slate-950 border border-slate-700/60 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-brand-500 leading-relaxed shadow-inner"
        />

        {/* 1-Click Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            onClick={handleCopy}
          >
            {copied ? 'Copied to Clipboard!' : '1-Click Copy Text'}
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ExternalLink className="w-4 h-4 text-sky-400" />}
              onClick={handleOpenTelegramApp}
            >
              Open Telegram App
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleOpenTelegramWeb}
            >
              Share to Telegram Web
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal for Group Link */}
      <TelegramGroupLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        groupId={selectedGroupId}
      />
    </div>
  );
};
