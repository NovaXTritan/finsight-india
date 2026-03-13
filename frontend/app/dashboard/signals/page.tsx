'use client';

import { useEffect, useState } from 'react';
import { signalsApi, Signal, DemoSignal } from '@/lib/api';
import { SignalsList } from '@/components/SignalsList';
import dynamic from 'next/dynamic';
import { SkeletonHeatmap } from '@/components/Skeleton';
import {
  Bell,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Zap,
  Eye,
  Info,
  ToggleLeft,
  ToggleRight,
  Play,
  Sparkles,
  GitBranch,
  ChevronDown,
} from 'lucide-react';

const SankeyFlow = dynamic(
  () => import('@/components/visualizations/SankeyFlow').then(mod => mod.SankeyFlow),
  { ssr: false, loading: () => <SkeletonHeatmap /> }
);

export default function SignalsPage() {
  const [signals, setSignals] = useState<(Signal | DemoSignal)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const perPage = 20;

  const fetchSignals = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const data = await signalsApi.get(pageNum, perPage);
      setSignals(data.signals);
      setTotal(data.total);
      setHasMore(data.has_more);

      // Don't auto-switch to demo mode — show empty state instead
      // Demo signals were fake/misleading
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDemoSignals = async () => {
    setIsLoading(true);
    try {
      const data = await signalsApi.getDemo();
      setSignals(data.signals);
      setTotal(data.total);
      setHasMore(false);
    } catch (error) {
      console.error('Failed to fetch demo signals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runDetection = async () => {
    setIsDetecting(true);
    setDetectionMessage(null);
    try {
      const result = await signalsApi.runDetection();
      setDetectionMessage(result.message);
      if (result.success) {
        await fetchSignals(1);
      }
    } catch (error) {
      console.error('Detection failed:', error);
      setDetectionMessage('Detection failed. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };

  const toggleDemoMode = async () => {
    const newMode = !isDemoMode;
    setIsDemoMode(newMode);

    if (newMode) {
      await fetchDemoSignals();
    } else {
      await fetchSignals(1);
    }
  };

  useEffect(() => {
    fetchSignals(page);
  }, [page]);

  const totalPages = Math.ceil(total / perPage);

  const severityColors: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    low: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  };

  const decisionColors: Record<string, string> = {
    BUY_CONSIDERATION: 'text-green-400',
    OPPORTUNITY: 'text-green-400',
    MONITOR: 'text-yellow-400',
    WATCH: 'text-yellow-400',
    ALERT: 'text-orange-400',
    RESEARCH: 'text-primary-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Bell className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Signals</h1>
              <p className="text-[var(--text-secondary)]">
                {isDemoMode
                  ? 'Demo signals - showing sample patterns'
                  : `${total} signals detected for your watchlist`}
              </p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            <button
              onClick={toggleDemoMode}
              className={`flex items-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border transition-all text-sm ${
                isDemoMode
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  : 'bg-[var(--bg-muted)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-primary-500/30'
              }`}
            >
              {isDemoMode ? (
                <ToggleRight className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-yellow-400" />
              ) : (
                <ToggleLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
              )}
              {isDemoMode ? 'Demo' : 'Real'}
            </button>

            {!isDemoMode && (
              <button
                onClick={runDetection}
                disabled={isDetecting}
                className="btn-primary flex items-center space-x-1.5 sm:space-x-2 text-sm"
              >
                {isDetecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Run Detection</span>
                <span className="sm:hidden">Detect</span>
              </button>
            )}

            <button
              onClick={() => isDemoMode ? fetchDemoSignals() : fetchSignals(page)}
              className="btn-secondary flex items-center space-x-1.5 sm:space-x-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="card border-l-2 border-l-yellow-500 p-4">
          <div className="flex items-start">
            <div className="p-2 bg-yellow-500/10 rounded-lg mr-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-yellow-400">Demo Mode Active</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                These are sample signals for demonstration purposes. Real signals appear when
                anomalies are detected in stocks from your watchlist. Add stocks to your watchlist
                and run detection to see actual signals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detection Message */}
      {detectionMessage && (
        <div className={`card p-4 border-l-2 ${
          detectionMessage.includes('Found') || detectionMessage.includes('complete')
            ? 'border-l-green-500'
            : 'border-l-primary-500'
        }`}>
          <div className="flex items-center">
            <Info className="h-5 w-5 mr-2 text-[var(--text-secondary)]" />
            <span className="text-[var(--text-secondary)]">{detectionMessage}</span>
          </div>
        </div>
      )}

      {/* Signal Type Legend */}
      <div className="card p-3 sm:p-5">
        <div className="flex items-center space-x-2 mb-3 sm:mb-4">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Signal Types</h3>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {[
            { name: 'Volume Spike', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
            { name: 'Breakout', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
            { name: 'Volatility Surge', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
            { name: 'Options Activity', color: 'bg-primary-500/10 text-primary-400 border-primary-500/20' },
            { name: 'Price Divergence', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
            { name: 'Support Test', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
          ].map((type) => (
            <span
              key={type.name}
              className={`px-3 py-1.5 text-xs font-medium rounded border ${type.color}`}
            >
              {type.name}
            </span>
          ))}
        </div>
      </div>

      {/* Signal Pipeline */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowPipeline(!showPipeline)}
          className="flex items-center justify-between w-full px-5 py-4 hover:bg-[var(--bg-muted)] transition-colors"
        >
          <div className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-primary-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Signal Detection Pipeline</h3>
          </div>
          <ChevronDown className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${showPipeline ? 'rotate-180' : ''}`} />
        </button>
        {showPipeline && (
          <div className="px-5 pb-5 border-t border-[var(--border-default)]">
            <p className="text-xs text-[var(--text-muted)] mt-3 mb-4">
              Data flows from sources through analysis and severity scoring to actionable decisions.
            </p>
            <SankeyFlow />
          </div>
        )}
      </div>

      {/* Signals List */}
      <div className="card overflow-hidden">
        <div className="p-5">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-[var(--bg-muted)] rounded-lg" />
              ))}
            </div>
          ) : signals.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Signals Yet</h3>
              <p className="text-[var(--text-secondary)] mb-2">
                Signals appear when real anomalies are detected in your watchlist stocks.
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Add stocks to your watchlist, then run detection to scan for volume spikes, breakouts, and unusual activity.
              </p>
              <button
                onClick={runDetection}
                disabled={isDetecting}
                className="btn-primary"
              >
                <Play className="h-4 w-4 mr-2 inline" />
                {isDetecting ? 'Detecting...' : 'Run Detection Now'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {signals.map((signal) => {
                const isDemo = 'is_demo' in signal && signal.is_demo;
                return (
                  <div
                    key={signal.id}
                    className={`p-5 rounded-lg border transition-all ${
                      isDemo
                        ? 'border-yellow-500/20 bg-yellow-500/5'
                        : 'bg-[var(--bg-muted)] border-[var(--border-default)]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-500/10 border border-primary-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-400 font-mono">
                            {signal.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-[var(--text-primary)]">{signal.symbol}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${severityColors[signal.severity]}`}>
                              {signal.severity.toUpperCase()}
                            </span>
                            {isDemo && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                DEMO
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-[var(--text-muted)] mt-0.5">
                            {signal.pattern_type.replace(/_/g, ' ')} | Z-Score: <span className="font-mono">{signal.z_score.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-[var(--text-primary)] font-mono">
                          {signal.price?.toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className={`text-sm font-medium ${decisionColors[signal.signal_action] || 'text-[var(--text-muted)]'}`}>
                          {signal.signal_action?.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-[var(--text-secondary)]">{signal.reasoning}</p>
                    </div>

                    {'context' in signal && signal.context && (
                      <div className="mb-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)]">
                        <p className="text-xs text-[var(--text-muted)]">{signal.context}</p>
                      </div>
                    )}

                    {/* Catalyst Context */}
                    {signal.catalyst_context && Object.keys(signal.catalyst_context).length > 0 && (
                      <div className="mb-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)] space-y-1">
                        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Catalyst Context</p>
                        {Object.entries(signal.catalyst_context).map(([key, val]) => (
                          <p key={key} className="text-xs text-[var(--text-muted)]">
                            <span className="text-primary-400 font-medium">{key.replace(/_/g, ' ')}:</span> {val}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-default)]">
                      <span>
                        Detected: {new Date(signal.detected_at).toLocaleString()}
                      </span>
                      <div className="flex items-center space-x-3">
                        <span className="text-yellow-400" title={`Confidence Level ${signal.confidence_level || 1}/5`}>
                          {'★'.repeat(signal.confidence_level || 1)}{'☆'.repeat(5 - (signal.confidence_level || 1))}
                        </span>
                        <span className="px-2 py-1 bg-primary-500/10 rounded text-primary-400 font-medium font-mono">
                          {((signal.statistical_confidence || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isDemoMode && totalPages > 1 && (
          <div className="px-5 py-4 border-t border-[var(--border-default)] flex items-center justify-between">
            <div className="text-sm text-[var(--text-muted)] font-mono">
              Page {page} of {totalPages} ({total} signals)
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)] hover:border-[var(--text-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="p-2 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)] hover:border-[var(--text-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
