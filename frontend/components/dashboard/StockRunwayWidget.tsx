'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { Clock, TrendingDown, AlertTriangle, CheckCircle2, Flame, Package } from 'lucide-react';
import DottedMarkerProgressBar from '@/components/ui/DottedMarkerProgressBar';

export default function StockRunwayWidget() {
  const { data: runway, isLoading } = useQuery({
    queryKey: ['stockRunway'],
    queryFn: dashboardService.getStockRunway,
  });

  if (isLoading) {
    return (
      <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl animate-pulse h-48" />
    );
  }

  if (!runway) return null;

  // Calculate runway percentage (e.g. 90 days = 100%, 30 days = 33%)
  const runwayPct = Math.min(100, (runway.overall_days_remaining / 90.0) * 100.0);

  return (
    <div className="card-inspo p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#FFD84D]/10 border border-[#FFD84D]/20 rounded-2xl text-[#FFD84D]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Stock Lasting (Runway Estimate)
            </h3>
            <span className="text-[10px] text-[#8E8E8E] font-mono">Predictive Consumption Analysis</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FFD84D]/10 text-[#FFD84D] border border-[#FFD84D]/20 font-mono">
          <Flame className="w-3.5 h-3.5 text-[#FFD84D]" />
          {runway.overall_days_remaining} Days Runway Left
        </div>
      </div>

      <div className="bg-[#101010] p-4 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
        <span className="text-[#8E8E8E] font-medium flex items-center gap-2">
          <Package className="w-4 h-4 text-[#FFD84D]" />
          Total Occupied Inventory Stock:
        </span>
        <span className="text-sm font-bold text-white font-mono">
          {runway.total_current_stock.toLocaleString()} units
        </span>
      </div>

      {/* Progress Bar */}
      <DottedMarkerProgressBar
        valuePct={runwayPct}
        barColor="bg-[#FFD84D]"
        heightClass="h-5"
      />

      {/* Shortest Runway Alert List */}
      {runway.shortest_runway_items && runway.shortest_runway_items.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[10px] font-bold uppercase text-[#555555]">
            Items Requiring Immediate Restock Attention
          </div>
          {runway.shortest_runway_items.slice(0, 2).map((item) => (
            <div key={item.product_id} className="flex justify-between items-center bg-[#101010] p-3 rounded-2xl border border-white/5 text-xs">
              <span className="font-bold text-white truncate max-w-[180px]">
                {item.product_name} <span className="text-[10px] font-mono text-[#8E8E8E]">({item.sku})</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5B5B]/10 text-[#FF5B5B] border border-[#FF5B5B]/20 font-mono">
                {item.days_remaining} days left ({item.current_stock} in stock)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
