'use client';

import { useEffect, useState } from 'react';
import { signalsApi, TrackRecordData } from '@/lib/api';
import {
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
} from 'lucide-react';

export default function TrackRecordPage() {
  const [data, setData] = useState<TrackRecordData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'by_type' | 'by_stock' | 'recent'>('overview');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await signalsApi.getTrackRecord();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch track record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[var(--bg-muted)] rounded w-1/3" />
            <div className="h-4 bg-[var(--bg-muted)] rounded w-2/3" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6">
            <div className="animate-pulse h-32 bg-[var(--bg-muted)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.total_signals === 0) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Target className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Track Record</h1>
              <p className="text-[var(--text-secondary)]">Signal accuracy and performance metrics</p>
            </div>
          </div>
        </div>
        <div className="card p-12 text-center">
          <Target className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Track Record Yet</h3>
          <p className="text-[var(--text-secondary)]">
            Track record builds as signals are generated and outcomes are tracked over time.
            Run detection on your watchlist to start generating signals.
          </p>
        </div>
      </div>
    );
  }

  const hitRate3d = data.hit_rates['3d'];
  const hitRate5d = data.hit_rates['5d'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Target className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Track Record</h1>
              <p className="text-[var(--text-secondary)]">
                {data.total_signals} signals tracked | Updated {new Date(data.last_updated).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button onClick={fetchData} className="btn-secondary flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm text-[var(--text-muted)] mb-1">Total Signals</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">{data.total_signals}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-[var(--text-muted)] mb-1">3-Day Hit Rate</div>
          <div className={`text-2xl font-bold font-mono ${
            hitRate3d && hitRate3d.hit_rate >= 35 ? 'text-green-400' : 'text-[var(--text-primary)]'
          }`}>
            {hitRate3d ? `${hitRate3d.hit_rate}%` : '--'}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {hitRate3d ? `${hitRate3d.hits}/${hitRate3d.total} signals` : 'No data yet'}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-[var(--text-muted)] mb-1">5-Day Hit Rate</div>
          <div className={`text-2xl font-bold font-mono ${
            hitRate5d && hitRate5d.hit_rate >= 35 ? 'text-green-400' : 'text-[var(--text-primary)]'
          }`}>
            {hitRate5d ? `${hitRate5d.hit_rate}%` : '--'}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {hitRate5d ? `${hitRate5d.hits}/${hitRate5d.total} signals` : 'No data yet'}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-[var(--text-muted)] mb-1">Avg 3D Return</div>
          <div className={`text-2xl font-bold font-mono ${
            hitRate3d && hitRate3d.avg_return > 0 ? 'text-green-400' : hitRate3d && hitRate3d.avg_return < 0 ? 'text-red-400' : 'text-[var(--text-primary)]'
          }`}>
            {hitRate3d ? `${hitRate3d.avg_return > 0 ? '+' : ''}${hitRate3d.avg_return}%` : '--'}
          </div>
        </div>
      </div>

      {/* Hit Rates by Horizon */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-primary-400" />
          Hit Rates by Horizon
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-3 text-[var(--text-muted)] font-medium">Horizon</th>
                <th className="text-right py-3 text-[var(--text-muted)] font-medium">Tracked</th>
                <th className="text-right py-3 text-[var(--text-muted)] font-medium">Hits</th>
                <th className="text-right py-3 text-[var(--text-muted)] font-medium">Hit Rate</th>
                <th className="text-right py-3 text-[var(--text-muted)] font-medium">Avg Return</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.hit_rates).map(([horizon, stats]) => (
                <tr key={horizon} className="border-b border-[var(--border-default)] last:border-0">
                  <td className="py-3 text-[var(--text-primary)] font-medium">{horizon}</td>
                  <td className="py-3 text-right text-[var(--text-secondary)] font-mono">{stats.total}</td>
                  <td className="py-3 text-right text-[var(--text-secondary)] font-mono">{stats.hits}</td>
                  <td className="py-3 text-right font-mono">
                    <span className={stats.hit_rate >= 35 ? 'text-green-400' : 'text-[var(--text-secondary)]'}>
                      {stats.hit_rate}%
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono">
                    <span className={stats.avg_return > 0 ? 'text-green-400' : stats.avg_return < 0 ? 'text-red-400' : 'text-[var(--text-secondary)]'}>
                      {stats.avg_return > 0 ? '+' : ''}{stats.avg_return}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2">
        {[
          { key: 'by_type', label: 'By Signal Type' },
          { key: 'by_stock', label: 'By Stock' },
          { key: 'recent', label: 'Recent Signals' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* By Signal Type */}
      {activeTab === 'by_type' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Performance by Signal Type</h3>
          {Object.keys(data.by_signal_type).length === 0 ? (
            <p className="text-[var(--text-muted)]">No signal type data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.by_signal_type).map(([type, stats]) => (
                <div key={type} className="p-4 bg-[var(--bg-muted)] rounded-lg border border-[var(--border-default)] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-[var(--text-muted)]">{stats.count} signals</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold font-mono ${
                      stats.hit_rate_3d >= 35 ? 'text-green-400' : 'text-[var(--text-secondary)]'
                    }`}>
                      {stats.hit_rate_3d}% hit rate
                    </div>
                    <div className={`text-xs font-mono ${
                      stats.avg_return_3d > 0 ? 'text-green-400' : stats.avg_return_3d < 0 ? 'text-red-400' : 'text-[var(--text-muted)]'
                    }`}>
                      avg {stats.avg_return_3d > 0 ? '+' : ''}{stats.avg_return_3d}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* By Stock */}
      {activeTab === 'by_stock' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Performance by Stock</h3>
          {Object.keys(data.by_stock).length === 0 ? (
            <p className="text-[var(--text-muted)]">No stock data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-3 text-[var(--text-muted)] font-medium">Stock</th>
                    <th className="text-right py-3 text-[var(--text-muted)] font-medium">Signals</th>
                    <th className="text-right py-3 text-[var(--text-muted)] font-medium">3D Hit Rate</th>
                    <th className="text-right py-3 text-[var(--text-muted)] font-medium">Avg Return</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.by_stock).map(([stock, stats]) => (
                    <tr key={stock} className="border-b border-[var(--border-default)] last:border-0">
                      <td className="py-3 text-[var(--text-primary)] font-medium">{stock}</td>
                      <td className="py-3 text-right text-[var(--text-secondary)] font-mono">{stats.count}</td>
                      <td className="py-3 text-right font-mono">
                        <span className={stats.hit_rate_3d >= 35 ? 'text-green-400' : 'text-[var(--text-secondary)]'}>
                          {stats.hit_rate_3d}%
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono">
                        <span className={stats.avg_return_3d > 0 ? 'text-green-400' : stats.avg_return_3d < 0 ? 'text-red-400' : 'text-[var(--text-secondary)]'}>
                          {stats.avg_return_3d > 0 ? '+' : ''}{stats.avg_return_3d}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recent Signals */}
      {activeTab === 'recent' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Recent Signals with Outcomes</h3>
          {data.recent_signals.length === 0 ? (
            <p className="text-[var(--text-muted)]">No recent signals.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_signals.map((sig) => (
                <div key={sig.id} className="p-4 bg-[var(--bg-muted)] rounded-lg border border-[var(--border-default)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-[var(--text-primary)]">{sig.symbol}</span>
                      <span className="text-xs text-[var(--text-muted)]">{sig.pattern_type.replace(/_/g, ' ')}</span>
                      <span className="text-yellow-400 text-xs">
                        {'★'.repeat(sig.confidence_level)}{'☆'.repeat(5 - sig.confidence_level)}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(sig.detected_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-[var(--text-muted)] font-mono">Z={sig.z_score.toFixed(1)}</span>
                    <span className="text-[var(--text-muted)] font-mono">@{sig.price.toFixed(0)}</span>
                    {sig.return_3d !== null ? (
                      <span className="flex items-center space-x-1">
                        {sig.correct_3d ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className={`font-mono ${sig.return_3d > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          3d: {sig.return_3d > 0 ? '+' : ''}{sig.return_3d}%
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-[var(--text-muted)]">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-mono">3d: pending</span>
                      </span>
                    )}
                    {sig.return_5d !== null ? (
                      <span className={`font-mono ${sig.return_5d > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        5d: {sig.return_5d > 0 ? '+' : ''}{sig.return_5d}%
                      </span>
                    ) : (
                      <span className="font-mono text-[var(--text-muted)]">5d: pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-[var(--text-muted)] text-center py-4">
        FinSight provides statistical anomaly detection for educational and informational purposes only.
        Past signal performance does not predict future results. Not investment advice.
      </div>
    </div>
  );
}
