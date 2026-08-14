import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'LESSON' | 'HOMEWORK' | 'TEST' | 'PAYMENT';
  title: string;
  targetUrl: string;
}

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  events: CalendarEvent[];
  eventFilter: 'ALL' | 'LESSON' | 'HOMEWORK' | 'TEST' | 'PAYMENT';
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  events,
  eventFilter,
}) => {
  const navigate = useNavigate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startOffset = (firstDayOfWeek + 6) % 7;

  const monthNamesUz = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];

  const filteredEvents = events.filter(
    (ev) => eventFilter === 'ALL' || ev.type === eventFilter
  );

  const eventsByDate = new Map<string, CalendarEvent[]>();
  filteredEvents.forEach((ev) => {
    const list = eventsByDate.get(ev.date) || [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  });

  const calendarCells = [];
  for (let i = 0; i < startOffset; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month + 1).padStart(2, '0');
    const fullDateStr = `${year}-${monthStr}-${dayStr}`;
    calendarCells.push({ day, fullDateStr });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Card className="space-y-4 p-4 bg-white border-slate-200 overflow-x-auto">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 className="text-base font-extrabold text-slate-900">
          {monthNamesUz[month]} {year}
        </h3>
        <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 text-white">
          {filteredEvents.length} ta dars / hodisa
        </span>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-600 border-b border-slate-200 pb-2 uppercase tracking-wider">
        <span>Dush</span>
        <span>Sesh</span>
        <span>Chor</span>
        <span>Pay</span>
        <span>Jum</span>
        <span>Shan</span>
        <span className="text-rose-600">Yak</span>
      </div>

      {/* Grid Cells */}
      <div className="grid grid-cols-7 gap-1.5 min-w-[650px]">
        {calendarCells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="h-28 bg-slate-50 rounded-xl border border-slate-200" />;
          }

          const dayEvents = eventsByDate.get(cell.fullDateStr) || [];
          const isToday = cell.fullDateStr === todayStr;

          return (
            <div
              key={cell.fullDateStr}
              className={`h-28 p-1.5 rounded-xl border flex flex-col justify-between transition-colors ${
                isToday
                  ? 'bg-emerald-50 border-emerald-500 font-extrabold'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-emerald-600 text-white' : 'text-slate-800'
                  }`}
                >
                  {cell.day}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-500">
                    {dayEvents.length} ta
                  </span>
                )}
              </div>

              {/* Event Badges */}
              <div className="space-y-1 overflow-y-auto max-h-20 text-[10px]">
                {dayEvents.map((ev) => {
                  const badgeClasses = {
                    LESSON: 'bg-blue-600 text-white font-bold',
                    HOMEWORK: 'bg-amber-500 text-slate-950 font-bold',
                    TEST: 'bg-emerald-600 text-white font-extrabold',
                    PAYMENT: 'bg-red-600 text-white font-extrabold',
                  };

                  return (
                    <div
                      key={ev.id}
                      onClick={() => navigate(ev.targetUrl)}
                      title={ev.title}
                      className={`p-1 rounded truncate cursor-pointer ${badgeClasses[ev.type]}`}
                    >
                      <span>{ev.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
