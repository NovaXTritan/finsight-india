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

export default function FNOPage() {
  const [symbols, setSymbols] = useState<FNOSymbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [optionChain, setOptionChain] = useState<OptionChainByStrikes | null>(null);
  const [maxPain, setMaxPain] = useState<MaxPainResult | null>(null);
  const [pcr, setPCR] = useState<PCRResult | null>(null);
  const [oiAnalysis, setOIAnalysis] = useState<OIAnalysis | null>(null);
  const [ivData, setIVData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chain' | 'analysis'>('chain');

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
      const [chainData, painData, pcrData, oiData, ivInfo] = await Promise.all([
        optionsApi.getChainByStrikes(selectedSymbol, 15),
        optionsApi.getMaxPain(selectedSymbol),
        optionsApi.getPCR(selectedSymbol),
        optionsApi.getOIAnalysis(selectedSymbol),
        optionsApi.getIVPercentile(selectedSymbol),
      ]);
      setOptionChain(chainData);
      setMaxPain(painData);
      setPCR(pcrData);
      setOIAnalysis(oiData);
      setIVData(ivInfo);
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
      <div className="glass-card-dashboard p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-glow">
              <Gauge className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">F&O Analytics</h1>
              <p className="text-gray-500">Option chain, Greeks, Max Pain, PCR</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="input-glass-light pr-10 appearance-none cursor-pointer"
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="btn-glass-primary flex items-center space-x-2"
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
          <div className="glass-card-dashboard p-4 card-hover-lift">
            <div className="text-sm text-gray-500 mb-1">Spot Price</div>
            <p className="text-xl font-bold text-gray-900">
              {formatNumber(optionChain.spot_price)}
            </p>
            <p className="text-xs text-gray-500">Lot: {optionChain.lot_size}</p>
          </div>

          {/* Max Pain */}
          {maxPain && (
            <div className="glass-card-dashboard p-4 card-hover-lift border-l-4 border-l-purple-500">
              <div className="flex items-center space-x-1 text-sm text-gray-500 mb-1">
                <Target className="h-4 w-4 text-purple-500" />
                <span>Max Pain</span>
              </div>
              <p className="text-xl font-bold text-purple-600">{formatNumber(maxPain.max_pain)}</p>
              <p className={`text-xs ${maxPain.distance_from_spot > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {maxPain.distance_from_spot > 0 ? '+' : ''}{maxPain.distance_from_spot}% from spot
              </p>
            </div>
          )}

          {/* PCR */}
          {pcr && (
            <div className={`glass-card-dashboard p-4 card-hover-lift border-l-4 ${
              pcr.sentiment === 'BULLISH' ? 'border-l-green-500' :
              pcr.sentiment === 'BEARISH' ? 'border-l-red-500' : 'border-l-gray-400'
            }`}>
              <div className="flex items-center space-x-1 text-sm text-gray-500 mb-1">
                <BarChart3 className="h-4 w-4 text-primary-500" />
                <span>PCR (OI)</span>
              </div>
              <p className={`text-xl font-bold ${
                pcr.sentiment === 'BULLISH' ? 'text-green-600' :
                pcr.sentiment === 'BEARISH' ? 'text-red-600' : 'text-gray-900'
              }`}>
                {pcr.pcr_oi}
              </p>
              <p className="text-xs text-gray-500">{pcr.sentiment}</p>
            </div>
          )}

          {/* IV Percentile */}
          {ivData && (
            <div className={`glass-card-dashboard p-4 card-hover-lift border-l-4 ${
              ivData.iv_interpretation === 'HIGH' ? 'border-l-red-500' :
              ivData.iv_interpretation === 'LOW' ? 'border-l-green-500' : 'border-l-yellow-500'
            }`}>
              <div className="flex items-center space-x-1 text-sm text-gray-500 mb-1">
                <Activity className="h-4 w-4 text-orange-500" />
                <span>ATM IV</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{ivData.current_iv}%</p>
              <p className={`text-xs ${
                ivData.iv_interpretation === 'HIGH' ? 'text-red-600' :
                ivData.iv_interpretation === 'LOW' ? 'text-green-600' : 'text-gray-500'
              }`}>
                {ivData.iv_interpretation} ({ivData.iv_percentile}%)
              </p>
            </div>
          )}

          {/* Support/Resistance */}
          {oiAnalysis && (
            <div className="glass-card-dashboard p-4 card-hover-lift">
              <div className="text-sm text-gray-500 mb-1">Support / Resistance</div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600 font-bold">{oiAnalysis.max_pe_oi_strike}</span>
                <span className="text-gray-400">/</span>
                <span className="text-red-600 font-bold">{oiAnalysis.max_ce_oi_strike}</span>
              </div>
              <p className="text-xs text-gray-500">Max OI strikes</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2">
        {[
          { id: 'chain', label: 'Option Chain' },
          { id: 'analysis', label: 'OI Analysis' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-glow'
                : 'glass-card-dashboard text-gray-600 hover:text-primary-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Option Chain Table */}
      {activeTab === 'chain' && (
        <div className="glass-card-dashboard overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-primary-400 animate-spin mx-auto" />
              <p className="mt-2 text-gray-500">Loading option chain...</p>
            </div>
          ) : !optionChain ? (
            <div className="p-8 text-center">
              <Activity className="h-12 w-12 text-primary-300 mx-auto" />
              <p className="mt-2 text-gray-500">Select a symbol to view option chain</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-primary-50 via-white to-purple-50 border-b border-primary-100">
                    <th colSpan={8} className="px-2 py-3 text-center text-green-700 bg-green-50/80 border-r border-primary-100 font-semibold">
                      CALLS
                    </th>
                    <th className="px-3 py-3 text-center bg-gradient-to-r from-primary-100 to-purple-100 font-bold text-primary-700">Strike</th>
                    <th colSpan={8} className="px-2 py-3 text-center text-red-700 bg-red-50/80 border-l border-primary-100 font-semibold">
                      PUTS
                    </th>
                  </tr>
                  <tr className="bg-gray-50/80 border-b border-primary-100 text-xs text-gray-500">
                    <th className="px-2 py-2 text-right">OI</th>
                    <th className="px-2 py-2 text-right">Chg</th>
                    <th className="px-2 py-2 text-right">Vol</th>
                    <th className="px-2 py-2 text-right">IV</th>
                    <th className="px-2 py-2 text-right">LTP</th>
                    <th className="px-2 py-2 text-right">Delta</th>
                    <th className="px-2 py-2 text-right">Theta</th>
                    <th className="px-2 py-2 text-right border-r border-primary-100">Vega</th>
                    <th className="px-3 py-2 text-center bg-primary-50/50">Strike</th>
                    <th className="px-2 py-2 text-right border-l border-primary-100">Vega</th>
                    <th className="px-2 py-2 text-right">Theta</th>
                    <th className="px-2 py-2 text-right">Delta</th>
                    <th className="px-2 py-2 text-right">LTP</th>
                    <th className="px-2 py-2 text-right">IV</th>
                    <th className="px-2 py-2 text-right">Vol</th>
                    <th className="px-2 py-2 text-right">Chg</th>
                    <th className="px-2 py-2 text-right">OI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100/50">
                  {optionChain.strikes.map((strike) => (
                    <tr
                      key={strike.strike}
                      className={`transition-colors ${
                        strike.is_atm
                          ? 'bg-gradient-to-r from-yellow-50 via-yellow-100/50 to-yellow-50'
                          : strike.is_itm_ce
                          ? 'bg-green-50/40'
                          : strike.is_itm_pe
                          ? 'bg-red-50/40'
                          : 'hover:bg-primary-50/30'
                      }`}
                    >
                      {/* CE Side */}
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end">
                          <div
                            className="h-2 bg-gradient-to-r from-green-300 to-green-400 rounded-full mr-1"
                            style={{ width: `${getOIBarWidth(strike.ce?.oi || 0, maxOI)}px`, maxWidth: '60px' }}
                          />
                          <span className={strike.ce?.oi === oiAnalysis?.max_ce_oi ? 'font-bold text-green-700' : ''}>
                            {formatLargeNumber(strike.ce?.oi)}
                          </span>
                        </div>
                      </td>
                      <td className={`px-2 py-2 text-right ${
                        (strike.ce?.oi_change || 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatLargeNumber(strike.ce?.oi_change)}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-600">
                        {formatLargeNumber(strike.ce?.volume)}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-600">
                        {strike.ce?.iv?.toFixed(1) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {strike.ce?.ltp?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 text-xs">
                        {strike.ce?.delta?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 text-xs">
                        {strike.ce?.theta?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 text-xs border-r border-primary-100">
                        {strike.ce?.vega?.toFixed(2) || '-'}
                      </td>

                      {/* Strike */}
                      <td className={`px-3 py-2 text-center font-bold ${
                        strike.is_atm
                          ? 'bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-200 text-yellow-800'
                          : 'bg-gradient-to-r from-primary-50 to-purple-50'
                      }`}>
                        {strike.strike}
                        {strike.is_atm && <span className="block text-xs font-medium">ATM</span>}
                      </td>

                      {/* PE Side */}
                      <td className="px-2 py-2 text-right text-gray-500 text-xs border-l border-primary-100">
                        {strike.pe?.vega?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 text-xs">
                        {strike.pe?.theta?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 text-xs">
                        {strike.pe?.delta?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {strike.pe?.ltp?.toFixed(2) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-600">
                        {strike.pe?.iv?.toFixed(1) || '-'}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-600">
                        {formatLargeNumber(strike.pe?.volume)}
                      </td>
                      <td className={`px-2 py-2 text-right ${
                        (strike.pe?.oi_change || 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatLargeNumber(strike.pe?.oi_change)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center">
                          <span className={strike.pe?.oi === oiAnalysis?.max_pe_oi ? 'font-bold text-red-700' : ''}>
                            {formatLargeNumber(strike.pe?.oi)}
                          </span>
                          <div
                            className="h-2 bg-gradient-to-r from-red-400 to-red-300 rounded-full ml-1"
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
            <div className="glass-card-dashboard p-6 card-hover-lift">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="p-2 bg-gradient-to-br from-primary-100 to-purple-100 rounded-lg mr-3">
                  <BarChart3 className="h-5 w-5 text-primary-600" />
                </div>
                Put-Call Ratio
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">PCR (OI)</span>
                  <span className={`text-xl font-bold ${
                    pcr.sentiment === 'BULLISH' ? 'text-green-600' :
                    pcr.sentiment === 'BEARISH' ? 'text-red-600' : 'text-gray-900'
                  }`}>{pcr.pcr_oi}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">PCR (Volume)</span>
                  <span className="font-bold">{pcr.pcr_volume}</span>
                </div>
                <div className="h-4 bg-gradient-to-r from-green-100 to-red-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                    style={{ width: `${(pcr.put_oi / (pcr.call_oi + pcr.put_oi)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 font-medium">Put OI: {formatLargeNumber(pcr.put_oi)}</span>
                  <span className="text-red-600 font-medium">Call OI: {formatLargeNumber(pcr.call_oi)}</span>
                </div>
                <div className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-100">
                  <p className="text-sm text-gray-600">{pcr.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Max Pain Details */}
          {maxPain && (
            <div className="glass-card-dashboard p-6 card-hover-lift">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg mr-3">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                Max Pain Analysis
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Max Pain Strike</span>
                  <span className="text-xl font-bold text-purple-600">{maxPain.max_pain}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Spot</span>
                  <span className="font-bold">{formatNumber(maxPain.current_price)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Distance from Spot</span>
                  <span className={`font-bold ${maxPain.distance_from_spot > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {maxPain.distance_from_spot > 0 ? '+' : ''}{maxPain.distance_from_spot}%
                  </span>
                </div>
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-purple-600 mt-0.5" />
                    <p className="text-sm text-purple-800">
                      Max Pain is where option writers make maximum profit.
                      Price tends to gravitate toward this level near expiry.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Support/Resistance */}
          <div className="glass-card-dashboard p-6 card-hover-lift">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg mr-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              Support & Resistance
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Resistance (Max Call OI)</p>
                <div className="flex flex-wrap gap-2">
                  {oiAnalysis.resistance_levels.map((level) => (
                    <span
                      key={level}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        level === oiAnalysis.max_ce_oi_strike
                          ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 shadow-sm'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {level}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Support (Max Put OI)</p>
                <div className="flex flex-wrap gap-2">
                  {oiAnalysis.support_levels.map((level) => (
                    <span
                      key={level}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        level === oiAnalysis.max_pe_oi_strike
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 shadow-sm'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {level}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-800 font-medium">
                  Range: {oiAnalysis.support_levels[0]} - {oiAnalysis.resistance_levels[oiAnalysis.resistance_levels.length - 1]}
                </p>
              </div>
            </div>
          </div>

          {/* IV Analysis */}
          {ivData && (
            <div className="glass-card-dashboard p-6 card-hover-lift">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg mr-3">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                Implied Volatility
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ATM IV</span>
                  <span className="text-xl font-bold">{ivData.current_iv}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">IV Percentile</span>
                  <span className={`font-bold ${
                    ivData.iv_interpretation === 'HIGH' ? 'text-red-600' :
                    ivData.iv_interpretation === 'LOW' ? 'text-green-600' : 'text-gray-900'
                  }`}>{ivData.iv_percentile}%</span>
                </div>
                <div className="h-3 bg-gradient-to-r from-green-100 via-yellow-100 to-red-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      ivData.iv_interpretation === 'HIGH' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                      ivData.iv_interpretation === 'LOW' ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                    }`}
                    style={{ width: `${ivData.iv_percentile}%` }}
                  />
                </div>
                <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                  <p className="text-sm text-orange-800">{ivData.recommendation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expiry Info */}
      {optionChain && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-4 glass-card-dashboard px-6 py-3">
            <span className="text-sm text-gray-500">Expiry: <span className="font-medium text-gray-700">{optionChain.expiry_date}</span></span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Updated: <span className="font-medium text-gray-700">{new Date().toLocaleTimeString()}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
