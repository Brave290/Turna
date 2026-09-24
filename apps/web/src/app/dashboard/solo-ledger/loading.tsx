export default function SoloLedgerLoading() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading solo ledger">
      <div className="h-8 w-44 rounded-xl bg-border/60" />
      <div className="h-12 w-full rounded-xl bg-border/40" />
      <div className="h-64 rounded-2xl bg-border/40" />
    </div>
  );
}
