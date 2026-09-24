'use client';

import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';

export function JoinActions({
  joinUrl,
  disabled,
  full,
}: {
  joinUrl: string;
  disabled: boolean;
  full: boolean;
}) {
  return (
    <div className="space-y-3">
      <Link
        href={joinUrl}
        className={`btn-primary w-full inline-flex justify-center items-center gap-2 ${
          disabled ? 'pointer-events-none opacity-50' : ''
        }`}
        aria-disabled={disabled}
      >
        {full ? 'Circle is full' : 'Join Circle'}
        {!full && <ArrowRight className="w-4 h-4" />}
      </Link>
      <Link
        href="/"
        className="btn-outline w-full inline-flex justify-center items-center gap-2"
      >
        <Users className="w-4 h-4" />
        Learn about Turna
      </Link>
    </div>
  );
}
