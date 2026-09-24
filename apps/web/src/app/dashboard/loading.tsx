export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-xl bg-border/60" />
      <div className="h-4 w-72 rounded-lg bg-border/40" />
      <div className="h-40 rounded-[20px] bg-border/50" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 rounded-2xl bg-border/40" />
        <div className="h-28 rounded-2xl bg-border/40" />
        <div className="h-28 rounded-2xl bg-border/40" />
        <div className="h-28 rounded-2xl bg-border/40" />
      </div>
      <div className="h-32 rounded-2xl bg-border/40" />
    </div>
  );
}
