export default function SignalsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      ))}
    </div>
  );
}
