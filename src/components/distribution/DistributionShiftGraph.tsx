import React, { useState } from 'react';
import { DistributionShiftResult } from '../../services/types';

interface DistributionShiftGraphProps {
  shiftReport: DistributionShiftResult;
}

export const DistributionShiftGraph: React.FC<DistributionShiftGraphProps> = ({ shiftReport }) => {
  const [activeTab, setActiveTab] = useState<'density' | 'breakdown'>('density');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const density = shiftReport.densityBins || {
    current: [4, 10, 26, 38, 16, 4, 2, 0, 0, 0],
    reference: [2, 6, 14, 45, 24, 7, 2, 0, 0, 0],
    labels: ['0%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%']
  };

  const breakdowns = shiftReport.featureBreakdown || [
    {
      name: 'Illumination / Lux Variance',
      baseline: '850 lx',
      observed: shiftReport.ambientLux || '469 lx',
      shift_pct: Math.min(99, Math.round(shiftReport.mmd * 100)),
      severity: shiftReport.mmd > 0.25 ? 'CRITICAL' : shiftReport.mmd > 0.12 ? 'MODERATE' : 'NOMINAL'
    },
    {
      name: 'Spatial Edge Sharpness (Laplacian)',
      baseline: '0.412',
      observed: '0.285',
      shift_pct: Math.min(85, Math.round(shiftReport.wasserstein * 260)),
      severity: shiftReport.wasserstein > 0.15 ? 'MODERATE' : 'NOMINAL'
    },
    {
      name: 'Dynamic Range / Contrast',
      baseline: '0.58',
      observed: '0.44',
      shift_pct: 24.1,
      severity: 'MODERATE'
    },
    {
      name: 'Spectral Balance (R/B Ratio)',
      baseline: '1.05',
      observed: '1.18',
      shift_pct: 12.4,
      severity: 'NOMINAL'
    }
  ];

  // SVG Chart geometry
  const width = 720;
  const height = 220;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 35;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const maxVal = Math.max(
    ...density.current,
    ...density.reference,
    30
  );

  const getX = (i: number) => padLeft + (i / (density.labels.length - 1)) * plotWidth;
  const getY = (val: number) => padTop + plotHeight - (val / maxVal) * plotHeight;

  // Build SVG path for smooth curves
  const makeSmoothPath = (values: number[]) => {
    const points = values.map((val, i) => ({ x: getX(i), y: getY(val) }));
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const refCurve = makeSmoothPath(density.reference);
  const currCurve = makeSmoothPath(density.current);

  const refArea = `${refCurve} L ${getX(density.reference.length - 1)} ${padTop + plotHeight} L ${getX(0)} ${padTop + plotHeight} Z`;
  const currArea = `${currCurve} L ${getX(density.current.length - 1)} ${padTop + plotHeight} L ${getX(0)} ${padTop + plotHeight} Z`;

  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container-high shadow-xs flex flex-col gap-3">
      {/* Graph Header with Tabs and Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-surface-container-high/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-on-surface">Feature Distribution Shift Curve</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              RBF-Kernel MMD
            </span>
          </div>
          <span className="text-xs text-secondary">
            Continuous probability density function comparing baseline vs. incoming stream
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-surface-container-high text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('density')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTab === 'density'
                ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Probability Density (KDE)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTab === 'breakdown'
                ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Dimension Matrix
          </button>
        </div>
      </div>

      {activeTab === 'density' ? (
        <div className="flex flex-col gap-2">
          {/* Legend and Divergence Status */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-5 rounded-sm bg-emerald-500/30 border border-emerald-600 inline-block"></span>
                <span className="text-on-surface text-[11px]">Reference Baseline Distribution</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-5 rounded-sm bg-amber-500/30 border border-amber-600 inline-block"></span>
                <span className="text-on-surface text-[11px]">Current Observed Distribution</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-secondary">Optimal Transport Δ:</span>
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                W₁ = {shiftReport.wasserstein}
              </span>
            </div>
          </div>

          {/* SVG Canvas Chart */}
          <div className="relative w-full overflow-hidden bg-surface-container-low/20 rounded-lg border border-surface-container-high/40 p-1">
            <svg
              className="w-full h-auto max-h-[240px]"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="currGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.04" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                const y = padTop + plotHeight * (1 - frac);
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.08"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[9px] fill-slate-400 font-mono"
                    >
                      {Math.round(frac * maxVal)}%
                    </text>
                  </g>
                );
              })}

              {/* MMD Threshold Horizontal Marker */}
              {(() => {
                const threshFrac = Math.min(1.0, (shiftReport.mmdThreshold * 2.5));
                const threshY = padTop + plotHeight * (1 - threshFrac);
                return (
                  <g>
                    <line
                      x1={padLeft}
                      y1={threshY}
                      x2={width - padRight}
                      y2={threshY}
                      stroke="#e11d48"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      strokeOpacity="0.6"
                    />
                    <text
                      x={width - padRight - 4}
                      y={threshY - 4}
                      textAnchor="end"
                      className="text-[9px] fill-rose-600 font-mono font-medium"
                    >
                      MMD Safety Limit ({shiftReport.mmdThreshold})
                    </text>
                  </g>
                );
              })()}

              {/* Baseline Reference Area & Line */}
              <path d={refArea} fill="url(#refGrad)" />
              <path d={refCurve} fill="none" stroke="#10b981" strokeWidth="2.5" />

              {/* Current Observed Area & Line */}
              <path d={currArea} fill="url(#currGrad)" />
              <path d={currCurve} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

              {/* Data points & Interactive Hover Hitboxes */}
              {density.labels.map((lbl, idx) => {
                const x = getX(idx);
                const yRef = getY(density.reference[idx]);
                const yCurr = getY(density.current[idx]);
                const isHovered = hoveredIndex === idx;

                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer"
                  >
                    {/* Hover vertical crosshair */}
                    {isHovered && (
                      <line
                        x1={x}
                        y1={padTop}
                        x2={x}
                        y2={padTop + plotHeight}
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Reference Point dot */}
                    <circle
                      cx={x}
                      cy={yRef}
                      r={isHovered ? 4.5 : 3}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />

                    {/* Current Point dot */}
                    <circle
                      cx={x}
                      cy={yCurr}
                      r={isHovered ? 4.5 : 3}
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />

                    {/* X-axis Label */}
                    <text
                      x={x}
                      y={height - padBottom + 16}
                      textAnchor="middle"
                      className={`text-[9px] font-mono ${isHovered ? 'fill-primary font-bold' : 'fill-slate-500'}`}
                    >
                      {lbl}
                    </text>

                    {/* Transparent Hitbox for easy hover */}
                    <rect
                      x={x - 18}
                      y={padTop}
                      width={36}
                      height={plotHeight}
                      fill="transparent"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredIndex !== null && (
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-mono px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-3 z-10 pointer-events-none"
              >
                <span>Bin: {density.labels[hoveredIndex]}</span>
                <span className="text-emerald-400">Baseline: {density.reference[hoveredIndex]}%</span>
                <span className="text-amber-400">Observed: {density.current[hoveredIndex]}%</span>
                <span className="text-rose-300 font-semibold">
                  Δ: {Math.abs(density.current[hoveredIndex] - density.reference[hoveredIndex]).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Breakdown Matrix Tab */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {breakdowns.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-surface-container-high bg-surface-container-low/30 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-on-surface">{item.name}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                    item.severity === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : item.severity === 'MODERATE'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {item.severity}
                </span>
              </div>

              {/* Comparison Numbers */}
              <div className="flex items-center justify-between text-[11px] font-mono text-secondary">
                <span>Baseline: <strong className="text-on-surface">{item.baseline}</strong></span>
                <span>Observed: <strong className="text-on-surface">{item.observed}</strong></span>
              </div>

              {/* Progress bar showing shift intensity */}
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.severity === 'CRITICAL'
                      ? 'bg-rose-500'
                      : item.severity === 'MODERATE'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, item.shift_pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
