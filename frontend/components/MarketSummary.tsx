'use client';

import { useEffect, useState } from 'react';
import { marketApi, MarketSummary as MarketSummaryType, Index, FiiDii } from '@/lib/api';
import { TrendingUp, TrendingDown, RefreshCw, Clock, Activity } from 'lucide-react';

export function MarketSummaryCard() {
  const [data, setData] = useState<MarketSummaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
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
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-primary-600 hover:text-primary-700 flex items-center justify-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <Activity className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Market Pulse</h2>
          {data?.market_status && (
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                data.market_status.is_open
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {data.market_status.is_open ? 'Market Open' : 'Market Closed'}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          {lastUpdated && (
            <>
              <Clock className="h-4 w-4" />
              <span>{lastUpdated.toLocaleTimeString()}</span>
            </>
          )}
          <button
            onClick={fetchData}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Indices */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.indices?.map((index) => (
            <IndexCard key={index.name} index={index} />
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

function IndexCard({ index }: { index: Index }) {
  const isPositive = index.change >= 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm font-medium text-gray-500 mb-1">{index.name}</div>
      <div className="text-xl font-bold text-gray-900">
        {index.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '-'}
      </div>
      <div
        className={`flex items-center mt-1 text-sm font-medium ${
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
}

function FiiDiiCard({ data }: { data: FiiDii }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Institutional Activity</h3>
        <span className="text-xs text-gray-500">{data.date}</span>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {/* FII */}
        <div>
          <div className="text-sm font-medium text-gray-600 mb-2">FII (Foreign)</div>
          <div className="space-y-1 text-sm">
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
            <div className="flex justify-between pt-1 border-t border-gray-200">
              <span className="text-gray-600 font-medium">Net</span>
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
        <div>
          <div className="text-sm font-medium text-gray-600 mb-2">DII (Domestic)</div>
          <div className="space-y-1 text-sm">
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
            <div className="flex justify-between pt-1 border-t border-gray-200">
              <span className="text-gray-600 font-medium">Net</span>
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
}

function formatCrores(value: number): string {
  if (value === undefined || value === null) return '-';
  return Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default MarketSummaryCard;
