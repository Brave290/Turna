'use client';

import { useEffect, useState, useTransition } from 'react';
import { Vote, Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { createPoll, votePoll, type FeatureActionState } from '@/lib/circle-features-actions';

export type PollDto = {
  id: string;
  question: string;
  options: string[];
  status: string;
  created_at: string;
  total_votes?: number;
  my_vote?: number | null;
  counts?: number[];
};

export function CirclePolls({
  circleId,
  canCreate,
  polls: initial,
}: {
  circleId: string;
  canCreate: boolean;
  polls: PollDto[];
}) {
  const toast = useToast();
  const [items, setItems] = useState<PollDto[]>(initial);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => setItems(initial), [initial]);

  function submit() {
    const options = [optA.trim(), optB.trim()].filter(Boolean);
    if (!question.trim() || options.length < 2) {
      toast.error('Add a question and at least two options');
      return;
    }
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('question', question.trim());
    fd.set('options', JSON.stringify(options));
    startTransition(() => {
      void createPoll(null, fd).then((res) => {
        if (res?.success) {
          toast.success(res.success);
          setOpen(false);
          setQuestion('');
          setOptA('');
          setOptB('');
          if (res.poll) setItems((prev) => [res.poll!, ...prev]);
        } else {
          toast.error(res?.error?.form?.[0] ?? 'Could not create poll');
        }
      });
    });
  }

  function vote(pollId: string, index: number) {
    const fd = new FormData();
    fd.set('poll_id', pollId);
    fd.set('option_index', String(index));
    void votePoll(null, fd).then((res: FeatureActionState) => {
      if (res?.success) {
        setItems((prev) =>
          prev.map((p) => {
            if (p.id !== pollId) return p;
            const counts = [...(p.counts ?? p.options.map(() => 0))];
            if (p.my_vote != null && counts[p.my_vote] != null) {
              counts[p.my_vote] = Math.max(0, counts[p.my_vote] - 1);
            }
            counts[index] = (counts[index] ?? 0) + 1;
            return {
              ...p,
              my_vote: index,
              counts,
              total_votes: (p.total_votes ?? counts.reduce((s, n) => s + n, 0)),
            };
          })
        );
        toast.success('Vote recorded');
      } else {
        toast.error(res?.error?.form?.[0] ?? 'Could not vote');
      }
    });
  }

  return (
    <section className="card" data-no-swipe>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Vote className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-forest">Polls</h2>
        </div>
        {canCreate && (
          <button type="button" className="btn-outline btn-sm" onClick={() => setOpen((v) => !v)}>
            <Plus className="w-4 h-4" /> {open ? 'Close' : 'New poll'}
          </button>
        )}
      </div>

      {open && canCreate && (
        <div className="space-y-3 border border-border rounded-xl p-4 mb-4">
          <div>
            <label className="label" htmlFor="poll-q">Question</label>
            <input
              id="poll-q"
              className="input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Change contribution day from Friday to Saturday?"
              maxLength={200}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="poll-a">Option A</label>
              <input id="poll-a" className="input" value={optA} onChange={(e) => setOptA(e.target.value)} placeholder="Friday" />
            </div>
            <div>
              <label className="label" htmlFor="poll-b">Option B</label>
              <input id="poll-b" className="input" value={optB} onChange={(e) => setOptB(e.target.value)} placeholder="Saturday" />
            </div>
          </div>
          <button type="button" className="btn-primary btn-sm" disabled={pending} onClick={submit}>
            {pending ? <Spinner /> : 'Create poll'}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted">No polls yet.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((p) => {
            const counts = p.counts ?? p.options.map(() => 0);
            const total = counts.reduce((s, n) => s + n, 0) || 1;
            return (
              <li key={p.id} className="border border-border rounded-xl p-4">
                <p className="font-medium text-forest mb-3">{p.question}</p>
                <div className="space-y-2">
                  {p.options.map((opt, i) => {
                    const c = counts[i] ?? 0;
                    const pct = Math.round((c / total) * 100);
                    const mine = p.my_vote === i;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => vote(p.id, i)}
                        className="w-full text-left rounded-lg border border-border hover:border-primary/50 transition-colors overflow-hidden relative"
                      >
                        <span
                          className="absolute inset-y-0 left-0 bg-primary/15"
                          style={{ width: `${pct}%` }}
                          aria-hidden
                        />
                        <span className="relative flex items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span className="font-medium text-forest flex items-center gap-1.5">
                            {mine && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                            {opt}
                          </span>
                          <span className="text-muted tabular-nums">
                            {c} · {pct}%
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted mt-2">{total} votes</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
