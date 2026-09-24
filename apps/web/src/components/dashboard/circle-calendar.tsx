'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';

export function CircleCalendar({
  cycles,
  currency,
}: {
  cycles: {
    id: string;
    cycle_number: number;
    due_date: string;
    status: string;
    expected_amount: number;
  }[];
  currency: string;
}) {
  const sorted = useMemo(
    () => [...cycles].sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [cycles]
  );
  const [selectedId, setSelectedId] = useState<string | null>(sorted[0]?.id ?? null);
  const selected = sorted.find((c) => c.id === selectedId) ?? sorted[0] ?? null;

  const byDay = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const c of sorted) {
      const key = c.due_date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [sorted]);

  const days = useMemo(() => {
    if (sorted.length === 0) return [];
    const first = new Date(sorted[0].due_date + 'T00:00:00');
    const start = new Date(first);
    start.setDate(1);
    const last = new Date(sorted[sorted.length - 1].due_date + 'T00:00:00');
    const end = new Date(last);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    const out: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      out.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [sorted]);

  return (
    <section className="card" data-no-swipe>
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-forest">Circle calendar</h2>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">
          No cycle dates yet. Calendars appear once the circle is active.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = d.toISOString().slice(0, 10);
              const list = byDay.get(key) ?? [];
              const has = list.length > 0;
              const isSelected = has && list.some((c) => c.id === selectedId);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!has}
                  onClick={() => has && setSelectedId(list[0].id)}
                  className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center border transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary text-white'
                      : has
                        ? 'border-primary/40 bg-primary/10 text-forest hover:border-primary'
                        : 'border-transparent text-muted/50'
                  }`}
                  aria-label={has ? `Cycle due ${formatDate(key)}` : undefined}
                >
                  <span className="font-medium">{d.getDate()}</span>
                  {has && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-primary'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="rounded-xl border border-border bg-cream p-4">
              <p className="text-xs text-muted uppercase tracking-wider">
                {formatDate(selected.due_date)}
              </p>
              <p className="font-display text-lg font-bold text-forest mt-1">
                Contribution due · Cycle {selected.cycle_number}
              </p>
              <div className="flex items-center justify-between gap-3 mt-2">
                <p className="text-sm text-muted flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  {formatCurrency(selected.expected_amount, currency)}
                </p>
                <StatusBadge status={selected.status} />
              </div>
              {selected.status === 'collecting' && (
                <p className="text-xs text-primary mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Open for contributions
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
