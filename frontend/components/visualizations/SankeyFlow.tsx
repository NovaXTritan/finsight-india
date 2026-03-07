'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { motion, AnimatePresence } from 'framer-motion';

interface FlowNode {
  name: string;
  color?: string;
}

interface FlowLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyFlowProps {
  nodes?: FlowNode[];
  links?: FlowLink[];
  width?: number;
  height?: number;
}

// Default: Signal detection pipeline flow
const DEFAULT_NODES: FlowNode[] = [
  // Sources (col 0)
  { name: 'NSE Feed', color: '#3b82f6' },
  { name: 'BSE Feed', color: '#8b5cf6' },
  { name: 'Yahoo Finance', color: '#06b6d4' },
  { name: 'SEBI Filings', color: '#10b981' },
  // Processing (col 1)
  { name: 'Volume Analysis', color: '#f59e0b' },
  { name: 'Price Analysis', color: '#f97316' },
  { name: 'Volatility Analysis', color: '#ec4899' },
  // Severity (col 2)
  { name: 'Low (Z < 2)', color: '#22d3ee' },
  { name: 'Medium (Z 2-3)', color: '#f59e0b' },
  { name: 'High (Z 3-4)', color: '#f97316' },
  { name: 'Critical (Z > 4)', color: '#ef4444' },
  // Outcomes (col 3)
  { name: 'Ignored', color: '#52525b' },
  { name: 'Monitored', color: '#22d3ee' },
  { name: 'Reviewed', color: '#f59e0b' },
  { name: 'Executed', color: '#10b981' },
];

const DEFAULT_LINKS: FlowLink[] = [
  // Sources → Analysis
  { source: 0, target: 4, value: 45 },
  { source: 0, target: 5, value: 40 },
  { source: 0, target: 6, value: 30 },
  { source: 1, target: 4, value: 20 },
  { source: 1, target: 5, value: 25 },
  { source: 2, target: 4, value: 35 },
  { source: 2, target: 5, value: 30 },
  { source: 2, target: 6, value: 25 },
  { source: 3, target: 6, value: 15 },
  // Analysis → Severity
  { source: 4, target: 7, value: 50 },
  { source: 4, target: 8, value: 30 },
  { source: 4, target: 9, value: 15 },
  { source: 4, target: 10, value: 5 },
  { source: 5, target: 7, value: 40 },
  { source: 5, target: 8, value: 35 },
  { source: 5, target: 9, value: 15 },
  { source: 5, target: 10, value: 5 },
  { source: 6, target: 7, value: 25 },
  { source: 6, target: 8, value: 20 },
  { source: 6, target: 9, value: 15 },
  { source: 6, target: 10, value: 10 },
  // Severity → Outcomes
  { source: 7, target: 11, value: 80 },
  { source: 7, target: 12, value: 30 },
  { source: 7, target: 13, value: 5 },
  { source: 8, target: 11, value: 20 },
  { source: 8, target: 12, value: 40 },
  { source: 8, target: 13, value: 20 },
  { source: 8, target: 14, value: 5 },
  { source: 9, target: 12, value: 10 },
  { source: 9, target: 13, value: 25 },
  { source: 9, target: 14, value: 10 },
  { source: 10, target: 13, value: 8 },
  { source: 10, target: 14, value: 12 },
];

type SNode = SankeyNode<FlowNode, FlowLink>;
type SLink = SankeyLink<FlowNode, FlowLink>;

export function SankeyFlow({
  nodes = DEFAULT_NODES,
  links = DEFAULT_LINKS,
  width = 800,
  height = 400,
}: SankeyFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width, height });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDims({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.width * 0.45, 280),
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const { sankeyNodes, sankeyLinks } = useMemo(() => {
    const margin = { top: 16, right: 16, bottom: 16, left: 16 };
    const innerWidth = dims.width - margin.left - margin.right;
    const innerHeight = dims.height - margin.top - margin.bottom;

    const sankeyGenerator = sankey<FlowNode, FlowLink>()
      .nodeId((d: any) => d.index)
      .nodeWidth(14)
      .nodePadding(12)
      .extent([
        [margin.left, margin.top],
        [margin.left + innerWidth, margin.top + innerHeight],
      ]);

    const graph = sankeyGenerator({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    });

    return {
      sankeyNodes: graph.nodes as SNode[],
      sankeyLinks: graph.links as SLink[],
    };
  }, [nodes, links, dims]);

  const linkPath = sankeyLinkHorizontal();

  const isHighlighted = (node: SNode) => {
    if (!hoveredNode) return true;
    if ((node as any).name === hoveredNode) return true;
    // Check connected links
    return sankeyLinks.some(
      (l) =>
        (((l.source as SNode) as any).name === hoveredNode && ((l.target as SNode) as any).name === (node as any).name) ||
        (((l.target as SNode) as any).name === hoveredNode && ((l.source as SNode) as any).name === (node as any).name)
    );
  };

  const isLinkHighlighted = (link: SLink) => {
    if (!hoveredNode) return true;
    return (
      ((link.source as SNode) as any).name === hoveredNode ||
      ((link.target as SNode) as any).name === hoveredNode
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width={dims.width} height={dims.height} className="select-none">
        <defs>
          {sankeyLinks.map((link, i) => {
            const sourceColor = ((link.source as SNode) as any).color || '#06b6d4';
            const targetColor = ((link.target as SNode) as any).color || '#06b6d4';
            return (
              <linearGradient key={`gradient-${i}`} id={`link-gradient-${i}`} gradientUnits="userSpaceOnUse"
                x1={(link.source as SNode).x1} x2={(link.target as SNode).x0}>
                <stop offset="0%" stopColor={sourceColor} />
                <stop offset="100%" stopColor={targetColor} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Links */}
        {sankeyLinks.map((link, i) => {
          const highlighted = isLinkHighlighted(link);
          return (
            <motion.path
              key={`link-${i}`}
              d={linkPath(link as any) || ''}
              fill="none"
              stroke={`url(#link-gradient-${i})`}
              strokeWidth={Math.max(link.width || 1, 1)}
              strokeOpacity={hoveredLink === i ? 0.5 : highlighted ? 0.2 : 0.05}
              onMouseEnter={() => setHoveredLink(i)}
              onMouseLeave={() => setHoveredLink(null)}
              className="cursor-pointer"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: i * 0.02 }}
            />
          );
        })}

        {/* Nodes */}
        {sankeyNodes.map((node, i) => {
          const nodeData = node as any;
          const highlighted = isHighlighted(node);
          const nodeHeight = (node.y1 || 0) - (node.y0 || 0);

          return (
            <g
              key={`node-${i}`}
              onMouseEnter={() => setHoveredNode(nodeData.name)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              <motion.rect
                x={node.x0}
                y={node.y0}
                width={(node.x1 || 0) - (node.x0 || 0)}
                height={nodeHeight}
                fill={nodeData.color || '#06b6d4'}
                fillOpacity={highlighted ? 0.8 : 0.2}
                rx={2}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.03 }}
                style={{ transformOrigin: `${node.x0}px ${(node.y0 || 0) + nodeHeight / 2}px` }}
              />
              {/* Node label */}
              {nodeHeight > 14 && (
                <text
                  x={(node.x0 || 0) < dims.width / 2 ? (node.x1 || 0) + 6 : (node.x0 || 0) - 6}
                  y={(node.y0 || 0) + nodeHeight / 2}
                  textAnchor={(node.x0 || 0) < dims.width / 2 ? 'start' : 'end'}
                  dominantBaseline="central"
                  fill={highlighted ? 'var(--text-primary)' : 'var(--text-muted)'}
                  fontSize={10}
                  fontWeight={500}
                  opacity={highlighted ? 1 : 0.4}
                  style={{ transition: 'all 0.15s ease' }}
                >
                  {nodeData.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip for link */}
      <AnimatePresence>
        {hoveredLink !== null && sankeyLinks[hoveredLink] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-2 right-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg z-10"
          >
            <div className="text-[10px] text-[var(--text-muted)] mb-1">Flow</div>
            <div className="text-xs text-[var(--text-primary)]">
              <span className="font-medium">{((sankeyLinks[hoveredLink].source as SNode) as any).name}</span>
              <span className="text-[var(--text-muted)]"> → </span>
              <span className="font-medium">{((sankeyLinks[hoveredLink].target as SNode) as any).name}</span>
            </div>
            <div className="text-xs font-mono text-primary-400 mt-0.5">
              {sankeyLinks[hoveredLink].value} signals
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Column headers */}
      <div className="flex justify-between px-4 mt-2">
        {['Data Sources', 'Analysis', 'Severity', 'Decision'].map((header) => (
          <span key={header} className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {header}
          </span>
        ))}
      </div>
    </div>
  );
}
