'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { Warehouse, Percent, ShieldCheck, AlertTriangle, Layers } from 'lucide-react';
import DottedMarkerProgressBar from '@/components/ui/DottedMarkerProgressBar';

export default function InventoryCapacityWidget() {
  const { data: capacity, isLoading } = useQuery({
    queryKey: ['inventoryCapacity'],
    queryFn: dashboardService.getInventoryCapacity,
  });

  if (isLoading) {
    return (
      <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl animate-pulse h-48" />
    );
  }

  if (!capacity) return null;

  const getStatusColor = (pct: number) => {
    if (pct >= 90.0) return 'text-[#FF5B5B] bg-[#FF5B5B]/10 border-[#FF5B5B]/20';
    if (pct >= 60.0) return 'text-[#C6FF00] bg-[#C6FF00]/10 border-[#C6FF00]/20';
    return 'text-[#FFD84D] bg-[#FFD84D]/10 border-[#FFD84D]/20';
  };

  const getBarColor = (pct: number) => {
    if (pct >= 90.0) return 'bg-[#FF5B5B]';
    if (pct >= 60.0) return 'bg-[#C6FF00]';
    return 'bg-[#FFD84D]';
  };

  return (
    <div className="card-inspo p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded-2xl text-[#C6FF00]">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Total Inventory Capacity Utilization
            </h3>
            <span className="text-[10px] text-[#8E8E8E] font-mono">Store & Warehouse Aggregated</span>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(capacity.utilization_pct)}`}>
          {capacity.status}
        </span>
      </div>

      {/* Occupied Capacity Details Header */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-[#8E8E8E]">Occupied Capacity:</span>
        <span className="text-white font-bold font-mono">
          {capacity.total_occupied_units.toLocaleString()} / {capacity.total_capacity_units.toLocaleString()} units ({capacity.utilization_pct.toFixed(0)}%)
        </span>
      </div>

      {/* Progress Bar */}
      <DottedMarkerProgressBar
        valuePct={capacity.utilization_pct}
        barColor={getBarColor(capacity.utilization_pct)}
        heightClass="h-5"
      />

      {/* Zone Breakdown */}
      {capacity.zone_breakdown && capacity.zone_breakdown.length > 0 && (
        <div className="pt-3 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
          {capacity.zone_breakdown.slice(0, 3).map((z, idx) => (
            <div key={idx} className="bg-[#101010] p-2.5 rounded-2xl border border-white/5">
              <span className="text-[#8E8E8E] block font-medium truncate">{z.zone_name}</span>
              <span className="text-white font-bold font-mono">{z.occupied} / {z.capacity} ({z.utilization_pct}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
