'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface RadarAxis {
  label: string;
  value: number; // 0-1 normalized
}

interface SignalRadarProps {
  axes: RadarAxis[];
  size?: number;
  color?: string;
  label?: string;
}

const DEFAULT_AXES: RadarAxis[] = [
  { label: 'Volume', value: 0.82 },
  { label: 'Volatility', value: 0.65 },
  { label: 'Price', value: 0.45 },
  { label: 'Momentum', value: 0.73 },
  { label: 'Liquidity', value: 0.58 },
];

export function SignalRadar({ axes = DEFAULT_AXES, size = 200, color = '#06b6d4', label }: SignalRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = (size - 60) / 2;
  const levels = 4;
  const angleStep = (Math.PI * 2) / axes.length;

  // Grid rings
  const rings = useMemo(
    () =>
      Array.from({ length: levels }, (_, i) => {
        const r = ((i + 1) / levels) * maxRadius;
        const points = axes
          .map((_, j) => {
            const angle = j * angleStep - Math.PI / 2;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
          })
          .join(' ');
        return { r, points };
      }),
    [axes, cx, cy, maxRadius, angleStep, levels]
  );

  // Axis lines
  const axisLines = useMemo(
    () =>
      axes.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return {
          x: cx + maxRadius * Math.cos(angle),
          y: cy + maxRadius * Math.sin(angle),
        };
      }),
    [axes, cx, cy, maxRadius, angleStep]
  );

  // Data polygon
  const dataPoints = useMemo(
    () =>
      axes.map((axis, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = axis.value * maxRadius;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      }),
    [axes, cx, cy, maxRadius, angleStep]
  );

  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Labels
  const labels = useMemo(
    () =>
      axes.map((axis, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const labelR = maxRadius + 20;
        return {
          label: axis.label,
          value: axis.value,
          x: cx + labelR * Math.cos(angle),
          y: cy + labelR * Math.sin(angle),
        };
      }),
    [axes, cx, cy, maxRadius, angleStep]
  );

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-xs font-semibold text-[var(--text-secondary)] mb-2">{label}</span>
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((ring, i) => (
          <polygon
            key={`ring-${i}`}
            points={ring.points}
            fill="none"
            stroke="var(--border-default)"
            strokeWidth={0.5}
            opacity={0.6}
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((end, i) => (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="var(--border-default)"
            strokeWidth={0.5}
            opacity={0.4}
          />
        ))}

        {/* Data area */}
        <motion.polygon
          points={dataPath}
          fill={color}
          fillOpacity={0.1}
          stroke={color}
          strokeWidth={1.5}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <motion.circle
            key={`point-${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={color}
            stroke="var(--bg-card)"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
          />
        ))}

        {/* Labels */}
        {labels.map((l, i) => (
          <g key={`label-${i}`}>
            <text
              x={l.x}
              y={l.y - 5}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--text-secondary)"
              fontSize={9}
              fontWeight={500}
            >
              {l.label}
            </text>
            <text
              x={l.x}
              y={l.y + 7}
              textAnchor="middle"
              dominantBaseline="central"
              fill={color}
              fontSize={9}
              fontWeight={700}
              fontFamily="var(--font-mono)"
            >
              {(l.value * 100).toFixed(0)}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
