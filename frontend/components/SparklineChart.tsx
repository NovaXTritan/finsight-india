'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { SparklinePoint } from '@/lib/api';

interface SparklineChartProps {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  color?: 'green' | 'red' | 'auto';
  showDots?: boolean;
}

export function SparklineChart({
  data,
  width = 120,
  height = 40,
  color = 'auto',
  showDots = false,
}: SparklineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-gray-300 text-xs"
      >
        No data
      </div>
    );
  }

  // Determine color based on price movement
  let strokeColor = '#6B7280'; // gray
  if (color === 'auto') {
    const firstPrice = data[0]?.price || 0;
    const lastPrice = data[data.length - 1]?.price || 0;
    strokeColor = lastPrice >= firstPrice ? '#10B981' : '#EF4444';
  } else if (color === 'green') {
    strokeColor = '#10B981';
  } else if (color === 'red') {
    strokeColor = '#EF4444';
  }

  // Calculate min/max for Y-axis with some padding
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || 1;

  return (
    <div style={{ width, height }}>
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
            strokeWidth={1.5}
            dot={showDots ? { fill: strokeColor, r: 2 } : false}
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
  return <SparklineChart data={data} width={80} height={24} color={color} />;
}
