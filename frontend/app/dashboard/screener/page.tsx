'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
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
  };

  const runScreener = async (newFilters?: ScreenerFilters, newPage = 1) => {
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
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    runScreener(filters, 1);
  };

  const loadPreset = (preset: ScreenerPreset) => {
    runScreener(preset.filters);
  };

  const loadSavedScreener = (screener: SavedScreener) => {
    runScreener(screener.filters as ScreenerFilters);
  };

  const saveScreener = async () => {
    if (!screenerName.trim()) return;
    try {
      const saved = await screenerApi.saveScreener(screenerName, filters);
      setSavedScreeners([saved, ...savedScreeners]);
      setSaveModalOpen(false);
      setScreenerName('');
    } catch (error) {
      console.error('Failed to save screener:', error);
    }
  };

  const deleteScreener = async (id: number) => {
    try {
      await screenerApi.deleteScreener(id);
      setSavedScreeners(savedScreeners.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete screener:', error);
    }
  };

  const exportToCsv = () => {
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
  };

  const formatMarketCap = (value?: number) => {
    if (!value) return '-';
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e7) return `${(value / 1e7).toFixed(2)}Cr`;
    if (value >= 1e5) return `${(value / 1e5).toFixed(2)}L`;
    return value.toLocaleString();
  };

  const formatNumber = (value?: number, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(decimals);
  };

  const clearFilters = () => {
    setFilters({});
    setResults([]);
    setTotal(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Screener</h1>
          <p className="text-gray-500">Filter stocks by fundamentals</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
          {results.length > 0 && (
            <>
              <button
                onClick={() => setSaveModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
              <button
                onClick={exportToCsv}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </>
          )}
          <button
            onClick={() => runScreener()}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
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

      {/* Presets & Saved Screeners */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-500 mr-2">Quick Presets:</span>
          {presets.slice(0, 6).map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-primary-100 hover:text-primary-700 rounded-full transition-colors"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
          {savedScreeners.length > 0 && (
            <>
              <span className="text-gray-300 mx-2">|</span>
              <span className="text-sm font-medium text-gray-500 mr-2">Saved:</span>
              {savedScreeners.slice(0, 3).map((screener) => (
                <button
                  key={screener.id}
                  onClick={() => loadSavedScreener(screener)}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full transition-colors flex items-center space-x-1"
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* PE Ratio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PE Ratio
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.pe_min || ''}
                  onChange={(e) => setFilters({ ...filters, pe_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.pe_max || ''}
                  onChange={(e) => setFilters({ ...filters, pe_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* PB Ratio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PB Ratio
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.pb_min || ''}
                  onChange={(e) => setFilters({ ...filters, pb_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.pb_max || ''}
                  onChange={(e) => setFilters({ ...filters, pb_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* ROE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ROE (%)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.roe_min || ''}
                  onChange={(e) => setFilters({ ...filters, roe_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.roe_max || ''}
                  onChange={(e) => setFilters({ ...filters, roe_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Dividend Yield */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dividend Yield (%)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.dividend_yield_min || ''}
                  onChange={(e) => setFilters({ ...filters, dividend_yield_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.dividend_yield_max || ''}
                  onChange={(e) => setFilters({ ...filters, dividend_yield_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Debt to Equity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Debt/Equity (Max)
              </label>
              <input
                type="number"
                placeholder="Max D/E"
                value={filters.debt_to_equity_max || ''}
                onChange={(e) => setFilters({ ...filters, debt_to_equity_max: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Current Ratio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Ratio (Min)
              </label>
              <input
                type="number"
                placeholder="Min"
                value={filters.current_ratio_min || ''}
                onChange={(e) => setFilters({ ...filters, current_ratio_min: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Market Cap */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Market Cap (Cr)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.market_cap_min ? filters.market_cap_min / 1e7 : ''}
                  onChange={(e) => setFilters({ ...filters, market_cap_min: e.target.value ? Number(e.target.value) * 1e7 : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.market_cap_max ? filters.market_cap_max / 1e7 : ''}
                  onChange={(e) => setFilters({ ...filters, market_cap_max: e.target.value ? Number(e.target.value) * 1e7 : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* 52-Week High/Low */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Near 52W High/Low (%)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="High %"
                  value={filters.near_52w_high || ''}
                  onChange={(e) => setFilters({ ...filters, near_52w_high: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="number"
                  placeholder="Low %"
                  value={filters.near_52w_low || ''}
                  onChange={(e) => setFilters({ ...filters, near_52w_low: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Sector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sector
              </label>
              <select
                value={filters.sectors?.[0] || ''}
                onChange={(e) => setFilters({ ...filters, sectors: e.target.value ? [e.target.value] : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Sectors</option>
                {filterOptions.sectors.map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            {/* FNO Only */}
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.is_fno || false}
                  onChange={(e) => setFilters({ ...filters, is_fno: e.target.checked ? true : undefined })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">F&O Stocks Only</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {results.length} of {total} stocks
          </p>
          <div className="flex items-center space-x-2">
            {page > 1 && (
              <button
                onClick={() => runScreener(filters, page - 1)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Previous
              </button>
            )}
            {(page * perPage) < total && (
              <button
                onClick={() => runScreener(filters, page + 1)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
            <p className="mt-2 text-gray-500">Running screener...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center">
            <Search className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="mt-2 text-gray-500">Set filters and click "Run Screener"</p>
            <p className="text-sm text-gray-400 mt-1">Or select a preset to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
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
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
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
              <tbody className="divide-y divide-gray-100">
                {results.map((stock) => (
                  <tr key={stock.symbol} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{stock.symbol}</span>
                        {stock.is_fno && (
                          <Star className="h-3 w-3 text-yellow-500" title="F&O enabled" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm max-w-[200px] truncate">
                      {stock.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{stock.sector || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {formatMarketCap(stock.market_cap)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {stock.current_price ? `₹${stock.current_price.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatNumber(stock.pe_ratio)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatNumber(stock.pb_ratio)}</td>
                    <td className="px-4 py-3">
                      <span className={stock.roe && stock.roe > 15 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                        {formatNumber(stock.roe)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={stock.dividend_yield && stock.dividend_yield > 2 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                        {formatNumber(stock.dividend_yield)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={stock.debt_to_equity && stock.debt_to_equity > 100 ? 'text-red-600' : 'text-gray-600'}>
                        {formatNumber(stock.debt_to_equity)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        {stock.price_to_52w_high && stock.price_to_52w_high >= 95 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : stock.price_to_52w_high && stock.price_to_52w_high <= 60 ? (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        ) : null}
                        <span className="text-gray-600">{formatNumber(stock.price_to_52w_high)}</span>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Save Screener</h2>
              <button onClick={() => setSaveModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={screenerName}
                  onChange={(e) => setScreenerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="My Value Screener"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSaveModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveScreener}
                  disabled={!screenerName.trim()}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
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
