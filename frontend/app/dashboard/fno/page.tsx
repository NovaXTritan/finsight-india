'use client';

import { useEffect, useState } from 'react';
import {
  optionsApi,
  OptionChainByStrikes,
  StrikeData,
  MaxPainResult,
  PCRResult,
  OIAnalysis,
  FNOSymbol,
} from '@/lib/api';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Target,
  BarChart3,
  Activity,
  ChevronDown,
  Info,
  Gauge,
} from 'lucide-react';

const StockChart = dynamic(
  () => import('@/components/StockChart').then(mod => mod.StockChart),
  { ssr: false, loading: () => <div className="h-[300px] bg-[var(--bg-muted)] rounded animate-pulse" /> }
);

export default function FNOPage() {
  const [symbols, setSymbols] = useState<FNOSymbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [optionChain, setOptionChain] = useState<OptionChainByStrikes | null>(null);
  const [maxPain, setMaxPain] = useState<MaxPainResult | null>(null);
  const [pcr, setPCR] = useState<PCRResult | null>(null);
  const [oiAnalysis, setOIAnalysis] = useState<OIAnalysis | null>(null);
  const [ivData, setIVData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'chain' | 'analysis'>('chart');

  useEffect(() => {
    loadSymbols();
  }, []);

  useEffect(() => {
    if (selectedSymbol) {
      loadData();
    }
  }, [selectedSymbol]);

  const loadSymbols = async () => {
    try {
      const data = await optionsApi.getSymbols();
      setSymbols(data);
    } catch (error) {
      console.error('Failed to load symbols:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [chainRes, painRes, pcrRes, oiRes, ivRes] = await Promise.allSettled([
        optionsApi.getChainByStrikes(selectedSymbol, 15),
        optionsApi.getMaxPain(selectedSymbol),
        optionsApi.getPCR(selectedSymbol),
        optionsApi.getOIAnalysis(selectedSymbol),
        optionsApi.getIVPercentile(selectedSymbol),
      ]);
      if (chainRes.status === 'fulfilled') setOptionChain(chainRes.value);
      if (painRes.status === 'fulfilled') setMaxPain(painRes.value);
      if (pcrRes.status === 'fulfilled') setPCR(pcrRes.value);
      if (oiRes.status === 'fulfilled') setOIAnalysis(oiRes.value);
      if (ivRes.status === 'fulfilled') setIVData(ivRes.value);
    } catch (error) {
      console.error('Failed to load F&O data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value?: number, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  const formatLargeNumber = (value?: number) => {
    if (!value) return '-';
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const getOIBarWidth = (oi: number, maxOI: number) => {
    if (!maxOI) return 0;
    return Math.min(100, (oi / maxOI) * 100);
  };

  // Calculate max OI for bar scaling
  const maxOI = optionChain
    ? Math.max(
        ...optionChain.strikes.map((s) => Math.max(s.ce?.oi || 0, s.pe?.oi || 0))
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Gauge className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">F&O Analytics</h1>
              <p className="text-[var(--text-secondary)]">Option chain, Greeks, Max Pain, PCR</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="bg-[var(--bg-muted)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg pr-10 appearance-none cursor-pointer px-3 py-2"
              >
                <optgroup label="Indices">
                  {symbols.filter((s) => s.is_index).map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} (Lot: {s.lot_size})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Stocks">
                  {symbols.filter((s) => !s.is_index).slice(0, 50).map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} (Lot: {s.lot_size})
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="btn-primary flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {optionChain && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Spot Price */}
          <div className="card p-4 card-hover-lift">
            <div className="text-sm text-[var(--text-secondary)] mb-1">Spot Price</div>
            <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
              {formatNumber(optionChain.spot_price)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] font-mono">Lot: {optionChain.lot_size}</p>
          </div>

          {/* Max Pain */}
          {maxPain && (
            <div className="card p-4 card-hover-lift border-l-4 border-l-purple-500">
              <div className="flex items-center space-x-1 text-sm text-[var(--text-secondary)] mb-1">
                <Target className="h-4 w-4 text-purple-500" />
                <span>Max Pain</span>
              </div>
              <p className="text-xl font-bold font-mono text-purple-400">{formatNumber(maxPain.max_pain)}</p>
              <p className={`text-xs font-mono ${maxPain.distance_from_spot > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {maxPain.distance_from_spot > 0 ? '+' : ''}{maxPain.distance_from_spot}% from spot
              </p>
            </div>
          )}

          {/* PCR */}
          {pcr && (
            <div className={`card p-4 card-hover-lift border-l-4 ${
              pcr.sentiment === 'BULLISH' ? 'border-l-green-500' :
              pcr.sentiment === 'BEARISH' ? 'border-l-red-500' : 'border-l-[var(--text-muted)]'
            }`}>
              <div className="flex items-center space-x-1 text-sm text-[var(--text-secondary)] mb-1">
                <BarChart3 className="h-4 w-4 text-primary-500" />
                <span>PCR (OI)</span>
              </div>
              <p className={`text-xl font-bold font-mono ${
                pcr.sentiment === 'BULLISH' ? 'text-green-400' :
                pcr.sentiment === 'BEARISH' ? 'text-red-400' : 'text-[var(--text-primary)]'
              }`}>
                {pcr.pcr_oi}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{pcr.sentiment}</p>
            </div>
          )}

          {/* IV Percentile */}
          {ivData && (
            <div className={`card p-4 card-hover-lift border-l-4 ${
              ivData.iv_interpretation === 'HIGH' ? 'border-l-red-500' :
              ivData.iv_interpretation === 'LOW' ? 'border-l-green-500' : 'border-l-yellow-500'
            }`}>
              <div className="flex items-center space-x-1 text-sm text-[var(--text-secondary)] mb-1">
                <Activity className="h-4 w-4 text-orange-500" />
                <span>ATM IV</span>
              </div>
              <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{ivData.current_iv}%</p>
              <p className={`text-xs font-mono ${
                ivData.iv_interpretation === 'HIGH' ? 'text-red-400' :
                ivData.iv_interpretation === 'LOW' ? 'text-green-400' : 'text-[var(--text-secondary)]'
              }`}>
                {ivData.iv_interpretation} ({ivData.iv_percentile}%)
              </p>
            </div>
          )}

          {/* Support/Resistance */}
          {oiAnalysis && (
            <div className="card p-4 card-hover-lift">
              <div className="text-sm text-[var(--text-secondary)] mb-1">Support / Resistance</div>
              <div className="flex items-center space-x-2">
                <span className="text-green-400 font-bold font-mono">{oiAnalysis.max_pe_oi_strike}</span>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="text-red-400 font-bold font-mono">{oiAnalysis.max_ce_oi_strike}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Max OI strikes</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2">
        {[
          { id: 'chart', label: 'Price Chart' },
          { id: 'chain', label: 'Option Chain' },
          { id: 'analysis', label: 'OI Analysis' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Price Chart */}
      {activeTab === 'chart' && (
        <StockChart
          symbol={selectedSymbol === 'NIFTY' ? '^NSEI' : selectedSymbol === 'BANKNIFTY' ? '^NSEBANK' : selectedSymbol}
          height={450}
          defaultPeriod="3mo"
        />
      )}

      {/* Option Chain Table */}
      {activeTab === 'chain' && (
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-primary-400 animate-spin mx-auto" />
              <p className="mt-2 text-[var(--text-secondary)]">Loading option chain...</p>
            </div>
          ) : !optionChain ? (
            <div className="p-8 text-center">
              <Activity className="h-12 w-12 text-primary-300 mx-auto" />
              <p className="mt-2 text-[var(--text-secondary)]">Select a symbol to view option chain</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)]">
                    <th colSpan={8} className="px-2 py-3 text-center text-green-400 bg-green-500/10 border-r border-[var(--border-default)] font-semibold">
                      CALLS
                    </th>
                    <th className="px-3 py-3 text-center bg-primary-500/10 font-bold text-primary-400">Strike</th>
                    <th colSpan={8} className="px-2 py-3 text-center text-red-400 bg-red-500/10 border-l border-[var(--border-default)] font-semibold">
                      PUTS
                    </th>
                  </tr>
                  <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)] text-xs text-[var(--text-secondary)]">
                    <th className="px-2 py-2 text-right">OI</th>
                    <th className="px-2 py-2 text-right">Chg</th>
                    <th className="px-2 py-2 text-right">Vol</th>
                    <th className="px-2 py-2 text-right">IV</th>
                    <th className="px-2 py-2 text-right">LTP</th>
                    <th className="px-2 py-2 text-right">Delta</th>
                    <th className="px-2 py-2 text-right">Theta</th>
                    <th className="px-2 py-2 text-right border-r border-[var(--border-default)]">Vega</th>
                    <th className="px-3 py-2 text-center bg-primary-500/10">Strike</th>
                    <th className="px-2 py-2 text-right border-l border-[var(--border-default)]">Vega</th>
                    <th className="px-2 py-2 text-right">Theta</th>
                    <th className="px-2 py-2 text-right">Delta</th>
                    <th className="px-2 py-2 text-right">LTP</th>
                    <th className="px-2 py-2 text-right">IV</th>
                    <th className="px-2 py-2 text-right">Vol</th>
                    <th className="px-2 py-2 text-right">Chg</th>
                    <th className="px-2 py-2 text-right">OI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {optionChain.strikes.map((strike) => (
                    <tr
                      key={strike.strike}
                      className={`transition-colors ${
                        strike.is_atm
                          ? 'bg-yellow-500/10'
                          : strike.is_itm_ce
                          ? 'bg-green-500/5'
                          : strike.is_itm_pe
                          ? 'bg-red-500/5'
                          : 'hover:bg-[var(--bg-muted)]'
                      }`}
                    >
                      {/* CE Side */}
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end">
                          <div
                            className="h-2 bg-green-400 rounded-full mr-1"
                            style={{ width: `${getOIBarWidth(strike.ce?.oi || 0, maxOI)}px`, maxWidth: '60px' }}
                          />
                          <span className={`font-mono ${strike.ce?.oi === oiAnalysis?.max_ce_oi ? 'font-bold text-green-400' : ''}`}>
                            {formatLargeNumber(strike.ce?.oi)}
                          </span>
                        </div>
                      </td>
                      <td className={`px-2 py-2 text-right font-mono ${
                        (strike.ce?.oi_change || 0) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatLargeNumber(strike.ce?.oi_change)}
                      </td>
                      <td className="px-2 py-2 text-right text-[var(--text-secondary)] font-mono">
                        {formatLargeNumber(strike.ce?.volume)}
                      </td>
                      <td className="px-2 py-2 text-right text-[var(--text-secondary)] font-mono">
                        {strike.ce?.iv?.toFixed(1) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right font-medium font-mono">
                        {strike.ce?.ltp?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-[var(--text-secondary)] text-xs font-mono">
                        {strike.ce?.delta?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-[var(--text-secondary)] text-xs font-mono">
                        {strike.ce?.theta?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-[var(--text-secondary)] text-xs font-mono border-r border-[var(--border-default)]">
                        {strike.ce?.vega?.toFixed(2) || '-'}
                      </td>

                      {/* Strike */}
                      <td className={`px-3 py-2 text-center font-bold font-mono ${
                        strike.is_atm
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-primary-500/10'
                      }`}>
                        {strike.strike}
                        {strike.is_atm && <span className="block text-xs font-medium">ATM</span>}
                      </td>

                      {/* PE Side */}
                      <td className="px-2 py-2 text-right text-[var(--text-secondary)] text-xs font-mono border-l border-[var(--border-default)]">
                        {strike.pe?.vega?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-[var(--text-secondary)] text-xs font-mono">
                        {strike.pe?.theta?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-[var(--text-secondary)] text-xs font-mono">
                        {strike.pe?.delta?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right font-medium font-mono">
                        {strike.pe?.ltp?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-[var(--text-secondary)] font-mono">
                        {strike.pe?.iv?.toFixed(1) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-[var(--text-secondary)] font-mono">
                        {formatLargeNumber(strike.pe?.volume)}
                      </td>
                      <td className={`px-2 py-2 text-right font-mono ${
                        (strike.pe?.oi_change || 0) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatLargeNumber(strike.pe?.oi_change)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center">
                          <span className={`font-mono ${strike.pe?.oi === oiAnalysis?.max_pe_oi ? 'font-bold text-red-400' : ''}`}>
                            {formatLargeNumber(strike.pe?.oi)}
                          </span>
                          <div
                            className="h-2 bg-red-400 rounded-full ml-1"
                            style={{ width: `${getOIBarWidth(strike.pe?.oi || 0, maxOI)}px`, maxWidth: '60px' }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* OI Analysis Tab */}
      {activeTab === 'analysis' && oiAnalysis && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* PCR Details */}
          {pcr && (
            <div className="card p-6 card-hover-lift">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                <div className="p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg mr-3">
                  <BarChart3 className="h-5 w-5 text-primary-400" />
                </div>
                Put-Call Ratio
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">PCR (OI)</span>
                  <span className={`text-xl font-bold font-mono ${
                    pcr.sentiment === 'BULLISH' ? 'text-green-400' :
                    pcr.sentiment === 'BEARISH' ? 'text-red-400' : 'text-[var(--text-primary)]'
                  }`}>{pcr.pcr_oi}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">PCR (Volume)</span>
                  <span className="font-bold font-mono">{pcr.pcr_volume}</span>
                </div>
                <div className="h-4 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(pcr.put_oi / (pcr.call_oi + pcr.put_oi)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-400 font-medium font-mono">Put OI: {formatLargeNumber(pcr.put_oi)}</span>
                  <span className="text-red-400 font-medium font-mono">Call OI: {formatLargeNumber(pcr.call_oi)}</span>
                </div>
                <div className="mt-4 p-4 bg-[var(--bg-muted)] rounded-lg border border-[var(--border-default)]">
                  <p className="text-sm text-[var(--text-secondary)]">{pcr.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Max Pain Details */}
          {maxPain && (
            <div className="card p-6 card-hover-lift">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg mr-3">
                  <Target className="h-5 w-5 text-purple-400" />
                </div>
                Max Pain Analysis
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Max Pain Strike</span>
                  <span className="text-xl font-bold font-mono text-purple-400">{maxPain.max_pain}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Current Spot</span>
                  <span className="font-bold font-mono">{formatNumber(maxPain.current_price)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Distance from Spot</span>
                  <span className={`font-bold font-mono ${maxPain.distance_from_spot > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {maxPain.distance_from_spot > 0 ? '+' : ''}{maxPain.distance_from_spot}%
                  </span>
                </div>
                <div className="mt-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-purple-400 mt-0.5" />
                    <p className="text-sm text-purple-300">
                      Max Pain is where option writers make maximum profit.
                      Price tends to gravitate toward this level near expiry.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Support/Resistance */}
          <div className="card p-6 card-hover-lift">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg mr-3">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              Support & Resistance
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-2">Resistance (Max Call OI)</p>
                <div className="flex flex-wrap gap-2">
                  {oiAnalysis.resistance_levels.map((level) => (
                    <span
                      key={level}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium font-mono transition-all ${
                        level === oiAnalysis.max_ce_oi_strike
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {level}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-2">Support (Max Put OI)</p>
                <div className="flex flex-wrap gap-2">
                  {oiAnalysis.support_levels.map((level) => (
                    <span
                      key={level}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium font-mono transition-all ${
                        level === oiAnalysis.max_pe_oi_strike
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      }`}
                    >
                      {level}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm text-blue-300 font-medium font-mono">
                  Range: {oiAnalysis.support_levels[0] ?? '—'} - {oiAnalysis.resistance_levels[oiAnalysis.resistance_levels.length - 1] ?? '—'}
                </p>
              </div>
            </div>
          </div>

          {/* IV Analysis */}
          {ivData && (
            <div className="card p-6 card-hover-lift">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg mr-3">
                  <Activity className="h-5 w-5 text-orange-400" />
                </div>
                Implied Volatility
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">ATM IV</span>
                  <span className="text-xl font-bold font-mono">{ivData.current_iv}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">IV Percentile</span>
                  <span className={`font-bold font-mono ${
                    ivData.iv_interpretation === 'HIGH' ? 'text-red-400' :
                    ivData.iv_interpretation === 'LOW' ? 'text-green-400' : 'text-[var(--text-primary)]'
                  }`}>{ivData.iv_percentile}%</span>
                </div>
                <div className="h-3 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      ivData.iv_interpretation === 'HIGH' ? 'bg-red-500' :
                      ivData.iv_interpretation === 'LOW' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${ivData.iv_percentile}%` }}
                  />
                </div>
                <div className="mt-4 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <p className="text-sm text-orange-300">{ivData.recommendation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expiry Info */}
      {optionChain && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-4 card px-6 py-3">
            <span className="text-sm text-[var(--text-secondary)]">Expiry: <span className="font-medium text-[var(--text-primary)]">{optionChain.expiry_date}</span></span>
            <span className="text-[var(--text-muted)]">|</span>
            <span className="text-sm text-[var(--text-secondary)]">Updated: <span className="font-medium text-[var(--text-primary)]">{new Date().toLocaleTimeString()}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
