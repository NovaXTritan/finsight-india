'use client';

import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />;
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-5 space-y-3', className)}>
      <div className="flex items-center space-x-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <div className="card p-5">
      <div className="flex items-center space-x-2 mb-3">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-7 w-24" />
    </div>
  );
}

function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-[var(--border-default)]">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-[var(--border-default)] flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-3 flex-1"
              style={{ opacity: 1 - i * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonSignal() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-5 w-20 ml-auto" />
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-24 rounded" />
      </div>
    </div>
  );
}

function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="card overflow-hidden" style={{ height }}>
      <div className="p-4 flex items-center justify-between border-b border-[var(--border-default)]">
        <Skeleton className="h-4 w-32" />
        <div className="flex space-x-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-6 w-10 rounded" />
          ))}
        </div>
      </div>
      <div className="p-4 flex items-end space-x-1 h-[calc(100%-56px)]">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="skeleton flex-1 rounded-sm"
            style={{ height: `${30 + Math.sin(i * 0.5) * 25 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonHeatmap({ tiles = 20 }: { tiles?: number }) {
  return (
    <div className="card p-4">
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: tiles }).map((_, i) => (
          <Skeleton
            key={i}
            className="aspect-square rounded-lg"
            style={{ animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonBento() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <SkeletonChart height={400} />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="space-y-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonStatCard,
  SkeletonTable,
  SkeletonSignal,
  SkeletonChart,
  SkeletonHeatmap,
  SkeletonBento,
};
