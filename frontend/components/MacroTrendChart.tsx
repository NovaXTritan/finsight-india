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
  color = '#4F46E5',
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
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-700">
            Value: <span className="font-semibold">{formatValue(payload[0].value)}</span>
          </p>
          {showYoY && payload[0].payload.yoy_change !== undefined && (
            <p className={`text-sm ${payload[0].payload.yoy_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              YoY: {payload[0].payload.yoy_change >= 0 ? '+' : ''}{payload[0].payload.yoy_change.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'bar' ? (
          <BarChart data={sortedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
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
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={sortedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
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
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: color }}
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
  color = '#4F46E5',
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
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
