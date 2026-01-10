'use client';

import { useEffect, useState } from 'react';
import { useWatchlistStore } from '@/lib/store';
import { watchlistApi, signalsApi, Signal, marketApi } from '@/lib/api';
import { WatchlistManager } from '@/components/WatchlistManager';
import { SignalsList } from '@/components/SignalsList';
import {
  Star,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
} from 'lucide-react';

interface StockPrice {
  symbol: string;
  price: number;
  change?: number;
  change_pct?: number;
}

export default function WatchlistPage() {
  const { symbols, setWatchlist } = useWatchlistStore();
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [signals, setSignals] = useState<Record<string, Signal[]>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const fetchWatchlist = async () => {
    try {
      const data = await watchlistApi.get();
      setWatchlist(data.symbols, data.count, data.limit);
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    }
  };

  const fetchPrices = async () => {
    if (symbols.length === 0) return;

    setIsLoadingPrices(true);
    const priceData: Record<string, StockPrice> = {};

    // Fetch prices for each symbol (in parallel with limit)
    const promises = symbols.slice(0, 10).map(async (symbol) => {
      try {
        const data = await marketApi.getStockPrice(symbol);
        priceData[symbol] = {
          symbol,
          price: data.price,
        };
      } catch (error) {
        console.error(`Failed to fetch price for ${symbol}:`, error);
      }
    });

    await Promise.all(promises);
    setPrices(priceData);
    setIsLoadingPrices(false);
  };

  const fetchSignalsForSymbol = async (symbol: string) => {
    try {
      const data = await signalsApi.getBySymbol(symbol, 5);
      setSignals(prev => ({ ...prev, [symbol]: data }));
    } catch (error) {
      console.error(`Failed to fetch signals for ${symbol}:`, error);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    if (symbols.length > 0) {
      fetchPrices();
    }
  }, [symbols]);

  useEffect(() => {
    if (selectedSymbol) {
      fetchSignalsForSymbol(selectedSymbol);
    }
  }, [selectedSymbol]);

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
            Manage and track your favorite stocks
          </p>
        </div>
        <button
          onClick={fetchPrices}
          disabled={isLoadingPrices}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingPrices ? 'animate-spin' : ''}`} />
          Refresh Prices
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Watchlist Manager */}
        <div>
          <WatchlistManager onUpdate={fetchWatchlist} />
        </div>

        {/* Stock Cards */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Your Stocks</h2>
            </div>

            {symbols.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">No stocks in watchlist</p>
                <p className="text-sm mt-1">Add symbols to see their prices and signals</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {symbols.map((symbol) => {
                  const priceData = prices[symbol];
                  const symbolSignals = signals[symbol] || [];
                  const isSelected = selectedSymbol === symbol;

                  return (
                    <div key={symbol}>
                      <div
                        className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-primary-50' : ''
                        }`}
                        onClick={() => setSelectedSymbol(isSelected ? null : symbol)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                              <span className="text-lg font-bold text-primary-700">
                                {symbol.slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{symbol}</div>
                              <div className="text-sm text-gray-500">
                                {symbolSignals.length > 0
                                  ? `${symbolSignals.length} recent signals`
                                  : 'No recent signals'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            {priceData ? (
                              <>
                                <div className="text-lg font-semibold text-gray-900">
                                  {priceData.price?.toLocaleString('en-IN', {
                                    style: 'currency',
                                    currency: 'INR',
                                    maximumFractionDigits: 2,
                                  })}
                                </div>
                                {priceData.change_pct !== undefined && (
                                  <div
                                    className={`flex items-center justify-end text-sm ${
                                      priceData.change_pct >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {priceData.change_pct >= 0 ? (
                                      <TrendingUp className="h-4 w-4 mr-1" />
                                    ) : (
                                      <TrendingDown className="h-4 w-4 mr-1" />
                                    )}
                                    {priceData.change_pct.toFixed(2)}%
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-gray-400">Loading...</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Signals */}
                      {isSelected && symbolSignals.length > 0 && (
                        <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                          <div className="flex items-center space-x-2 mb-3 pt-3">
                            <Bell className="h-4 w-4 text-primary-600" />
                            <span className="text-sm font-medium text-gray-700">
                              Recent Signals for {symbol}
                            </span>
                          </div>
                          <SignalsList
                            signals={symbolSignals}
                            showActions={true}
                          />
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
