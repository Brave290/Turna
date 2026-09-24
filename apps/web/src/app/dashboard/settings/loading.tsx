export default function SettingsLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading settings">
      <div className="h-20 rounded-2xl bg-border/50" />
      <div className="h-4 w-24 rounded bg-border/40" />
      <div className="rounded-2xl border border-border bg-white divide-y divide-border/60 px-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-1 py-4">
            <div className="w-9 h-9 rounded-xl bg-border/50" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-40 rounded bg-border/50" />
              <div className="h-3 w-56 rounded bg-border/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
