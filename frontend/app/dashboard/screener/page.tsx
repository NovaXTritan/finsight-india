'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  screenerApi,
  ScreenerFilters,
  ScreenerFilterOptions,
  StockFundamentals,
  SavedScreener,
  ScreenerPreset,
} from '@/lib/api';
import {
  Search,
  Filter,
  Save,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Bookmark,
  TrendingUp,
  TrendingDown,
  Star,
  Sliders,
} from 'lucide-react';

export default function ScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilters>({});
  const [filterOptions, setFilterOptions] = useState<ScreenerFilterOptions | null>(null);
  const [results, setResults] = useState<StockFundamentals[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [savedScreeners, setSavedScreeners] = useState<SavedScreener[]>([]);
  const [presets, setPresets] = useState<ScreenerPreset[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [screenerName, setScreenerName] = useState('');

  const loadInitialData = useCallback(async () => {
    try {
      const [filtersData, presetsData, savedData] = await Promise.all([
        screenerApi.getFilters(),
        screenerApi.getPresets(),
        screenerApi.getSavedScreeners(),
      ]);
      setFilterOptions(filtersData);
      setPresets(presetsData.presets);
      setSavedScreeners(savedData.screeners);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const runScreener = useCallback(async (newFilters?: ScreenerFilters, newPage = 1) => {
    setIsLoading(true);
    try {
      const filtersToUse = newFilters || filters;
      const result = await screenerApi.run(filtersToUse, newPage, perPage, sortBy, sortOrder);
      setResults(result.stocks);
      setTotal(result.total);
      setPage(newPage);
      if (newFilters) setFilters(newFilters);
    } catch (error) {
      console.error('Failed to run screener:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, perPage, sortBy, sortOrder]);

  const handleSort = useCallback((column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    runScreener(filters, 1);
  }, [sortBy, sortOrder, filters, runScreener]);

  const loadPreset = useCallback((preset: ScreenerPreset) => {
    runScreener(preset.filters);
  }, [runScreener]);

  const loadSavedScreener = useCallback((screener: SavedScreener) => {
    runScreener(screener.filters as ScreenerFilters);
  }, [runScreener]);

  const saveScreener = useCallback(async () => {
    if (!screenerName.trim()) return;
    try {
      const saved = await screenerApi.saveScreener(screenerName, filters);
      setSavedScreeners((prev) => [saved, ...prev]);
      setSaveModalOpen(false);
      setScreenerName('');
    } catch (error) {
      console.error('Failed to save screener:', error);
    }
  }, [screenerName, filters]);

  const deleteScreener = useCallback(async (id: number) => {
    try {
      await screenerApi.deleteScreener(id);
      setSavedScreeners((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete screener:', error);
    }
  }, []);

  const exportToCsv = useCallback(() => {
    if (results.length === 0) return;

    const headers = [
      'Symbol', 'Name', 'Sector', 'Market Cap', 'Price', 'PE', 'PB', 'ROE',
      'Dividend Yield', 'Debt/Equity', '52W High', '52W Low', 'Beta'
    ];

    const rows = results.map((stock) => [
      stock.symbol,
      stock.name || '',
      stock.sector || '',
      stock.market_cap || '',
      stock.current_price || '',
      stock.pe_ratio || '',
      stock.pb_ratio || '',
      stock.roe || '',
      stock.dividend_yield || '',
      stock.debt_to_equity || '',
      stock.high_52w || '',
      stock.low_52w || '',
      stock.beta || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screener-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const formatMarketCap = useCallback((value?: number) => {
    if (!value) return '-';
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e7) return `${(value / 1e7).toFixed(2)}Cr`;
    if (value >= 1e5) return `${(value / 1e5).toFixed(2)}L`;
    return value.toLocaleString();
  }, []);

  const formatNumber = useCallback((value?: number, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(decimals);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setResults([]);
    setTotal(0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--bg-raised)] border border-[var(--border-primary)] rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Sliders className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stock Screener</h1>
              <p className="text-[var(--text-secondary)]">Filter stocks by fundamentals</p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-primary)] hover:bg-[var(--bg-overlay)] text-primary-400 rounded-lg transition-all"
            >
              <Filter className="h-4 w-4" />
              <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
            </button>
            {results.length > 0 && (
              <>
                <button
                  onClick={() => setSaveModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-primary)] hover:bg-[var(--bg-overlay)] text-primary-400 rounded-lg transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={exportToCsv}
                  className="flex items-center space-x-2 px-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-primary)] hover:bg-[var(--bg-overlay)] text-primary-400 rounded-lg transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </>
            )}
            <button
              onClick={() => runScreener()}
              disabled={isLoading}
              className="btn-glass-primary px-5 py-2.5 flex items-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Run Screener</span>
            </button>
          </div>
        </div>
      </div>

      {/* Presets & Saved Screeners */}
      <div className="bg-[var(--bg-raised)] border border-[var(--border-primary)] rounded-lg p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-[var(--text-secondary)] mr-2">Quick Presets:</span>
          {presets.slice(0, 6).map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              className="px-4 py-1.5 text-sm bg-[var(--bg-overlay)] hover:bg-[var(--bg-overlay)] text-primary-400 rounded-full transition-all border border-[var(--border-primary)]"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
          {savedScreeners.length > 0 && (
            <>
              <span className="text-[var(--text-muted)] mx-2">|</span>
              <span className="text-sm font-medium text-[var(--text-secondary)] mr-2">Saved:</span>
              {savedScreeners.slice(0, 3).map((screener) => (
                <button
                  key={screener.id}
                  onClick={() => loadSavedScreener(screener)}
                  className="px-4 py-1.5 text-sm bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-full transition-all flex items-center space-x-1.5 border border-blue-500/20"
                >
                  <Bookmark className="h-3 w-3" />
                  <span>{screener.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && filterOptions && (
        <div className="bg-[var(--bg-raised)] border border-[var(--border-primary)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center space-x-2">
              <Filter className="h-5 w-5 text-primary-400" />
              <span>Filters</span>
            </h2>
            <button
              onClick={clearFilters}
              className="text-sm text-[var(--text-secondary)] hover:text-primary-400 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* PE Ratio */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                PE Ratio
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.pe_min || ''}
                  onChange={(e) => setFilters({ ...filters, pe_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.pe_max || ''}
                  onChange={(e) => setFilters({ ...filters, pe_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {/* PB Ratio */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                PB Ratio
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.pb_min || ''}
                  onChange={(e) => setFilters({ ...filters, pb_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.pb_max || ''}
                  onChange={(e) => setFilters({ ...filters, pb_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {/* ROE */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                ROE (%)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.roe_min || ''}
                  onChange={(e) => setFilters({ ...filters, roe_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.roe_max || ''}
                  onChange={(e) => setFilters({ ...filters, roe_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {/* Dividend Yield */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Dividend Yield (%)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.dividend_yield_min || ''}
                  onChange={(e) => setFilters({ ...filters, dividend_yield_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.dividend_yield_max || ''}
                  onChange={(e) => setFilters({ ...filters, dividend_yield_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {/* Debt to Equity */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Debt/Equity (Max)
              </label>
              <input
                type="number"
                placeholder="Max D/E"
                value={filters.debt_to_equity_max || ''}
                onChange={(e) => setFilters({ ...filters, debt_to_equity_max: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
              />
            </div>

            {/* Current Ratio */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Current Ratio (Min)
              </label>
              <input
                type="number"
                placeholder="Min"
                value={filters.current_ratio_min || ''}
                onChange={(e) => setFilters({ ...filters, current_ratio_min: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
              />
            </div>

            {/* Market Cap */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Market Cap (Cr)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.market_cap_min ? filters.market_cap_min / 1e7 : ''}
                  onChange={(e) => setFilters({ ...filters, market_cap_min: e.target.value ? Number(e.target.value) * 1e7 : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.market_cap_max ? filters.market_cap_max / 1e7 : ''}
                  onChange={(e) => setFilters({ ...filters, market_cap_max: e.target.value ? Number(e.target.value) * 1e7 : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {/* 52-Week High/Low */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Near 52W High/Low (%)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="High %"
                  value={filters.near_52w_high || ''}
                  onChange={(e) => setFilters({ ...filters, near_52w_high: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
                <input
                  type="number"
                  placeholder="Low %"
                  value={filters.near_52w_low || ''}
                  onChange={(e) => setFilters({ ...filters, near_52w_low: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {/* Sector */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Sector
              </label>
              <select
                value={filters.sectors?.[0] || ''}
                onChange={(e) => setFilters({ ...filters, sectors: e.target.value ? [e.target.value] : undefined })}
                className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm w-full px-3 py-2"
              >
                <option value="">All Sectors</option>
                {filterOptions.sectors.map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            {/* FNO Only */}
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer px-4 py-2.5 bg-[var(--bg-overlay)] border border-[var(--border-primary)] rounded-lg hover:bg-[var(--bg-overlay)] transition-colors">
                <input
                  type="checkbox"
                  checked={filters.is_fno || false}
                  onChange={(e) => setFilters({ ...filters, is_fno: e.target.checked ? true : undefined })}
                  className="w-4 h-4 text-primary-400 border-[var(--border-primary)] rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-primary-400">F&O Stocks Only</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-[var(--text-secondary)]">
            Showing <span className="font-semibold text-primary-400 font-mono">{results.length}</span> of{' '}
            <span className="font-semibold font-mono">{total}</span> stocks
          </p>
          <div className="flex items-center space-x-2">
            {page > 1 && (
              <button
                onClick={() => runScreener(filters, page - 1)}
                className="px-4 py-1.5 text-sm bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-primary-400 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
              >
                Previous
              </button>
            )}
            {(page * perPage) < total && (
              <button
                onClick={() => runScreener(filters, page + 1)}
                className="px-4 py-1.5 text-sm bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-primary-400 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-[var(--bg-raised)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-primary-500/30 blur-xl rounded-full animate-pulse" />
              <RefreshCw className="relative h-16 w-16 text-primary-500 animate-spin mx-auto" />
            </div>
            <p className="text-[var(--text-secondary)]">Running screener...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center">
            <div className="relative mx-auto w-20 h-20 mb-4">
              <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full" />
              <Search className="relative h-20 w-20 text-primary-500/40 mx-auto" />
            </div>
            <p className="text-[var(--text-secondary)] font-medium">Set filters and click &quot;Run Screener&quot;</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Or select a preset to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-glass w-full">
              <thead>
                <tr>
                  {[
                    { key: 'symbol', label: 'Symbol' },
                    { key: 'name', label: 'Name' },
                    { key: 'sector', label: 'Sector' },
                    { key: 'market_cap', label: 'Market Cap' },
                    { key: 'current_price', label: 'Price' },
                    { key: 'pe_ratio', label: 'PE' },
                    { key: 'pb_ratio', label: 'PB' },
                    { key: 'roe', label: 'ROE %' },
                    { key: 'dividend_yield', label: 'Div Yield %' },
                    { key: 'debt_to_equity', label: 'D/E' },
                    { key: 'price_to_52w_high', label: '% of 52W H' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="cursor-pointer hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col.label}</span>
                        {sortBy === col.key && (
                          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((stock) => (
                  <tr key={stock.symbol}>
                    <td>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-[var(--text-primary)]">{stock.symbol}</span>
                        {stock.is_fno && (
                          <span title="F&O enabled">
                            <Star className="h-3 w-3 text-yellow-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-[var(--text-secondary)] text-sm max-w-[200px] truncate">
                      {stock.name || '-'}
                    </td>
                    <td className="text-[var(--text-secondary)] text-sm">{stock.sector || '-'}</td>
                    <td className="font-medium text-[var(--text-primary)] font-mono">
                      {formatMarketCap(stock.market_cap)}
                    </td>
                    <td className="text-[var(--text-primary)] font-mono">
                      {stock.current_price ? `₹${stock.current_price.toLocaleString()}` : '-'}
                    </td>
                    <td className="text-[var(--text-secondary)] font-mono">{formatNumber(stock.pe_ratio)}</td>
                    <td className="text-[var(--text-secondary)] font-mono">{formatNumber(stock.pb_ratio)}</td>
                    <td>
                      <span className={`font-mono ${stock.roe && stock.roe > 15 ? 'text-green-400 font-medium' : 'text-[var(--text-secondary)]'}`}>
                        {formatNumber(stock.roe)}
                      </span>
                    </td>
                    <td>
                      <span className={`font-mono ${stock.dividend_yield && stock.dividend_yield > 2 ? 'text-green-400 font-medium' : 'text-[var(--text-secondary)]'}`}>
                        {formatNumber(stock.dividend_yield)}
                      </span>
                    </td>
                    <td>
                      <span className={`font-mono ${stock.debt_to_equity && stock.debt_to_equity > 100 ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                        {formatNumber(stock.debt_to_equity)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-1">
                        {stock.price_to_52w_high && stock.price_to_52w_high >= 95 ? (
                          <TrendingUp className="h-3 w-3 text-green-400" />
                        ) : stock.price_to_52w_high && stock.price_to_52w_high <= 60 ? (
                          <TrendingDown className="h-3 w-3 text-red-400" />
                        ) : null}
                        <span className="text-[var(--text-secondary)] font-mono">{formatNumber(stock.price_to_52w_high)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--bg-raised)] border border-[var(--border-primary)] rounded-lg w-full max-w-md p-6 mx-4 animate-slide-down">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Save Screener</h2>
              <button onClick={() => setSaveModalOpen(false)} className="p-2 hover:bg-[var(--bg-overlay)] rounded-lg transition-colors">
                <X className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Name</label>
                <input
                  type="text"
                  value={screenerName}
                  onChange={(e) => setScreenerName(e.target.value)}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg w-full px-3 py-2 placeholder:text-[var(--text-muted)]"
                  placeholder="My Value Screener"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSaveModalOpen(false)}
                  className="flex-1 px-4 py-2.5 btn-glass-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={saveScreener}
                  disabled={!screenerName.trim()}
                  className="flex-1 btn-glass-primary disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
