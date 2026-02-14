export default function FnOLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      {/* Symbol selector */}
      <div className="h-12 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      {/* Options chain table */}
      <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  );
}
