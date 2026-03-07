'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getZScoreColor, getZScoreSeverity } from '@/lib/mock-data';

interface SignalGaugeProps {
  value: number;      // Z-score value (0 to ~8)
  maxValue?: number;  // Max scale value
  label?: string;
  size?: number;
  showLabel?: boolean;
}

export function SignalGauge({ value, maxValue = 8, label = 'Z-Score', size = 160, showLabel = true }: SignalGaugeProps) {
  const severity = getZScoreSeverity(value);
  const color = getZScoreColor(value);

  const { path, endAngle, cx, cy, radius, strokeWidth } = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2 + 10;
    const radius = (size - 40) / 2;
    const strokeWidth = 10;
    const startAngle = -210;
    const totalAngle = 240; // 240° arc

    const progress = Math.min(value / maxValue, 1);
    const endAngle = startAngle + totalAngle * progress;

    // Background arc
    const bgStart = (startAngle * Math.PI) / 180;
    const bgEnd = ((startAngle + totalAngle) * Math.PI) / 180;

    const toX = (angle: number) => cx + radius * Math.cos(angle);
    const toY = (angle: number) => cy + radius * Math.sin(angle);

    const path = `M ${toX(bgStart)} ${toY(bgStart)} A ${radius} ${radius} 0 1 1 ${toX(bgEnd)} ${toY(bgEnd)}`;

    return { path, endAngle, cx, cy, radius, strokeWidth };
  }, [size, value, maxValue]);

  // Compute the progress arc path
  const progressPath = useMemo(() => {
    const startAngle = (-210 * Math.PI) / 180;
    const totalAngle = (240 * Math.PI) / 180;
    const progress = Math.min(value / maxValue, 1);
    const end = startAngle + totalAngle * progress;

    const toX = (angle: number) => cx + radius * Math.cos(angle);
    const toY = (angle: number) => cy + radius * Math.sin(angle);

    const largeArc = progress > 0.5 ? 1 : 0;

    if (progress <= 0) return '';
    return `M ${toX(startAngle)} ${toY(startAngle)} A ${radius} ${radius} 0 ${largeArc} 1 ${toX(end)} ${toY(end)}`;
  }, [cx, cy, radius, value, maxValue]);

  // Tick marks
  const ticks = useMemo(() => {
    const startAngle = -210;
    const totalAngle = 240;
    const tickValues = [0, 1, 2, 3, 4, 6, 8];

    return tickValues.map((tv) => {
      const angle = ((startAngle + (tv / maxValue) * totalAngle) * Math.PI) / 180;
      const innerR = radius - 16;
      const outerR = radius - 8;
      const labelR = radius - 24;

      return {
        value: tv,
        x1: cx + innerR * Math.cos(angle),
        y1: cy + innerR * Math.sin(angle),
        x2: cx + outerR * Math.cos(angle),
        y2: cy + outerR * Math.sin(angle),
        labelX: cx + labelR * Math.cos(angle),
        labelY: cy + labelR * Math.sin(angle),
      };
    });
  }, [cx, cy, radius, maxValue]);

  // Severity zones (background segments)
  const zones = useMemo(() => {
    const startAngle = -210;
    const totalAngle = 240;
    const segments = [
      { start: 0, end: 1, color: '#1a1d24', label: 'Normal' },
      { start: 1, end: 2, color: '#22d3ee', label: 'Low' },
      { start: 2, end: 3, color: '#f59e0b', label: 'Med' },
      { start: 3, end: 4, color: '#f97316', label: 'High' },
      { start: 4, end: 8, color: '#ef4444', label: 'Critical' },
    ];

    return segments.map((seg) => {
      const sAngle = ((startAngle + (seg.start / maxValue) * totalAngle) * Math.PI) / 180;
      const eAngle = ((startAngle + (seg.end / maxValue) * totalAngle) * Math.PI) / 180;
      const toX = (angle: number) => cx + (radius + 2) * Math.cos(angle);
      const toY = (angle: number) => cy + (radius + 2) * Math.sin(angle);
      const progress = (seg.end - seg.start) / maxValue;
      const largeArc = progress > 0.5 ? 1 : 0;

      return {
        ...seg,
        path: `M ${toX(sAngle)} ${toY(sAngle)} A ${radius + 2} ${radius + 2} 0 ${largeArc} 1 ${toX(eAngle)} ${toY(eAngle)}`,
      };
    });
  }, [cx, cy, radius, maxValue]);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Zone arcs (outer ring) */}
        {zones.map((zone) => (
          <path
            key={zone.label}
            d={zone.path}
            fill="none"
            stroke={zone.color}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.15}
          />
        ))}

        {/* Background arc */}
        <path
          d={path}
          fill="none"
          stroke="var(--bg-muted)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        {progressPath && (
          <motion.path
            d={progressPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            filter={severity !== 'normal' ? `drop-shadow(0 0 6px ${color})` : undefined}
          />
        )}

        {/* Tick marks */}
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="var(--text-muted)"
              strokeWidth={1}
              opacity={0.4}
            />
            <text
              x={tick.labelX}
              y={tick.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--text-muted)"
              fontSize={8}
              fontFamily="var(--font-mono)"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {/* Center value */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={size > 140 ? 28 : 22}
          fontWeight={800}
          fontFamily="var(--font-mono)"
        >
          {value.toFixed(2)}
        </text>
        {showLabel && (
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--text-muted)"
            fontSize={10}
          >
            {label}
          </text>
        )}

        {/* Severity label */}
        <text
          x={cx}
          y={cy + 28}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={9}
          fontWeight={700}
          fontFamily="var(--font-display)"
          style={{ textTransform: 'uppercase' }}
        >
          {severity === 'normal' ? '' : severity.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
