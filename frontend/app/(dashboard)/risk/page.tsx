'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { riskService } from '@/services/riskService';
import { ShieldAlert, AlertTriangle, Activity, CheckCircle2, ShieldCheck } from 'lucide-react';

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
    if (score < 30) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score < 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151C28] p-6 rounded-2xl border border-[#222D3F]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            Operational Business Risk Scorecard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time evaluation of store exposure to stockouts, overstock dead capital, and expiry losses.
          </p>
        </div>
      </div>

      {/* Main Scorecard Gauge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Score Gauge */}
        <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Overall Business Risk Score
          </div>
          <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 ${getRiskColor(riskScore)} shadow-xl mb-3`}>
            <span className="text-3xl font-extrabold text-white">{riskScore.toFixed(1)}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">out of 100</span>
          </div>
          <p className="text-xs text-slate-400">
            {riskScore < 30 ? 'Low Exposure - Operational Balance Healthy' : riskScore < 60 ? 'Moderate Exposure - Attention Required' : 'High Operational Exposure'}
          </p>
        </div>

        {/* Health Score */}
        <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Inventory Health Index
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {riskData ? riskData.inventory_health_score.toFixed(1) : 0} %
            </div>
            <p className="text-xs text-slate-400 mt-2">Percentage of catalog items in optimal stock parameters.</p>
          </div>
          <div className="pt-4 border-t border-[#222D3F] mt-4 flex items-center gap-2 text-xs text-slate-300">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Stockout Risks: {riskData ? riskData.stockout_risk_count : 0}</span>
          </div>
        </div>

        {/* Forecast Confidence */}
        <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              ML Forecast Confidence Index
            </div>
            <div className="text-3xl font-bold text-indigo-400">
              {riskData ? (riskData.forecast_confidence_score * 100).toFixed(0) : 0} %
            </div>
            <p className="text-xs text-slate-400 mt-2">Accuracy measure of demand predictions based on historical sales.</p>
          </div>
          <div className="pt-4 border-t border-[#222D3F] mt-4 flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Overstock Risks: {riskData ? riskData.overstock_risk_count : 0}</span>
          </div>
        </div>
      </div>

      {/* Priority Alerts */}
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Active Risk Alerts & Mitigation Directives
        </h2>

        {riskData?.active_risk_alerts && riskData.active_risk_alerts.length > 0 ? (
          <div className="space-y-4">
            {riskData.active_risk_alerts.map((alert, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#0E1420] border border-[#222D3F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-400">{alert.sku}</span>
                    <span className="text-sm font-bold text-white">{alert.product_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {alert.risk_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{alert.description}</p>
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    Action: {alert.suggested_action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#0E1420] rounded-xl border border-[#222D3F]">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-slate-300 font-medium">No active high-priority risk alerts detected.</p>
          </div>
        )}
      </div>
    </div>
  );
}
