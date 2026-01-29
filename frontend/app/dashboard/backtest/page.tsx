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
  FlaskConical,
  Zap,
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
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

  const tabs = [
    { id: 'builder', label: 'Strategy Builder', icon: Settings },
    { id: 'history', label: 'History', icon: History },
    { id: 'results', label: 'Results', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card-dashboard p-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-glow">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Backtesting</h1>
            <p className="text-gray-500">Test trading strategies on historical data</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-glow'
                : 'glass-card-dashboard text-gray-600 hover:text-primary-600'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card-dashboard border-l-4 border-l-red-500 p-4 flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-700 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-50 rounded-lg transition-colors">
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
            <div className="glass-card-dashboard p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 text-primary-500 mr-2" />
                Basic Info
              </h3>
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
                    className="input-glass-light"
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
                    className="input-glass-light"
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
                    className="input-glass-light"
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
                    className="input-glass-light"
                  />
                </div>
              </div>
            </div>

            {/* Symbols */}
            <div className="glass-card-dashboard p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="h-5 w-5 text-primary-500 mr-2" />
                Symbols
              </h3>
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
                  className="input-glass-light"
                />
                {showSymbolDropdown && filteredSymbols.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 glass-card-dashboard max-h-48 overflow-y-auto">
                    {filteredSymbols.slice(0, 10).map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => handleAddSymbol(symbol)}
                        className="w-full px-4 py-2 text-left hover:bg-primary-50 text-sm transition-colors"
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
                    className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-primary-50 to-purple-50 text-primary-700 rounded-full text-sm font-medium border border-primary-100"
                  >
                    {symbol}
                    <button
                      onClick={() => handleRemoveSymbol(symbol)}
                      className="ml-2 hover:text-primary-900 transition-colors"
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
            <div className="glass-card-dashboard p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 text-primary-500 mr-2" />
                Strategy
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Strategy Type
                  </label>
                  <div className="relative">
                    <select
                      value={formData.strategyType}
                      onChange={e => setFormData(prev => ({ ...prev, strategyType: e.target.value }))}
                      className="input-glass-light appearance-none pr-10"
                    >
                      {strategyTypes.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Strategy-specific params */}
              {formData.strategyType === 'sma_crossover' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-xl border border-primary-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fast SMA Period
                    </label>
                    <input
                      type="number"
                      value={formData.fastPeriod}
                      onChange={e => setFormData(prev => ({ ...prev, fastPeriod: Number(e.target.value) }))}
                      className="input-glass-light"
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
                      className="input-glass-light"
                    />
                  </div>
                </div>
              )}

              {formData.strategyType === 'rsi' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-xl border border-primary-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Oversold Level
                    </label>
                    <input
                      type="number"
                      value={formData.rsiOversold}
                      onChange={e => setFormData(prev => ({ ...prev, rsiOversold: Number(e.target.value) }))}
                      className="input-glass-light"
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
                      className="input-glass-light"
                    />
                  </div>
                </div>
              )}

              {formData.strategyType === 'breakout' && (
                <div className="p-4 bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-xl border border-primary-100">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Breakout Period
                  </label>
                  <input
                    type="number"
                    value={formData.breakoutPeriod}
                    onChange={e => setFormData(prev => ({ ...prev, breakoutPeriod: Number(e.target.value) }))}
                    className="input-glass-light"
                  />
                </div>
              )}
            </div>

            {/* Position & Risk */}
            <div className="glass-card-dashboard p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Percent className="h-5 w-5 text-primary-500 mr-2" />
                Position & Risk Management
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position Sizing
                  </label>
                  <div className="relative">
                    <select
                      value={formData.positionSize}
                      onChange={e => setFormData(prev => ({ ...prev, positionSize: e.target.value as any }))}
                      className="input-glass-light appearance-none pr-10"
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percent">% of Capital</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
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
                      className="input-glass-light"
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
                      className="input-glass-light"
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
                    className="input-glass-light"
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
                    className="input-glass-light"
                  />
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunBacktest}
              disabled={isRunning || formData.symbols.length === 0}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-glow transition-all"
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
            <div className="glass-card-dashboard p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Presets</h3>
              <div className="space-y-2">
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="w-full p-4 text-left glass-card-purple rounded-xl hover:shadow-md transition-all group"
                  >
                    <div className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">{preset.name}</div>
                    <div className="text-sm text-gray-500">{preset.type}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Info */}
            <div className="glass-card-dashboard p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Info</h3>
              {strategyTypes.find(st => st.id === formData.strategyType) && (
                <div className="p-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-100">
                  <p className="text-sm text-gray-600">
                    {strategyTypes.find(st => st.id === formData.strategyType)?.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="glass-card-dashboard overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Strategy</th>
                  <th>Period</th>
                  <th className="text-right">Return</th>
                  <th className="text-right">Sharpe</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backtests.map(bt => (
                  <tr
                    key={bt.id}
                    className="cursor-pointer"
                    onClick={() => loadBacktestDetails(bt)}
                  >
                    <td className="font-medium text-gray-900">{bt.name}</td>
                    <td className="text-gray-600">{bt.strategy.name || bt.strategy.type}</td>
                    <td className="text-gray-600 text-sm">
                      {bt.start_date} to {bt.end_date}
                    </td>
                    <td className={`text-right font-medium ${
                      (bt.total_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {bt.total_return ? `${bt.total_return.toFixed(2)}%` : '-'}
                    </td>
                    <td className="text-right text-gray-600">
                      {bt.sharpe_ratio?.toFixed(2) || '-'}
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(bt.status)}`}>
                        {getStatusIcon(bt.status)}
                        <span className="capitalize">{bt.status}</span>
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteBacktest(bt.id);
                        }}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {backtests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      <FlaskConical className="h-12 w-12 mx-auto mb-4 text-primary-300" />
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className={`glass-card-dashboard p-4 card-hover-lift border-l-4 ${
              (selectedBacktest.total_return || 0) >= 0 ? 'border-l-green-500' : 'border-l-red-500'
            }`}>
              <div className="text-sm text-gray-500">Total Return</div>
              <div className={`text-2xl font-bold ${
                (selectedBacktest.total_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedBacktest.total_return?.toFixed(2) || 0}%
              </div>
            </div>
            <div className="glass-card-dashboard p-4 card-hover-lift">
              <div className="text-sm text-gray-500">Final Capital</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(selectedBacktest.final_capital)}
              </div>
            </div>
            <div className="glass-card-dashboard p-4 card-hover-lift border-l-4 border-l-primary-500">
              <div className="text-sm text-gray-500">Sharpe Ratio</div>
              <div className="text-2xl font-bold text-primary-600">
                {selectedBacktest.sharpe_ratio?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="glass-card-dashboard p-4 card-hover-lift border-l-4 border-l-red-500">
              <div className="text-sm text-gray-500">Max Drawdown</div>
              <div className="text-2xl font-bold text-red-600">
                {selectedBacktest.max_drawdown?.toFixed(2) || 0}%
              </div>
            </div>
            <div className="glass-card-dashboard p-4 card-hover-lift border-l-4 border-l-purple-500">
              <div className="text-sm text-gray-500">Win Rate</div>
              <div className="text-2xl font-bold text-purple-600">
                {selectedBacktest.win_rate?.toFixed(1) || 0}%
              </div>
            </div>
            <div className="glass-card-dashboard p-4 card-hover-lift">
              <div className="text-sm text-gray-500">Total Trades</div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedBacktest.total_trades}
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card-dashboard p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 text-primary-500 mr-2" />
                Performance Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-lg">
                  <span className="text-gray-600">CAGR</span>
                  <span className="font-medium">{selectedBacktest.cagr?.toFixed(2) || '-'}%</span>
                </div>
                <div className="flex justify-between p-3 bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-lg">
                  <span className="text-gray-600">Sortino Ratio</span>
                  <span className="font-medium">{selectedBacktest.sortino_ratio?.toFixed(2) || '-'}</span>
                </div>
                <div className="flex justify-between p-3 bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-lg">
                  <span className="text-gray-600">Profit Factor</span>
                  <span className="font-medium">{selectedBacktest.profit_factor?.toFixed(2) || '-'}</span>
                </div>
              </div>
            </div>

            <div className="glass-card-dashboard p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 text-primary-500 mr-2" />
                Trade Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-green-50/50 rounded-lg">
                  <span className="text-gray-600">Winning Trades</span>
                  <span className="font-medium text-green-600">{selectedBacktest.winning_trades}</span>
                </div>
                <div className="flex justify-between p-3 bg-red-50/50 rounded-lg">
                  <span className="text-gray-600">Losing Trades</span>
                  <span className="font-medium text-red-600">{selectedBacktest.losing_trades}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50/50 rounded-lg">
                  <span className="text-gray-600">Avg Win</span>
                  <span className="font-medium text-green-600">{formatCurrency(selectedBacktest.avg_win)}</span>
                </div>
                <div className="flex justify-between p-3 bg-red-50/50 rounded-lg">
                  <span className="text-gray-600">Avg Loss</span>
                  <span className="font-medium text-red-600">{formatCurrency(selectedBacktest.avg_loss)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          {equityCurve && (
            <div className="glass-card-dashboard p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Equity Curve</h3>
              <div className="h-64 flex items-end space-x-0.5">
                {equityCurve.equity.slice(-100).map((eq, i) => {
                  const maxEq = Math.max(...equityCurve.equity);
                  const minEq = Math.min(...equityCurve.equity);
                  const height = ((eq - minEq) / (maxEq - minEq)) * 100;
                  const isUp = i > 0 && eq >= equityCurve.equity.slice(-100)[i - 1];
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all ${
                        isUp
                          ? 'bg-gradient-to-t from-green-500 to-green-300'
                          : 'bg-gradient-to-t from-red-500 to-red-300'
                      }`}
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
          <div className="glass-card-dashboard overflow-hidden">
            <div className="px-6 py-4 border-b border-primary-100/50 bg-gradient-to-r from-primary-50/50 to-purple-50/50">
              <h3 className="text-lg font-semibold text-gray-900">Trade History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th className="text-right">Entry Price</th>
                    <th className="text-right">Exit Price</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">P&L</th>
                    <th className="text-right">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 50).map(trade => (
                    <tr key={trade.id}>
                      <td className="font-medium text-gray-900">{trade.symbol}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          trade.trade_type === 'LONG'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {trade.trade_type}
                        </span>
                      </td>
                      <td className="text-gray-600 text-sm">
                        {new Date(trade.entry_date).toLocaleDateString()}
                      </td>
                      <td className="text-gray-600 text-sm">
                        {trade.exit_date ? new Date(trade.exit_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="text-right">{formatNumber(trade.entry_price)}</td>
                      <td className="text-right">{formatNumber(trade.exit_price)}</td>
                      <td className="text-right">{trade.quantity}</td>
                      <td className={`text-right font-medium ${
                        (trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(trade.pnl)}
                      </td>
                      <td className={`text-right ${
                        (trade.return_pct || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trade.return_pct ? `${(trade.return_pct * 100).toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                  {trades.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-500">
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
        <div className="glass-card-dashboard p-12 text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="absolute inset-0 bg-primary-200/50 blur-xl rounded-full" />
            <BarChart3 className="relative h-16 w-16 mx-auto text-primary-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Backtest Selected</h3>
          <p className="text-gray-500">
            Run a backtest or select one from the History tab to view results.
          </p>
        </div>
      )}
    </div>
  );
}
