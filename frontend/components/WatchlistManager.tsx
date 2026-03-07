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
      {/* Header */}
      <div className="bg-[var(--bg-overlay)] px-6 py-4 border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Star className="h-5 w-5 text-yellow-400" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Watchlist</h2>
          </div>
          <span className="text-sm text-[var(--text-secondary)] font-medium font-mono">
            {count} / {limit} symbols
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-[var(--bg-overlay)] rounded-full overflow-hidden border border-[var(--border-primary)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              count >= limit ? 'bg-red-400' : count >= limit * 0.8 ? 'bg-yellow-400' : 'bg-primary-400'
            }`}
            style={{ width: `${(count / limit) * 100}%` }}
          />
        </div>
      </div>

      {/* Add Symbol Form */}
      <div className="p-4 border-b border-[var(--border-primary)] bg-[var(--bg-overlay)]">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
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
          <div className="mt-3 flex items-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Quick Add - Popular Stocks */}
      {availablePopularStocks.length > 0 && count < limit && (
        <div className="px-4 py-3 border-b border-[var(--border-primary)]">
          <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">Quick add popular stocks:</div>
          <div className="flex flex-wrap gap-2">
            {availablePopularStocks.slice(0, 5).map((stock) => (
              <button
                key={stock}
                onClick={() => handleAdd(stock)}
                className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-overlay)] text-primary-400 rounded-lg hover:bg-[var(--bg-overlay)] transition-all border border-[var(--border-primary)]"
              >
                + {stock}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist Items */}
      <div className="divide-y divide-[var(--border-primary)] max-h-[400px] overflow-y-auto">
        {symbols.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <Star className="relative h-16 w-16 mx-auto text-yellow-400" />
            </div>
            <p className="font-medium">No symbols in watchlist</p>
            <p className="text-sm mt-1">Add symbols to track signals</p>
          </div>
        ) : (
          symbols.map((symbol) => (
            <div
              key={symbol}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-overlay)] transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-500/10 border border-primary-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-400">
                    {symbol.slice(0, 2)}
                  </span>
                </div>
                <span className="font-semibold text-[var(--text-primary)]">{symbol}</span>
              </div>
              <button
                onClick={() => handleRemove(symbol)}
                disabled={removingSymbol === symbol}
                className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 opacity-0 group-hover:opacity-100"
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
