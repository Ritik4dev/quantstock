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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151C28] p-6 rounded-2xl border border-[#222D3F]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            Executive Reports & Smart Daily Briefing
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Grounded operational summaries, financial period analysis, and metric explainers.
          </p>
        </div>
      </div>

      {/* Smart Daily Brief */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-surface to-surface p-6 rounded-2xl border border-indigo-500/30 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{dailyBrief?.greeting || 'Good Morning!'}</h2>
            <p className="text-xs text-slate-400">{dailyBrief?.date}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-[#0E1420] p-4 rounded-xl border border-[#222D3F]">
            <div className="text-xs text-slate-400 uppercase font-semibold">Expected Sales Today</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {dailyBrief ? dailyBrief.expected_sales_today : 0} units
            </div>
          </div>
          <div className="bg-[#0E1420] p-4 rounded-xl border border-[#222D3F]">
            <div className="text-xs text-slate-400 uppercase font-semibold">Low Stock Warnings</div>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {dailyBrief ? dailyBrief.low_stock_count : 0} items
            </div>
          </div>
        </div>

        {dailyBrief?.business_summary && (
          <div className="p-4 bg-[#0E1420] rounded-xl border border-[#222D3F] text-sm text-slate-300">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Store Overview Summary</h3>
            <p>{dailyBrief.business_summary}</p>
          </div>
        )}
      </div>

      {/* 30-Day Executive Report Summary */}
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          30-Day Financial Performance Executive Report
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0E1420] p-4 rounded-xl border border-[#222D3F]">
            <div className="text-xs text-slate-400 uppercase font-semibold">Period Revenue</div>
            <div className="text-xl font-bold text-white mt-1">
              ${reportSummary ? reportSummary.total_revenue.toLocaleString() : '0'}
            </div>
          </div>
          <div className="bg-[#0E1420] p-4 rounded-xl border border-[#222D3F]">
            <div className="text-xs text-slate-400 uppercase font-semibold">Period Net Profit</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              ${reportSummary ? reportSummary.total_profit.toLocaleString() : '0'}
            </div>
          </div>
          <div className="bg-[#0E1420] p-4 rounded-xl border border-[#222D3F]">
            <div className="text-xs text-slate-400 uppercase font-semibold">Inventory Health Score</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">
              {reportSummary ? reportSummary.inventory_health_score : 0} / 100
            </div>
          </div>
        </div>

        {reportSummary?.executive_summary && (
          <div className="p-4 bg-[#0E1420] rounded-xl border border-[#222D3F] text-sm text-slate-200 leading-relaxed">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Executive Analysis</h3>
            <p className="whitespace-pre-wrap">{reportSummary.executive_summary}</p>
          </div>
        )}
      </div>

      {/* Metric Explainer Component */}
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-violet-400" />
          Natural Language Metric & Strategy Explainer
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={explainTopic}
            onChange={(e) => setExplainTopic(e.target.value)}
            placeholder="e.g. Stockout Risk, Reorder Quantity Calculation, Clearance Discounts..."
            className="flex-1 w-full bg-[#0E1420] border border-[#222D3F] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => explainMutation.mutate(explainTopic)}
            disabled={explainMutation.isPending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            {explainMutation.isPending ? 'Generating Explanation...' : 'Explain Metric'}
          </button>
        </div>

        {explanationResult && (
          <div className="p-4 bg-[#0E1420] rounded-xl border border-[#222D3F] text-sm text-slate-200 leading-relaxed">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
              Explanation for: {explainTopic}
            </h3>
            <p className="whitespace-pre-wrap">{explanationResult}</p>
          </div>
        )}
      </div>
    </div>
  );
}
