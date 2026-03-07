'use client';

import { useEffect, useState } from 'react';
import { useWatchlistStore } from '@/lib/store';
import { watchlistApi, signalsApi, Signal, EnrichedStock } from '@/lib/api';
import { WatchlistManager } from '@/components/WatchlistManager';
import { SignalsList } from '@/components/SignalsList';
import dynamic from 'next/dynamic';

const SparklineChart = dynamic(
  () => import('@/components/SparklineChart').then(mod => mod.SparklineChart),
  { ssr: false, loading: () => <div className="w-[100px] h-[36px] bg-[var(--bg-overlay)] rounded animate-pulse" /> }
);

const StockChart = dynamic(
  () => import('@/components/StockChart').then(mod => mod.StockChart),
  { ssr: false, loading: () => <div className="h-[300px] bg-[var(--bg-overlay)] rounded animate-pulse" /> }
);
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
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Star className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Watchlist</h1>
              <div className="flex items-center space-x-3 text-[var(--text-secondary)]">
                <span>Track your favorite stocks with live prices</span>
                {lastUpdated && (
                  <span className="flex items-center text-xs text-[var(--text-muted)] bg-[var(--bg-overlay)] px-2 py-1 rounded">
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
        <div>
          <WatchlistManager onUpdate={fetchWatchlist} />
        </div>

        <div className="lg:col-span-2">
          <div className="glass-card-dashboard overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-overlay)] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Stocks</h2>
              <span className="text-sm text-[var(--text-muted)] font-mono">{enrichedData.length} symbols</span>
            </div>

            {isLoading && enrichedData.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 text-primary-400 animate-spin mx-auto" />
                <p className="mt-2 text-[var(--text-secondary)]">Loading stock data...</p>
              </div>
            ) : symbols.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)]">
                <Star className="h-12 w-12 mx-auto text-yellow-500/50 mb-4" />
                <p className="font-medium">No stocks in watchlist</p>
                <p className="text-sm mt-1">Add symbols to see their prices and charts</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-primary)]">
                {enrichedData.map((stock) => {
                  const symbolSignals = signals[stock.symbol] || [];
                  const isSelected = selectedSymbol === stock.symbol;
                  const isPositive = (stock.day_change_pct || 0) >= 0;

                  return (
                    <div key={stock.symbol}>
                      <div
                        className={`px-6 py-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-[var(--bg-overlay)]' : 'hover:bg-[var(--bg-overlay)]'
                        }`}
                        onClick={() => setSelectedSymbol(isSelected ? null : stock.symbol)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                              isPositive
                                ? 'bg-green-500/10 border-green-500/20'
                                : 'bg-red-500/10 border-red-500/20'
                            }`}>
                              <span className={`text-sm font-bold font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                {stock.symbol.slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-[var(--text-primary)]">{stock.symbol}</div>
                              <div className="text-sm text-[var(--text-muted)] truncate max-w-[200px]">
                                {stock.name || stock.symbol}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-6">
                            <div className="hidden md:block">
                              <SparklineChart
                                data={stock.sparkline}
                                width={100}
                                height={36}
                                color={isPositive ? 'green' : 'red'}
                              />
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-semibold text-[var(--text-primary)] font-mono">
                                {stock.current_price
                                  ? `₹${stock.current_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                                  : '-'}
                              </div>
                              <div
                                className={`flex items-center justify-end text-sm font-medium font-mono ${
                                  isPositive ? 'text-green-400' : 'text-red-400'
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

                            <ChevronRight className={`h-5 w-5 text-[var(--text-muted)] transition-transform ${
                              isSelected ? 'rotate-90' : ''
                            }`} />
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-[var(--text-muted)]">
                          {stock.pe_ratio && (
                            <span className="px-2 py-1 bg-[var(--bg-overlay)] rounded border border-[var(--border-primary)]">PE: <span className="font-medium font-mono text-[var(--text-secondary)]">{stock.pe_ratio.toFixed(1)}</span></span>
                          )}
                          {stock.market_cap && (
                            <span className="px-2 py-1 bg-[var(--bg-overlay)] rounded border border-[var(--border-primary)]">MCap: <span className="font-medium font-mono text-[var(--text-secondary)]">{formatMarketCap(stock.market_cap)}</span></span>
                          )}
                          {stock.volume && (
                            <span className="px-2 py-1 bg-[var(--bg-overlay)] rounded border border-[var(--border-primary)]">Vol: <span className="font-medium font-mono text-[var(--text-secondary)]">{formatVolume(stock.volume)}</span></span>
                          )}

                          {stock.position_52w !== undefined && (
                            <div className="flex items-center space-x-2 px-2 py-1 bg-[var(--bg-overlay)] rounded border border-[var(--border-primary)]">
                              <span>52W:</span>
                              <div className="w-24 h-1.5 bg-[var(--border-primary)] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    stock.position_52w > 80 ? 'bg-green-400' :
                                    stock.position_52w < 20 ? 'bg-red-400' : 'bg-yellow-400'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, stock.position_52w))}%` }}
                                />
                              </div>
                              <span className="font-medium font-mono text-[var(--text-secondary)]">{stock.position_52w.toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Section */}
                      {isSelected && (
                        <div className="px-6 pb-4 bg-[var(--bg-overlay)] border-t border-[var(--border-primary)] animate-slide-down">
                          {/* Chart */}
                          <div className="py-4">
                            <StockChart symbol={stock.symbol} height={300} defaultPeriod="1mo" />
                          </div>

                          <div className="py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] p-3 rounded-lg">
                              <div className="text-xs text-[var(--text-muted)]">52W High</div>
                              <div className="font-semibold text-[var(--text-primary)] font-mono">
                                {stock.high_52w ? `₹${stock.high_52w.toLocaleString()}` : '-'}
                              </div>
                            </div>
                            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] p-3 rounded-lg">
                              <div className="text-xs text-[var(--text-muted)]">52W Low</div>
                              <div className="font-semibold text-[var(--text-primary)] font-mono">
                                {stock.low_52w ? `₹${stock.low_52w.toLocaleString()}` : '-'}
                              </div>
                            </div>
                            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] p-3 rounded-lg">
                              <div className="text-xs text-[var(--text-muted)]">Prev Close</div>
                              <div className="font-semibold text-[var(--text-primary)] font-mono">
                                {stock.prev_close ? `₹${stock.prev_close.toLocaleString()}` : '-'}
                              </div>
                            </div>
                            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] p-3 rounded-lg">
                              <div className="text-xs text-[var(--text-muted)]">Avg Volume</div>
                              <div className="font-semibold text-[var(--text-primary)] font-mono">
                                {formatVolume(stock.avg_volume)}
                              </div>
                            </div>
                          </div>

                          {symbolSignals.length > 0 && (
                            <div className="pt-3 border-t border-[var(--border-primary)]">
                              <div className="flex items-center space-x-2 mb-3">
                                <div className="p-1.5 bg-primary-500/10 rounded">
                                  <Bell className="h-4 w-4 text-primary-400" />
                                </div>
                                <span className="text-sm font-medium text-[var(--text-secondary)]">
                                  Recent Signals
                                </span>
                              </div>
                              <SignalsList
                                signals={symbolSignals}
                                showActions={true}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[var(--border-primary)]">
                            <button className="flex items-center px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] rounded-lg transition-all">
                              <Eye className="h-4 w-4 mr-1.5" />
                              View Details
                            </button>
                            <button className="flex items-center px-3 py-2 text-sm text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all">
                              <Plus className="h-4 w-4 mr-1.5" />
                              Add to Portfolio
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSymbol(stock.symbol);
                              }}
                              className="flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
