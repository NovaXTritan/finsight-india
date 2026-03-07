'use client';

import { useState, memo, useCallback } from 'react';
import { Signal, signalsApi } from '@/lib/api';
import Link from 'next/link';
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
  ExternalLink,
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
  low: '',
  medium: '',
  high: '',
  critical: 'animate-pulse',
} as const;

const decisionStyles = {
  IGNORE: 'decision-ignore',
  MONITOR: 'decision-monitor',
  REVIEW: 'decision-review',
  EXECUTE: 'decision-execute',
  ALERT: 'bg-red-500/10 text-red-400 border border-red-500/20',
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
      <div className="text-center py-12 text-[var(--text-secondary)]">
        <div className="relative mx-auto w-16 h-16 mb-4">
          <AlertTriangle className="relative h-16 w-16 mx-auto text-primary-400" />
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
    <div className={`glass-card-dashboard overflow-hidden card-hover-lift ${glowClass}`}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Symbol badge */}
            <div className="min-w-[80px]">
              <div className="inline-flex items-center px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                <span className="font-bold text-primary-400 text-lg">{signal.symbol}</span>
              </div>
            </div>

            {/* Pattern Type */}
            <div className="hidden sm:block">
              <span className="text-sm text-[var(--text-secondary)]">{formatPatternType(signal.pattern_type)}</span>
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
                decisionStyles[signal.agent_decision as keyof typeof decisionStyles] || 'bg-[var(--bg-overlay)]'
              }`}
            >
              <DecisionIcon className="h-3.5 w-3.5" />
              <span>{signal.agent_decision}</span>
            </div>

            {/* Confidence Stars */}
            <div className="hidden sm:block text-right">
              <div className="text-sm text-yellow-400" title={`Confidence Level ${signal.confidence_level || 1}/5`}>
                {'★'.repeat(signal.confidence_level || 1)}{'☆'.repeat(5 - (signal.confidence_level || 1))}
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-mono">{(signal.agent_confidence * 100).toFixed(0)}%</div>
            </div>

            <ChevronRight
              className={`h-5 w-5 text-primary-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center mt-3 text-xs text-[var(--text-secondary)]">
          <Clock className="h-3.5 w-3.5 mr-1" />
          {formatTime(signal.detected_at)}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[var(--border-primary)] bg-[var(--bg-overlay)] animate-slide-down">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-primary)]">
              <div className="text-xs text-[var(--text-secondary)]">Price</div>
              <div className="font-semibold font-mono text-[var(--text-primary)]">
                {signal.price?.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 2,
                }) || '-'}
              </div>
            </div>
            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-primary)]">
              <div className="text-xs text-[var(--text-secondary)]">Volume</div>
              <div className="font-semibold font-mono text-[var(--text-primary)]">
                {signal.volume?.toLocaleString('en-IN') || '-'}
              </div>
            </div>
            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-primary)]">
              <div className="text-xs text-[var(--text-secondary)]">Z-Score</div>
              <div className="font-semibold font-mono text-[var(--text-primary)]">{signal.z_score?.toFixed(2) || '-'}</div>
            </div>
            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-primary)]">
              <div className="text-xs text-[var(--text-secondary)]">Pattern</div>
              <div className="font-semibold text-[var(--text-primary)]">{formatPatternType(signal.pattern_type)}</div>
            </div>
          </div>

          {/* Context */}
          {signal.context && (
            <div className="mb-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center text-xs font-semibold text-blue-400 mb-2">
                <Eye className="h-3.5 w-3.5 mr-1" />
                What This Means
              </div>
              <div className="text-sm text-[var(--text-secondary)]">{signal.context}</div>
            </div>
          )}

          {/* Sources */}
          {signal.sources && (
            <div className="mb-3 p-4 bg-[var(--bg-overlay)] rounded-lg border border-[var(--border-primary)]">
              <div className="flex items-center text-xs font-semibold text-[var(--text-secondary)] mb-2">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Data Sources
              </div>
              <div className="flex flex-wrap gap-2">
                {signal.sources.split(' | ').map((source: string, i: number) => (
                  <span key={i} className="badge-glass">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Thought Process */}
          {signal.thought_process && (
            <div className="mb-3 p-4 bg-[var(--bg-overlay)] rounded-lg border border-[var(--border-primary)]">
              <div className="flex items-center text-xs font-semibold text-primary-400 mb-2">
                <Zap className="h-3.5 w-3.5 mr-1" />
                AI Thought Process
              </div>
              <div className="text-sm text-[var(--text-secondary)] whitespace-pre-line font-mono text-xs leading-relaxed">
                {signal.thought_process}
              </div>
            </div>
          )}

          {/* Catalyst Context */}
          {signal.catalyst_context && Object.keys(signal.catalyst_context).length > 0 && (
            <div className="mb-3 p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
              <div className="flex items-center text-xs font-semibold text-purple-400 mb-2">
                <Zap className="h-3.5 w-3.5 mr-1" />
                Catalyst Context
              </div>
              <div className="space-y-1.5">
                {Object.entries(signal.catalyst_context).map(([key, val]) => (
                  <p key={key} className="text-xs text-[var(--text-secondary)]">
                    <span className="text-purple-400 font-medium">{key.replace(/_/g, ' ')}:</span> {val}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Quick Summary */}
          {signal.agent_reason && !signal.context && (
            <div className="mb-4 p-4 bg-[var(--bg-raised)] rounded-lg border border-[var(--border-primary)]">
              <div className="text-xs text-[var(--text-secondary)] mb-1">AI Analysis</div>
              <div className="text-sm text-[var(--text-secondary)]">{signal.agent_reason}</div>
            </div>
          )}

          {/* View Details Link */}
          <div className="mb-3">
            <Link
              href={`/dashboard/signal-detail?id=${signal.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Full Details & Historical Comparison
            </Link>
          </div>

          {/* Actions */}
          {showActions && !recordedAction && (
            <div className="flex items-center space-x-2 pt-2">
              <span className="text-xs text-[var(--text-secondary)] mr-2">Your action:</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('ignored');
                }}
                disabled={isRecording}
                className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-overlay)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-overlay)] transition-all disabled:opacity-50 border border-[var(--border-primary)]"
              >
                Ignored
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('reviewed');
                }}
                disabled={isRecording}
                className="px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50 border border-blue-500/20"
              >
                Reviewed
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('traded');
                }}
                disabled={isRecording}
                className="px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-all disabled:opacity-50 border border-green-500/20"
              >
                Traded
              </button>
            </div>
          )}

          {recordedAction && (
            <div className="flex items-center text-sm text-green-400 pt-2">
              <CheckCircle className="h-4 w-4 mr-1" />
              Action recorded: {recordedAction}
            </div>
          )}

          <p className="text-[10px] text-[var(--text-muted)] mt-3 pt-2 border-t border-[var(--border-primary)]">
            Not investment advice. Statistical anomaly detection for informational purposes only.
          </p>
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
