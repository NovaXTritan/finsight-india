'use client';

import { useEffect, useState } from 'react';
import { marketApi, MarketRegime } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus, Zap, Info } from 'lucide-react';

const regimeConfig = {
  BULL: {
    icon: TrendingUp,
    bg: 'bg-emerald-500/8 border-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  BEAR: {
    icon: TrendingDown,
    bg: 'bg-red-500/8 border-red-500/20',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
  SIDEWAYS: {
    icon: Minus,
    bg: 'bg-yellow-500/8 border-yellow-500/20',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  VOLATILE: {
    icon: Zap,
    bg: 'bg-orange-500/8 border-orange-500/20',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
  },
};

function ScoreBar({ label, value, max = 2 }: { label: string; value: number; max?: number }) {
  const pct = Math.abs(value) / max * 100;
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[var(--text-muted)] w-16 text-right font-mono">{label}</span>
      <div className="flex-1 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden relative">
        {isPositive && (
          <div
            className="absolute left-1/2 h-full bg-emerald-400 rounded-full"
            style={{ width: `${pct / 2}%` }}
          />
        )}
        {isNegative && (
          <div
            className="absolute right-1/2 h-full bg-red-400 rounded-full"
            style={{ width: `${pct / 2}%` }}
          />
        )}
        {value === 0 && (
          <div className="absolute left-1/2 -translate-x-0.5 h-full w-1 bg-[var(--text-muted)] rounded-full" />
        )}
      </div>
      <span className={`w-6 text-right font-mono ${
        isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-[var(--text-muted)]'
      }`}>
        {value > 0 ? '+' : ''}{value}
      </span>
    </div>
  );
}

export function RegimeBanner() {
  const [regime, setRegime] = useState<MarketRegime | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    marketApi.getRegime()
      .then(setRegime)
      .catch(() => setError(true));
  }, []);

  if (error || !regime) return null;

  const config = regimeConfig[regime.regime];
  const Icon = config.icon;

  return (
    <div className={`border rounded-lg ${config.bg} transition-all`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
            <Icon className={`h-4 w-4 ${config.text}`} />
            <span className={`text-sm font-semibold font-display ${config.text}`}>
              {regime.regime_info.label}
            </span>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {(regime.confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
            {regime.regime_info.description}
          </span>
          <Info className={`h-3.5 w-3.5 ${config.text} transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-[var(--border-default)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
            <ScoreBar label="Trend" value={regime.scores.trend} />
            <ScoreBar label="Breadth" value={regime.scores.breadth} />
            <ScoreBar label="Volatility" value={regime.scores.volatility} />
            <ScoreBar label="Momentum" value={regime.scores.momentum} />
          </div>
          {regime.details.trend && (
            <p className="text-[10px] text-[var(--text-muted)] mt-2 font-mono">
              {regime.details.trend.description}
              {regime.details.breadth ? ` | ${regime.details.breadth.description}` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
