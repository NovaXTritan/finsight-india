export default function MacroLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-36 bg-[var(--bg-overlay)] rounded-lg" />
      {/* Indicator cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-[var(--bg-overlay)] rounded-lg" />
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-72 bg-[var(--bg-overlay)] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
