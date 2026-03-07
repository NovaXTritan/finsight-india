'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getZScoreColor, getZScoreSeverity } from '@/lib/mock-data';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SignalAnnotation {
  date: string;
  type: string;
  zScore: number;
  description: string;
}

interface SignalTimelineProps {
  symbol: string;
  prices?: PricePoint[];
  signals?: SignalAnnotation[];
  height?: number;
}

// Generate realistic price data for demo
function generatePriceData(symbol: string, days: number = 60): PricePoint[] {
  const basePrice = symbol === 'HDFCBANK' ? 1650 : symbol === 'HINDUNILVR' ? 2400 : 1500;
  const volatility = 0.015;
  const data: PricePoint[] = [];
  let price = basePrice;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends

    const change = (Math.random() - 0.5) * 2 * volatility;
    // Inject a drop around day 45 for HDFCBANK
    const dropFactor = symbol === 'HDFCBANK' && i >= 42 && i <= 50
      ? -0.015 : 0;

    price = price * (1 + change + dropFactor);
    const dayRange = price * volatility;

    data.push({
      date: date.toISOString().split('T')[0],
      open: price - dayRange * (Math.random() - 0.5),
      high: price + dayRange * Math.random(),
      low: price - dayRange * Math.random(),
      close: price,
      volume: Math.floor(5000000 + Math.random() * 5000000 * (i >= 40 && i <= 42 ? 5.4 : 1)),
    });
  }
  return data;
}

// Generate signal annotations
function generateSignals(symbol: string): SignalAnnotation[] {
  if (symbol === 'HDFCBANK') {
    return [
      { date: '', type: 'Volume Anomaly', zScore: 5.44, description: '5.4x avg volume - institutional selling detected' },
    ];
  }
  if (symbol === 'HINDUNILVR') {
    return [
      { date: '', type: 'Volatility Spike', zScore: 3.58, description: 'Unusual options activity before earnings' },
    ];
  }
  return [];
}

export function SignalTimeline({ symbol, prices, signals, height = 320 }: SignalTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showAnnotation, setShowAnnotation] = useState<number | null>(null);

  const priceData = useMemo(() => prices || generatePriceData(symbol), [prices, symbol]);
  const signalData = useMemo(() => {
    const sigs = signals || generateSignals(symbol);
    // Place signals ~75% through the timeline
    return sigs.map((s, i) => ({
      ...s,
      date: s.date || priceData[Math.floor(priceData.length * 0.7) + i]?.date || '',
    }));
  }, [signals, symbol, priceData]);

  // Chart dimensions
  const margin = { top: 16, right: 12, bottom: 40, left: 56 };
  const chartWidth = 800; // SVG viewBox width, scales responsively
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const { xScale, yScale, volumeScale, priceExtent } = useMemo(() => {
    const prices = priceData.map((d) => [d.low, d.high]).flat();
    const minP = Math.min(...prices) * 0.995;
    const maxP = Math.max(...prices) * 1.005;
    const maxVol = Math.max(...priceData.map((d) => d.volume));

    return {
      xScale: (i: number) => (i / (priceData.length - 1)) * innerWidth,
      yScale: (v: number) => innerHeight - ((v - minP) / (maxP - minP)) * innerHeight,
      volumeScale: (v: number) => (v / maxVol) * (innerHeight * 0.15),
      priceExtent: [minP, maxP] as [number, number],
    };
  }, [priceData, innerWidth, innerHeight]);

  // Find signal indices in price data
  const signalIndices = useMemo(
    () => signalData.map((s) => priceData.findIndex((p) => p.date === s.date)),
    [signalData, priceData]
  );

  // Price line path
  const linePath = useMemo(() => {
    return priceData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.close)}`)
      .join(' ');
  }, [priceData, xScale, yScale]);

  // Area path (for gradient fill under price line)
  const areaPath = useMemo(() => {
    const line = priceData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.close)}`)
      .join(' ');
    return `${line} L ${xScale(priceData.length - 1)} ${innerHeight} L ${xScale(0)} ${innerHeight} Z`;
  }, [priceData, xScale, yScale, innerHeight]);

  const hoveredPrice = hoveredIndex !== null ? priceData[hoveredIndex] : null;

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{symbol}</span>
          {priceData.length > 0 && (
            <span className={`text-xs font-mono ${
              priceData[priceData.length - 1].close >= priceData[0].close ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {priceData[priceData.length - 1].close >= priceData[0].close ? '+' : ''}
              {(((priceData[priceData.length - 1].close - priceData[0].close) / priceData[0].close) * 100).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {signalData.map((sig, i) => (
            <button
              key={i}
              onClick={() => setShowAnnotation(showAnnotation === i ? null : i)}
              className={`flex items-center space-x-1 text-[10px] px-2 py-1 rounded-md border transition-all ${
                showAnnotation === i
                  ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent)]'
                  : 'bg-[var(--bg-muted)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Z: {sig.zScore}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full"
        style={{ height: 'auto' }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id={`area-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`signal-gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Y-axis grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = (i / 4) * innerHeight;
            const price = priceExtent[1] - (i / 4) * (priceExtent[1] - priceExtent[0]);
            return (
              <g key={`grid-${i}`}>
                <line x1={0} y1={y} x2={innerWidth} y2={y} stroke="var(--border-default)" strokeWidth={0.5} />
                <text x={-8} y={y} textAnchor="end" dominantBaseline="central" fill="var(--text-muted)" fontSize={9} fontFamily="var(--font-mono)">
                  {price.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Volume bars */}
          {priceData.map((d, i) => (
            <rect
              key={`vol-${i}`}
              x={xScale(i) - 2}
              y={innerHeight - volumeScale(d.volume)}
              width={Math.max(innerWidth / priceData.length - 1, 1)}
              height={volumeScale(d.volume)}
              fill={signalIndices.includes(i) ? '#ef4444' : 'var(--border-default)'}
              fillOpacity={signalIndices.includes(i) ? 0.5 : 0.3}
            />
          ))}

          {/* Area under price line */}
          <path d={areaPath} fill={`url(#area-${symbol})`} />

          {/* Price line */}
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={1.5} />

          {/* Signal markers */}
          {signalIndices.map((idx, i) => {
            if (idx < 0) return null;
            const sig = signalData[i];
            const x = xScale(idx);
            const y = yScale(priceData[idx].close);
            const color = getZScoreColor(sig.zScore);

            return (
              <g key={`signal-marker-${i}`}>
                {/* Vertical highlight zone */}
                <rect
                  x={x - 15}
                  y={0}
                  width={30}
                  height={innerHeight}
                  fill={`url(#signal-gradient-${symbol})`}
                  opacity={showAnnotation === i ? 0.5 : 0.2}
                />
                {/* Signal dot */}
                <circle cx={x} cy={y} r={5} fill={color} stroke="var(--bg-card)" strokeWidth={2} />
                {/* Pulse ring */}
                <circle cx={x} cy={y} r={5} fill="none" stroke={color} strokeWidth={1}>
                  <animate attributeName="r" values="5;14" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* Label */}
                <g transform={`translate(${x}, ${Math.max(y - 20, 16)})`}>
                  <rect x={-28} y={-10} width={56} height={20} rx={4} fill="var(--bg-elevated)" stroke={color} strokeWidth={1} />
                  <text textAnchor="middle" dominantBaseline="central" fill={color} fontSize={9} fontWeight={700} fontFamily="var(--font-mono)">
                    Z: {sig.zScore}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Hover crosshair */}
          {hoveredIndex !== null && (
            <g>
              <line
                x1={xScale(hoveredIndex)}
                y1={0}
                x2={xScale(hoveredIndex)}
                y2={innerHeight}
                stroke="var(--text-muted)"
                strokeWidth={0.5}
                strokeDasharray="3,3"
              />
              <circle
                cx={xScale(hoveredIndex)}
                cy={yScale(priceData[hoveredIndex].close)}
                r={3}
                fill="var(--accent)"
                stroke="var(--bg-card)"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Invisible hover zones */}
          {priceData.map((_, i) => (
            <rect
              key={`hover-${i}`}
              x={xScale(i) - innerWidth / priceData.length / 2}
              y={0}
              width={innerWidth / priceData.length}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
            />
          ))}

          {/* X-axis date labels */}
          {priceData
            .filter((_, i) => i % Math.ceil(priceData.length / 6) === 0)
            .map((d, i, arr) => {
              const idx = priceData.indexOf(d);
              return (
                <text
                  key={`date-${i}`}
                  x={xScale(idx)}
                  y={innerHeight + 20}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                >
                  {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </text>
              );
            })}
        </g>
      </svg>

      {/* Hover price tooltip */}
      <AnimatePresence>
        {hoveredPrice && hoveredIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="absolute top-0 right-0 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg"
          >
            <div className="text-[10px] text-[var(--text-muted)] font-mono mb-1">{hoveredPrice.date}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
              <span className="text-[var(--text-muted)]">O</span>
              <span className="text-[var(--text-primary)] font-mono text-right">{hoveredPrice.open.toFixed(2)}</span>
              <span className="text-[var(--text-muted)]">H</span>
              <span className="text-[var(--text-primary)] font-mono text-right">{hoveredPrice.high.toFixed(2)}</span>
              <span className="text-[var(--text-muted)]">L</span>
              <span className="text-[var(--text-primary)] font-mono text-right">{hoveredPrice.low.toFixed(2)}</span>
              <span className="text-[var(--text-muted)]">C</span>
              <span className="text-[var(--text-primary)] font-mono text-right">{hoveredPrice.close.toFixed(2)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signal annotation panel */}
      <AnimatePresence>
        {showAnnotation !== null && signalData[showAnnotation] && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="mt-3"
          >
            <div className="card p-4 !border-red-500/20">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/15 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{signalData[showAnnotation].type}</span>
                    <span className={`${getZScoreSeverity(signalData[showAnnotation].zScore) === 'critical' ? 'severity-critical' : 'severity-high'} text-[10px]`}>
                      Z: {signalData[showAnnotation].zScore}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{signalData[showAnnotation].description}</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">{signalData[showAnnotation].date}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
