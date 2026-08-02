'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';
import { salesService } from '@/services/salesService';
import { BarChart3, TrendingUp, DollarSign, Award, Layers, ShoppingCart, Percent } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

import POSBarcodeScannerWidget from '@/components/pos/POSBarcodeScannerWidget';
import SalesDocumentUploadModal from '@/components/pos/SalesDocumentUploadModal';
import IndividualProductRevenueChart from '@/components/analytics/IndividualProductRevenueChart';
import PerProductFinancialTable from '@/components/analytics/PerProductFinancialTable';

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);

  const { data: analytics, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['analyticsOverview', days],
    queryFn: () => analyticsService.getOverview(days),
  });

  const { data: financials, isLoading: isFinancialsLoading, refetch: refetchFinancials } = useQuery({
    queryKey: ['financialAnalytics'],
    queryFn: salesService.getFinancialAnalytics,
  });

  const handleSaleRefetch = () => {
    refetchOverview();
    refetchFinancials();
  };

  const chartData = analytics ? analytics.daily_sales : [];
  const categoryData = analytics ? analytics.category_distribution : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#C6FF00]" />
            Business & Profit Analytics
          </h1>
          <p className="text-xs text-[#8E8E8E] mt-1">
            Real-time POS barcode billing, multi-format sales document parsing, auto stock decrement, and per-product profit margin analytics.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsSalesModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#C6FF00] text-black text-xs font-bold shadow-lg shadow-[#C6FF00]/20 hover:bg-[#9DFF00] transition-colors flex items-center gap-2"
          >
            Upload Sales Document / Receipts
          </button>
        </div>
      </div>

      {/* Overall Financial Metric Cards */}
      {financials && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-inspo h-[150px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8E8E8E]">
              <span className="font-semibold uppercase tracking-wider">Total Store Revenue</span>
              <div className="p-2 bg-[#C6FF00]/10 rounded-xl text-[#C6FF00]">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#C6FF00] tracking-tight">
              ${financials.total_revenue.toFixed(2)}
            </div>
            <div className="text-[11px] text-[#8E8E8E]">SQL Aggregated Transactions</div>
          </div>

          <div className="card-inspo h-[150px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8E8E8E]">
              <span className="font-semibold uppercase tracking-wider">Total Net Profit</span>
              <div className="p-2 bg-[#B7FF38]/10 rounded-xl text-[#B7FF38]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#B7FF38] tracking-tight">
              ${financials.total_profit.toFixed(2)}
            </div>
            <div className="text-[11px] text-[#8E8E8E]">Net Profit After Buying Cost</div>
          </div>

          <div className="card-inspo h-[150px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8E8E8E]">
              <span className="font-semibold uppercase tracking-wider">Overall Profit Margin</span>
              <div className="p-2 bg-[#FFD84D]/10 rounded-xl text-[#FFD84D]">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {financials.overall_profit_margin_pct.toFixed(1)}%
            </div>
            <div className="text-[11px] text-[#8E8E8E]">Average Profit Margin %</div>
          </div>

          <div className="card-inspo h-[150px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8E8E8E]">
              <span className="font-semibold uppercase tracking-wider">Total Units Sold</span>
              <div className="p-2 bg-white/5 rounded-xl text-white">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {financials.total_units_sold} units
            </div>
            <div className="text-[11px] text-[#8E8E8E]">Cumulative Catalog Units Sold</div>
          </div>
        </div>
      )}

      {/* POS Barcode Checkout Scanner */}
      <POSBarcodeScannerWidget onSaleSuccess={handleSaleRefetch} />

      {/* Main Overall Revenue & Profit Chart */}
      <div className="card-inspo space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#C6FF00]" />
            Overall Store Revenue & Profit Trend ({days} Days)
          </h2>

          <div className="flex items-center gap-1 bg-[#101010] p-1 rounded-xl border border-white/5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  days === d
                    ? 'bg-[#C6FF00] text-black font-bold shadow-md'
                    : 'text-[#8E8E8E] hover:text-white'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {chartData && chartData.length > 0 ? (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C6FF00" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C6FF00" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B7FF38" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#B7FF38" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="period" stroke="#8E8E8E" fontSize={11} />
                <YAxis stroke="#8E8E8E" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151515',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#C6FF00" fillOpacity={1} fill="url(#colorRev)" name="Revenue ($)" />
                <Area type="monotone" dataKey="profit" stroke="#B7FF38" fillOpacity={1} fill="url(#colorProfit)" name="Profit ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-[#8E8E8E] bg-[#101010] rounded-2xl border border-white/5">
            No Overall Sales Data Recorded in the Last {days} Days.
          </div>
        )}
      </div>

      {/* Individual Product Revenue & Profit Chart Component */}
      <IndividualProductRevenueChart
        selectedProductId={selectedProductId}
        productsList={financials?.products}
        onSelectProduct={(id) => setSelectedProductId(id)}
      />

      {/* Per-Product Financial Breakdown Table */}
      {financials?.products && (
        <PerProductFinancialTable
          products={financials.products}
          selectedProductId={selectedProductId}
          onSelectProduct={(id) => setSelectedProductId(id)}
        />
      )}

      {/* Multi-Format Sales Document Upload Modal */}
      <SalesDocumentUploadModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        onUploadSuccess={handleSaleRefetch}
      />
    </div>
  );
}
