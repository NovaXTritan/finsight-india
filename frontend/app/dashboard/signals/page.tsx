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
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bell className="h-7 w-7 mr-2 text-primary-600" />
            Signals
          </h1>
          <p className="text-gray-500">
            {isDemoMode
              ? 'Demo signals - showing sample patterns'
              : `${total} signals detected for your watchlist`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Demo Mode Toggle */}
          <button
            onClick={toggleDemoMode}
            className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
              isDemoMode
                ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isDemoMode ? (
              <ToggleRight className="h-5 w-5 mr-2" />
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
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isDetecting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Run Detection
            </button>
          )}

          <button
            onClick={() => isDemoMode ? fetchDemoSignals() : fetchSignals(page)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Demo Mode Active</h3>
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
        <div className={`p-4 rounded-lg border ${
          detectionMessage.includes('Found') || detectionMessage.includes('complete')
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            {detectionMessage}
          </div>
        </div>
      )}

      {/* Signal Type Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Signal Types</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'Volume Spike', color: 'bg-purple-100 text-purple-700' },
            { name: 'Breakout', color: 'bg-green-100 text-green-700' },
            { name: 'Volatility Surge', color: 'bg-red-100 text-red-700' },
            { name: 'Options Activity', color: 'bg-blue-100 text-blue-700' },
            { name: 'Price Divergence', color: 'bg-orange-100 text-orange-700' },
            { name: 'Support Test', color: 'bg-yellow-100 text-yellow-700' },
          ].map((type) => (
            <span
              key={type.name}
              className={`px-2 py-1 text-xs rounded-full ${type.color}`}
            >
              {type.name}
            </span>
          ))}
        </div>
      </div>

      {/* Signals List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : signals.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Signals Yet</h3>
              <p className="text-gray-500 mb-4">
                Signals appear when unusual market activity is detected for your watchlist stocks.
              </p>
              <button
                onClick={() => setIsDemoMode(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
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
                    className={`p-4 rounded-lg border ${
                      isDemo ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-primary-700">
                            {signal.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">{signal.symbol}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${severityColors[signal.severity]}`}>
                              {signal.severity.toUpperCase()}
                            </span>
                            {isDemo && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                                DEMO
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
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
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">{signal.context}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Detected: {new Date(signal.detected_at).toLocaleString()}
                      </span>
                      <span>
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
