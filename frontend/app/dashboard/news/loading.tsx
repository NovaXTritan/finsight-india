export default function NewsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      ))}
    </div>
  );
}
