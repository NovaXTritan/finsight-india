'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { getStocksBySector, getZScoreColor, getZScoreSeverity, SECTOR_COLORS, type StockData, type SectorGroup } from '@/lib/mock-data';

interface TreemapNode {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  data: { name: string; stock?: StockData };
  depth: number;
  value?: number;
}

interface AnomalyHeatmapProps {
  data?: SectorGroup[];
  width?: number;
  height?: number;
  onStockClick?: (symbol: string) => void;
}

export function AnomalyHeatmap({ data, width = 800, height = 500, onStockClick }: AnomalyHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [hoveredStock, setHoveredStock] = useState<StockData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const sectors = data || getStocksBySector();

  // Responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.width * 0.55, 300),
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Compute treemap layout
  const nodes = useMemo(() => {
    const hierarchy = d3.hierarchy<{ name: string; children?: unknown[]; stock?: StockData; weight?: number }>({
      name: 'root',
      children: sectors.map((sector) => ({
        name: sector.name,
        children: sector.children.map((stock) => ({
          name: stock.symbol,
          weight: stock.weight,
          stock,
        })),
      })),
    })
      .sum((d: any) => d.weight || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .padding(2)
      .paddingTop(18)
      .paddingInner(1)
      .round(true);

    treemap(hierarchy);
    return hierarchy.descendants() as unknown as TreemapNode[];
  }, [sectors, dimensions]);

  const handleMouseMove = (e: React.MouseEvent, stock: StockData) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setHoveredStock(stock);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="select-none"
      >
        {nodes.map((node, i) => {
          const w = node.x1 - node.x0;
          const h = node.y1 - node.y0;

          // Sector labels (depth 1)
          if (node.depth === 1) {
            return (
              <g key={`sector-${i}`}>
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={w}
                  height={h}
                  fill="var(--bg-card)"
                  stroke="var(--border-default)"
                  strokeWidth={1}
                  rx={4}
                />
                <text
                  x={node.x0 + 6}
                  y={node.y0 + 13}
                  fill="var(--text-muted)"
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="var(--font-display)"
                >
                  {node.data.name}
                </text>
              </g>
            );
          }

          // Stock cells (depth 2)
          if (node.depth === 2 && node.data.stock) {
            const stock = node.data.stock;
            const severity = getZScoreSeverity(stock.zScore);
            const color = getZScoreColor(stock.zScore);
            const isAnomaly = stock.zScore >= 2;
            const isHovered = hoveredStock?.symbol === stock.symbol;
            const showLabel = w > 40 && h > 30;
            const showChange = w > 55 && h > 42;

            return (
              <g
                key={`stock-${stock.symbol}`}
                onMouseMove={(e) => handleMouseMove(e, stock)}
                onMouseLeave={() => setHoveredStock(null)}
                onClick={() => onStockClick?.(stock.symbol)}
                className={onStockClick ? 'cursor-pointer' : ''}
              >
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={w}
                  height={h}
                  fill={severity === 'normal' ? 'var(--bg-muted)' : color}
                  fillOpacity={severity === 'normal' ? 1 : (0.12 + Math.min(stock.zScore / 8, 0.3))}
                  stroke={isHovered ? color : 'var(--border-default)'}
                  strokeWidth={isHovered ? 1.5 : 0.5}
                  strokeOpacity={isHovered ? 1 : 0.5}
                  rx={2}
                  style={{ transition: 'all 0.15s ease' }}
                />
                {/* Pulse overlay for anomalies */}
                {isAnomaly && (
                  <rect
                    x={node.x0}
                    y={node.y0}
                    width={w}
                    height={h}
                    fill={color}
                    fillOpacity={0}
                    rx={2}
                  >
                    <animate
                      attributeName="fillOpacity"
                      values="0;0.08;0"
                      dur={severity === 'critical' ? '1.5s' : '2.5s'}
                      repeatCount="indefinite"
                    />
                  </rect>
                )}
                {showLabel && (
                  <text
                    x={node.x0 + w / 2}
                    y={node.y0 + h / 2 - (showChange ? 4 : 0)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isAnomaly ? color : 'var(--text-secondary)'}
                    fontSize={w > 70 ? 11 : 9}
                    fontWeight={isAnomaly ? 700 : 500}
                    fontFamily="var(--font-mono)"
                  >
                    {stock.symbol}
                  </text>
                )}
                {showChange && (
                  <text
                    x={node.x0 + w / 2}
                    y={node.y0 + h / 2 + 12}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={stock.change >= 0 ? '#34d399' : '#f87171'}
                    fontSize={9}
                    fontFamily="var(--font-mono)"
                  >
                    {stock.change >= 0 ? '+' : ''}{stock.change}%
                  </text>
                )}
              </g>
            );
          }

          return null;
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredStock && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute z-50 pointer-events-none"
            style={{
              left: Math.min(tooltipPos.x + 12, dimensions.width - 200),
              top: Math.max(tooltipPos.y - 80, 0),
            }}
          >
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg min-w-[160px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold font-mono text-[var(--text-primary)]">{hoveredStock.symbol}</span>
                <span className={`text-[10px] font-mono font-bold ${hoveredStock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {hoveredStock.change >= 0 ? '+' : ''}{hoveredStock.change}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--text-muted)]">Z-Score</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: getZScoreColor(hoveredStock.zScore) }}
                  >
                    {hoveredStock.zScore.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--text-muted)]">Rel. Volume</span>
                  <span className="text-[var(--text-secondary)] font-mono">{hoveredStock.volume.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--text-muted)]">Sector</span>
                  <span className="text-[var(--text-secondary)]">{hoveredStock.sector}</span>
                </div>
              </div>
              {hoveredStock.zScore >= 2 && (
                <div className="mt-1.5 pt-1.5 border-t border-[var(--border-default)]">
                  <span className={`text-[10px] font-semibold ${
                    getZScoreSeverity(hoveredStock.zScore) === 'critical' ? 'text-red-400' :
                    getZScoreSeverity(hoveredStock.zScore) === 'high' ? 'text-orange-400' : 'text-amber-400'
                  }`}>
                    {getZScoreSeverity(hoveredStock.zScore).toUpperCase()} ANOMALY
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center space-x-3">
          {[
            { label: 'Normal', color: 'var(--bg-muted)', z: '< 1' },
            { label: 'Low', color: '#22d3ee', z: '1-2' },
            { label: 'Medium', color: '#f59e0b', z: '2-3' },
            { label: 'High', color: '#f97316', z: '3-4' },
            { label: 'Critical', color: '#ef4444', z: '> 4' },
          ].map((item) => (
            <div key={item.label} className="flex items-center space-x-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color, opacity: item.color === 'var(--bg-muted)' ? 1 : 0.4 }}
              />
              <span className="text-[10px] text-[var(--text-muted)]">{item.label}</span>
            </div>
          ))}
        </div>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">Z-Score Intensity</span>
      </div>
    </div>
  );
}
