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
  Sparkles,
  ArrowRight,
  Calendar,
  IndianRupee,
  LineChart,
  Activity,
  Shield,
  Rocket,
  Brain,
  Gauge,
} from 'lucide-react';

// Built-in strategy presets with visual data
const STRATEGY_PRESETS = [
  {
    id: 'momentum',
    name: 'Momentum Rider',
    description: 'Catches strong uptrends using moving average crossovers',
    icon: Rocket,
    color: 'blue',
    strategyType: 'sma_crossover',
    params: { fast_period: 10, slow_period: 30 },
    risk: 'Medium',
    timeframe: 'Swing',
  },
  {
    id: 'value',
    name: 'Value Hunter',
    description: 'Buys oversold stocks using RSI indicator',
    icon: Target,
    color: 'green',
    strategyType: 'rsi',
    params: { oversold: 30, overbought: 70 },
    risk: 'Low',
    timeframe: 'Position',
  },
  {
    id: 'breakout',
    name: 'Breakout Trader',
    description: 'Captures price breakouts from consolidation zones',
    icon: Zap,
    color: 'orange',
    strategyType: 'breakout',
    params: { period: 20 },
    risk: 'High',
    timeframe: 'Swing',
  },
  {
    id: 'conservative',
    name: 'Safe & Steady',
    description: 'Long-term trend following with tight risk management',
    icon: Shield,
    color: 'purple',
    strategyType: 'sma_crossover',
    params: { fast_period: 50, slow_period: 200 },
    risk: 'Low',
    timeframe: 'Long-term',
  },
];

// Color map for strategy presets
const PRESET_COLORS: Record<string, { icon: string; selected: string; border: string }> = {
  blue: {
    icon: 'bg-blue-500/10 border border-blue-500/20',
    selected: 'bg-blue-500/10 border-blue-500/30',
    border: 'border-blue-500/20',
  },
  green: {
    icon: 'bg-green-500/10 border border-green-500/20',
    selected: 'bg-green-500/10 border-green-500/30',
    border: 'border-green-500/20',
  },
  orange: {
    icon: 'bg-orange-500/10 border border-orange-500/20',
    selected: 'bg-orange-500/10 border-orange-500/30',
    border: 'border-orange-500/20',
  },
  purple: {
    icon: 'bg-purple-500/10 border border-purple-500/20',
    selected: 'bg-purple-500/10 border-purple-500/30',
    border: 'border-purple-500/20',
  },
};

const ICON_TEXT_COLORS: Record<string, string> = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  orange: 'text-orange-400',
  purple: 'text-purple-400',
};

// Popular symbol groups
const SYMBOL_GROUPS = [
  { name: 'Nifty 50 Top 10', symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'ITC'] },
  { name: 'IT Sector', symbols: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM'] },
  { name: 'Banking', symbols: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK'] },
  { name: 'Auto', symbols: ['MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO'] },
];

const ALL_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'ITC',
  'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'BAJFINANCE',
  'WIPRO', 'HCLTECH', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO',
  'TECHM', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO',
];

export default function BacktestPage() {
  // State
  const [backtests, setBacktests] = useState<BacktestRun[]>([]);
  const [selectedBacktest, setSelectedBacktest] = useState<BacktestRun | null>(null);
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [equityCurve, setEquityCurve] = useState<EquityCurve | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'presets' | 'custom' | 'history' | 'results'>('presets');

  // Simple form state
  const [selectedPreset, setSelectedPreset] = useState<typeof STRATEGY_PRESETS[0] | null>(null);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [capital, setCapital] = useState(100000);
  const [dateRange, setDateRange] = useState('1y');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stopLoss, setStopLoss] = useState(5);
  const [takeProfit, setTakeProfit] = useState(10);

  useEffect(() => {
    loadBacktests();
  }, []);

  const loadBacktests = async () => {
    try {
      const res = await backtestApi.list();
      setBacktests(res.runs);
    } catch (err) {
      console.error('Failed to load backtests:', err);
    }
  };

  const loadBacktestDetails = async (backtest: BacktestRun) => {
    setSelectedBacktest(backtest);
    setView('results');

    if (backtest.status === 'completed') {
      try {
        const [tradesRes, curveRes] = await Promise.allSettled([
          backtestApi.getTrades(backtest.id),
          backtestApi.getEquityCurve(backtest.id),
        ]);
        if (tradesRes.status === 'fulfilled') setTrades(tradesRes.value.trades);
        if (curveRes.status === 'fulfilled') setEquityCurve(curveRes.value);
      } catch (err) {
        console.error('Failed to load backtest details:', err);
      }
    }
  };

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    switch (dateRange) {
      case '3m': start.setMonth(start.getMonth() - 3); break;
      case '6m': start.setMonth(start.getMonth() - 6); break;
      case '1y': start.setFullYear(start.getFullYear() - 1); break;
      case '2y': start.setFullYear(start.getFullYear() - 2); break;
      case '5y': start.setFullYear(start.getFullYear() - 5); break;
    }
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const handleQuickBacktest = async (preset: typeof STRATEGY_PRESETS[0]) => {
    if (selectedSymbols.length === 0) {
      setError('Please select at least one stock');
      return;
    }

    setIsRunning(true);
    setError(null);
    const dates = getDateRange();

    try {
      const result = await backtestApi.run({
        name: `${preset.name} - ${new Date().toLocaleDateString()}`,
        strategy: {
          name: preset.name,
          type: preset.strategyType as any,
          params: preset.params as unknown as Record<string, number>,
          position_size: 'fixed',
          capital_per_trade: Math.floor(capital / Math.min(selectedSymbols.length, 5)),
          stop_loss_pct: stopLoss,
          take_profit_pct: takeProfit,
        },
        symbols: selectedSymbols,
        start_date: dates.start,
        end_date: dates.end,
        initial_capital: capital,
      });

      setBacktests(prev => [result, ...prev]);
      await loadBacktestDetails(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Backtest failed. Please try again.');
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
        setView('presets');
      }
    } catch (err) {
      console.error('Failed to delete backtest:', err);
    }
  };

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : prev.length < 20 ? [...prev, symbol] : prev
    );
  };

  const selectSymbolGroup = (symbols: string[]) => {
    setSelectedSymbols(symbols.slice(0, 20));
  };

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'High': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-[var(--bg-overlay)] text-[var(--text-secondary)]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card-dashboard p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-2xl">
              <FlaskConical className="h-7 w-7 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Strategy Backtester</h1>
              <p className="text-[var(--text-secondary)]">Test strategies on historical data before risking real money</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView('presets')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === 'presets' || view === 'custom'
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'
              }`}
            >
              <Sparkles className="h-4 w-4 inline mr-2" />
              New Test
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === 'history'
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'
              }`}
            >
              <History className="h-4 w-4 inline mr-2" />
              History ({backtests.length})
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card-dashboard border-l-4 border-l-red-500 p-4 flex items-center space-x-3 animate-slide-down">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-red-400 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-900/20 rounded-lg transition-colors">
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Presets View */}
      {view === 'presets' && (
        <div className="space-y-6">
          {/* Step 1: Choose Strategy */}
          <div className="glass-card-dashboard p-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm">1</div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Choose a Strategy</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {STRATEGY_PRESETS.map(preset => {
                const colors = PRESET_COLORS[preset.color];
                const iconTextColor = ICON_TEXT_COLORS[preset.color];
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset)}
                    className={`relative p-5 rounded-2xl text-left transition-all duration-300 border-2 group ${
                      selectedPreset?.id === preset.id
                        ? `${colors.selected} shadow-lg scale-[1.02]`
                        : 'bg-[var(--bg-overlay)] border-[var(--border-primary)] hover:border-[var(--text-muted)] hover:shadow-md'
                    }`}
                  >
                    {selectedPreset?.id === preset.id && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle className="h-5 w-5 text-primary-400" />
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-lg ${colors.icon} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <preset.icon className={`h-6 w-6 ${iconTextColor}`} />
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">{preset.name}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">{preset.description}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRiskBadge(preset.risk)}`}>
                        {preset.risk} Risk
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-overlay)] text-[var(--text-secondary)] border border-[var(--border-primary)]">
                        {preset.timeframe}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Stocks */}
          <div className="glass-card-dashboard p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm">2</div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Select Stocks</h2>
              </div>
              <span className="text-sm text-[var(--text-secondary)] font-mono">{selectedSymbols.length}/20 selected</span>
            </div>

            {/* Quick Groups */}
            <div className="flex flex-wrap gap-2 mb-4">
              {SYMBOL_GROUPS.map(group => (
                <button
                  key={group.name}
                  onClick={() => selectSymbolGroup(group.symbols)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-[var(--bg-overlay)] text-primary-400 border border-[var(--border-primary)] hover:bg-primary-500/10 transition-all"
                >
                  {group.name}
                </button>
              ))}
              <button
                onClick={() => setSelectedSymbols([])}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-all"
              >
                Clear All
              </button>
            </div>

            {/* Symbol Grid */}
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {ALL_SYMBOLS.map(symbol => (
                <button
                  key={symbol}
                  onClick={() => toggleSymbol(symbol)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedSymbols.includes(symbol)
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-md'
                      : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Configure & Run */}
          <div className="glass-card-dashboard p-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm">3</div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Configure & Run</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Capital */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  <IndianRupee className="h-4 w-4 inline mr-1" />
                  Starting Capital
                </label>
                <div className="flex space-x-2">
                  {[100000, 500000, 1000000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setCapital(amt)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium font-mono transition-all ${
                        capital === amt
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-md'
                          : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] border border-transparent'
                      }`}
                    >
                      {amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}K`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Period */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Test Period
                </label>
                <div className="flex space-x-2">
                  {[
                    { value: '6m', label: '6M' },
                    { value: '1y', label: '1Y' },
                    { value: '2y', label: '2Y' },
                    { value: '5y', label: '5Y' },
                  ].map(period => (
                    <button
                      key={period.value}
                      onClick={() => setDateRange(period.value)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        dateRange === period.value
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-md'
                          : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] border border-transparent'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Toggle */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  <Settings className="h-4 w-4 inline mr-1" />
                  Risk Settings
                </label>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full py-2 rounded-lg text-sm font-medium bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-primary)] flex items-center justify-center space-x-2 transition-all"
                >
                  <span>{showAdvanced ? 'Hide' : 'Show'} Advanced</span>
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-primary)] mb-6 animate-slide-down">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Stop Loss %
                  </label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={e => setStopLoss(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] text-[var(--text-primary)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Take Profit %
                  </label>
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={e => setTakeProfit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] text-[var(--text-primary)] font-mono"
                  />
                </div>
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={() => selectedPreset && handleQuickBacktest(selectedPreset)}
              disabled={isRunning || !selectedPreset || selectedSymbols.length === 0}
              className="w-full py-4 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-3 transition-all hover:scale-[1.01]"
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
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {/* Summary */}
            {selectedPreset && selectedSymbols.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-primary)]">
                <p className="text-sm text-[var(--text-secondary)]">
                  Testing <span className="font-semibold text-primary-400">{selectedPreset.name}</span> strategy on{' '}
                  <span className="font-semibold text-primary-400 font-mono">{selectedSymbols.length} stocks</span> with{' '}
                  <span className="font-semibold text-primary-400 font-mono">{formatCurrency(capital)}</span> capital over{' '}
                  <span className="font-semibold text-primary-400">{dateRange === '1y' ? '1 year' : dateRange === '2y' ? '2 years' : dateRange === '5y' ? '5 years' : dateRange}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History View */}
      {view === 'history' && (
        <div className="glass-card-dashboard overflow-hidden">
          {backtests.length > 0 ? (
            <div className="divide-y divide-[var(--border-primary)]">
              {backtests.map(bt => (
                <div
                  key={bt.id}
                  onClick={() => loadBacktestDetails(bt)}
                  className="p-4 hover:bg-[var(--bg-overlay)] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        (bt.total_return || 0) >= 0
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}>
                        {(bt.total_return || 0) >= 0 ? (
                          <TrendingUp className="h-6 w-6 text-green-400" />
                        ) : (
                          <TrendingDown className="h-6 w-6 text-red-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">{bt.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {bt.strategy.name || bt.strategy.type} • {bt.start_date} to {bt.end_date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className={`text-xl font-bold font-mono ${
                          (bt.total_return || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {bt.total_return ? `${bt.total_return >= 0 ? '+' : ''}${bt.total_return.toFixed(2)}%` : '-'}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] font-mono">
                          {bt.total_trades} trades
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {bt.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {bt.status === 'running' && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
                        {bt.status === 'failed' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteBacktest(bt.id);
                          }}
                          className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <FlaskConical className="h-16 w-16 mx-auto text-[var(--text-muted)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Backtests Yet</h3>
              <p className="text-[var(--text-secondary)] mb-4">Run your first backtest to see results here</p>
              <button
                onClick={() => setView('presets')}
                className="px-6 py-2 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg font-medium hover:bg-primary-500/30 transition-all"
              >
                Create Backtest
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results View */}
      {view === 'results' && selectedBacktest && (
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setView('history')}
            className="text-sm text-[var(--text-secondary)] hover:text-primary-400 flex items-center space-x-1 transition-colors"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
            <span>Back to History</span>
          </button>

          {/* Header Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className={`glass-card-dashboard p-5 rounded-2xl border-l-4 ${
              (selectedBacktest.total_return || 0) >= 0 ? 'border-l-green-500' : 'border-l-red-500'
            }`}>
              <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)] mb-1">
                <TrendingUp className="h-4 w-4" />
                <span>Total Return</span>
              </div>
              <div className={`text-2xl font-bold font-mono ${
                (selectedBacktest.total_return || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {selectedBacktest.total_return?.toFixed(2) || 0}%
              </div>
            </div>

            <div className="glass-card-dashboard p-5 rounded-2xl">
              <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)] mb-1">
                <IndianRupee className="h-4 w-4" />
                <span>Final Capital</span>
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                {formatCurrency(selectedBacktest.final_capital)}
              </div>
            </div>

            <div className="glass-card-dashboard p-5 rounded-2xl border-l-4 border-l-purple-500">
              <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)] mb-1">
                <Gauge className="h-4 w-4" />
                <span>Sharpe Ratio</span>
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400">
                {selectedBacktest.sharpe_ratio?.toFixed(2) || '-'}
              </div>
            </div>

            <div className="glass-card-dashboard p-5 rounded-2xl border-l-4 border-l-red-500">
              <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)] mb-1">
                <TrendingDown className="h-4 w-4" />
                <span>Max Drawdown</span>
              </div>
              <div className="text-2xl font-bold font-mono text-red-400">
                {selectedBacktest.max_drawdown?.toFixed(2) || 0}%
              </div>
            </div>

            <div className="glass-card-dashboard p-5 rounded-2xl border-l-4 border-l-blue-500">
              <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)] mb-1">
                <Target className="h-4 w-4" />
                <span>Win Rate</span>
              </div>
              <div className="text-2xl font-bold font-mono text-blue-400">
                {selectedBacktest.win_rate?.toFixed(1) || 0}%
              </div>
            </div>

            <div className="glass-card-dashboard p-5 rounded-2xl">
              <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)] mb-1">
                <Activity className="h-4 w-4" />
                <span>Total Trades</span>
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                {selectedBacktest.total_trades}
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          {equityCurve && equityCurve.equity.length > 0 && (
            <div className="glass-card-dashboard p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                <LineChart className="h-5 w-5 text-primary-400 mr-2" />
                Equity Curve
              </h3>
              <div className="h-48 flex items-end space-x-px">
                {equityCurve.equity.slice(-80).map((eq, i, arr) => {
                  const maxEq = Math.max(...arr);
                  const minEq = Math.min(...arr);
                  const range = maxEq - minEq || 1;
                  const height = ((eq - minEq) / range) * 100;
                  const isUp = i > 0 && eq >= arr[i - 1];
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all ${
                        isUp
                          ? 'bg-green-500/60'
                          : 'bg-red-500/60'
                      }`}
                      style={{ height: `${Math.max(height, 3)}%` }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)] font-mono">
                <span>{equityCurve.dates[0]}</span>
                <span>{equityCurve.dates[equityCurve.dates.length - 1]}</span>
              </div>
            </div>
          )}

          {/* Trade Stats & Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card-dashboard p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Trade Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <span className="text-[var(--text-secondary)]">Winning Trades</span>
                  <span className="font-semibold font-mono text-green-400">{selectedBacktest.winning_trades}</span>
                </div>
                <div className="flex justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-[var(--text-secondary)]">Losing Trades</span>
                  <span className="font-semibold font-mono text-red-400">{selectedBacktest.losing_trades}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <span className="text-[var(--text-secondary)]">Avg Win</span>
                  <span className="font-semibold font-mono text-green-400">{formatCurrency(selectedBacktest.avg_win)}</span>
                </div>
                <div className="flex justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-[var(--text-secondary)]">Avg Loss</span>
                  <span className="font-semibold font-mono text-red-400">{formatCurrency(selectedBacktest.avg_loss)}</span>
                </div>
                <div className="flex justify-between p-3 bg-[var(--bg-overlay)] border border-[var(--border-primary)] rounded-lg">
                  <span className="text-[var(--text-secondary)]">Profit Factor</span>
                  <span className="font-semibold font-mono text-[var(--text-primary)]">{selectedBacktest.profit_factor?.toFixed(2) || '-'}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 glass-card-dashboard rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-overlay)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Trades</h3>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full">
                  <thead className="bg-[var(--bg-overlay)] sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Symbol</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Entry</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Exit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-primary)]">
                    {trades.slice(0, 20).map(trade => (
                      <tr key={trade.id} className="hover:bg-[var(--bg-overlay)]">
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{trade.symbol}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)] font-mono">
                          {new Date(trade.entry_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)] font-mono">
                          {trade.exit_date ? new Date(trade.exit_date).toLocaleDateString() : '-'}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold font-mono ${
                          (trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(trade.pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
