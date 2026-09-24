'use client';

import { useTransition } from 'react';
import { Play, Pause, CheckCircle2, SkipForward, Archive } from 'lucide-react';
import {
  setCircleLifecycle,
  advanceCycle,
  leaveCircle,
} from '@/lib/circle-actions';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { useConfirm } from '@/components/ui';

/**
 * Owner lifecycle controls: start / pause / resume / complete + cycle advance.
 */
export function LifecycleControls({
  circleId,
  status,
}: {
  circleId: string;
  status: string;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function act(action: string) {
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('action', action);
    startTransition(() => {
      void (async () => {
        const res = await setCircleLifecycle(null, fd);
        if (res?.success) toast.success(res.success);
        else if (res?.error?.form?.[0]) toast.error(res.error.form[0]);
      })();
    });
  }

  function cycleAct(action: string) {
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('action', action);
    startTransition(() => {
      void (async () => {
        const res = await advanceCycle(null, fd);
        if (res?.success) toast.success(res.success);
        else if (res?.error?.form?.[0]) toast.error(res.error.form[0]);
      })();
    });
  }

  const canStart = status === 'draft' || status === 'paused';
  const canPause = status === 'active';
  const canComplete = status === 'active' || status === 'paused';

  return (
    <section className="card" data-no-swipe>
      <h2 className="font-semibold text-forest mb-1">Lifecycle</h2>
      <p className="text-xs text-muted mb-4">
        Owner only. Start creates the first collecting cycle. Close a cycle when
        contributions are done, then pay out and open the next.
      </p>
      <div className="flex flex-wrap gap-2">
        {canStart && (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={pending}
            onClick={() => act(status === 'paused' ? 'resume' : 'start')}
          >
            {pending ? <Spinner /> : <><Play className="w-4 h-4" /> {status === 'paused' ? 'Resume' : 'Start circle'}</>}
          </button>
        )}
        {canPause && (
          <button
            type="button"
            className="btn-outline btn-sm"
            disabled={pending}
            onClick={() => act('pause')}
          >
            <Pause className="w-4 h-4" /> Pause
          </button>
        )}
        {status === 'active' && (
          <>
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={pending}
              onClick={() => cycleAct('close')}
            >
              <Archive className="w-4 h-4" /> Close cycle
            </button>
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={pending}
              onClick={() => cycleAct('next')}
            >
              <SkipForward className="w-4 h-4" /> Next cycle
            </button>
          </>
        )}
        {canComplete && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={pending}
            onClick={() => act('complete')}
          >
            <CheckCircle2 className="w-4 h-4" /> Complete
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Leave circle (member) with confirm.
 * Renders the confirm dialog from useConfirm alongside the button.
 */
export function LeaveCircleButton({
  circleId,
  circleName,
}: {
  circleId: string;
  circleName: string;
}) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [pending, startTransition] = useTransition();

  async function onClick() {
    const ok = await confirm(
      `You will leave "${circleName}". You cannot rejoin without a new invite.`,
      { title: 'Leave circle?', confirmLabel: 'Leave', danger: true }
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set('circle_id', circleId);
    startTransition(() => {
      void (async () => {
        const res = await leaveCircle(null, fd);
        if (res?.error?.form?.[0]) toast.error(res.error.form[0]);
      })();
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn-outline btn-sm text-error border-error/30 hover:bg-error/5"
        disabled={pending}
        onClick={onClick}
      >
        {pending ? <Spinner /> : 'Leave circle'}
      </button>
      {dialog}
    </>
  );
}
