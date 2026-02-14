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

const MacroTrendChart = dynamic(
  () => import('@/components/MacroTrendChart').then(mod => mod.MacroTrendChart),
  { ssr: false, loading: () => <div className="w-full h-[280px] bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /> }
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
  'Tax Revenue': 'from-green-500 to-emerald-600',
  'Auto Industry': 'from-blue-500 to-indigo-600',
  'Economic Activity': 'from-purple-500 to-violet-600',
  'Infrastructure': 'from-orange-500 to-amber-600',
  'Infrastructure - Cement': 'from-orange-500 to-amber-600',
  'Infrastructure - Power': 'from-yellow-500 to-amber-500',
};

function TrendIcon({ value }: { value: number | null }) {
  if (value === null) return <Minus className="h-4 w-4 text-gray-400" />;
  if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
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
    <div className="glass-card-dashboard p-5 card-hover-lift">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 bg-gradient-to-br ${colorClass} rounded-xl shadow-glow`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{period}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {change !== null && (
          <div className={`flex items-center text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
    BULLISH: 'bg-green-100 text-green-800 border-green-200',
    NEUTRAL: 'bg-gray-100 text-gray-800 border-gray-200',
    CAUTIOUS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    BEARISH: 'bg-red-100 text-red-800 border-red-200',
  };

  const signalBorders: Record<string, string> = {
    BULLISH: 'border-l-green-500',
    NEUTRAL: 'border-l-gray-400',
    CAUTIOUS: 'border-l-yellow-500',
    BEARISH: 'border-l-red-500',
  };

  return (
    <div className={`glass-card-dashboard p-5 border-l-4 ${signalBorders[insight.signal] || signalBorders.NEUTRAL}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{insight.indicator}</h4>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${signalColors[insight.signal] || signalColors.NEUTRAL}`}>
          {insight.signal}
        </span>
      </div>

      <div className="flex items-center space-x-4 mb-4 text-sm">
        <span className="text-gray-600">
          Value: <span className="font-bold text-gray-900">{insight.current_value.toFixed(1)}</span>
        </span>
        {insight.change !== null && (
          <span className={`font-semibold ${insight.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {insight.change >= 0 ? '+' : ''}{insight.change.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="space-y-3">
        {insight.sector_impacts.map((impact, idx) => (
          <div key={idx} className="bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-xl p-4 border border-primary-100/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900">{impact.sector}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                impact.impact.includes('Positive') ? 'bg-green-100 text-green-700' :
                impact.impact.includes('Negative') ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {impact.impact}
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-2">{impact.reasoning}</p>
            <div className="flex flex-wrap gap-1.5">
              {impact.stocks.map((stock) => (
                <span
                  key={stock}
                  className="inline-flex items-center px-2 py-0.5 text-xs bg-gradient-to-r from-primary-100 to-purple-100 text-primary-700 rounded font-medium"
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

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [macroRes, healthRes, insightsRes] = await Promise.all([
        fetch(`${API_BASE}/api/macro/all?months=${months}`),
        fetch(`${API_BASE}/api/macro/health-score`),
        fetch(`${API_BASE}/api/macro/insights`),
      ]);

      if (!macroRes.ok) {
        throw new Error('Failed to fetch macro data');
      }

      const macroData = await macroRes.json();
      setData(macroData);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealthScore(healthData);
      }

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData);
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
      <div className="glass-card-dashboard p-12 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={fetchData}
          className="btn-glass-primary px-6 py-2.5"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card-dashboard p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-glow">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Macro Analytics</h1>
              <p className="text-gray-500">Economic indicators with sector impact analysis</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              className="input-glass-light text-sm"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
              <option value={24}>24 Months</option>
            </select>
            <button
              onClick={fetchData}
              className="p-2.5 hover:bg-primary-100 rounded-xl transition-colors"
            >
              <RefreshCw className="h-5 w-5 text-primary-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card-dashboard px-6 py-3">
        <nav className="flex space-x-2">
          {(['overview', 'charts', 'insights'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-glow'
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
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
                colorClass="from-green-500 to-emerald-600"
              />
            )}
            {latestPMI && (
              <SummaryCard
                title="Manufacturing PMI"
                value={latestPMI.value.toFixed(1)}
                change={latestPMI.mom_change}
                period={formatPeriod(latestPMI.period)}
                icon={Factory}
                colorClass="from-purple-500 to-violet-600"
              />
            )}
            {latestPower && (
              <SummaryCard
                title="Power Generation"
                value={formatValue(latestPower.value, latestPower.unit)}
                change={latestPower.yoy_change}
                period={formatPeriod(latestPower.period)}
                icon={Zap}
                colorClass="from-yellow-500 to-amber-500"
              />
            )}
            {latestAuto && (
              <SummaryCard
                title="Total Auto Sales"
                value={formatValue(latestAuto.value, latestAuto.unit)}
                change={latestAuto.yoy_change}
                period={formatPeriod(latestAuto.period)}
                icon={Car}
                colorClass="from-blue-500 to-indigo-600"
              />
            )}
          </div>

          {/* Quick Insights */}
          {insights.length > 0 && (
            <div className="glass-card-dashboard p-6 bg-gradient-to-r from-primary-50/50 to-purple-50/50">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-500 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.slice(0, 3).map((insight, idx) => (
                  <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-primary-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{insight.indicator}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        insight.signal === 'BULLISH' ? 'bg-green-100 text-green-700' :
                        insight.signal === 'BEARISH' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {insight.signal}
                      </span>
                    </div>
                    {insight.sector_impacts[0] && (
                      <p className="text-xs text-gray-600">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sector Impact Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {insights.map((insight, idx) => (
                <InsightCard key={idx} insight={insight} />
              ))}
            </div>
          </div>

          {/* PMI Interpretation Guide */}
          <div className="glass-card-dashboard p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Understanding PMI</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="font-semibold text-gray-900">Above 55</span>
                </div>
                <p className="text-gray-600">Strong expansion. Capital goods and industrials likely to outperform.</p>
              </div>
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-100">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="font-semibold text-gray-900">50-55</span>
                </div>
                <p className="text-gray-600">Moderate expansion. Selective opportunities in cyclicals.</p>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-xl border border-red-100">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <span className="font-semibold text-gray-900">Below 50</span>
                </div>
                <p className="text-gray-600">Contraction. Defensive sectors (FMCG, Pharma) may be safer.</p>
              </div>
            </div>
          </div>

          {/* Correlation Info */}
          <div className="glass-card-dashboard p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-l-4 border-l-blue-500">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-700">
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
