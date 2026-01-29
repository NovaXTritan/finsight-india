'use client';

import { useEffect, useState } from 'react';
import { signalsApi, Signal, DemoSignal } from '@/lib/api';
import { SignalsList } from '@/components/SignalsList';
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
} from 'lucide-react';

export default function SignalsPage() {
  const [signals, setSignals] = useState<(Signal | DemoSignal)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);
  const perPage = 20;

  const fetchSignals = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const data = await signalsApi.get(pageNum, perPage);
      setSignals(data.signals);
      setTotal(data.total);
      setHasMore(data.has_more);

      // If no real signals, suggest demo mode
      if (data.signals.length === 0 && !isDemoMode) {
        setIsDemoMode(true);
        await fetchDemoSignals();
      }
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
        // Refresh signals after detection
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
    critical: 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200',
    high: 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border-orange-200',
    medium: 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200',
    low: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border-blue-200',
  };

  const decisionColors: Record<string, string> = {
    BUY_CONSIDERATION: 'text-green-600',
    OPPORTUNITY: 'text-green-600',
    MONITOR: 'text-yellow-600',
    WATCH: 'text-yellow-600',
    ALERT: 'text-orange-600',
    RESEARCH: 'text-blue-600',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card-dashboard p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-glow">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Signals</h1>
              <p className="text-gray-500">
                {isDemoMode
                  ? 'Demo signals - showing sample patterns'
                  : `${total} signals detected for your watchlist`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Demo Mode Toggle */}
            <button
              onClick={toggleDemoMode}
              className={`flex items-center px-4 py-2.5 rounded-xl border transition-all ${
                isDemoMode
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 text-yellow-700'
                  : 'glass-card-dashboard text-gray-700 hover:border-primary-200'
              }`}
            >
              {isDemoMode ? (
                <ToggleRight className="h-5 w-5 mr-2 text-yellow-500" />
              ) : (
                <ToggleLeft className="h-5 w-5 mr-2" />
              )}
              {isDemoMode ? 'Demo Mode' : 'Real Data'}
            </button>

            {/* Run Detection Button */}
            {!isDemoMode && (
              <button
                onClick={runDetection}
                disabled={isDetecting}
                className="btn-glass-primary flex items-center space-x-2"
              >
                {isDetecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span>Run Detection</span>
              </button>
            )}

            <button
              onClick={() => isDemoMode ? fetchDemoSignals() : fetchSignals(page)}
              className="btn-glass-secondary flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="glass-card-dashboard border-l-4 border-l-yellow-400 p-4">
          <div className="flex items-start">
            <div className="p-2 bg-yellow-100 rounded-lg mr-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">Demo Mode Active</h3>
              <p className="text-sm text-yellow-700 mt-1">
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
        <div className={`glass-card-dashboard p-4 border-l-4 ${
          detectionMessage.includes('Found') || detectionMessage.includes('complete')
            ? 'border-l-green-500 bg-green-50/50'
            : 'border-l-blue-500 bg-blue-50/50'
        }`}>
          <div className="flex items-center">
            <Info className="h-5 w-5 mr-2 text-gray-600" />
            <span className="text-gray-700">{detectionMessage}</span>
          </div>
        </div>
      )}

      {/* Signal Type Legend */}
      <div className="glass-card-dashboard p-5">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900">Signal Types</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'Volume Spike', color: 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 border-purple-200' },
            { name: 'Breakout', color: 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-green-200' },
            { name: 'Volatility Surge', color: 'bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200' },
            { name: 'Options Activity', color: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-blue-200' },
            { name: 'Price Divergence', color: 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 border-orange-200' },
            { name: 'Support Test', color: 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border-yellow-200' },
          ].map((type) => (
            <span
              key={type.name}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border ${type.color}`}
            >
              {type.name}
            </span>
          ))}
        </div>
      </div>

      {/* Signals List */}
      <div className="glass-card-dashboard overflow-hidden">
        <div className="p-5">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-primary-50 rounded-xl" />
              ))}
            </div>
          ) : signals.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-primary-200/50 blur-xl rounded-full" />
                <Bell className="relative h-16 w-16 mx-auto text-primary-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Signals Yet</h3>
              <p className="text-gray-500 mb-4">
                Signals appear when unusual market activity is detected for your watchlist stocks.
              </p>
              <button
                onClick={() => setIsDemoMode(true)}
                className="btn-glass-primary"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Demo Signals
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {signals.map((signal) => {
                const isDemo = 'is_demo' in signal && signal.is_demo;
                return (
                  <div
                    key={signal.id}
                    className={`p-5 rounded-xl border transition-all card-hover-lift ${
                      isDemo
                        ? 'border-yellow-200 bg-gradient-to-r from-yellow-50/50 to-orange-50/30'
                        : 'glass-card-purple'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-purple-500 rounded-xl flex items-center justify-center shadow-glow">
                          <span className="text-lg font-bold text-white">
                            {signal.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">{signal.symbol}</span>
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${severityColors[signal.severity]}`}>
                              {signal.severity.toUpperCase()}
                            </span>
                            {isDemo && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                                DEMO
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {signal.pattern_type.replace(/_/g, ' ')} | Z-Score: {signal.z_score.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {signal.price?.toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className={`text-sm font-medium ${decisionColors[signal.agent_decision] || 'text-gray-600'}`}>
                          {signal.agent_decision?.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-700">{signal.agent_reason}</p>
                    </div>

                    {'context' in signal && signal.context && (
                      <div className="mb-3 p-4 bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-xl border border-primary-100">
                        <p className="text-xs text-gray-600">{signal.context}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-primary-100/50">
                      <span>
                        Detected: {new Date(signal.detected_at).toLocaleString()}
                      </span>
                      <span className="px-2 py-1 bg-primary-100 rounded-full text-primary-700 font-medium">
                        Confidence: {((signal.agent_confidence || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination - only for real signals */}
        {!isDemoMode && totalPages > 1 && (
          <div className="px-5 py-4 border-t border-primary-100/50 bg-gradient-to-r from-primary-50/30 to-purple-50/30 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} signals)
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl glass-card-dashboard hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="p-2 rounded-xl glass-card-dashboard hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
