export default function WatchlistLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-[var(--bg-overlay)] rounded-lg" />
        <div className="h-9 w-28 bg-[var(--bg-overlay)] rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-36 bg-[var(--bg-overlay)] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
