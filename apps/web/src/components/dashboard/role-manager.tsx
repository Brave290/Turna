'use client';

import { useTransition } from 'react';
import { Shield, UserCog, Eye, Landmark, Crown } from 'lucide-react';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { setMemberRole, type FeatureActionState } from '@/lib/circle-features-actions';

const ROLES = [
  {
    value: 'treasurer',
    label: 'Treasurer',
    icon: Landmark,
    hint: 'Confirm contributions, post announcements',
  },
  {
    value: 'member',
    label: 'Member',
    icon: UserCog,
    hint: 'Contribute, vote, view own records',
  },
  {
    value: 'observer',
    label: 'Observer',
    icon: Eye,
    hint: 'Read-only ledger access',
  },
] as const;

export function RoleManager({
  circleId,
  isOwner,
  members,
}: {
  circleId: string;
  isOwner: boolean;
  members: {
    id: string;
    user_id: string;
    role: string;
    display_name: string | null;
    isSelf: boolean;
  }[];
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function change(memberId: string, role: string) {
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('member_id', memberId);
    fd.set('role', role);
    startTransition(() => {
      void setMemberRole(null, fd).then((res: FeatureActionState) => {
        if (res?.success) toast.success(res.success);
        else toast.error(res?.error?.form?.[0] ?? 'Could not update role');
      });
    });
  }

  return (
    <section className="card" data-no-swipe>
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-forest">Roles & permissions</h2>
      </div>
      <p className="text-xs text-muted mb-4">
        Owner controls settings and deletes. Treasurer confirms contributions
        and posts announcements. Observer is read-only.
      </p>

      <div className="grid sm:grid-cols-3 gap-2 mb-4">
        {ROLES.map((r) => (
          <div key={r.value} className="rounded-xl border border-border p-3 bg-cream/50">
            <p className="text-sm font-medium text-forest flex items-center gap-1.5">
              <r.icon className="w-4 h-4 text-primary" />
              {r.label}
            </p>
            <p className="text-xs text-muted mt-1">{r.hint}</p>
          </div>
        ))}
      </div>

      <ul className="divide-y divide-border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium text-forest truncate">
                {m.display_name ?? 'Member'}
                {m.isSelf && <span className="text-muted font-normal"> (you)</span>}
              </p>
              <span className="badge bg-forest/10 text-forest capitalize text-[10px]">
                {m.role}
              </span>
            </div>
            {isOwner && m.role !== 'owner' && (
              <select
                className="input w-auto text-sm py-1.5"
                value={m.role}
                disabled={pending}
                onChange={(e) => change(m.id, e.target.value)}
                aria-label={`Role for ${m.display_name ?? 'member'}`}
              >
                {m.role === 'owner' && (
                  <option value="owner">Owner</option>
                )}
                <option value="treasurer">Treasurer</option>
                <option value="member">Member</option>
                <option value="observer">Observer</option>
              </select>
            )}
            {m.role === 'owner' && (
              <Crown className="w-4 h-4 text-warning shrink-0" aria-label="Owner" />
            )}
          </li>
        ))}
      </ul>
      {pending && (
        <p className="text-xs text-muted mt-2 flex items-center gap-1">
          <Spinner className="w-3 h-3" /> Saving…
        </p>
      )}
    </section>
  );
}
