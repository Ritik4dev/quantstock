'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { Clock, AlertTriangle, Sparkles, Users, TrendingUp, DollarSign, ShieldAlert, ArrowRight, Sun, Percent } from 'lucide-react';

export default function XGBoostSmartInsightsBanner() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['smartDashboardInsights'],
    queryFn: dashboardService.getSmartInsights,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        <div className="h-44 bg-[#151C28] rounded-2xl border border-[#222D3F]" />
        <div className="h-44 bg-[#151C28] rounded-2xl border border-[#222D3F]" />
      </div>
    );
  }

  const footfall = insights?.footfall_prediction;
  const spoilageItems = insights?.spoilage_risks || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CARD 1: XGBoost Hourly Store Footfall & Busy-Hours Predictor */}
      <div className="card-inspo p-6 flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded-2xl text-[#C6FF00]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Hourly Store Footfall Predictor
              </h3>
              <span className="text-[10px] text-[#8E8E8E] font-mono">XGBoost Traffic Model</span>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-[#C6FF00]/10 text-[#C6FF00] border border-[#C6FF00]/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#C6FF00]" />
            ML Forecast
          </span>
        </div>

        {footfall && footfall.has_sufficient_data ? (
          <div className="space-y-3">
            <div className="bg-[#101010] border border-white/5 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8E8E8E]">Predicted Peak Window:</span>
                <span className="text-[#C6FF00] font-extrabold text-sm font-mono">{footfall.peak_hours_window}</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-[#8E8E8E] flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#B7FF38]" />
                  Traffic Surge:
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#B7FF38]/10 text-[#B7FF38] border border-[#B7FF38]/20 font-mono">
                  +{footfall.predicted_surge_pct.toFixed(0)}% vs Baseline
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs bg-[#C6FF00]/5 border border-[#C6FF00]/10 p-3.5 rounded-2xl">
              <div className="flex items-center gap-2 text-white font-medium">
                <Users className="w-4 h-4 text-[#C6FF00] shrink-0" />
                <span>{footfall.insight_text}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-[#101010] rounded-2xl border border-white/5 text-xs text-[#8E8E8E] text-center">
            {footfall?.insight_text || 'Awaiting sales transaction data to train hourly store footfall & busy-hours prediction model.'}
          </div>
        )}
      </div>

      {/* CARD 2: XGBoost Product Spoilage & Expiry Waste Classifier */}
      <div className="card-inspo p-6 flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF5B5B]/10 border border-[#FF5B5B]/20 rounded-2xl text-[#FF5B5B]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Product Spoilage & Waste Classifier
              </h3>
              <span className="text-[10px] text-[#8E8E8E] font-mono">XGBoost Waste Model</span>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-[#FF5B5B]/10 text-[#FF5B5B] border border-[#FF5B5B]/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-[#FF5B5B]" />
            Waste Defense
          </span>
        </div>

        {spoilageItems.length > 0 ? (
          <div className="space-y-2 max-h-44 overflow-y-auto">
            {spoilageItems.slice(0, 2).map((item) => (
              <div key={item.product_id} className="bg-[#101010] border border-white/5 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    {item.product_name}
                    <span className="text-[10px] font-mono text-[#8E8E8E]">({item.sku})</span>
                  </span>
                  <span className="text-[#FF5B5B] font-extrabold text-xs font-mono">
                    {item.spoilage_risk_pct.toFixed(0)}% Spoilage Risk
                  </span>
                </div>

                <p className="text-[11px] text-[#8E8E8E]">
                  {item.recommendation_text}
                </p>

                <div className="flex items-center justify-between text-[10px] text-[#8E8E8E] pt-1.5 border-t border-white/5">
                  <span>Expires in: <strong className="text-[#FFD84D] font-mono">{item.days_until_expiry} days</strong></span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#FFD84D]/10 text-[#FFD84D] border border-[#FFD84D]/20">
                    Put on {item.recommended_discount_pct}% Discount
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 bg-[#101010] rounded-2xl border border-white/5 text-xs text-[#8E8E8E] text-center flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#B7FF38]" />
            <span>Zero items currently at high risk of spoilage or waste expiry.</span>
          </div>
        )}
      </div>
    </div>
  );
}
