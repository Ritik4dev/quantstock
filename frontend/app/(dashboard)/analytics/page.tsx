'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';
import { BarChart3, TrendingUp, DollarSign, Award, Layers } from 'lucide-react';
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

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analyticsOverview', days],
    queryFn: () => analyticsService.getOverview(days),
  });

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading SQL Analytics Engine...</div>;
  }

  const chartData = analytics ? analytics.daily_sales : [];
  const categoryData = analytics ? analytics.category_distribution : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151C28] p-6 rounded-2xl border border-[#222D3F]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Store Sales & Financial Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pure SQL analytical aggregation of daily sales, profit metrics, and velocity rankings.
          </p>
        </div>

        {/* Days selector */}
        <div className="flex items-center gap-2 bg-[#0E1420] p-1 rounded-xl border border-[#222D3F]">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === d
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Main Revenue & Sales Chart */}
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Revenue & Profit Trend ({days} Days)
        </h2>

        {chartData && chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222D3F" />
                <XAxis dataKey="period" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151C28',
                    borderColor: '#222D3F',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRev)" name="Revenue ($)" />
                <Area type="monotone" dataKey="profit" stroke="#6366F1" fillOpacity={1} fill="url(#colorProfit)" name="Profit ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 bg-[#0E1420] rounded-xl border border-[#222D3F]">
            No Data Available
          </div>
        )}
      </div>

      {/* Category Distribution Chart */}
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" />
          Category Inventory Value Breakdown
        </h2>

        {categoryData && categoryData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222D3F" />
                <XAxis dataKey="category" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151C28',
                    borderColor: '#222D3F',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="inventory_value" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Inventory Value ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 bg-[#0E1420] rounded-xl border border-[#222D3F]">
            No Data Available
          </div>
        )}
      </div>

      {/* Best & Worst Sellers Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Sellers */}
        <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Top Best Sellers
          </h2>
          {analytics?.best_sellers && analytics.best_sellers.length > 0 ? (
            <div className="space-y-3">
              {analytics.best_sellers.map((p) => (
                <div key={p.product_id} className="flex justify-between items-center p-3 rounded-xl bg-[#0E1420] border border-[#222D3F]">
                  <div>
                    <div className="text-sm font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-indigo-400 font-mono">{p.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">${p.total_revenue}</div>
                    <div className="text-xs text-slate-400">{p.total_quantity_sold} sold</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 p-4 bg-[#0E1420] rounded-xl border border-[#222D3F]">No Data Available</p>
          )}
        </div>

        {/* Slow Moving */}
        <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-rose-400" />
            Slow Moving Products
          </h2>
          {analytics?.slow_moving_products && analytics.slow_moving_products.length > 0 ? (
            <div className="space-y-3">
              {analytics.slow_moving_products.map((p) => (
                <div key={p.product_id} className="flex justify-between items-center p-3 rounded-xl bg-[#0E1420] border border-[#222D3F]">
                  <div>
                    <div className="text-sm font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-indigo-400 font-mono">{p.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-300">{p.total_quantity_sold} sold</div>
                    <div className="text-xs text-rose-400 font-medium">Stock: {p.current_stock}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 p-4 bg-[#0E1420] rounded-xl border border-[#222D3F]">No Data Available</p>
          )}
        </div>
      </div>
    </div>
  );
}
