'use client';

import { Download } from 'lucide-react';

function escapeCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Client-side CSV export: headers + rows → blob download.
 * Used by ledger and payments pages (no server round-trip).
 */
export function ExportCsvButton({
  filename,
  headers,
  rows,
  label = 'Export CSV',
}: {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  label?: string;
}) {
  function download() {
    const csv = [
      headers.map(escapeCell).join(','),
      ...rows.map((r) => r.map(escapeCell).join(',')),
    ].join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="btn-outline btn-sm" onClick={download}>
      <Download className="w-4 h-4" /> {label}
    </button>
  );
}
