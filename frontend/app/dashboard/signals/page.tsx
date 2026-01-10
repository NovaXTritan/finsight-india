'use client';

import { useEffect, useState } from 'react';
import { signalsApi, Signal } from '@/lib/api';
import { SignalsList } from '@/components/SignalsList';
import { Bell, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const perPage = 20;

  const fetchSignals = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const data = await signalsApi.get(pageNum, perPage);
      setSignals(data.signals);
      setTotal(data.total);
      setHasMore(data.has_more);
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals(page);
  }, [page]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bell className="h-7 w-7 mr-2 text-primary-600" />
            All Signals
          </h1>
          <p className="text-gray-500">
            {total} signals detected for your watchlist
          </p>
        </div>
        <button
          onClick={() => fetchSignals(page)}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Signals List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <SignalsList
              signals={signals}
              onActionRecorded={() => fetchSignals(page)}
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} signals)
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
