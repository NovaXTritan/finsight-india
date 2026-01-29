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
  Clock,
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
      <div className="glass-card-dashboard p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-glow">
              <Star className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Watchlist</h1>
              <div className="flex items-center space-x-3 text-gray-500">
                <span>Track your favorite stocks with live prices</span>
                {lastUpdated && (
                  <span className="flex items-center text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    <Clock className="h-3 w-3 mr-1" />
                    {lastUpdated}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={fetchEnrichedData}
            disabled={isLoading}
            className="btn-glass-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Prices</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Watchlist Manager */}
        <div>
          <WatchlistManager onUpdate={fetchWatchlist} />
        </div>

        {/* Enriched Stock Cards */}
        <div className="lg:col-span-2">
          <div className="glass-card-dashboard overflow-hidden">
            <div className="px-6 py-4 border-b border-primary-100/50 bg-gradient-to-r from-primary-50/50 to-purple-50/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Your Stocks</h2>
              <span className="text-sm text-gray-500 bg-white/60 px-3 py-1 rounded-full">{enrichedData.length} symbols</span>
            </div>

            {isLoading && enrichedData.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 text-primary-400 animate-spin mx-auto" />
                <p className="mt-2 text-gray-500">Loading stock data...</p>
              </div>
            ) : symbols.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <div className="absolute inset-0 bg-yellow-200/50 blur-xl rounded-full" />
                  <Star className="relative h-16 w-16 mx-auto text-yellow-400" />
                </div>
                <p className="font-medium">No stocks in watchlist</p>
                <p className="text-sm mt-1">Add symbols to see their prices and charts</p>
              </div>
            ) : (
              <div className="divide-y divide-primary-100/50">
                {enrichedData.map((stock) => {
                  const symbolSignals = signals[stock.symbol] || [];
                  const isSelected = selectedSymbol === stock.symbol;
                  const isPositive = (stock.day_change_pct || 0) >= 0;

                  return (
                    <div key={stock.symbol}>
                      <div
                        className={`px-6 py-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-gradient-to-r from-primary-50 to-purple-50' : 'hover:bg-primary-50/30'
                        }`}
                        onClick={() => setSelectedSymbol(isSelected ? null : stock.symbol)}
                      >
                        {/* Main Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                              isPositive
                                ? 'bg-gradient-to-br from-green-400 to-green-500'
                                : 'bg-gradient-to-br from-red-400 to-red-500'
                            }`}>
                              <span className="text-lg font-bold text-white">
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
                                className={`flex items-center justify-end text-sm font-medium ${
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

                            <ChevronRight className={`h-5 w-5 text-primary-400 transition-transform ${
                              isSelected ? 'rotate-90' : ''
                            }`} />
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {stock.pe_ratio && (
                            <span className="px-2 py-1 bg-gray-100 rounded-lg">PE: <span className="font-medium text-gray-700">{stock.pe_ratio.toFixed(1)}</span></span>
                          )}
                          {stock.market_cap && (
                            <span className="px-2 py-1 bg-gray-100 rounded-lg">MCap: <span className="font-medium text-gray-700">{formatMarketCap(stock.market_cap)}</span></span>
                          )}
                          {stock.volume && (
                            <span className="px-2 py-1 bg-gray-100 rounded-lg">Vol: <span className="font-medium text-gray-700">{formatVolume(stock.volume)}</span></span>
                          )}

                          {/* 52-Week Position Bar */}
                          {stock.position_52w !== undefined && (
                            <div className="flex items-center space-x-2 px-2 py-1 bg-gray-100 rounded-lg">
                              <span>52W:</span>
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    stock.position_52w > 80 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                                    stock.position_52w < 20 ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-yellow-500 to-yellow-400'
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
                        <div className="px-6 pb-4 bg-gradient-to-b from-primary-50/30 to-white border-t border-primary-100/50 animate-slide-down">
                          {/* Details Grid */}
                          <div className="py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="glass-card-purple p-3 rounded-xl">
                              <div className="text-xs text-gray-500">52W High</div>
                              <div className="font-semibold text-gray-900">
                                {stock.high_52w ? `₹${stock.high_52w.toLocaleString()}` : '-'}
                              </div>
                            </div>
                            <div className="glass-card-purple p-3 rounded-xl">
                              <div className="text-xs text-gray-500">52W Low</div>
                              <div className="font-semibold text-gray-900">
                                {stock.low_52w ? `₹${stock.low_52w.toLocaleString()}` : '-'}
                              </div>
                            </div>
                            <div className="glass-card-purple p-3 rounded-xl">
                              <div className="text-xs text-gray-500">Prev Close</div>
                              <div className="font-semibold text-gray-900">
                                {stock.prev_close ? `₹${stock.prev_close.toLocaleString()}` : '-'}
                              </div>
                            </div>
                            <div className="glass-card-purple p-3 rounded-xl">
                              <div className="text-xs text-gray-500">Avg Volume</div>
                              <div className="font-semibold text-gray-900">
                                {formatVolume(stock.avg_volume)}
                              </div>
                            </div>
                          </div>

                          {/* Signals Section */}
                          {symbolSignals.length > 0 && (
                            <div className="pt-3 border-t border-primary-100/50">
                              <div className="flex items-center space-x-2 mb-3">
                                <div className="p-1.5 bg-primary-100 rounded-lg">
                                  <Bell className="h-4 w-4 text-primary-600" />
                                </div>
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
                          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-primary-100/50">
                            <button className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                              <Eye className="h-4 w-4 mr-1.5" />
                              View Details
                            </button>
                            <button className="flex items-center px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-all">
                              <Plus className="h-4 w-4 mr-1.5" />
                              Add to Portfolio
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSymbol(stock.symbol);
                              }}
                              className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
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
