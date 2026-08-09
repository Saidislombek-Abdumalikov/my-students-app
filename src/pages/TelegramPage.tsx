import React from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { TelegramShareConsole } from '../components/telegram/TelegramShareConsole';
import { Send, Sparkles, ShieldCheck, Link as LinkIcon } from 'lucide-react';

export const TelegramPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Send className="w-6 h-6 text-sky-400" />
            <span>Telegram Integration Layer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Direct teacher communication layer with 1-click Telegram App / Web sharing shortcuts and group link memory.
          </p>
        </div>

        <Badge variant="brand" dot>
          Phase 12 Active
        </Badge>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="space-y-1 bg-slate-900/60 border-slate-800">
          <div className="flex items-center space-x-2 text-sky-400 font-bold text-xs">
            <Send className="w-4 h-4" />
            <span>1-Click App Dispatch</span>
          </div>
          <p className="text-xs text-slate-400">
            Launches your local Telegram Desktop application or Web interface pre-filled with formatted text.
          </p>
        </Card>

        <Card className="space-y-1 bg-slate-900/60 border-slate-800">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
            <LinkIcon className="w-4 h-4" />
            <span>Group Chat Link Memory</span>
          </div>
          <p className="text-xs text-slate-400">
            Store specific parent Telegram group links per class for instant teacher navigation.
          </p>
        </Card>

        <Card className="space-y-1 bg-slate-900/60 border-slate-800">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Bot Credential Leaks</span>
          </div>
          <p className="text-xs text-slate-400">
            100% client-side security. No sensitive bot tokens or API secrets exposed in frontend code.
          </p>
        </Card>
      </div>

      {/* Telegram Share Console */}
      <TelegramShareConsole />
    </div>
  );
};
