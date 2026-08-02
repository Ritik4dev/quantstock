'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { recommendationService } from '@/services/recommendationService';
import { Sparkles, ShoppingCart, Tag, AlertTriangle, ShieldCheck } from 'lucide-react';
import ExplainWithAIButton from '@/components/ai/ExplainWithAIButton';

export default function RecommendationsPage() {
  const { data: recs, isLoading } = useQuery({
    queryKey: ['recommendationsOverview'],
    queryFn: recommendationService.getOverview,
  });

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading Backend Recommendation Engine...</div>;
  }

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#C6FF00]" />
            Inventory Recommendations & Reorder Engine
          </h1>
          <p className="text-xs text-[#8E8E8E] mt-1">
            Calculated reorder quantities, safety stock margins, supplier lead times, and clearance strategies.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-inspo p-6 flex flex-col justify-between h-[130px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E8E]">Recommended Reorder Units</div>
          <div className="text-3xl font-extrabold text-[#C6FF00] tracking-tight font-mono">
            {recs ? recs.total_recommended_reorder_units : 0} units
          </div>
        </div>
        <div className="card-inspo p-6 flex flex-col justify-between h-[130px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E8E]">Estimated Purchase Cost</div>
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
            ${recs ? recs.total_estimated_reorder_cost.toLocaleString() : '0'}
          </div>
        </div>
        <div className="card-inspo p-6 flex flex-col justify-between h-[130px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E8E]">High Priority Reorders</div>
          <div className="text-3xl font-extrabold text-[#FFD84D] tracking-tight font-mono">
            {recs ? recs.high_priority_reorders_count : 0}
          </div>
        </div>
        <div className="card-inspo p-6 flex flex-col justify-between h-[130px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E8E]">Clearance Action Items</div>
          <div className="text-3xl font-extrabold text-[#B7FF38] tracking-tight font-mono">
            {recs ? recs.clearance_items_count : 0}
          </div>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="card-inspo p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
          <ShoppingCart className="w-4 h-4 text-[#C6FF00]" />
          Actionable Procurement & Clearance Recommendations
        </h2>

        {recs?.recommendations && recs.recommendations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#8E8E8E]">
              <thead className="text-[11px] font-semibold text-[#555555] uppercase border-b border-white/5">
                <tr>
                  <th className="pb-3 px-3 font-semibold">SKU</th>
                  <th className="pb-3 px-3 font-semibold">Product Name</th>
                  <th className="pb-3 px-3 font-semibold">Current Stock</th>
                  <th className="pb-3 px-3 font-semibold">Reorder Qty</th>
                  <th className="pb-3 px-3 font-semibold">Safety Stock</th>
                  <th className="pb-3 px-3 font-semibold">Action Type</th>
                  <th className="pb-3 px-3 font-semibold">Action Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {recs.recommendations.map((r) => (
                  <tr key={r.product_id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="py-3.5 px-3 font-mono text-xs text-[#C6FF00]">{r.sku}</td>
                    <td className="py-3.5 px-3 font-medium text-white">{r.product_name}</td>
                    <td className="py-3.5 px-3 font-bold text-white font-mono">{r.current_stock}</td>
                    <td className="py-3.5 px-3 font-bold text-[#B7FF38] font-mono">
                      {r.recommended_order_quantity > 0 ? `+${r.recommended_order_quantity}` : '0'}
                    </td>
                    <td className="py-3.5 px-3 text-[#8E8E8E] font-mono">{r.safety_stock}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          r.action_type.includes('Reorder')
                            ? 'bg-[#FFD84D]/10 text-[#FFD84D] border-[#FFD84D]/20'
                            : r.action_type.includes('Clearance')
                            ? 'bg-[#C6FF00]/10 text-[#C6FF00] border-[#C6FF00]/20'
                            : 'bg-[#B7FF38]/10 text-[#B7FF38] border-[#B7FF38]/20'
                        }`}
                      >
                        {r.action_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[#8E8E8E] text-xs flex items-center justify-between gap-2">
                      <span>{r.action_reason}</span>
                      <ExplainWithAIButton
                        topic={`Recommendation for '${r.product_name}'`}
                        contextData={{
                          product: r.product_name,
                          reorder_qty: r.recommended_order_quantity,
                          action_type: r.action_type,
                          safety_stock: r.safety_stock,
                          reason: r.action_reason,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#8E8E8E] bg-[#101010] rounded-2xl border border-white/5">
            No Data Available
          </div>
        )}
      </div>
    </div>
  );
}
