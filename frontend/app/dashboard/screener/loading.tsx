export default function ScreenerLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      {/* Filter bar */}
      <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      {/* Table rows */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      ))}
    </div>
  );
}
