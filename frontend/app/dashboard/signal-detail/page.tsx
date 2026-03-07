'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signalsApi, marketApi, Signal, StockInstitutionalFlow } from '@/lib/api';
import { ArrowLeft, Star, AlertTriangle, TrendingUp, BarChart3, Clock, CheckCircle, XCircle, Loader2, Building2 } from 'lucide-react';
import Link from 'next/link';

interface SignalDetail extends Signal {
  outcomes?: Record<string, {
    horizon_days: number;
    return_pct: number | null;
    was_correct: boolean | null;
    price_at_signal: number;
    price_at_horizon: number | null;
  }>;
  historical_similar?: Array<{
    id: string;
    symbol: string;
    pattern_type: string;
    z_score: number;
    detected_at: string;
    return_3d: number | null;
    return_5d: number | null;
  }>;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/25',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  low: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
};

function ConfidenceStars({ level }: { level: number }) {
  return (
    <span className="text-sm" title={`Confidence Level ${level}/5`}>
      {'★'.repeat(level)}{'☆'.repeat(5 - level)}
    </span>
  );
}

export default function SignalDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [signal, setSignal] = useState<SignalDetail | null>(null);
  const [flow, setFlow] = useState<StockInstitutionalFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No signal ID provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    signalsApi.getById(id)
      .then((data) => {
        setSignal(data as SignalDetail);
        marketApi.getStockInstitutionalFlow(data.symbol).then(setFlow).catch(() => {});
      })
      .catch(() => setError('Signal not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
        <p className="text-[var(--text-secondary)]">{error || 'Signal not found'}</p>
        <Link href="/dashboard/signals" className="text-primary-400 text-sm mt-2 inline-block hover:underline">
          Back to Signals
        </Link>
      </div>
    );
  }

  const horizons = [1, 3, 5, 10, 30];
  const catalyst = signal.catalyst_context || {};
  const catalystKeys = Object.keys(catalyst);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-[var(--bg-muted)] rounded-lg transition-colors">
          <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-display-md font-display text-[var(--text-primary)]">{signal.symbol}</h1>
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${severityColors[signal.severity]}`}>
              {signal.severity.toUpperCase()}
            </span>
            <span className="text-yellow-400">
              <ConfidenceStars level={signal.confidence_level || 1} />
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {signal.pattern_type.replace(/_/g, ' ')} | Z-Score: {signal.z_score.toFixed(2)} | Detected {new Date(signal.detected_at).toLocaleDateString('en-IN')}
          </p>
        </div>
      </div>

      {/* Signal Summary */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Price at Signal</p>
            <p className="text-lg font-mono font-semibold text-[var(--text-primary)]">
              {signal.price ? `₹${signal.price.toLocaleString('en-IN')}` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Volume</p>
            <p className="text-lg font-mono font-semibold text-[var(--text-primary)]">
              {signal.volume ? (signal.volume / 100000).toFixed(1) + 'L' : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Z-Score</p>
            <p className="text-lg font-mono font-semibold text-[var(--text-primary)]">{signal.z_score.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Confidence</p>
            <p className="text-lg font-mono font-semibold text-[var(--text-primary)]">
              {signal.agent_confidence ? `${(signal.agent_confidence * 100).toFixed(0)}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Outcome Tracking */}
      {signal.outcomes && Object.keys(signal.outcomes).length > 0 && (
        <div className="card p-4">
          <h2 className="text-heading font-display text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary-400" />
            Outcome Tracking
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {horizons.map(h => {
              const key = `${h}d`;
              const outcome = signal.outcomes?.[key];
              return (
                <div key={h} className="text-center p-3 rounded-lg bg-[var(--bg-muted)]">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{h}D</p>
                  {outcome ? (
                    <>
                      <div className="flex justify-center mb-1">
                        {outcome.was_correct ? (
                          <CheckCircle className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                      <p className={`text-sm font-mono font-semibold ${
                        (outcome.return_pct || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {outcome.return_pct !== null ? `${outcome.return_pct > 0 ? '+' : ''}${outcome.return_pct.toFixed(2)}%` : '—'}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] mt-2">Pending</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Catalyst Context */}
      {catalystKeys.length > 0 && (
        <div className="card p-4">
          <h2 className="text-heading font-display text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-400" />
            Catalyst Context
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {catalystKeys.map(key => (
              <div key={key} className="p-3 rounded-lg bg-[var(--bg-muted)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                <p className="text-sm text-[var(--text-secondary)]">{catalyst[key]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Institutional Flow */}
      {flow && flow.has_institutional_activity && (
        <div className="card p-4">
          <h2 className="text-heading font-display text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary-400" />
            Institutional Flow Analysis
          </h2>
          <div className="space-y-2">
            {Object.entries(flow.signals).map(([key, value]) => (
              <div key={key} className="p-3 rounded-lg bg-[var(--bg-muted)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                <p className="text-sm text-[var(--text-secondary)]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Thought Process */}
      {signal.thought_process && (
        <div className="card p-4">
          <h2 className="text-heading font-display text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary-400" />
            AI Analysis
          </h2>
          <div className="text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed bg-[var(--bg-muted)] p-3 rounded-lg font-mono text-xs">
            {signal.thought_process}
          </div>
        </div>
      )}

      {/* Historical Similar */}
      {signal.historical_similar && signal.historical_similar.length > 0 && (
        <div className="card p-4">
          <h2 className="text-heading font-display text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary-400" />
            Historical Similar Signals
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--text-muted)] border-b border-[var(--border-default)]">
                  <th className="text-left py-2 px-2">Symbol</th>
                  <th className="text-left py-2 px-2">Pattern</th>
                  <th className="text-right py-2 px-2">Z-Score</th>
                  <th className="text-right py-2 px-2">3D Return</th>
                  <th className="text-right py-2 px-2">5D Return</th>
                  <th className="text-left py-2 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {signal.historical_similar.map((h) => (
                  <tr key={h.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-muted)]">
                    <td className="py-2 px-2 font-mono font-medium text-[var(--text-primary)]">{h.symbol}</td>
                    <td className="py-2 px-2 text-[var(--text-secondary)]">{h.pattern_type.replace(/_/g, ' ')}</td>
                    <td className="py-2 px-2 text-right font-mono">{h.z_score.toFixed(2)}</td>
                    <td className={`py-2 px-2 text-right font-mono ${
                      h.return_3d !== null ? (h.return_3d >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-[var(--text-muted)]'
                    }`}>
                      {h.return_3d !== null ? `${h.return_3d > 0 ? '+' : ''}${h.return_3d.toFixed(2)}%` : '—'}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono ${
                      h.return_5d !== null ? (h.return_5d >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-[var(--text-muted)]'
                    }`}>
                      {h.return_5d !== null ? `${h.return_5d > 0 ? '+' : ''}${h.return_5d.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-2 px-2 text-[var(--text-muted)]">{new Date(h.detected_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
        This is an AI-generated anomaly detection signal for educational/research purposes only.
        Not investment advice. Past performance does not guarantee future results. Always do your
        own research and consult a SEBI-registered advisor before making investment decisions.
      </p>
    </div>
  );
}
