'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { recommendationService } from '@/services/recommendationService';
import { Sparkles, ShoppingCart, Tag, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function RecommendationsPage() {
  const { data: recs, isLoading } = useQuery({
    queryKey: ['recommendationsOverview'],
    queryFn: recommendationService.getOverview,
  });

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading Backend Recommendation Engine...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151C28] p-6 rounded-2xl border border-[#222D3F]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-400" />
            Inventory Recommendations & Reorder Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Calculated reorder quantities, safety stock margins, supplier lead times, and clearance strategies.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="text-xs font-semibold uppercase text-slate-400">Recommended Reorder Units</div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {recs ? recs.total_recommended_reorder_units : 0} units
          </div>
        </div>
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="text-xs font-semibold uppercase text-slate-400">Estimated Purchase Cost</div>
          <div className="text-2xl font-bold text-white mt-2">
            ${recs ? recs.total_estimated_reorder_cost.toLocaleString() : '0'}
          </div>
        </div>
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="text-xs font-semibold uppercase text-slate-400">High Priority Reorders</div>
          <div className="text-2xl font-bold text-amber-400 mt-2">
            {recs ? recs.high_priority_reorders_count : 0}
          </div>
        </div>
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="text-xs font-semibold uppercase text-slate-400">Clearance Action Items</div>
          <div className="text-2xl font-bold text-violet-400 mt-2">
            {recs ? recs.clearance_items_count : 0}
          </div>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-indigo-400" />
          Actionable Procurement & Clearance Recommendations
        </h2>

        {recs?.recommendations && recs.recommendations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0E1420] text-xs uppercase text-slate-400 border-b border-[#222D3F]">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">SKU</th>
                  <th className="px-4 py-3.5 font-semibold">Product Name</th>
                  <th className="px-4 py-3.5 font-semibold">Current Stock</th>
                  <th className="px-4 py-3.5 font-semibold">Reorder Qty</th>
                  <th className="px-4 py-3.5 font-semibold">Safety Stock</th>
                  <th className="px-4 py-3.5 font-semibold">Action Type</th>
                  <th className="px-4 py-3.5 font-semibold">Action Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222D3F]">
                {recs.recommendations.map((r) => (
                  <tr key={r.product_id} className="hover:bg-[#1E2738]/50">
                    <td className="px-4 py-3.5 font-mono text-xs text-indigo-400">{r.sku}</td>
                    <td className="px-4 py-3.5 font-medium text-white">{r.product_name}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-200">{r.current_stock}</td>
                    <td className="px-4 py-3.5 font-bold text-emerald-400">
                      {r.recommended_order_quantity > 0 ? `+${r.recommended_order_quantity}` : '0'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">{r.safety_stock}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          r.action_type.includes('Reorder')
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : r.action_type.includes('Clearance')
                            ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {r.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-300">{r.action_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-[#0E1420] rounded-xl border border-[#222D3F]">
            No Data Available
          </div>
        )}
      </div>
    </div>
  );
}
