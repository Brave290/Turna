export default function LedgerLoading() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading ledger">
      <div className="h-8 w-40 rounded-xl bg-border/60" />
      <div className="h-10 w-full rounded-xl bg-border/40" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-border/40" />
        ))}
      </div>
    </div>
  );
}
