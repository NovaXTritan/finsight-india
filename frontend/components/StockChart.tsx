'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { marketApi, StockChartData } from '@/lib/api';
import { RefreshCw, TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';

const PERIODS = [
  { label: '1D', value: '1d', interval: '5m' },
  { label: '5D', value: '5d', interval: '15m' },
  { label: '1M', value: '1mo', interval: '1d' },
  { label: '3M', value: '3mo', interval: '1d' },
  { label: '6M', value: '6mo', interval: '1d' },
  { label: '1Y', value: '1y', interval: '1d' },
];

interface StockChartProps {
  symbol: string;
  height?: number;
  showControls?: boolean;
  defaultPeriod?: string;
}

export function StockChart({ symbol, height = 400, showControls = true, defaultPeriod = '1mo' }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [chartData, setChartData] = useState<StockChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(
    PERIODS.find(p => p.value === defaultPeriod) || PERIODS[2]
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await marketApi.getStockChart(symbol, selectedPeriod.value, selectedPeriod.interval);
      setChartData(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!chartData || !containerRef.current || chartData.candles.length === 0) return;

    let isMounted = true;

    const initChart = async () => {
      const { createChart, CandlestickSeries, HistogramSeries } = await import('lightweight-charts');
      if (!isMounted || !containerRef.current) return;

      // Clean up old chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: height,
        layout: {
          background: { color: 'transparent' },
          textColor: 'rgba(156, 163, 175, 0.9)',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: 'rgba(55, 65, 81, 0.3)' },
          horzLines: { color: 'rgba(55, 65, 81, 0.3)' },
        },
        crosshair: {
          mode: 0,
          vertLine: { color: 'rgba(99, 102, 241, 0.4)', width: 1, style: 2 },
          horzLine: { color: 'rgba(99, 102, 241, 0.4)', width: 1, style: 2 },
        },
        rightPriceScale: {
          borderColor: 'rgba(55, 65, 81, 0.5)',
          scaleMargins: { top: 0.1, bottom: 0.25 },
        },
        timeScale: {
          borderColor: 'rgba(55, 65, 81, 0.5)',
          timeVisible: selectedPeriod.interval !== '1d',
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      // Candlestick series
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      // Volume series
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      // Parse and set data
      const candles = chartData.candles.map(c => {
        const time = c.datetime
          ? Math.floor(new Date(c.datetime).getTime() / 1000)
          : 0;
        return {
          time: time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        };
      }).filter(c => c.time > 0);

      const volumes = chartData.candles.map(c => {
        const time = c.datetime
          ? Math.floor(new Date(c.datetime).getTime() / 1000)
          : 0;
        return {
          time: time as any,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        };
      }).filter(c => c.time > 0);

      if (candles.length > 0) {
        candleSeries.setData(candles);
        volumeSeries.setData(volumes);
        chart.timeScale().fitContent();
      }

      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      // Responsive resize
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        chart.remove();
      };
    };

    initChart();

    return () => {
      isMounted = false;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartData, height, selectedPeriod.interval]);

  // Calculate summary stats
  const firstCandle = chartData?.candles[0];
  const lastCandle = chartData?.candles[chartData.candles.length - 1];
  const priceChange = firstCandle && lastCandle ? lastCandle.close - firstCandle.open : 0;
  const priceChangePct = firstCandle && firstCandle.open > 0 ? (priceChange / firstCandle.open) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] font-mono">{symbol}</h3>
            {lastCandle && (
              <div className="flex items-center space-x-3">
                <span className="text-xl font-bold text-[var(--text-primary)] font-mono">
                  {'\u20B9'}{lastCandle.close.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span className={`flex items-center text-sm font-semibold font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePct.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* Data source badge */}
            {chartData && (
              <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium ${
                chartData.is_live
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              }`}>
                {chartData.is_live ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span>{chartData.data_source === 'yahoo' ? 'Yahoo Finance' : chartData.data_source === 'fallback' ? 'Cached' : chartData.data_source.toUpperCase()}</span>
              </div>
            )}
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 hover:bg-[var(--bg-muted)] rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-[var(--text-muted)] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Period selector */}
        {showControls && (
          <div className="flex items-center space-x-1 mt-3">
            {PERIODS.map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  selectedPeriod.value === period.value
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-primary)]/80">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-primary-400 animate-spin" />
              <span className="text-sm text-[var(--text-secondary)]">Loading chart...</span>
            </div>
          </div>
        )}
        {error ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center">
              <p className="text-sm text-[var(--text-muted)]">{error}</p>
              <button onClick={fetchData} className="mt-2 text-xs text-primary-400 hover:underline">Try again</button>
            </div>
          </div>
        ) : (
          <div ref={containerRef} style={{ height }} />
        )}
      </div>

      {/* OHLCV Summary bar */}
      {lastCandle && (
        <div className="px-6 py-2.5 border-t border-[var(--border-default)] bg-[var(--bg-muted)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div className="flex items-center space-x-4 font-mono">
              <span>O: <span className="text-[var(--text-secondary)]">{lastCandle.open.toFixed(2)}</span></span>
              <span>H: <span className="text-green-400">{lastCandle.high.toFixed(2)}</span></span>
              <span>L: <span className="text-red-400">{lastCandle.low.toFixed(2)}</span></span>
              <span>C: <span className="text-[var(--text-primary)]">{lastCandle.close.toFixed(2)}</span></span>
              <span>V: <span className="text-[var(--text-secondary)]">{(lastCandle.volume / 1e5).toFixed(1)}L</span></span>
            </div>
            <span>{chartData?.candles.length} candles</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockChart;
