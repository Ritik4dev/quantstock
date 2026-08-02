'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { aiDiscoveryService } from '@/services/aiDiscoveryService';
import {
  ShieldCheck,
  Store,
  Box,
  TrendingUp,
  RefreshCw,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

export default function AnalysisSummaryAuditPage() {
  const router = useRouter();

  const { data: auditData, isLoading, isError, refetch } = useQuery({
    queryKey: ['storeAnalysisSummary'],
    queryFn: aiDiscoveryService.getAnalysisSummary,
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto fade-in-up">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => router.push('/ai-discovery')}
            className="p-2.5 rounded-xl bg-[#151515] hover:bg-white/[0.04] text-white border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C6FF00]" />
              Store Intelligence Audit Report
            </h1>
            <p className="text-xs text-[#8E8E8E] mt-0.5">
              100% Data-Grounded Business Metrics (Zero Precoded Heuristics / Zero Hallucination Audit).
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="px-4 py-2.5 rounded-xl bg-[#151515] hover:bg-white/[0.04] text-[#C6FF00] border border-[#C6FF00]/30 text-xs font-bold transition-all flex items-center gap-2 shrink-0 self-start sm:self-center"
        >
          <RefreshCw className="w-4 h-4 text-[#C6FF00]" />
          Re-Analyze Store History
        </button>
      </div>

      {isLoading && (
        <div className="card-inspo p-12 text-center text-xs text-[#C6FF00] font-mono animate-pulse">
          Auditing PostgreSQL database tables (Products, Inventory, Sales, Business Profile)...
        </div>
      )}

      {isError && (
        <div className="p-5 rounded-2xl bg-[#FF5B5B]/10 border border-[#FF5B5B]/20 text-[#FF5B5B] text-xs font-mono">
          Failed to load store audit summary. Please check backend connection.
        </div>
      )}

      {auditData && auditData.has_data && (
        <div className="space-y-6">
          {/* Business Grounded Profile Card */}
          <div className="card-inspo p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-[#C6FF00]" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {auditData.business.name}
                  </h3>
                  <span className="text-[10px] text-[#8E8E8E]">
                    Store Type: {auditData.business.type} | Owner: {auditData.business.owner} ({auditData.business.email})
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] uppercase font-bold bg-[#C6FF00]/10 text-[#C6FF00] border border-[#C6FF00]/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified DB Records
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#101010] p-3.5 rounded-2xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-semibold">Location Context</span>
                <span className="text-white font-bold">{auditData.profile_attributes.location_type}</span>
              </div>
              <div className="bg-[#101010] p-3.5 rounded-2xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-semibold">Daily Customers / Footfall</span>
                <span className="text-white font-bold font-mono">{auditData.profile_attributes.daily_customers}</span>
              </div>
              <div className="bg-[#101010] p-3.5 rounded-2xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-semibold">Staff / Employees</span>
                <span className="text-white font-bold font-mono">{auditData.profile_attributes.employees}</span>
              </div>
              <div className="bg-[#101010] p-3.5 rounded-2xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-semibold">Business Scale</span>
                <span className="text-white font-bold">{auditData.profile_attributes.business_scale}</span>
              </div>
            </div>
          </div>

          {/* Grounded Inventory & Sales Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inventory Breakdown */}
            <div className="card-inspo p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm tracking-tight">
                  <Box className="w-4 h-4 text-[#C6FF00]" />
                  PostgreSQL Inventory Audit
                </div>
                <span className="text-[10px] text-[#8E8E8E] font-mono">Real DB Count</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-[#101010] p-3 rounded-xl border border-white/5">
                  <span className="text-[#8E8E8E]">Total Registered SKUs</span>
                  <span className="text-white font-bold font-mono">{auditData.grounded_inventory_metrics.total_skus} SKUs</span>
                </div>
                <div className="flex justify-between items-center bg-[#101010] p-3 rounded-xl border border-white/5">
                  <span className="text-[#8E8E8E]">Total Physical Stock Units</span>
                  <span className="text-[#C6FF00] font-bold font-mono">
                    {auditData.grounded_inventory_metrics.total_stock_units} Units
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#101010] p-3 rounded-xl border border-white/5">
                  <span className="text-[#8E8E8E]">Total Retail Inventory Value</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    ${auditData.grounded_inventory_metrics.total_retail_valuation.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#101010] p-3 rounded-xl border border-white/5">
                  <span className="text-[#8E8E8E]">Total Cost Inventory Value</span>
                  <span className="text-slate-300 font-bold font-mono">
                    ${auditData.grounded_inventory_metrics.total_cost_valuation.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sales Performance Breakdown */}
            <div className="card-inspo p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm tracking-tight">
                  <TrendingUp className="w-4 h-4 text-[#C6FF00]" />
                  PostgreSQL Sales History Audit
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {auditData.grounded_sales_metrics.sales_data_status}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-[#101010] p-3 rounded-xl border border-white/5">
                  <span className="text-[#8E8E8E]">Total Sales Orders Recorded</span>
                  <span className="text-white font-bold font-mono">
                    {auditData.grounded_sales_metrics.total_recorded_sales_orders} Orders
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#101010] p-3 rounded-xl border border-white/5">
                  <span className="text-[#8E8E8E]">Total Verified Revenue</span>
                  <span className="text-[#C6FF00] font-bold font-mono">
                    ${auditData.grounded_sales_metrics.total_recorded_revenue.toFixed(2)}
                  </span>
                </div>
                <div className="p-3.5 bg-[#101010] rounded-xl border border-white/5 text-[11px] text-[#8E8E8E] leading-relaxed">
                  <strong className="text-white block mb-1">Zero-Hallucination Integrity Guarantee:</strong>
                  Sales metrics are computed dynamically from actual customer transactions recorded in PostgreSQL. No arbitrary sales figures or daily footfall rates are fabricated.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
