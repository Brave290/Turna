'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card text-center py-14 max-w-md mx-auto">
      <p className="font-display text-2xl font-bold text-forest mb-2">
        Something went wrong
      </p>
      <p className="text-sm text-muted mb-6">
        We couldn&apos;t load the overview. Please try again.
      </p>
      <button type="button" onClick={reset} className="btn-primary">
        Try again
      </button>
      {error?.digest ? (
        <p className="text-xs text-muted/70 mt-4">Ref: {error.digest}</p>
      ) : null}
    </div>
  );
}
