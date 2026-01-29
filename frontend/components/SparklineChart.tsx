'use client';

import { LineChart, Line, ResponsiveContainer, YAxis, Area, AreaChart } from 'recharts';
import { SparklinePoint } from '@/lib/api';

interface SparklineChartProps {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  color?: 'green' | 'red' | 'auto' | 'purple';
  showDots?: boolean;
  showGradient?: boolean;
}

export function SparklineChart({
  data,
  width = 120,
  height = 40,
  color = 'auto',
  showDots = false,
  showGradient = true,
}: SparklineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-gray-300 text-xs bg-gray-50 rounded-lg"
      >
        No data
      </div>
    );
  }

  // Determine color based on price movement
  let strokeColor = '#9333ea'; // purple default
  let gradientId = 'gradientPurple';

  if (color === 'auto') {
    const firstPrice = data[0]?.price || 0;
    const lastPrice = data[data.length - 1]?.price || 0;
    if (lastPrice >= firstPrice) {
      strokeColor = '#10B981';
      gradientId = 'gradientGreen';
    } else {
      strokeColor = '#EF4444';
      gradientId = 'gradientRed';
    }
  } else if (color === 'green') {
    strokeColor = '#10B981';
    gradientId = 'gradientGreen';
  } else if (color === 'red') {
    strokeColor = '#EF4444';
    gradientId = 'gradientRed';
  } else if (color === 'purple') {
    strokeColor = '#9333ea';
    gradientId = 'gradientPurple';
  }

  // Calculate min/max for Y-axis with some padding
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || 1;

  if (showGradient) {
    return (
      <div style={{ width, height }} className="rounded-lg overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientPurple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              hide
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={showDots ? { fill: strokeColor, r: 2, strokeWidth: 0 } : false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width, height }} className="rounded-lg overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            hide
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={2}
            dot={showDots ? { fill: strokeColor, r: 2, strokeWidth: 0 } : false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Mini version for compact display
export function MiniSparkline({
  data,
  positive,
}: {
  data: SparklinePoint[];
  positive?: boolean;
}) {
  const color = positive === undefined ? 'auto' : positive ? 'green' : 'red';
  return <SparklineChart data={data} width={80} height={24} color={color} showGradient={true} />;
}
