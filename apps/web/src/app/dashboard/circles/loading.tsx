export default function CirclesLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading circles">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 rounded-xl bg-border/60" />
          <div className="h-4 w-56 rounded bg-border/40" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-border/50" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-44 rounded-2xl bg-border/40" />
        ))}
      </div>
    </div>
  );
}
