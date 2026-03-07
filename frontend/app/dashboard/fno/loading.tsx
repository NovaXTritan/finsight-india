export default function FnOLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-[var(--bg-overlay)] rounded-lg" />
      {/* Symbol selector */}
      <div className="h-12 w-64 bg-[var(--bg-overlay)] rounded-lg" />
      {/* Options chain table */}
      <div className="h-96 bg-[var(--bg-overlay)] rounded-lg" />
    </div>
  );
}
