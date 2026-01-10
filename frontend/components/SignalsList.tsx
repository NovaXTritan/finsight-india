'use client';

import { useState } from 'react';
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

export function SignalsList({ signals, onActionRecorded, showActions = true }: SignalsListProps) {
  if (signals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">No signals detected</p>
        <p className="text-sm mt-1">Add symbols to your watchlist to see signals</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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

function SignalCard({
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

  const handleAction = async (action: string) => {
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
  };

  const severityStyles = {
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };

  const decisionStyles = {
    IGNORE: 'bg-gray-100 text-gray-600',
    MONITOR: 'bg-blue-100 text-blue-700',
    REVIEW: 'bg-yellow-100 text-yellow-700',
    EXECUTE: 'bg-green-100 text-green-700',
    ALERT: 'bg-red-100 text-red-700',
  };

  const decisionIcons = {
    IGNORE: XCircle,
    MONITOR: Eye,
    REVIEW: AlertTriangle,
    EXECUTE: CheckCircle,
    ALERT: Zap,
  };

  const DecisionIcon = decisionIcons[signal.agent_decision as keyof typeof decisionIcons] || Eye;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Symbol */}
            <div className="min-w-[80px]">
              <span className="font-bold text-gray-900 text-lg">{signal.symbol}</span>
            </div>

            {/* Pattern Type */}
            <div className="hidden sm:block">
              <span className="text-sm text-gray-600">{formatPatternType(signal.pattern_type)}</span>
            </div>

            {/* Severity Badge */}
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                severityStyles[signal.severity]
              }`}
            >
              {signal.severity}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Agent Decision */}
            <div
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                decisionStyles[signal.agent_decision as keyof typeof decisionStyles] || 'bg-gray-100'
              }`}
            >
              <DecisionIcon className="h-3.5 w-3.5" />
              <span>{signal.agent_decision}</span>
            </div>

            {/* Confidence */}
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-gray-900">
                {(signal.agent_confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">confidence</div>
            </div>

            <ChevronRight
              className={`h-5 w-5 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center mt-2 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5 mr-1" />
          {formatTime(signal.detected_at)}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-500">Price</div>
              <div className="font-medium">
                {signal.price?.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 2,
                }) || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Volume</div>
              <div className="font-medium">
                {signal.volume?.toLocaleString('en-IN') || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Z-Score</div>
              <div className="font-medium">{signal.z_score?.toFixed(2) || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Pattern</div>
              <div className="font-medium">{formatPatternType(signal.pattern_type)}</div>
            </div>
          </div>

          {/* Agent Reason */}
          {signal.agent_reason && (
            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">AI Analysis</div>
              <div className="text-sm text-gray-700">{signal.agent_reason}</div>
            </div>
          )}

          {/* Actions */}
          {showActions && !recordedAction && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 mr-2">Your action:</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('ignored');
                }}
                disabled={isRecording}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Ignored
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('reviewed');
                }}
                disabled={isRecording}
                className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                Reviewed
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('traded');
                }}
                disabled={isRecording}
                className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                Traded
              </button>
            </div>
          )}

          {recordedAction && (
            <div className="flex items-center text-sm text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              Action recorded: {recordedAction}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
