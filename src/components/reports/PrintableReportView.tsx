import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Printer } from 'lucide-react';
import { Button } from '../common/Button';

interface PrintableReportViewProps {
  title: string;
  subtitle: string;
  period: string;
  groupName: string;
  summaryMetrics: { label: string; value: string | number }[];
  headers: string[];
  rows: (string | number)[][];
  onPrint?: () => void;
}

export const PrintableReportView: React.FC<PrintableReportViewProps> = ({
  title,
  subtitle,
  period,
  groupName,
  summaryMetrics,
  headers,
  rows,
  onPrint,
}) => {
  const handlePrint = () => {
    if (onPrint) onPrint();
    window.print();
  };

  return (
    <Card className="space-y-6 bg-white border-slate-200 p-6 print:bg-white print:text-black print:p-0 print:border-none">
      {/* Printable Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 print:border-black pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 print:text-black">{title}</h2>
            <Badge variant="brand" size="sm" className="print:hidden">{groupName}</Badge>
          </div>
          <p className="text-xs text-slate-500 print:text-slate-700 mt-1">{subtitle}</p>
          <p className="text-xs font-mono text-slate-500 print:text-slate-800 mt-0.5">
            Reporting Period: <strong>{period}</strong> • Class: <strong>{groupName}</strong>
          </p>
        </div>

        <div className="print:hidden">
          <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Print Report
          </Button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
        {summaryMetrics.map((m, i) => (
          <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-slate-100 print:border-slate-300">
            <p className="text-[11px] font-semibold text-slate-500 print:text-slate-600">{m.label}</p>
            <p className="text-base font-bold text-slate-900 print:text-black mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Report Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-slate-600 print:text-black border-collapse">
          <thead className="bg-slate-50 text-slate-500 print:bg-slate-200 print:text-black border-b border-slate-200 print:border-slate-400 uppercase font-bold text-[10px]">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="py-2.5 px-3 border-r border-slate-200 print:border-slate-300">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 print:divide-slate-300">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-100 print:hover:bg-transparent">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="py-2.5 px-3 border-r border-slate-200 print:border-slate-300 font-mono text-[11px]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
