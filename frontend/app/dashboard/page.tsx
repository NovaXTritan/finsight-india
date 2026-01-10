'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { signalsApi, Signal } from '@/lib/api';
import { MarketSummaryCard } from '@/components/MarketSummary';
import { SignalsList } from '@/components/SignalsList';
import { WatchlistManager } from '@/components/WatchlistManager';
import { NewsFeed } from '@/components/NewsFeed';
import { Bell, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);

  const fetchSignals = async () => {
    try {
      const data = await signalsApi.getLatest(5);
      setSignals(data);
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setIsLoadingSignals(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500">Here's what's happening in the market today</p>
        </div>
      </div>

      {/* Market Summary */}
      <MarketSummaryCard />

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Signals - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Latest Signals */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Latest Signals</h2>
              </div>
              <button
                onClick={fetchSignals}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Refresh signals"
              >
                <RefreshCw className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              {isLoadingSignals ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : (
                <SignalsList
                  signals={signals}
                  onActionRecorded={fetchSignals}
                />
              )}
            </div>
          </div>

          {/* News */}
          <NewsFeed limit={10} />
        </div>

        {/* Sidebar - Watchlist */}
        <div className="space-y-6">
          <WatchlistManager onUpdate={fetchSignals} />
        </div>
      </div>
    </div>
  );
}
