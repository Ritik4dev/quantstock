'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { riskService } from '@/services/riskService';
import { ShieldAlert, AlertTriangle, Activity, CheckCircle2, ShieldCheck } from 'lucide-react';
import ExplainWithAIButton from '@/components/ai/ExplainWithAIButton';

export default function RiskPage() {
  const { data: riskData, isLoading } = useQuery({
    queryKey: ['riskScorecard'],
    queryFn: riskService.getScorecard,
  });

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading Business Risk Scorecard Engine...</div>;
  }

  const riskScore = riskData ? riskData.overall_business_risk_score : 0;
  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-[#B7FF38] border-[#B7FF38]/40 bg-[#B7FF38]/10';
    if (score < 60) return 'text-[#FFD84D] border-[#FFD84D]/40 bg-[#FFD84D]/10';
    return 'text-[#FF5B5B] border-[#FF5B5B]/40 bg-[#FF5B5B]/10';
  };

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#FF5B5B]" />
            Operational Business Risk Scorecard
          </h1>
          <p className="text-xs text-[#8E8E8E] mt-1">
            Real-time evaluation of store exposure to stockouts, overstock dead capital, and expiry losses.
          </p>
        </div>
        {riskData && (
          <ExplainWithAIButton
            topic="Overall Business Risk Scorecard"
            contextData={{
              risk_score: riskData.overall_business_risk_score,
              health_index: riskData.inventory_health_score,
              stockout_count: riskData.stockout_risk_count,
              overstock_count: riskData.overstock_risk_count,
            }}
            label="Explain Risk Index with AI"
            size="md"
          />
        )}
      </div>

      {/* Main Scorecard Gauge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Score Gauge */}
        <div className="card-inspo p-6 flex flex-col items-center justify-center text-center space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">
            Overall Business Risk Score
          </div>
          <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 ${getRiskColor(riskScore)} shadow-[0_0_30px_rgba(0,0,0,0.5)] my-2`}>
            <span className="text-3xl font-black text-white font-mono">{riskScore.toFixed(1)}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8E8E]">out of 100</span>
          </div>
          <p className="text-xs text-[#8E8E8E] font-medium">
            {riskScore < 30 ? 'Low Exposure - Operational Balance Healthy' : riskScore < 60 ? 'Moderate Exposure - Attention Required' : 'High Operational Exposure'}
          </p>
        </div>

        {/* Health Score */}
        <div className="card-inspo p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E] mb-2">
              Inventory Health Index
            </div>
            <div className="text-4xl font-black text-[#B7FF38] tracking-tight font-mono">
              {riskData ? riskData.inventory_health_score.toFixed(1) : 0} %
            </div>
            <p className="text-xs text-[#8E8E8E] mt-2">Percentage of catalog items in optimal stock parameters.</p>
          </div>
          <div className="pt-4 border-t border-white/5 mt-4 flex items-center gap-2 text-xs text-[#8E8E8E] font-mono">
            <Activity className="w-4 h-4 text-[#B7FF38]" />
            <span>Stockout Risks: <strong className="text-white">{riskData ? riskData.stockout_risk_count : 0}</strong></span>
          </div>
        </div>

        {/* Forecast Confidence */}
        <div className="card-inspo p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E] mb-2">
              ML Forecast Confidence Index
            </div>
            <div className="text-4xl font-black text-[#C6FF00] tracking-tight font-mono">
              {riskData ? (riskData.forecast_confidence_score * 100).toFixed(0) : 0} %
            </div>
            <p className="text-xs text-[#8E8E8E] mt-2">Accuracy measure of demand predictions based on historical sales.</p>
          </div>
          <div className="pt-4 border-t border-white/5 mt-4 flex items-center gap-2 text-xs text-[#8E8E8E] font-mono">
            <ShieldCheck className="w-4 h-4 text-[#C6FF00]" />
            <span>Overstock Risks: <strong className="text-white">{riskData ? riskData.overstock_risk_count : 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Priority Alerts */}
      <div className="card-inspo p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
          <AlertTriangle className="w-4 h-4 text-[#FFD84D]" />
          Active Risk Alerts & Mitigation Directives
        </h2>

        {riskData?.active_risk_alerts && riskData.active_risk_alerts.length > 0 ? (
          <div className="space-y-3">
            {riskData.active_risk_alerts.map((alert, idx) => (
              <div key={idx} className="p-4.5 rounded-2xl bg-[#101010] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#C6FF00] font-bold">{alert.sku}</span>
                    <span className="text-sm font-bold text-white tracking-tight">{alert.product_name}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FF5B5B]/10 text-[#FF5B5B] border border-[#FF5B5B]/20">
                      {alert.risk_type}
                    </span>
                  </div>
                  <p className="text-xs text-[#8E8E8E] mt-1">{alert.description}</p>
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="text-xs font-bold text-[#B7FF38] bg-[#B7FF38]/10 px-3 py-1.5 rounded-xl border border-[#B7FF38]/20 font-mono">
                    Action: {alert.suggested_action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#101010] rounded-2xl border border-white/5">
            <CheckCircle2 className="w-8 h-8 text-[#B7FF38] mx-auto mb-2" />
            <p className="text-xs text-[#8E8E8E] font-medium">No active high-priority risk alerts detected.</p>
          </div>
        )}
      </div>
    </div>
  );
}
