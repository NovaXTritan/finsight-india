export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-[var(--bg-overlay)] rounded-lg" />
        <div className="h-8 w-24 bg-[var(--bg-overlay)] rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-[var(--bg-overlay)] rounded-lg" />
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-[var(--bg-overlay)] rounded-lg" />
        <div className="h-80 bg-[var(--bg-overlay)] rounded-lg" />
      </div>
    </div>
  );
}
