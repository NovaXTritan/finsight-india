'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useWatchlistStore } from '@/lib/store';
import { signalsApi, Signal } from '@/lib/api';
import { MarketSummaryCard } from '@/components/MarketSummary';
import { SignalsList } from '@/components/SignalsList';
import { WatchlistManager } from '@/components/WatchlistManager';
import { NewsFeed } from '@/components/NewsFeed';
import { SkeletonChart, SkeletonCard, SkeletonSignal, SkeletonHeatmap } from '@/components/Skeleton';
import { RegimeBanner } from '@/components/RegimeBanner';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Bell, RefreshCw, Zap, BarChart3, ArrowRight, Activity } from 'lucide-react';
import Link from 'next/link';

const StockChart = dynamic(
  () => import('@/components/StockChart').then(mod => mod.StockChart),
  { ssr: false, loading: () => <SkeletonChart height={420} /> }
);

const AnomalyHeatmap = dynamic(
  () => import('@/components/visualizations/AnomalyHeatmap').then(mod => mod.AnomalyHeatmap),
  { ssr: false, loading: () => <SkeletonHeatmap /> }
);

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const } },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { symbols: watchlistSymbols } = useWatchlistStore();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  const [chartSymbol, setChartSymbol] = useState('RELIANCE');

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

  useEffect(() => {
    if (watchlistSymbols.length > 0 && chartSymbol === 'RELIANCE') {
      setChartSymbol(watchlistSymbols[0]);
    }
  }, [watchlistSymbols, chartSymbol]);

  const highPriorityCount = signals.filter(s => s.severity === 'high' || s.severity === 'critical').length;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Welcome + Quick Stats */}
      <motion.div variants={fadeUp} className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display text-[var(--text-primary)]">
            Welcome back, <span className="text-primary-400">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Here&apos;s what&apos;s happening in the market today</p>
        </div>
        {highPriorityCount > 0 && (
          <Link
            href="/dashboard/signals"
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-red-500/8 border border-red-500/15 rounded-lg hover:bg-red-500/12 transition-colors group"
          >
            <Zap className="h-3.5 w-3.5 text-red-400" />
            <span className="text-sm font-medium text-red-400 font-mono">
              {highPriorityCount} High Priority
            </span>
            <ArrowRight className="h-3 w-3 text-red-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </motion.div>

      {/* Market Regime Banner */}
      <motion.div variants={fadeUp}>
        <RegimeBanner />
      </motion.div>

      {/* Market Summary */}
      <motion.div variants={fadeUp}>
        <MarketSummaryCard />
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column - 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Chart */}
          <motion.div variants={fadeUp}>
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-primary-400" />
                  <h2 className="text-heading font-display text-[var(--text-primary)]">Price Chart</h2>
                </div>
                {watchlistSymbols.length > 0 && (
                  <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide">
                    {watchlistSymbols.slice(0, 8).map(sym => (
                      <button
                        key={sym}
                        onClick={() => setChartSymbol(sym)}
                        className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all whitespace-nowrap ${
                          chartSymbol === sym
                            ? 'bg-primary-500/15 text-primary-400 border border-primary-500/25'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] border border-transparent'
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <StockChart symbol={chartSymbol} height={380} />
            </div>
          </motion.div>

          {/* Anomaly Heatmap */}
          <motion.div variants={fadeUp}>
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-primary-400" />
                  <h2 className="text-heading font-display text-[var(--text-primary)]">Market Heatmap</h2>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">Z-Score Intensity</span>
              </div>
              <div className="p-4">
                <AnomalyHeatmap
                  onStockClick={(sym) => setChartSymbol(sym)}
                />
              </div>
            </div>
          </motion.div>

          {/* Signals */}
          <motion.div variants={fadeUp}>
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4 text-primary-400" />
                  <h2 className="text-heading font-display text-[var(--text-primary)]">Latest Signals</h2>
                </div>
                <button
                  onClick={fetchSignals}
                  className={`p-1.5 hover:bg-[var(--bg-muted)] rounded-lg transition-colors ${
                    isLoadingSignals ? 'animate-spin' : ''
                  }`}
                  title="Refresh signals"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-primary-400" />
                </button>
              </div>
              <div className="p-4">
                {isLoadingSignals ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <SkeletonSignal key={i} />
                    ))}
                  </div>
                ) : signals.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center">
                      <Bell className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">No signals detected</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs mx-auto">
                      Signals appear when anomalies are found in your watchlist stocks
                    </p>
                  </div>
                ) : (
                  <SignalsList signals={signals} onActionRecorded={fetchSignals} />
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right column - 1/3 */}
        <div className="space-y-5">
          <motion.div variants={fadeUp}>
            <WatchlistManager onUpdate={fetchSignals} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <NewsFeed limit={8} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
