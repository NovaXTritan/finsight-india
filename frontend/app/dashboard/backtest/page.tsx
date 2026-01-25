'use client';

import { useEffect, useState } from 'react';
import {
  backtestApi,
  BacktestRun,
  BacktestTrade,
  BacktestStrategy,
  EquityCurve,
  StrategyType,
  StrategyPreset,
} from '@/lib/api';
import {
  Play,
  History,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Percent,
} from 'lucide-react';

// Nifty 50 symbols for selection
const POPULAR_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'ITC',
  'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'BAJFINANCE',
  'WIPRO', 'HCLTECH', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO',
];

export default function BacktestPage() {
  // State
  const [backtests, setBacktests] = useState<BacktestRun[]>([]);
  const [selectedBacktest, setSelectedBacktest] = useState<BacktestRun | null>(null);
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [equityCurve, setEquityCurve] = useState<EquityCurve | null>(null);
  const [strategyTypes, setStrategyTypes] = useState<StrategyType[]>([]);
  const [presets, setPresets] = useState<StrategyPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'history' | 'results'>('builder');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    strategyType: 'sma_crossover',
    symbols: [] as string[],
    startDate: '',
    endDate: '',
    initialCapital: 100000,
    positionSize: 'fixed' as 'fixed' | 'percent',
    capitalPerTrade: 50000,
    capitalPercent: 10,
    stopLossPct: 5,
    takeProfitPct: 10,
    // Strategy params
    fastPeriod: 20,
    slowPeriod: 50,
    rsiOversold: 30,
    rsiOverbought: 70,
    breakoutPeriod: 20,
  });

  const [symbolInput, setSymbolInput] = useState('');
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [typesRes, presetsRes, backtestsRes] = await Promise.all([
        backtestApi.getStrategyTypes(),
        backtestApi.getPresets(),
        backtestApi.list(),
      ]);
      setStrategyTypes(typesRes.types);
      setPresets(presetsRes.presets);
      setBacktests(backtestsRes.runs);

      // Set default dates (last 1 year)
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      setFormData(prev => ({
        ...prev,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      }));
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const loadBacktestDetails = async (backtest: BacktestRun) => {
    setSelectedBacktest(backtest);
    setActiveTab('results');

    if (backtest.status === 'completed') {
      try {
        const [tradesRes, curveRes] = await Promise.all([
          backtestApi.getTrades(backtest.id),
          backtestApi.getEquityCurve(backtest.id),
        ]);
        setTrades(tradesRes.trades);
        setEquityCurve(curveRes);
      } catch (err) {
        console.error('Failed to load backtest details:', err);
      }
    }
  };

  const handleAddSymbol = (symbol: string) => {
    const s = symbol.toUpperCase().trim();
    if (s && !formData.symbols.includes(s) && formData.symbols.length < 20) {
      setFormData(prev => ({ ...prev, symbols: [...prev.symbols, s] }));
    }
    setSymbolInput('');
    setShowSymbolDropdown(false);
  };

  const handleRemoveSymbol = (symbol: string) => {
    setFormData(prev => ({
      ...prev,
      symbols: prev.symbols.filter(s => s !== symbol),
    }));
  };

  const applyPreset = (preset: StrategyPreset) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      strategyType: preset.config.type,
      stopLossPct: preset.config.stop_loss_pct || 5,
      takeProfitPct: preset.config.take_profit_pct || 10,
      fastPeriod: preset.config.params?.fast_period || 20,
      slowPeriod: preset.config.params?.slow_period || 50,
      rsiOversold: preset.config.params?.oversold || 30,
      rsiOverbought: preset.config.params?.overbought || 70,
      breakoutPeriod: preset.config.params?.period || 20,
    }));
  };

  const buildStrategy = (): BacktestStrategy => {
    const params: Record<string, number> = {};

    if (formData.strategyType === 'sma_crossover') {
      params.fast_period = formData.fastPeriod;
      params.slow_period = formData.slowPeriod;
    } else if (formData.strategyType === 'rsi') {
      params.oversold = formData.rsiOversold;
      params.overbought = formData.rsiOverbought;
      params.exit_level = 50;
    } else if (formData.strategyType === 'breakout') {
      params.period = formData.breakoutPeriod;
    }

    return {
      name: formData.name || `${formData.strategyType} Strategy`,
      type: formData.strategyType as any,
      params,
      position_size: formData.positionSize,
      capital_per_trade: formData.positionSize === 'fixed' ? formData.capitalPerTrade : undefined,
      capital_percent: formData.positionSize === 'percent' ? formData.capitalPercent : undefined,
      stop_loss_pct: formData.stopLossPct || undefined,
      take_profit_pct: formData.takeProfitPct || undefined,
    };
  };

  const handleRunBacktest = async () => {
    if (formData.symbols.length === 0) {
      setError('Please add at least one symbol');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Please select date range');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const result = await backtestApi.run({
        name: formData.name || `${formData.strategyType} Backtest`,
        strategy: buildStrategy(),
        symbols: formData.symbols,
        start_date: formData.startDate,
        end_date: formData.endDate,
        initial_capital: formData.initialCapital,
      });

      setBacktests(prev => [result, ...prev]);
      await loadBacktestDetails(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Backtest failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeleteBacktest = async (id: string) => {
    try {
      await backtestApi.delete(id);
      setBacktests(prev => prev.filter(b => b.id !== id));
      if (selectedBacktest?.id === id) {
        setSelectedBacktest(null);
        setActiveTab('builder');
      }
    } catch (err) {
      console.error('Failed to delete backtest:', err);
    }
  };

  const formatNumber = (value?: number | null, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredSymbols = POPULAR_SYMBOLS.filter(
    s => s.toLowerCase().includes(symbolInput.toLowerCase()) && !formData.symbols.includes(s)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backtesting</h1>
          <p className="text-gray-500">Test trading strategies on historical data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'builder', label: 'Strategy Builder', icon: Settings },
            { id: 'history', label: 'History', icon: History },
            { id: 'results', label: 'Results', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Strategy Builder Tab */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Strategy Config */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backtest Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Strategy Backtest"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Capital
                  </label>
                  <input
                    type="number"
                    value={formData.initialCapital}
                    onChange={e => setFormData(prev => ({ ...prev, initialCapital: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Symbols */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Symbols</h3>
              <div className="relative mb-4">
                <input
                  type="text"
                  value={symbolInput}
                  onChange={e => {
                    setSymbolInput(e.target.value);
                    setShowSymbolDropdown(true);
                  }}
                  onFocus={() => setShowSymbolDropdown(true)}
                  placeholder="Search and add symbols..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {showSymbolDropdown && filteredSymbols.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredSymbols.slice(0, 10).map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => handleAddSymbol(symbol)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.symbols.map(symbol => (
                  <span
                    key={symbol}
                    className="inline-flex items-center px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                  >
                    {symbol}
                    <button
                      onClick={() => handleRemoveSymbol(symbol)}
                      className="ml-2 hover:text-primary-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {formData.symbols.length === 0 && (
                  <p className="text-gray-500 text-sm">No symbols selected</p>
                )}
              </div>
            </div>

            {/* Strategy */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Strategy Type
                  </label>
                  <select
                    value={formData.strategyType}
                    onChange={e => setFormData(prev => ({ ...prev, strategyType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {strategyTypes.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Strategy-specific params */}
              {formData.strategyType === 'sma_crossover' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fast SMA Period
                    </label>
                    <input
                      type="number"
                      value={formData.fastPeriod}
                      onChange={e => setFormData(prev => ({ ...prev, fastPeriod: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slow SMA Period
                    </label>
                    <input
                      type="number"
                      value={formData.slowPeriod}
                      onChange={e => setFormData(prev => ({ ...prev, slowPeriod: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {formData.strategyType === 'rsi' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Oversold Level
                    </label>
                    <input
                      type="number"
                      value={formData.rsiOversold}
                      onChange={e => setFormData(prev => ({ ...prev, rsiOversold: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overbought Level
                    </label>
                    <input
                      type="number"
                      value={formData.rsiOverbought}
                      onChange={e => setFormData(prev => ({ ...prev, rsiOverbought: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {formData.strategyType === 'breakout' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Breakout Period
                  </label>
                  <input
                    type="number"
                    value={formData.breakoutPeriod}
                    onChange={e => setFormData(prev => ({ ...prev, breakoutPeriod: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Position & Risk */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Position & Risk Management</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position Sizing
                  </label>
                  <select
                    value={formData.positionSize}
                    onChange={e => setFormData(prev => ({ ...prev, positionSize: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="percent">% of Capital</option>
                  </select>
                </div>

                {formData.positionSize === 'fixed' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capital per Trade
                    </label>
                    <input
                      type="number"
                      value={formData.capitalPerTrade}
                      onChange={e => setFormData(prev => ({ ...prev, capitalPerTrade: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capital %
                    </label>
                    <input
                      type="number"
                      value={formData.capitalPercent}
                      onChange={e => setFormData(prev => ({ ...prev, capitalPercent: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stop Loss %
                  </label>
                  <input
                    type="number"
                    value={formData.stopLossPct}
                    onChange={e => setFormData(prev => ({ ...prev, stopLossPct: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Take Profit %
                  </label>
                  <input
                    type="number"
                    value={formData.takeProfitPct}
                    onChange={e => setFormData(prev => ({ ...prev, takeProfitPct: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunBacktest}
              disabled={isRunning || formData.symbols.length === 0}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Running Backtest...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Run Backtest</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Presets */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Presets</h3>
              <div className="space-y-2">
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{preset.name}</div>
                    <div className="text-sm text-gray-500">{preset.type}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Info</h3>
              {strategyTypes.find(st => st.id === formData.strategyType) && (
                <p className="text-sm text-gray-600">
                  {strategyTypes.find(st => st.id === formData.strategyType)?.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Strategy</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Period</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Return</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Sharpe</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backtests.map(bt => (
                  <tr
                    key={bt.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => loadBacktestDetails(bt)}
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">{bt.name}</td>
                    <td className="py-3 px-4 text-gray-600">{bt.strategy.name || bt.strategy.type}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {bt.start_date} to {bt.end_date}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      (bt.total_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {bt.total_return ? `${bt.total_return.toFixed(2)}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {bt.sharpe_ratio?.toFixed(2) || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bt.status)}`}>
                        {getStatusIcon(bt.status)}
                        <span className="capitalize">{bt.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteBacktest(bt.id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {backtests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No backtests yet. Create one in the Strategy Builder tab.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && selectedBacktest && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Total Return</div>
              <div className={`text-2xl font-bold ${
                (selectedBacktest.total_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedBacktest.total_return?.toFixed(2) || 0}%
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Final Capital</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(selectedBacktest.final_capital)}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Sharpe Ratio</div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedBacktest.sharpe_ratio?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Max Drawdown</div>
              <div className="text-2xl font-bold text-red-600">
                {selectedBacktest.max_drawdown?.toFixed(2) || 0}%
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Win Rate</div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedBacktest.win_rate?.toFixed(1) || 0}%
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Total Trades</div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedBacktest.total_trades}
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">CAGR</span>
                  <span className="font-medium">{selectedBacktest.cagr?.toFixed(2) || '-'}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sortino Ratio</span>
                  <span className="font-medium">{selectedBacktest.sortino_ratio?.toFixed(2) || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit Factor</span>
                  <span className="font-medium">{selectedBacktest.profit_factor?.toFixed(2) || '-'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trade Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Winning Trades</span>
                  <span className="font-medium text-green-600">{selectedBacktest.winning_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Losing Trades</span>
                  <span className="font-medium text-red-600">{selectedBacktest.losing_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Win</span>
                  <span className="font-medium text-green-600">{formatCurrency(selectedBacktest.avg_win)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Loss</span>
                  <span className="font-medium text-red-600">{formatCurrency(selectedBacktest.avg_loss)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          {equityCurve && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Equity Curve</h3>
              <div className="h-64 flex items-end space-x-1">
                {equityCurve.equity.slice(-100).map((eq, i) => {
                  const maxEq = Math.max(...equityCurve.equity);
                  const minEq = Math.min(...equityCurve.equity);
                  const height = ((eq - minEq) / (maxEq - minEq)) * 100;
                  const isUp = i > 0 && eq >= equityCurve.equity.slice(-100)[i - 1];
                  return (
                    <div
                      key={i}
                      className={`flex-1 ${isUp ? 'bg-green-400' : 'bg-red-400'} rounded-t`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${equityCurve.dates.slice(-100)[i]}: ${formatCurrency(eq)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{equityCurve.dates[0]}</span>
                <span>{equityCurve.dates[equityCurve.dates.length - 1]}</span>
              </div>
            </div>
          )}

          {/* Trades Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Trade History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Symbol</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Entry</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Exit</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Entry Price</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Exit Price</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Qty</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">P&L</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 50).map(trade => (
                    <tr key={trade.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{trade.symbol}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.trade_type === 'LONG' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {trade.trade_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {new Date(trade.entry_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {trade.exit_date ? new Date(trade.exit_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">{formatNumber(trade.entry_price)}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(trade.exit_price)}</td>
                      <td className="py-3 px-4 text-right">{trade.quantity}</td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        (trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(trade.pnl)}
                      </td>
                      <td className={`py-3 px-4 text-right ${
                        (trade.return_pct || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trade.return_pct ? `${(trade.return_pct * 100).toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                  {trades.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        No trades found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'results' && !selectedBacktest && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Backtest Selected</h3>
          <p className="text-gray-500">
            Run a backtest or select one from the History tab to view results.
          </p>
        </div>
      )}
    </div>
  );
}
