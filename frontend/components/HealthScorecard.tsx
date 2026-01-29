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
    if (pct >= 80) return 'text-green-600';
    if (pct >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'excellent': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200';
      case 'good': return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200';
      case 'moderate': return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200';
      default: return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProgressGradient = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'from-green-400 to-emerald-500';
    if (pct >= 60) return 'from-yellow-400 to-amber-500';
    return 'from-red-400 to-rose-500';
  };

  return (
    <div className="glass-card-dashboard overflow-hidden">
      {/* Header with overall score */}
      <div className="px-6 py-5 bg-gradient-to-r from-primary-500 to-purple-600 border-b border-primary-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Economic Health Scorecard</h3>
              <p className="text-sm text-white/70">Based on latest macro indicators</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white">
              {overallScore.toFixed(1)}<span className="text-xl text-white/60">/{maxScore}</span>
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
          <div key={index} className="flex items-center space-x-4 p-3 bg-gradient-to-r from-primary-50/30 to-purple-50/30 rounded-xl hover:from-primary-50/50 hover:to-purple-50/50 transition-all">
            {/* Component name */}
            <div className="w-36 flex-shrink-0">
              <div className="text-sm font-semibold text-gray-900">{component.name}</div>
              <div className="text-xs text-gray-500">{component.indicator}</div>
            </div>

            {/* Progress bar */}
            <div className="flex-1">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getProgressGradient(component.score, component.max_score)} shadow-sm`}
                  style={{ width: `${(component.score / component.max_score) * 100}%` }}
                />
              </div>
            </div>

            {/* Value and interpretation */}
            <div className="w-44 flex-shrink-0 text-right">
              <div className="flex items-center justify-end space-x-1.5">
                {getTrendIcon(component.trend)}
                <span className="text-sm font-bold text-gray-900">
                  {typeof component.value === 'number' && component.value % 1 !== 0
                    ? component.value.toFixed(1)
                    : component.value}
                </span>
              </div>
              <div className="text-xs text-gray-500">{component.interpretation}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-6 py-4 bg-gradient-to-r from-primary-50/50 to-purple-50/50 border-t border-primary-100/50">
        <div className="flex items-center justify-center space-x-8 text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-sm" />
            <span className="font-medium">Strong (80%+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full shadow-sm" />
            <span className="font-medium">Moderate (60-80%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-rose-500 rounded-full shadow-sm" />
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
    <div className="flex items-center space-x-3 glass-card-purple p-3 rounded-xl">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 transform -rotate-90">
          <circle
            cx="28"
            cy="28"
            r="24"
            stroke="#E5E7EB"
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
            className="drop-shadow-sm"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">{score.toFixed(1)}</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{rating}</div>
        <div className="text-xs text-gray-500">Economic Health</div>
      </div>
    </div>
  );
}
