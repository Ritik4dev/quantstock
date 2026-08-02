'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';
import { FileText, Sun, TrendingUp, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function ReportsPage() {
  const [explainTopic, setExplainTopic] = useState('Stockout Risk and Reorder Point');
  const [explanationResult, setExplanationResult] = useState<string | null>(null);

  const { data: dailyBrief, isLoading: briefLoading } = useQuery({
    queryKey: ['dailyBrief'],
    queryFn: chatService.getDailyBrief,
  });

  const { data: reportSummary, isLoading: reportLoading } = useQuery({
    queryKey: ['reportSummary'],
    queryFn: () => chatService.getReportSummary(30),
  });

  const explainMutation = useMutation({
    mutationFn: (topic: string) => chatService.explainMetric({ topic }),
    onSuccess: (data) => {
      setExplanationResult(data.explanation);
    },
  });

  if (briefLoading || reportLoading) {
    return <div className="p-8 text-slate-400">Generating Executive Briefings & Reports...</div>;
  }

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#C6FF00]" />
            Executive Reports & Smart Daily Briefing
          </h1>
          <p className="text-xs text-[#8E8E8E] mt-1">
            Grounded operational summaries, financial period analysis, and metric explainers.
          </p>
        </div>
      </div>

      {/* Smart Daily Brief */}
      <div className="bg-gradient-to-r from-[#11140A] via-[#151515] to-[#101010] p-7 rounded-3xl border border-[#C6FF00]/20 space-y-5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FFD84D]/10 text-[#FFD84D] flex items-center justify-center border border-[#FFD84D]/20">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{dailyBrief?.greeting || 'Good Morning!'}</h2>
            <p className="text-xs text-[#8E8E8E] font-mono">{dailyBrief?.report_date}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#101010] p-4.5 rounded-2xl border border-white/5">
            <div className="text-[10px] text-[#8E8E8E] uppercase font-bold tracking-wider">Expected Revenue Today</div>
            <div className="text-2xl font-extrabold text-[#B7FF38] mt-1 font-mono">
              ${dailyBrief?.sales_forecast?.expected_revenue_usd.toFixed(2) || '0.00'}
            </div>
          </div>
          <div className="bg-[#101010] p-4.5 rounded-2xl border border-white/5">
            <div className="text-[10px] text-[#8E8E8E] uppercase font-bold tracking-wider">Inventory Alerts</div>
            <div className="text-2xl font-extrabold text-[#FFD84D] mt-1 font-mono">
              {dailyBrief?.inventory_alerts?.length || 0} items
            </div>
          </div>
        </div>

        {dailyBrief?.business_summary && (
          <div className="p-4.5 bg-[#101010] rounded-2xl border border-white/5 text-xs text-[#8E8E8E] leading-relaxed">
            <h3 className="text-[10px] font-bold text-[#C6FF00] uppercase tracking-wider mb-1.5">Store Overview Summary</h3>
            <p className="text-white">{dailyBrief.business_summary}</p>
          </div>
        )}
      </div>

      {/* 30-Day Executive Report Summary */}
      <div className="card-inspo p-7 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
          <TrendingUp className="w-4 h-4 text-[#B7FF38]" />
          30-Day Financial Performance Executive Report
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#101010] p-4.5 rounded-2xl border border-white/5">
            <div className="text-[10px] text-[#8E8E8E] uppercase font-bold tracking-wider">Period Revenue</div>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              ${reportSummary ? reportSummary.total_revenue.toLocaleString() : '0'}
            </div>
          </div>
          <div className="bg-[#101010] p-4.5 rounded-2xl border border-white/5">
            <div className="text-[10px] text-[#8E8E8E] uppercase font-bold tracking-wider">Period Net Profit</div>
            <div className="text-2xl font-extrabold text-[#B7FF38] mt-1 font-mono">
              ${reportSummary ? reportSummary.total_profit.toLocaleString() : '0'}
            </div>
          </div>
          <div className="bg-[#101010] p-4.5 rounded-2xl border border-white/5">
            <div className="text-[10px] text-[#8E8E8E] uppercase font-bold tracking-wider">Inventory Health Score</div>
            <div className="text-2xl font-extrabold text-[#C6FF00] mt-1 font-mono">
              {reportSummary ? reportSummary.inventory_health_score : 0} / 100
            </div>
          </div>
        </div>

        {reportSummary?.executive_summary && (
          <div className="p-4.5 bg-[#101010] rounded-2xl border border-white/5 text-xs text-white leading-relaxed">
            <h3 className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider mb-2">Detailed Executive Analysis</h3>
            <p className="whitespace-pre-wrap">{reportSummary.executive_summary}</p>
          </div>
        )}
      </div>

      {/* Metric Explainer Component */}
      <div className="card-inspo p-7 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
          <HelpCircle className="w-4 h-4 text-[#C6FF00]" />
          Natural Language Metric & Strategy Explainer
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={explainTopic}
            onChange={(e) => setExplainTopic(e.target.value)}
            placeholder="e.g. Stockout Risk, Reorder Quantity Calculation, Clearance Discounts..."
            className="flex-1 w-full bg-[#101010] border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#C6FF00]/50 placeholder-[#555555]"
          />
          <button
            onClick={() => explainMutation.mutate(explainTopic)}
            disabled={explainMutation.isPending}
            className="px-6 py-3 bg-[#C6FF00] hover:bg-[#9DFF00] text-black font-bold rounded-2xl text-xs shadow-[0_4px_15px_rgba(198,255,0,0.4)] flex items-center gap-2 disabled:opacity-50 shrink-0 transition-all"
          >
            <Sparkles className="w-4 h-4 text-black" />
            {explainMutation.isPending ? 'Generating Explanation...' : 'Explain Metric'}
          </button>
        </div>

        {explanationResult && (
          <div className="p-4.5 bg-[#101010] rounded-2xl border border-white/5 text-xs text-white leading-relaxed">
            <h3 className="text-[10px] font-bold text-[#C6FF00] uppercase tracking-wider mb-2">
              Explanation for: {explainTopic}
            </h3>
            <p className="whitespace-pre-wrap">{explanationResult}</p>
          </div>
        )}
      </div>
    </div>
  );
}
