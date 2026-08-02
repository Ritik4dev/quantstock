'use client';

import React from 'react';
import { ItemStockSuggestion } from '@/services/dashboardService';
import { Sparkles, AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, Tag } from 'lucide-react';

interface ItemStockIntelligenceBannerProps {
  suggestion?: ItemStockSuggestion;
}

export default function ItemStockIntelligenceBanner({ suggestion }: ItemStockIntelligenceBannerProps) {
  if (!suggestion) return null;

  const getActionBadge = () => {
    switch (suggestion.action_type) {
      case 'RESTOCK_RECOMMENDED':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
          label: 'RESTOCK RECOMMENDED',
          style: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
        };
      case 'OVERSTOCK_ALERT':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-violet-400" />,
          label: 'OVERSTOCK WARNING',
          style: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
        };
      case 'CLEARANCE_DISCOUNT':
        return {
          icon: <Tag className="w-3.5 h-3.5 text-rose-400" />,
          label: 'CLEARANCE DISCOUNT',
          style: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
        };
      default:
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'HEALTHY STOCK LEVEL',
          style: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
        };
    }
  };

  const badge = getActionBadge();

  return (
    <div className={`p-3 rounded-xl border mb-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md ${badge.style}`}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-black/20 shrink-0">
          {badge.icon}
        </div>
        <div>
          <div className="font-extrabold flex items-center gap-2 tracking-wide uppercase text-[10px]">
            <span>{badge.label}</span>
            <span className="text-slate-400 font-mono font-normal">
              (Velocity: {suggestion.sales_velocity_daily} units/day)
            </span>
          </div>
          <p className="text-slate-200 text-xs font-medium mt-0.5">
            {suggestion.insight_text}
          </p>
        </div>
      </div>

      {suggestion.suggested_order_qty > 0 && (
        <div className="shrink-0 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
          <span className="text-slate-300 text-[11px]">Suggested Order:</span>
          <span className="font-extrabold text-white text-xs">
            +{suggestion.suggested_order_qty} units
          </span>
        </div>
      )}
    </div>
  );
}
