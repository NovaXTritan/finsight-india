'use client';

import { useState } from 'react';
import { useWatchlistStore } from '@/lib/store';
import { watchlistApi } from '@/lib/api';
import {
  Plus,
  X,
  Search,
  Loader2,
  AlertCircle,
  Star,
} from 'lucide-react';

// Popular Indian stocks for quick add
const POPULAR_STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'ITC',
];

interface WatchlistManagerProps {
  onUpdate?: () => void;
}

export function WatchlistManager({ onUpdate }: WatchlistManagerProps) {
  const { symbols, count, limit, addSymbol, removeSymbol } = useWatchlistStore();
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null);

  const handleAdd = async (symbol: string) => {
    const s = symbol.toUpperCase().trim();
    if (!s) return;

    if (symbols.includes(s)) {
      setError(`${s} is already in your watchlist`);
      return;
    }

    if (count >= limit) {
      setError(`Watchlist limit reached (${limit} symbols). Upgrade to add more.`);
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      await watchlistApi.add(s);
      addSymbol(s);
      setNewSymbol('');
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add symbol');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    setRemovingSymbol(symbol);
    setError('');

    try {
      await watchlistApi.remove(symbol);
      removeSymbol(symbol);
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove symbol');
    } finally {
      setRemovingSymbol(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAdd(newSymbol);
  };

  const availablePopularStocks = POPULAR_STOCKS.filter(s => !symbols.includes(s));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900">Watchlist</h2>
          </div>
          <span className="text-sm text-gray-500">
            {count} / {limit} symbols
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              count >= limit ? 'bg-red-500' : count >= limit * 0.8 ? 'bg-yellow-500' : 'bg-primary-500'
            }`}
            style={{ width: `${(count / limit) * 100}%` }}
          />
        </div>
      </div>

      {/* Add Symbol Form */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Add symbol (e.g., RELIANCE)"
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={count >= limit}
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !newSymbol.trim() || count >= limit}
            className="px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-2 flex items-center text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </div>
        )}
      </div>

      {/* Quick Add - Popular Stocks */}
      {availablePopularStocks.length > 0 && count < limit && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-xs text-gray-500 mb-2">Quick add popular stocks:</div>
          <div className="flex flex-wrap gap-2">
            {availablePopularStocks.slice(0, 5).map((stock) => (
              <button
                key={stock}
                onClick={() => handleAdd(stock)}
                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                + {stock}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist Items */}
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {symbols.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">No symbols in watchlist</p>
            <p className="text-sm mt-1">Add symbols to track signals</p>
          </div>
        ) : (
          symbols.map((symbol) => (
            <div
              key={symbol}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-700">
                    {symbol.slice(0, 2)}
                  </span>
                </div>
                <span className="font-medium text-gray-900">{symbol}</span>
              </div>
              <button
                onClick={() => handleRemove(symbol)}
                disabled={removingSymbol === symbol}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Remove from watchlist"
              >
                {removingSymbol === symbol ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default WatchlistManager;
