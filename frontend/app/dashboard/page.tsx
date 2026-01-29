'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { signalsApi, Signal } from '@/lib/api';
import { MarketSummaryCard } from '@/components/MarketSummary';
import { SignalsList } from '@/components/SignalsList';
import { WatchlistManager } from '@/components/WatchlistManager';
import { NewsFeed } from '@/components/NewsFeed';
import { Bell, RefreshCw, Zap } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);

  const fetchSignals = useCallback(async () => {
    try {
      const data = await signalsApi.getLatest(5);
      setSignals(data);
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setIsLoadingSignals(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return (
    <div className="space-y-6 stagger-children">
      {/* Welcome Header */}
      <div className="glass-card-dashboard p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back,{' '}
              <span className="gradient-text-static">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-gray-500 mt-1">Here's what's happening in the market today</p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-100 to-purple-100 rounded-xl">
              <Zap className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">
                {signals.filter(s => s.severity === 'high' || s.severity === 'critical').length} High Priority Signals
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Market Summary */}
      <MarketSummaryCard />

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Signals - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Latest Signals */}
          <div className="glass-card-dashboard overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100/50 bg-gradient-to-r from-primary-50/50 to-purple-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-primary-100 to-purple-100 rounded-lg">
                  <Bell className="h-5 w-5 text-primary-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Latest Signals</h2>
              </div>
              <button
                onClick={fetchSignals}
                className={`p-2 hover:bg-primary-100 rounded-lg transition-colors ${
                  isLoadingSignals ? 'animate-spin' : ''
                }`}
                title="Refresh signals"
              >
                <RefreshCw className="h-4 w-4 text-primary-500" />
              </button>
            </div>
            <div className="p-4">
              {isLoadingSignals ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl" />
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
