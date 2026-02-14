export default function PortfolioLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
      {/* Holdings table */}
      <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  );
}
