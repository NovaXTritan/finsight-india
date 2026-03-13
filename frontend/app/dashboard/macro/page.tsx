'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  IndianRupee,
  Car,
  Factory,
  Zap,
  Building2,
  Info,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

const MacroTrendChart = dynamic(
  () => import('@/components/MacroTrendChart').then(mod => mod.MacroTrendChart),
  { ssr: false, loading: () => <div className="w-full h-[280px] bg-[var(--bg-muted)] rounded animate-pulse" /> }
);
import { HealthScorecard } from '@/components/HealthScorecard';

interface MacroIndicator {
  indicator_name: string;
  indicator_category: string;
  value: number;
  unit: string;
  period: string;
  period_date: string;
  yoy_change: number | null;
  mom_change: number | null;
  source: string;
  source_url: string;
  notes: string;
}

interface MacroData {
  gst: MacroIndicator[];
  auto_sales: MacroIndicator[];
  pmi: MacroIndicator[];
  cement: MacroIndicator[];
  power: MacroIndicator[];
}

interface HealthComponent {
  name: string;
  score: number;
  max_score: number;
  indicator: string;
  value: number;
  interpretation: string;
  trend: string;
}

interface HealthScore {
  overall_score: number;
  max_score: number;
  rating: string;
  components: HealthComponent[];
  generated_at: string;
}

interface SectorImpact {
  sector: string;
  impact: string;
  stocks: string[];
  reasoning: string;
}

interface MacroInsight {
  indicator: string;
  current_value: number;
  change: number | null;
  signal: string;
  sector_impacts: SectorImpact[];
}

const categoryIcons: Record<string, React.ElementType> = {
  'Tax Revenue': IndianRupee,
  'Auto Industry': Car,
  'Economic Activity': Factory,
  'Infrastructure': Building2,
  'Infrastructure - Cement': Building2,
  'Infrastructure - Power': Zap,
};

const categoryColors: Record<string, string> = {
  'Tax Revenue': 'bg-green-500/10 border border-green-500/20',
  'Auto Industry': 'bg-blue-500/10 border border-blue-500/20',
  'Economic Activity': 'bg-purple-500/10 border border-purple-500/20',
  'Infrastructure': 'bg-orange-500/10 border border-orange-500/20',
  'Infrastructure - Cement': 'bg-orange-500/10 border border-orange-500/20',
  'Infrastructure - Power': 'bg-yellow-500/10 border border-yellow-500/20',
};

function TrendIcon({ value }: { value: number | null }) {
  if (value === null) return <Minus className="h-4 w-4 text-[var(--text-muted)]" />;
  if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-[var(--text-muted)]" />;
}

function formatValue(value: number, unit: string): string {
  if (unit === 'Crore INR') {
    if (value >= 100000) {
      return `${(value / 100000).toFixed(2)} L Cr`;
    }
    return `${value.toLocaleString()} Cr`;
  }
  if (unit === 'Thousand Units') {
    return `${value.toLocaleString()} K`;
  }
  if (unit === 'Index' || unit === '%') {
    return value.toFixed(1);
  }
  if (unit === 'Billion Units') {
    return `${value.toFixed(1)} BU`;
  }
  if (unit === 'Million Tonnes') {
    return `${value.toFixed(1)} MT`;
  }
  if (unit === 'GW') {
    return `${value.toFixed(1)} GW`;
  }
  return value.toLocaleString();
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function SummaryCard({
  title,
  value,
  change,
  period,
  icon: Icon,
  colorClass
}: {
  title: string;
  value: string;
  change: number | null;
  period: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <div className="card p-5 card-hover-lift">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 ${colorClass} rounded-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-muted)] px-2 py-1 rounded-full">{period}</span>
      </div>
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</h3>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">{value}</span>
        {change !== null && (
          <div className={`flex items-center text-sm font-semibold font-mono ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendIcon value={change} />
            <span className="ml-1">{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: MacroInsight }) {
  const signalColors: Record<string, string> = {
    BULLISH: 'bg-green-500/10 text-green-400 border-green-500/20',
    NEUTRAL: 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-default)]',
    CAUTIOUS: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    BEARISH: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const signalBorders: Record<string, string> = {
    BULLISH: 'border-l-green-500',
    NEUTRAL: 'border-l-gray-400',
    CAUTIOUS: 'border-l-yellow-500',
    BEARISH: 'border-l-red-500',
  };

  return (
    <div className={`card p-5 border-l-4 ${signalBorders[insight.signal] || signalBorders.NEUTRAL}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-[var(--text-primary)]">{insight.indicator}</h4>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${signalColors[insight.signal] || signalColors.NEUTRAL}`}>
          {insight.signal}
        </span>
      </div>

      <div className="flex items-center space-x-4 mb-4 text-sm">
        <span className="text-[var(--text-secondary)]">
          Value: <span className="font-bold font-mono text-[var(--text-primary)]">{insight.current_value.toFixed(1)}</span>
        </span>
        {insight.change !== null && (
          <span className={`font-semibold font-mono ${insight.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {insight.change >= 0 ? '+' : ''}{insight.change.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="space-y-3">
        {insight.sector_impacts.map((impact, idx) => (
          <div key={idx} className="bg-[var(--bg-muted)] rounded-lg p-4 border border-[var(--border-default)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">{impact.sector}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                impact.impact.includes('Positive') ? 'bg-green-500/10 text-green-400' :
                impact.impact.includes('Negative') ? 'bg-red-500/10 text-red-400' :
                'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
              }`}>
                {impact.impact}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-2">{impact.reasoning}</p>
            <div className="flex flex-wrap gap-1.5">
              {impact.stocks.map((stock) => (
                <span
                  key={stock}
                  className="inline-flex items-center px-2 py-0.5 text-xs bg-primary-500/10 text-primary-400 rounded font-medium font-mono"
                >
                  {stock}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MacroPage() {
  const [data, setData] = useState<MacroData | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [insights, setInsights] = useState<MacroInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(12);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'insights'>('overview');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [macroRes, healthRes, insightsRes] = await Promise.allSettled([
        api.get(`/macro/all`, { params: { months } }),
        api.get(`/macro/health-score`),
        api.get(`/macro/insights`),
      ]);

      if (macroRes.status === 'rejected') {
        throw new Error('Failed to fetch macro data');
      }
      setData(macroRes.value.data);

      if (healthRes.status === 'fulfilled') {
        setHealthScore(healthRes.value.data);
      }

      if (insightsRes.status === 'fulfilled') {
        setInsights(insightsRes.value.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [months]);

  const getLatestIndicator = (indicators: MacroIndicator[], name?: string): MacroIndicator | null => {
    const filtered = name
      ? indicators.filter(i => i.indicator_name.includes(name))
      : indicators;
    if (filtered.length === 0) return null;
    return filtered.reduce((latest, current) =>
      current.period > latest.period ? current : latest
    );
  };

  const prepareChartData = (indicators: MacroIndicator[], indicatorName?: string) => {
    const filtered = indicatorName
      ? indicators.filter(i => i.indicator_name.includes(indicatorName))
      : indicators;

    return filtered
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(i => ({
        period: formatPeriod(i.period),
        value: i.value,
        yoy_change: i.yoy_change ?? undefined,
      }));
  };

  const latestGST = data ? getLatestIndicator(data.gst) : null;
  const latestPMI = data ? getLatestIndicator(data.pmi, 'Manufacturing') : null;
  const latestPower = data ? getLatestIndicator(data.power, 'Generation') : null;
  const latestAuto = data ? getLatestIndicator(data.auto_sales, 'Total') : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-500/30 blur-xl rounded-full animate-pulse" />
          <RefreshCw className="relative h-12 w-12 text-primary-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-12 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={fetchData}
          className="btn-primary px-6 py-2.5"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Macro Analytics</h1>
              <p className="text-[var(--text-secondary)]">Economic indicators with sector impact analysis</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              className="input text-sm"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
              <option value={24}>24 Months</option>
            </select>
            <button
              onClick={fetchData}
              className="p-2.5 hover:bg-[var(--bg-muted)] rounded-lg transition-colors"
            >
              <RefreshCw className="h-5 w-5 text-primary-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card px-6 py-3">
        <nav className="flex space-x-2">
          {(['overview', 'charts', 'insights'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Health Scorecard */}
          {healthScore && (
            <HealthScorecard
              overallScore={healthScore.overall_score}
              maxScore={healthScore.max_score}
              rating={healthScore.rating}
              components={healthScore.components}
            />
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {latestGST && (
              <SummaryCard
                title="GST Collection"
                value={formatValue(latestGST.value, latestGST.unit)}
                change={latestGST.yoy_change}
                period={formatPeriod(latestGST.period)}
                icon={IndianRupee}
                colorClass="bg-green-500/10 border border-green-500/20"
              />
            )}
            {latestPMI && (
              <SummaryCard
                title="Manufacturing PMI"
                value={latestPMI.value.toFixed(1)}
                change={latestPMI.mom_change}
                period={formatPeriod(latestPMI.period)}
                icon={Factory}
                colorClass="bg-purple-500/10 border border-purple-500/20"
              />
            )}
            {latestPower && (
              <SummaryCard
                title="Power Generation"
                value={formatValue(latestPower.value, latestPower.unit)}
                change={latestPower.yoy_change}
                period={formatPeriod(latestPower.period)}
                icon={Zap}
                colorClass="bg-yellow-500/10 border border-yellow-500/20"
              />
            )}
            {latestAuto && (
              <SummaryCard
                title="Total Auto Sales"
                value={formatValue(latestAuto.value, latestAuto.unit)}
                change={latestAuto.yoy_change}
                period={formatPeriod(latestAuto.period)}
                icon={Car}
                colorClass="bg-blue-500/10 border border-blue-500/20"
              />
            )}
          </div>

          {/* Quick Insights */}
          {insights.length > 0 && (
            <div className="card p-6 bg-[var(--bg-muted)]">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Key Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.slice(0, 3).map((insight, idx) => (
                  <div key={idx} className="bg-[var(--bg-elevated)] backdrop-blur-sm rounded-lg p-4 border border-[var(--border-default)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{insight.indicator}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        insight.signal === 'BULLISH' ? 'bg-green-500/10 text-green-400' :
                        insight.signal === 'BEARISH' ? 'bg-red-500/10 text-red-400' :
                        'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
                      }`}>
                        {insight.signal}
                      </span>
                    </div>
                    {insight.sector_impacts[0] && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        <ArrowRight className="h-3 w-3 inline mr-1 text-primary-500" />
                        {insight.sector_impacts[0].sector}: {insight.sector_impacts[0].impact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === 'charts' && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.gst.length > 0 && (
            <MacroTrendChart
              data={prepareChartData(data.gst)}
              title="GST Collections Trend"
              unit="Crore"
              chartType="bar"
              showYoY
              color="#10B981"
              height={280}
            />
          )}
          {data.pmi.length > 0 && (
            <MacroTrendChart
              data={prepareChartData(data.pmi, 'Manufacturing')}
              title="Manufacturing PMI"
              unit="Index"
              chartType="line"
              showYoY
              color="#8B5CF6"
              referenceLine={{ value: 50, label: 'Expansion Threshold' }}
              height={280}
            />
          )}
          {data.auto_sales.length > 0 && (
            <MacroTrendChart
              data={prepareChartData(data.auto_sales, 'Total')}
              title="Total Auto Sales"
              unit="Units"
              chartType="bar"
              showYoY
              color="#3B82F6"
              height={280}
            />
          )}
          {data.power.length > 0 && (
            <MacroTrendChart
              data={prepareChartData(data.power, 'Generation')}
              title="Power Generation"
              unit="BU"
              chartType="line"
              showYoY
              color="#F59E0B"
              height={280}
            />
          )}
          {data.cement.length > 0 && (
            <MacroTrendChart
              data={prepareChartData(data.cement, 'Dispatch')}
              title="Cement Dispatch"
              unit="MT"
              chartType="bar"
              showYoY
              color="#F97316"
              height={280}
            />
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* Sector Impact Analysis */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Sector Impact Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {insights.map((insight, idx) => (
                <InsightCard key={idx} insight={insight} />
              ))}
            </div>
          </div>

          {/* PMI Interpretation Guide */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Understanding PMI</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="font-semibold text-[var(--text-primary)]">Above 55</span>
                </div>
                <p className="text-[var(--text-secondary)]">Strong expansion. Capital goods and industrials likely to outperform.</p>
              </div>
              <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="font-semibold text-[var(--text-primary)]">50-55</span>
                </div>
                <p className="text-[var(--text-secondary)]">Moderate expansion. Selective opportunities in cyclicals.</p>
              </div>
              <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <span className="font-semibold text-[var(--text-primary)]">Below 50</span>
                </div>
                <p className="text-[var(--text-secondary)]">Contraction. Defensive sectors (FMCG, Pharma) may be safer.</p>
              </div>
            </div>
          </div>

          {/* Correlation Info */}
          <div className="card p-5 bg-blue-500/10 border-l-4 border-l-blue-500">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-300">
                <p className="font-semibold mb-1">How to Use This Data</p>
                <p>
                  Macro indicators provide leading signals for sector rotation. Strong PMI typically
                  benefits capital goods 1-2 months ahead. High GST collections confirm consumer
                  strength benefiting FMCG and retail. Use these insights alongside technical
                  analysis for timing entry.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
