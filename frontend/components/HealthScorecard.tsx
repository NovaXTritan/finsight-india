'use client';

import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface HealthComponent {
  name: string;
  score: number;
  max_score: number;
  indicator: string;
  value: number;
  interpretation: string;
  trend: string;
}

interface HealthScorecardProps {
  overallScore: number;
  maxScore: number;
  rating: string;
  components: HealthComponent[];
}

export function HealthScorecard({
  overallScore,
  maxScore,
  rating,
  components,
}: HealthScorecardProps) {
  const getScoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'text-green-400';
    if (pct >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'excellent': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'good': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'moderate': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      default: return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-400" />;
      default: return <Minus className="h-4 w-4 text-[var(--text-muted)]" />;
    }
  };

  const getProgressColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'bg-green-400';
    if (pct >= 60) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <div className="glass-card-dashboard overflow-hidden">
      {/* Header with overall score */}
      <div className="px-6 py-5 bg-[var(--bg-overlay)] border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Activity className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Economic Health Scorecard</h3>
              <p className="text-sm text-[var(--text-secondary)]">Based on latest macro indicators</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold font-mono text-[var(--text-primary)]">
              {overallScore.toFixed(1)}<span className="text-xl text-[var(--text-muted)]">/{maxScore}</span>
            </div>
            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mt-1 ${getRatingColor(rating)}`}>
              {rating}
            </span>
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="p-6 space-y-4">
        {components.map((component, index) => (
          <div key={index} className="flex items-center space-x-4 p-3 bg-[var(--bg-overlay)] rounded-lg hover:bg-[var(--bg-overlay)] transition-all border border-transparent hover:border-[var(--border-primary)]">
            {/* Component name */}
            <div className="w-36 flex-shrink-0">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{component.name}</div>
              <div className="text-xs text-[var(--text-secondary)]">{component.indicator}</div>
            </div>

            {/* Progress bar */}
            <div className="flex-1">
              <div className="h-3 bg-[var(--bg-overlay)] rounded-full overflow-hidden border border-[var(--border-primary)]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(component.score, component.max_score)}`}
                  style={{ width: `${(component.score / component.max_score) * 100}%` }}
                />
              </div>
            </div>

            {/* Value and interpretation */}
            <div className="w-44 flex-shrink-0 text-right">
              <div className="flex items-center justify-end space-x-1.5">
                {getTrendIcon(component.trend)}
                <span className="text-sm font-bold font-mono text-[var(--text-primary)]">
                  {typeof component.value === 'number' && component.value % 1 !== 0
                    ? component.value.toFixed(1)
                    : component.value}
                </span>
              </div>
              <div className="text-xs text-[var(--text-secondary)]">{component.interpretation}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-6 py-4 bg-[var(--bg-overlay)] border-t border-[var(--border-primary)]">
        <div className="flex items-center justify-center space-x-8 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-400 rounded-full" />
            <span className="font-medium">Strong (80%+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-400 rounded-full" />
            <span className="font-medium">Moderate (60-80%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-400 rounded-full" />
            <span className="font-medium">Weak (&lt;60%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact version for dashboard
export function HealthScoreCompact({
  score,
  maxScore,
  rating,
}: {
  score: number;
  maxScore: number;
  rating: string;
}) {
  const pct = (score / maxScore) * 100;
  const strokeColor = pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex items-center space-x-3 bg-[var(--bg-overlay)] border border-[var(--border-primary)] p-3 rounded-lg">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 transform -rotate-90">
          <circle
            cx="28"
            cy="28"
            r="24"
            stroke="var(--border-primary)"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="28"
            cy="28"
            r="24"
            stroke={strokeColor}
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${pct * 1.51} 151`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold font-mono text-[var(--text-primary)]">{score.toFixed(1)}</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{rating}</div>
        <div className="text-xs text-[var(--text-secondary)]">Economic Health</div>
      </div>
    </div>
  );
}
