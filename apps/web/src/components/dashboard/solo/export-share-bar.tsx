'use client';

import { FileDown, FileSpreadsheet, Printer, Share2, Bell } from 'lucide-react';
import type { ExportFormat } from './use-solo-ledger';

export function ExportShareBar({
  onExport,
  onShare,
  onRemind,
  formatOpen,
  setFormatOpen,
  canRemind,
  pendingCount,
  syncLabel,
  period,
}: {
  onExport: (format: ExportFormat) => void;
  onShare: () => void;
  onRemind: () => void;
  formatOpen: boolean;
  setFormatOpen: (v: boolean) => void;
  canRemind: boolean;
  pendingCount: number;
  syncLabel: string;
  period: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="badge bg-forest/10 text-forest text-[11px]" title={`${syncLabel} · ${period}`}>
        {pendingCount > 0 ? `${pendingCount} pending sync` : syncLabel}
      </span>
      <div className="relative">
        <button
          type="button"
          className="btn-outline btn-sm"
          onClick={() => setFormatOpen(!formatOpen)}
          aria-expanded={formatOpen}
          aria-label={`Export solo ledger for ${period}`}
        >
          <FileDown className="w-4 h-4" /> Export
        </button>
        {formatOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-white shadow-lg z-20 overflow-hidden">
            <FormatOption
              icon={<Printer className="w-4 h-4" />}
              label="Branded PDF"
              hint="Print-ready letterhead"
              onClick={() => {
                setFormatOpen(false);
                onExport('pdf');
              }}
            />
            <FormatOption
              icon={<FileSpreadsheet className="w-4 h-4" />}
              label="CSV spreadsheet"
              hint="Excel / Google Sheets"
              onClick={() => {
                setFormatOpen(false);
                onExport('csv');
              }}
            />
          </div>
        )}
      </div>
      <button type="button" className="btn-outline btn-sm" onClick={onShare}>
        <Share2 className="w-4 h-4" /> Share summary
      </button>
      {canRemind && (
        <button type="button" className="btn-outline btn-sm" onClick={onRemind}>
          <Bell className="w-4 h-4" /> Remind unpaid
        </button>
      )}
    </div>
  );
}

function FormatOption({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full flex items-start gap-2 px-3 py-2.5 text-sm text-forest hover:bg-cream text-left"
      onClick={onClick}
    >
      <span className="text-primary mt-0.5">{icon}</span>
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-[11px] text-muted">{hint}</span>
      </span>
    </button>
  );
}
