import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Group } from '../../types';
import { Send, Link as LinkIcon } from 'lucide-react';

interface TelegramGroupLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export const TelegramGroupLinkModal: React.FC<TelegramGroupLinkModalProps> = ({
  isOpen,
  onClose,
  groupId,
}) => {
  const group = useLiveQuery(() => (groupId ? db.groups.get(groupId) : undefined), [groupId]);

  const [telegramLink, setTelegramLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (group && group.notes) {
      // Check if group notes already contains a tg link
      const match = group.notes.match(/https:\/\/t\.me\/[^\s]+/);
      if (match) {
        setTelegramLink(match[0]);
      }
    }
  }, [group]);

  if (!group) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updatedNotes = group.notes
        ? `${group.notes.replace(/https:\/\/t\.me\/[^\s]+/, '').trim()}\nTelegram Group: ${telegramLink}`
        : `Telegram Group: ${telegramLink}`;

      await db.groups.update(groupId, { notes: updatedNotes });
      onClose();
    } catch (err) {
      console.error('Error saving Telegram link:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Link Telegram Parent Chat — ${group.name}`}
      subtitle="Save your Telegram parent group or channel link for 1-click sharing."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Telegram Group / Channel Link <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <LinkIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              required
              value={telegramLink}
              onChange={(e) => setTelegramLink(e.target.value)}
              placeholder="https://t.me/ielts_65_parents or t.me/+AbCdEfGhIjK"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/70 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
          <p className="font-bold text-sky-400 flex items-center gap-1">
            <Send className="w-3.5 h-3.5" /> Direct Telegram Shortcut
          </p>
          <p className="text-[11px] text-slate-400">
            Once saved, clicking "Share to Telegram" will automatically launch Telegram and direct you to this group chat.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Telegram Link
          </Button>
        </div>
      </form>
    </Modal>
  );
};
