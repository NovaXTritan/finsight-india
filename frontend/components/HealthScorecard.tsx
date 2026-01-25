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
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProgressColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header with overall score */}
      <div className="px-6 py-4 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Economic Health Scorecard</h3>
              <p className="text-sm text-gray-500">Based on latest macro indicators</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(overallScore, maxScore)}`}>
              {overallScore.toFixed(1)}<span className="text-lg text-gray-400">/{maxScore}</span>
            </div>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getRatingColor(rating)}`}>
              {rating}
            </span>
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="p-4 space-y-3">
        {components.map((component, index) => (
          <div key={index} className="flex items-center space-x-4">
            {/* Component name */}
            <div className="w-32 flex-shrink-0">
              <div className="text-sm font-medium text-gray-900">{component.name}</div>
              <div className="text-xs text-gray-500">{component.indicator}</div>
            </div>

            {/* Progress bar */}
            <div className="flex-1">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(component.score, component.max_score)}`}
                  style={{ width: `${(component.score / component.max_score) * 100}%` }}
                />
              </div>
            </div>

            {/* Value and interpretation */}
            <div className="w-40 flex-shrink-0 text-right">
              <div className="flex items-center justify-end space-x-1">
                {getTrendIcon(component.trend)}
                <span className="text-sm font-semibold text-gray-900">
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
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>Strong</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span>Moderate</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span>Weak</span>
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
    <div className="flex items-center space-x-3">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="#E5E7EB"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke={strokeColor}
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${pct * 1.26} 126`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">{score.toFixed(1)}</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">{rating}</div>
        <div className="text-xs text-gray-500">Economic Health</div>
      </div>
    </div>
  );
}
