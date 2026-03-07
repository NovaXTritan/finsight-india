export default function BacktestLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-44 bg-[var(--bg-overlay)] rounded-lg" />
      {/* Strategy presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-[var(--bg-overlay)] rounded-lg" />
        ))}
      </div>
      {/* Config form */}
      <div className="h-64 bg-[var(--bg-overlay)] rounded-lg" />
    </div>
  );
}
