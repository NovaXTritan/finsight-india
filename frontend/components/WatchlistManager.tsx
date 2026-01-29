'use client';

import { useState, useCallback, useMemo } from 'react';
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

  const handleAdd = useCallback(async (symbol: string) => {
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
  }, [symbols, count, limit, addSymbol, onUpdate]);

  const handleRemove = useCallback(async (symbol: string) => {
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
  }, [removeSymbol, onUpdate]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleAdd(newSymbol);
  }, [handleAdd, newSymbol]);

  const availablePopularStocks = useMemo(() =>
    POPULAR_STOCKS.filter(s => !symbols.includes(s)),
    [symbols]
  );

  return (
    <div className="glass-card-dashboard overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-primary-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Star className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Watchlist</h2>
          </div>
          <span className="text-sm text-white/90 font-medium">
            {count} / {limit} symbols
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              count >= limit ? 'bg-red-400' : count >= limit * 0.8 ? 'bg-yellow-300' : 'bg-white'
            }`}
            style={{ width: `${(count / limit) * 100}%` }}
          />
        </div>
      </div>

      {/* Add Symbol Form */}
      <div className="p-4 border-b border-primary-100/50 bg-gradient-to-b from-primary-50/50 to-white">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Add symbol (e.g., RELIANCE)"
              className="input-glass-light pl-10"
              disabled={count >= limit}
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !newSymbol.trim() || count >= limit}
            className="btn-glass-primary px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
          <div className="mt-3 flex items-center text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Quick Add - Popular Stocks */}
      {availablePopularStocks.length > 0 && count < limit && (
        <div className="px-4 py-3 border-b border-primary-100/50">
          <div className="text-xs font-medium text-gray-500 mb-2">Quick add popular stocks:</div>
          <div className="flex flex-wrap gap-2">
            {availablePopularStocks.slice(0, 5).map((stock) => (
              <button
                key={stock}
                onClick={() => handleAdd(stock)}
                className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-primary-50 to-purple-50 text-primary-700 rounded-lg hover:from-primary-100 hover:to-purple-100 transition-all border border-primary-100/50"
              >
                + {stock}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist Items */}
      <div className="divide-y divide-primary-100/50 max-h-[400px] overflow-y-auto">
        {symbols.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-yellow-200/50 blur-xl rounded-full" />
              <Star className="relative h-16 w-16 mx-auto text-yellow-400" />
            </div>
            <p className="font-medium">No symbols in watchlist</p>
            <p className="text-sm mt-1">Add symbols to track signals</p>
          </div>
        ) : (
          symbols.map((symbol) => (
            <div
              key={symbol}
              className="flex items-center justify-between px-4 py-3 hover:bg-primary-50/50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-purple-500 rounded-xl flex items-center justify-center shadow-glow">
                  <span className="text-sm font-bold text-white">
                    {symbol.slice(0, 2)}
                  </span>
                </div>
                <span className="font-semibold text-gray-900">{symbol}</span>
              </div>
              <button
                onClick={() => handleRemove(symbol)}
                disabled={removingSymbol === symbol}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 opacity-0 group-hover:opacity-100"
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
