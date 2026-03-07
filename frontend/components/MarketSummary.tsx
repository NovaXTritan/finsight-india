'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { marketApi, MarketSummary as MarketSummaryType, Index, FiiDii } from '@/lib/api';
import { TrendingUp, TrendingDown, RefreshCw, Clock, Activity, Wifi, WifiOff } from 'lucide-react';

export function MarketSummaryCard() {
  const [data, setData] = useState<MarketSummaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const summary = await marketApi.getSummary();
      setData(summary);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError('Failed to load market data');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="glass-card-dashboard p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-[var(--bg-overlay)] rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[var(--bg-overlay)] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card-dashboard p-6">
        <div className="text-center text-[var(--text-secondary)]">
          <p>{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-4 py-2 bg-[var(--bg-overlay)] text-primary-400 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors flex items-center justify-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card-dashboard overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--bg-overlay)] px-6 py-4 border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Activity className="h-5 w-5 text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Market Pulse</h2>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                data?.market_open
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border-primary)]'
              }`}
            >
              {data?.market_open ? 'Market Open' : 'Market Closed'}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-[var(--text-secondary)]">
            {/* Data source badge */}
            {data?.data_source && (
              <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium ${
                data.is_live
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              }`}>
                {data.is_live ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span>{data.is_live ? 'Live' : 'Delayed'}</span>
                <span className="opacity-60">({data.data_source})</span>
              </div>
            )}
            {lastUpdated && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-[var(--bg-overlay)] rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Indices */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.indices && Object.entries(data.indices).map(([name, index]) => (
            <IndexCard key={name} index={{ name, ...index }} />
          ))}
        </div>
      </div>

      {/* FII/DII Section */}
      {data?.fii_dii && (
        <div className="px-6 pb-6">
          <FiiDiiCard data={data.fii_dii} />
          {(data.fii_dii as any)?.is_live === false && (
            <div className="mt-2 px-3 py-1.5 bg-yellow-500/5 border border-yellow-500/10 rounded text-xs text-yellow-400/80 flex items-center space-x-1.5">
              <WifiOff className="h-3 w-3" />
              <span>FII/DII data may be delayed. NSE direct feed unavailable.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const IndexCard = memo(function IndexCard({ index }: { index: Index }) {
  const isPositive = index.change >= 0;

  return (
    <div className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] p-4 rounded-lg card-hover-lift">
      <div className="text-sm font-medium text-primary-400 mb-1">{index.name}</div>
      <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
        {index.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '-'}
      </div>
      <div
        className={`flex items-center mt-2 text-sm font-semibold font-mono ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {isPositive ? (
          <TrendingUp className="h-4 w-4 mr-1" />
        ) : (
          <TrendingDown className="h-4 w-4 mr-1" />
        )}
        <span>
          {isPositive ? '+' : ''}
          {index.change?.toFixed(2)} ({index.change_pct?.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
});

const FiiDiiCard = memo(function FiiDiiCard({ data }: { data: FiiDii }) {
  return (
    <div className="bg-[var(--bg-overlay)] rounded-lg p-5 border border-[var(--border-primary)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-primary)]">Institutional Activity</h3>
        <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-overlay)] px-2 py-1 rounded-full border border-[var(--border-primary)]">{data.date}</span>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {/* FII */}
        <div className="bg-[var(--bg-raised)] rounded-lg p-4">
          <div className="text-sm font-semibold text-primary-400 mb-3">FII (Foreign)</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Buy</span>
              <span className="font-medium font-mono text-[var(--text-primary)]">
                {formatCrores(data.fii_buy)} Cr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Sell</span>
              <span className="font-medium font-mono text-[var(--text-primary)]">
                {formatCrores(data.fii_sell)} Cr
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--border-primary)]">
              <span className="text-[var(--text-secondary)] font-medium">Net</span>
              <span
                className={`font-bold font-mono ${
                  data.fii_net >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {data.fii_net >= 0 ? '+' : ''}
                {formatCrores(data.fii_net)} Cr
              </span>
            </div>
          </div>
        </div>

        {/* DII */}
        <div className="bg-[var(--bg-raised)] rounded-lg p-4">
          <div className="text-sm font-semibold text-purple-400 mb-3">DII (Domestic)</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Buy</span>
              <span className="font-medium font-mono text-[var(--text-primary)]">
                {formatCrores(data.dii_buy)} Cr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Sell</span>
              <span className="font-medium font-mono text-[var(--text-primary)]">
                {formatCrores(data.dii_sell)} Cr
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--border-primary)]">
              <span className="text-[var(--text-secondary)] font-medium">Net</span>
              <span
                className={`font-bold font-mono ${
                  data.dii_net >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {data.dii_net >= 0 ? '+' : ''}
                {formatCrores(data.dii_net)} Cr
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function formatCrores(value: number): string {
  if (value === undefined || value === null) return '-';
  return Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default MarketSummaryCard;
