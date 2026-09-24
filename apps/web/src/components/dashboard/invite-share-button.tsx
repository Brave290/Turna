'use client';

import { useState } from 'react';
import { QrCode, Users } from 'lucide-react';
import { InviteShareModal } from '@/components/dashboard/invite-share-modal';
import { formatCurrency } from '@/lib/utils';

export function InviteShareButton({
  circleId,
  circleName,
  contributionAmount,
  currency,
  frequency,
  memberCount,
  memberLimit,
}: {
  circleId: string;
  circleName: string;
  contributionAmount: number;
  currency: string;
  frequency: string;
  memberCount: number;
  memberLimit: number;
}) {
  const [open, setOpen] = useState(false);
  const contributionLabel = `${formatCurrency(contributionAmount, currency)} / ${frequency.replace('biweekly', '2 weeks')}`;

  return (
    <>
      <button type="button" className="btn-primary btn-sm" onClick={() => setOpen(true)}>
        <QrCode className="w-4 h-4" />
        Invite members
      </button>
      <InviteShareModal
        open={open}
        onClose={() => setOpen(false)}
        circleId={circleId}
        circleName={circleName}
        contributionLabel={contributionLabel}
        memberCount={memberCount}
        memberLimit={memberLimit}
      />
      <span className="sr-only">
        <Users className="w-4 h-4" /> {memberCount} of {memberLimit} members
      </span>
    </>
  );
}
