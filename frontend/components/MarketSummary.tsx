'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { marketApi, MarketSummary as MarketSummaryType, Index, FiiDii } from '@/lib/api';
import { TrendingUp, TrendingDown, RefreshCw, Clock, Activity } from 'lucide-react';

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
          <div className="h-6 w-32 bg-primary-100 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-primary-50 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card-dashboard p-6">
        <div className="text-center text-gray-500">
          <p>{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors flex items-center justify-center mx-auto"
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
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Market Pulse</h2>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                data?.market_open
                  ? 'bg-green-400/20 text-green-100 border border-green-400/30'
                  : 'bg-white/10 text-white/80 border border-white/20'
              }`}
            >
              {data?.market_open ? 'Market Open' : 'Market Closed'}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-white/80">
            {lastUpdated && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
        </div>
      )}
    </div>
  );
}

const IndexCard = memo(function IndexCard({ index }: { index: Index }) {
  const isPositive = index.change >= 0;

  return (
    <div className="glass-card-purple p-4 card-hover-lift">
      <div className="text-sm font-medium text-primary-600 mb-1">{index.name}</div>
      <div className="text-xl font-bold text-gray-900">
        {index.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '-'}
      </div>
      <div
        className={`flex items-center mt-2 text-sm font-semibold ${
          isPositive ? 'text-green-600' : 'text-red-600'
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
    <div className="bg-gradient-to-r from-primary-50 via-purple-50 to-indigo-50 rounded-xl p-5 border border-primary-100/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Institutional Activity</h3>
        <span className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded-full">{data.date}</span>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {/* FII */}
        <div className="bg-white/60 rounded-lg p-4 backdrop-blur-sm">
          <div className="text-sm font-semibold text-primary-700 mb-3">FII (Foreign)</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Buy</span>
              <span className="font-medium text-gray-900">
                {formatCrores(data.fii_buy)} Cr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sell</span>
              <span className="font-medium text-gray-900">
                {formatCrores(data.fii_sell)} Cr
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-primary-100">
              <span className="text-gray-700 font-medium">Net</span>
              <span
                className={`font-bold ${
                  data.fii_net >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {data.fii_net >= 0 ? '+' : ''}
                {formatCrores(data.fii_net)} Cr
              </span>
            </div>
          </div>
        </div>

        {/* DII */}
        <div className="bg-white/60 rounded-lg p-4 backdrop-blur-sm">
          <div className="text-sm font-semibold text-purple-700 mb-3">DII (Domestic)</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Buy</span>
              <span className="font-medium text-gray-900">
                {formatCrores(data.dii_buy)} Cr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sell</span>
              <span className="font-medium text-gray-900">
                {formatCrores(data.dii_sell)} Cr
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-purple-100">
              <span className="text-gray-700 font-medium">Net</span>
              <span
                className={`font-bold ${
                  data.dii_net >= 0 ? 'text-green-600' : 'text-red-600'
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
