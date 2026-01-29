'use client';

import { useState, memo, useCallback } from 'react';
import { Signal, signalsApi } from '@/lib/api';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface SignalsListProps {
  signals: Signal[];
  onActionRecorded?: () => void;
  showActions?: boolean;
}

const severityStyles = {
  low: 'severity-low',
  medium: 'severity-medium',
  high: 'severity-high',
  critical: 'severity-critical',
} as const;

const severityGlow = {
  low: 'shadow-blue-200/50',
  medium: 'shadow-yellow-200/50',
  high: 'shadow-orange-200/50',
  critical: 'shadow-red-200/50 animate-pulse',
} as const;

const decisionStyles = {
  IGNORE: 'decision-ignore',
  MONITOR: 'decision-monitor',
  REVIEW: 'decision-review',
  EXECUTE: 'decision-execute',
  ALERT: 'bg-red-100 text-red-700',
} as const;

const decisionIcons = {
  IGNORE: XCircle,
  MONITOR: Eye,
  REVIEW: AlertTriangle,
  EXECUTE: CheckCircle,
  ALERT: Zap,
} as const;

export function SignalsList({ signals, onActionRecorded, showActions = true }: SignalsListProps) {
  if (signals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="relative mx-auto w-16 h-16 mb-4">
          <div className="absolute inset-0 bg-primary-200/50 blur-xl rounded-full" />
          <AlertTriangle className="relative h-16 w-16 mx-auto text-primary-300" />
        </div>
        <p className="text-lg font-medium">No signals detected</p>
        <p className="text-sm mt-1">Add symbols to your watchlist to see signals</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 stagger-children">
      {signals.map((signal) => (
        <SignalCard
          key={signal.id}
          signal={signal}
          onActionRecorded={onActionRecorded}
          showActions={showActions}
        />
      ))}
    </div>
  );
}

const SignalCard = memo(function SignalCard({
  signal,
  onActionRecorded,
  showActions,
}: {
  signal: Signal;
  onActionRecorded?: () => void;
  showActions: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAction, setRecordedAction] = useState<string | null>(null);

  const handleAction = useCallback(async (action: string) => {
    if (isRecording) return;

    setIsRecording(true);
    try {
      await signalsApi.recordAction(signal.id, action);
      setRecordedAction(action);
      onActionRecorded?.();
    } catch (error) {
      console.error('Failed to record action:', error);
    } finally {
      setIsRecording(false);
    }
  }, [isRecording, signal.id, onActionRecorded]);

  const DecisionIcon = decisionIcons[signal.agent_decision as keyof typeof decisionIcons] || Eye;
  const glowClass = severityGlow[signal.severity as keyof typeof severityGlow] || '';

  return (
    <div className={`glass-card-dashboard overflow-hidden card-hover-lift shadow-lg ${glowClass}`}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Symbol with gradient background */}
            <div className="min-w-[80px]">
              <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-primary-100 to-purple-100 rounded-lg">
                <span className="font-bold text-primary-700 text-lg">{signal.symbol}</span>
              </div>
            </div>

            {/* Pattern Type */}
            <div className="hidden sm:block">
              <span className="text-sm text-gray-600">{formatPatternType(signal.pattern_type)}</span>
            </div>

            {/* Severity Badge */}
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                severityStyles[signal.severity as keyof typeof severityStyles] || severityStyles.low
              }`}
            >
              {signal.severity}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Agent Decision */}
            <div
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                decisionStyles[signal.agent_decision as keyof typeof decisionStyles] || 'bg-gray-100'
              }`}
            >
              <DecisionIcon className="h-3.5 w-3.5" />
              <span>{signal.agent_decision}</span>
            </div>

            {/* Confidence */}
            <div className="hidden sm:block text-right">
              <div className="text-sm font-bold text-primary-600">
                {(signal.agent_confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">confidence</div>
            </div>

            <ChevronRight
              className={`h-5 w-5 text-primary-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center mt-3 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5 mr-1" />
          {formatTime(signal.detected_at)}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-primary-100/50 bg-gradient-to-b from-primary-50/30 to-white animate-slide-down">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/80 rounded-lg p-3 border border-primary-100/50">
              <div className="text-xs text-gray-500">Price</div>
              <div className="font-semibold text-gray-900">
                {signal.price?.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 2,
                }) || '-'}
              </div>
            </div>
            <div className="bg-white/80 rounded-lg p-3 border border-primary-100/50">
              <div className="text-xs text-gray-500">Volume</div>
              <div className="font-semibold text-gray-900">
                {signal.volume?.toLocaleString('en-IN') || '-'}
              </div>
            </div>
            <div className="bg-white/80 rounded-lg p-3 border border-primary-100/50">
              <div className="text-xs text-gray-500">Z-Score</div>
              <div className="font-semibold text-gray-900">{signal.z_score?.toFixed(2) || '-'}</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3 border border-primary-100/50">
              <div className="text-xs text-gray-500">Pattern</div>
              <div className="font-semibold text-gray-900">{formatPatternType(signal.pattern_type)}</div>
            </div>
          </div>

          {/* Context */}
          {(signal as any).context && (
            <div className="mb-3 p-4 bg-blue-50/80 rounded-xl border border-blue-100">
              <div className="flex items-center text-xs font-semibold text-blue-700 mb-2">
                <Eye className="h-3.5 w-3.5 mr-1" />
                What This Means
              </div>
              <div className="text-sm text-gray-700">{(signal as any).context}</div>
            </div>
          )}

          {/* Sources */}
          {(signal as any).sources && (
            <div className="mb-3 p-4 bg-gray-50/80 rounded-xl border border-gray-200">
              <div className="flex items-center text-xs font-semibold text-gray-600 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Data Sources
              </div>
              <div className="flex flex-wrap gap-2">
                {(signal as any).sources.split(' | ').map((source: string, i: number) => (
                  <span key={i} className="badge-glass">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Thought Process */}
          {(signal as any).thought_process && (
            <div className="mb-3 p-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-100">
              <div className="flex items-center text-xs font-semibold text-primary-700 mb-2">
                <Zap className="h-3.5 w-3.5 mr-1" />
                AI Thought Process
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-line font-mono text-xs leading-relaxed">
                {(signal as any).thought_process}
              </div>
            </div>
          )}

          {/* Quick Summary */}
          {signal.agent_reason && !((signal as any).context) && (
            <div className="mb-4 p-4 bg-white/80 rounded-xl border border-primary-100/50">
              <div className="text-xs text-gray-500 mb-1">AI Analysis</div>
              <div className="text-sm text-gray-700">{signal.agent_reason}</div>
            </div>
          )}

          {/* Actions */}
          {showActions && !recordedAction && (
            <div className="flex items-center space-x-2 pt-2">
              <span className="text-xs text-gray-500 mr-2">Your action:</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('ignored');
                }}
                disabled={isRecording}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Ignored
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('reviewed');
                }}
                disabled={isRecording}
                className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all disabled:opacity-50"
              >
                Reviewed
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('traded');
                }}
                disabled={isRecording}
                className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all disabled:opacity-50"
              >
                Traded
              </button>
            </div>
          )}

          {recordedAction && (
            <div className="flex items-center text-sm text-green-600 pt-2">
              <CheckCircle className="h-4 w-4 mr-1" />
              Action recorded: {recordedAction}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

function formatPatternType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default SignalsList;
