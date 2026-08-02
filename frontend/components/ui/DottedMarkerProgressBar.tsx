'use client';

import React from 'react';

interface DottedMarkerProgressBarProps {
  valuePct: number; // 0 to 100
  barColor?: string; // Tailwind class, e.g. 'bg-rose-500', 'bg-emerald-500'
  heightClass?: string;
  showDottedMarker?: boolean;
}

export default function DottedMarkerProgressBar({
  valuePct,
  barColor = 'bg-rose-500',
  heightClass = 'h-5',
  showDottedMarker = true,
}: DottedMarkerProgressBarProps) {
  // Clamp value between 0 and 100
  const clampedPct = Math.max(0, Math.min(100, valuePct));
  // Marker position clamped between 6% and 94% so label text doesn't overflow container edges
  const markerPosPct = Math.max(6, Math.min(94, clampedPct));

  return (
    <div className="space-y-4 pt-2 pb-6">
      {/* Progress Track & Marker Wrapper */}
      <div className="relative w-full">
        {/* Outer Pill Container */}
        <div className={`w-full ${heightClass} bg-[#0E1420] border border-[#263347] rounded-full overflow-hidden p-0.5 shadow-inner relative`}>
          {/* Filled Progress Bar */}
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${clampedPct}%` }}
          />
        </div>

        {/* Vertical Dotted Indicator Line & Percentage Label below */}
        {showDottedMarker && (
          <div
            className="absolute top-0 flex flex-col items-center pointer-events-none transition-all duration-700"
            style={{ left: `${markerPosPct}%` }}
          >
            {/* Dotted Line Extending Down from Progress Bar */}
            <div className="w-[1px] h-9 border-l-2 border-dotted border-slate-400/70 -mt-1" />

            {/* Bold Percentage Text Below Dotted Line */}
            <span className="mt-1 text-sm font-extrabold text-white font-mono tracking-tight bg-[#151C28]/90 px-1.5 py-0.5 rounded border border-[#222D3F]">
              {clampedPct.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
