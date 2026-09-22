"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center text-xl font-bold mx-auto mb-4">
          !
        </div>
        <h1 className="text-2xl font-bold text-forest mb-2">
          Something went wrong
        </h1>
        <p className="text-muted mb-6">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
