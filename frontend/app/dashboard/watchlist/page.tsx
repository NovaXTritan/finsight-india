'use client';

import { useEffect, useState } from 'react';
import { useWatchlistStore } from '@/lib/store';
import { watchlistApi, signalsApi, Signal, EnrichedStock } from '@/lib/api';
import { WatchlistManager } from '@/components/WatchlistManager';
import { SignalsList } from '@/components/SignalsList';
import { SparklineChart } from '@/components/SparklineChart';
import {
  Star,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  ChevronRight,
  Eye,
  Trash2,
  Plus,
} from 'lucide-react';

export default function WatchlistPage() {
  const { symbols, setWatchlist } = useWatchlistStore();
  const [enrichedData, setEnrichedData] = useState<EnrichedStock[]>([]);
  const [signals, setSignals] = useState<Record<string, Signal[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchWatchlist = async () => {
    try {
      const data = await watchlistApi.get();
      setWatchlist(data.symbols, data.count, data.limit);
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    }
  };

  const fetchEnrichedData = async () => {
    if (symbols.length === 0) return;

    setIsLoading(true);
    try {
      const data = await watchlistApi.getEnriched();
      setEnrichedData(data.symbols);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch enriched data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSignalsForSymbol = async (symbol: string) => {
    try {
      const data = await signalsApi.getBySymbol(symbol, 5);
      setSignals(prev => ({ ...prev, [symbol]: data }));
    } catch (error) {
      console.error(`Failed to fetch signals for ${symbol}:`, error);
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    try {
      await watchlistApi.remove(symbol);
      await fetchWatchlist();
      setEnrichedData(prev => prev.filter(s => s.symbol !== symbol));
    } catch (error) {
      console.error('Failed to remove symbol:', error);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    if (symbols.length > 0) {
      fetchEnrichedData();
    }
  }, [symbols]);

  useEffect(() => {
    if (selectedSymbol) {
      fetchSignalsForSymbol(selectedSymbol);
    }
  }, [selectedSymbol]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (symbols.length > 0) {
        fetchEnrichedData();
      }
    }, 120000);
    return () => clearInterval(interval);
  }, [symbols]);

  const formatMarketCap = (value?: number) => {
    if (!value) return '-';
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(0)}B`;
    if (value >= 1e7) return `${(value / 1e7).toFixed(0)}Cr`;
    return value.toLocaleString();
  };

  const formatVolume = (value?: number) => {
    if (!value) return '-';
    if (value >= 1e7) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Star className="h-7 w-7 mr-2 text-yellow-500" />
            Watchlist
          </h1>
          <p className="text-gray-500">
            Track your favorite stocks with live prices
            {lastUpdated && (
              <span className="ml-2 text-xs text-gray-400">
                Last updated: {lastUpdated}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchEnrichedData}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Prices
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Watchlist Manager */}
        <div>
          <WatchlistManager onUpdate={fetchWatchlist} />
        </div>

        {/* Enriched Stock Cards */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Your Stocks</h2>
              <span className="text-sm text-gray-500">{enrichedData.length} symbols</span>
            </div>

            {isLoading && enrichedData.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
                <p className="mt-2 text-gray-500">Loading stock data...</p>
              </div>
            ) : symbols.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">No stocks in watchlist</p>
                <p className="text-sm mt-1">Add symbols to see their prices and charts</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {enrichedData.map((stock) => {
                  const symbolSignals = signals[stock.symbol] || [];
                  const isSelected = selectedSymbol === stock.symbol;
                  const isPositive = (stock.day_change_pct || 0) >= 0;

                  return (
                    <div key={stock.symbol}>
                      <div
                        className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-primary-50' : ''
                        }`}
                        onClick={() => setSelectedSymbol(isSelected ? null : stock.symbol)}
                      >
                        {/* Main Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              isPositive ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              <span className={`text-lg font-bold ${
                                isPositive ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {stock.symbol.slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{stock.symbol}</div>
                              <div className="text-sm text-gray-500 truncate max-w-[200px]">
                                {stock.name || stock.symbol}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-6">
                            {/* Sparkline */}
                            <div className="hidden md:block">
                              <SparklineChart
                                data={stock.sparkline}
                                width={100}
                                height={36}
                                color={isPositive ? 'green' : 'red'}
                              />
                            </div>

                            {/* Price & Change */}
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-900">
                                {stock.current_price
                                  ? `₹${stock.current_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                                  : '-'}
                              </div>
                              <div
                                className={`flex items-center justify-end text-sm ${
                                  isPositive ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {isPositive ? (
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 mr-1" />
                                )}
                                {stock.day_change !== undefined && (
                                  <span>
                                    {stock.day_change >= 0 ? '+' : ''}
                                    {stock.day_change.toFixed(2)} ({stock.day_change_pct?.toFixed(2)}%)
                                  </span>
                                )}
                              </div>
                            </div>

                            <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${
                              isSelected ? 'rotate-90' : ''
                            }`} />
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {stock.pe_ratio && (
                            <span>PE: <span className="font-medium text-gray-700">{stock.pe_ratio.toFixed(1)}</span></span>
                          )}
                          {stock.market_cap && (
                            <span>MCap: <span className="font-medium text-gray-700">{formatMarketCap(stock.market_cap)}</span></span>
                          )}
                          {stock.volume && (
                            <span>Vol: <span className="font-medium text-gray-700">{formatVolume(stock.volume)}</span></span>
                          )}

                          {/* 52-Week Position Bar */}
                          {stock.position_52w !== undefined && (
                            <div className="flex items-center space-x-2">
                              <span>52W:</span>
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    stock.position_52w > 80 ? 'bg-green-500' :
                                    stock.position_52w < 20 ? 'bg-red-500' : 'bg-yellow-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, stock.position_52w))}%` }}
                                />
                              </div>
                              <span className="font-medium text-gray-700">{stock.position_52w.toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Section */}
                      {isSelected && (
                        <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                          {/* Details Grid */}
                          <div className="py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs text-gray-500">52W High</div>
                              <div className="font-semibold text-gray-900">
                                {stock.high_52w ? `₹${stock.high_52w.toLocaleString()}` : '-'}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs text-gray-500">52W Low</div>
                              <div className="font-semibold text-gray-900">
                                {stock.low_52w ? `₹${stock.low_52w.toLocaleString()}` : '-'}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs text-gray-500">Prev Close</div>
                              <div className="font-semibold text-gray-900">
                                {stock.prev_close ? `₹${stock.prev_close.toLocaleString()}` : '-'}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs text-gray-500">Avg Volume</div>
                              <div className="font-semibold text-gray-900">
                                {formatVolume(stock.avg_volume)}
                              </div>
                            </div>
                          </div>

                          {/* Signals Section */}
                          {symbolSignals.length > 0 && (
                            <div className="pt-3 border-t border-gray-200">
                              <div className="flex items-center space-x-2 mb-3">
                                <Bell className="h-4 w-4 text-primary-600" />
                                <span className="text-sm font-medium text-gray-700">
                                  Recent Signals
                                </span>
                              </div>
                              <SignalsList
                                signals={symbolSignals}
                                showActions={true}
                              />
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
                            <button className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                              <Eye className="h-4 w-4 mr-1.5" />
                              View Details
                            </button>
                            <button className="flex items-center px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                              <Plus className="h-4 w-4 mr-1.5" />
                              Add to Portfolio
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSymbol(stock.symbol);
                              }}
                              className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-1.5" />
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
