'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface MacroDataPoint {
  period: string;
  value: number;
  yoy_change?: number;
}

interface MacroTrendChartProps {
  data: MacroDataPoint[];
  title: string;
  unit: string;
  chartType?: 'line' | 'bar';
  showYoY?: boolean;
  color?: string;
  referenceLine?: { value: number; label: string };
  height?: number;
}

export function MacroTrendChart({
  data,
  title,
  unit,
  chartType = 'line',
  showYoY = false,
  color = '#9333ea',
  referenceLine,
  height = 250,
}: MacroTrendChartProps) {
  // Sort data by period
  const sortedData = [...data].sort((a, b) => a.period.localeCompare(b.period));

  // Format value for display
  const formatValue = (value: number) => {
    if (unit === 'Crore' || unit === 'Rs Crore') {
      if (value >= 100000) return `${(value / 100000).toFixed(1)}L Cr`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K Cr`;
      return `${value.toFixed(0)} Cr`;
    }
    if (unit === 'Index' || unit === 'index') {
      return value.toFixed(1);
    }
    if (unit === 'Units' || unit === 'Lakh Units') {
      if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
      return value.toFixed(0);
    }
    if (unit === 'BU' || unit === 'MU') {
      return `${value.toFixed(0)} ${unit}`;
    }
    if (unit === 'MT' || unit === 'Million Tonnes') {
      return `${value.toFixed(1)} MT`;
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-elevated)] p-3 border border-[var(--border-default)] rounded-lg">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Value: <span className="font-bold font-mono text-primary-400">{formatValue(payload[0].value)}</span>
          </p>
          {showYoY && payload[0].payload.yoy_change !== undefined && (
            <p className={`text-sm font-medium font-mono ${payload[0].payload.yoy_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              YoY: {payload[0].payload.yoy_change >= 0 ? '+' : ''}{payload[0].payload.yoy_change.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'bar' ? (
          <BarChart data={sortedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id={`barGradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" strokeOpacity={0.5} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickFormatter={formatValue}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {referenceLine && (
              <ReferenceLine
                y={referenceLine.value}
                stroke="#EF4444"
                strokeDasharray="5 5"
                label={{ value: referenceLine.label, position: 'right', fontSize: 10, fill: '#EF4444' }}
              />
            )}
            <Bar
              dataKey="value"
              fill={`url(#barGradient-${color.replace('#', '')})`}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        ) : (
          <LineChart data={sortedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id={`lineGradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" strokeOpacity={0.5} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickFormatter={formatValue}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {referenceLine && (
              <ReferenceLine
                y={referenceLine.value}
                stroke="#EF4444"
                strokeDasharray="5 5"
                label={{ value: referenceLine.label, position: 'right', fontSize: 10, fill: '#EF4444' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, strokeWidth: 2, r: 4, stroke: 'var(--bg-elevated)' }}
              activeDot={{ r: 6, fill: color, stroke: 'var(--bg-elevated)', strokeWidth: 2 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// Simple sparkline version
export function MacroSparkline({
  data,
  color = '#9333ea',
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <defs>
          <linearGradient id="sparklineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9333ea" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#c084fc" stopOpacity={1} />
          </linearGradient>
        </defs>
        <Line
          type="monotone"
          dataKey="value"
          stroke="url(#sparklineGradient)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
