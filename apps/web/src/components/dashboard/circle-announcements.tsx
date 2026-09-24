'use client';

import { useEffect, useState, useTransition } from 'react';
import { Megaphone, Pin, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { formatRelativeTime } from '@/lib/utils';
import {
  postAnnouncement,
  togglePinAnnouncement,
  deleteAnnouncement,
} from '@/lib/circle-features-actions';

export type AnnouncementDto = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  author_name?: string | null;
};

export function CircleAnnouncements({
  circleId,
  canPost,
  announcements: initial,
}: {
  circleId: string;
  canPost: boolean;
  announcements: AnnouncementDto[];
}) {
  const toast = useToast();
  const [items, setItems] = useState<AnnouncementDto[]>(initial);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => setItems(initial), [initial]);

  function submit() {
    if (!title.trim() || !body.trim()) return;
    const t = title.trim();
    const b = body.trim();
    const p = pinned;
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('title', t);
    fd.set('body', b);
    fd.set('pinned', p ? '1' : '');
    startTransition(() => {
      void postAnnouncement(null, fd).then((res) => {
        if (res?.success) {
          toast.success(res.success);
          setOpen(false);
          setTitle('');
          setBody('');
          setPinned(false);
          if (res.announcement) {
            setItems((prev) => [
              res.announcement!,
              ...prev.filter((a) => a.id !== res.announcement!.id),
            ]);
          }
        } else {
          toast.error(res?.error?.form?.[0] ?? 'Could not post');
        }
      });
    });
  }

  const sorted = [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <section className="card" data-no-swipe>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-forest">Announcements</h2>
        </div>
        {canPost && (
          <button type="button" className="btn-outline btn-sm" onClick={() => setOpen((v) => !v)}>
            <Plus className="w-4 h-4" /> {open ? 'Close' : 'Post'}
          </button>
        )}
      </div>

      {open && canPost && (
        <div className="space-y-3 border border-border rounded-xl p-4 mb-4">
          <div>
            <label className="label" htmlFor="ann-title">Title</label>
            <input
              id="ann-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Deadline moved to Saturday"
            />
          </div>
          <div>
            <label className="label" htmlFor="ann-body">Message</label>
            <textarea
              id="ann-body"
              className="input min-h-[80px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={800}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-forest">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-4 h-4 border-border text-primary focus:ring-primary/40"
            />
            Pin to top
          </label>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={pending || !title.trim() || !body.trim()}
            onClick={submit}
          >
            {pending ? <Spinner /> : 'Post announcement'}
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No announcements yet.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((a) => (
            <li key={a.id} className="rounded-xl border border-border p-3 bg-cream/50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-forest flex items-center gap-1.5">
                    {a.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                    {a.title}
                  </p>
                  <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{a.body}</p>
                  <p className="text-xs text-muted mt-2">
                    {a.author_name ? `${a.author_name} · ` : ''}
                    {formatRelativeTime(a.created_at)}
                  </p>
                </div>
                {canPost && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-muted hover:bg-white"
                      aria-label={a.pinned ? 'Unpin' : 'Pin'}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set('id', a.id);
                        fd.set('circle_id', circleId);
                        fd.set('pinned', a.pinned ? '0' : '1');
                        void togglePinAnnouncement(null, fd).then((res) => {
                          if (res?.success) {
                            setItems((prev) =>
                              prev.map((x) => (x.id === a.id ? { ...x, pinned: !x.pinned } : x))
                            );
                          } else if (res?.error?.form?.[0]) {
                            toast.error(res.error.form[0]);
                          }
                        });
                      }}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-error hover:bg-error/10"
                      aria-label="Delete"
                      onClick={() => {
                        const fd = new FormData();
                        fd.set('id', a.id);
                        fd.set('circle_id', circleId);
                        void deleteAnnouncement(null, fd).then((res) => {
                          if (res?.success) {
                            setItems((prev) => prev.filter((x) => x.id !== a.id));
                            toast.success('Announcement removed');
                          } else if (res?.error?.form?.[0]) {
                            toast.error(res.error.form[0]);
                          }
                        });
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
