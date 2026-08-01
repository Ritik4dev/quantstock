'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { analyticsService } from '@/services/analyticsService';
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  PieChart as PieIcon,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ['dashboardCards'],
    queryFn: dashboardService.getCards,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: dashboardService.getSummary,
  });

  const { data: analytics } = useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: () => analyticsService.getOverview(30),
  });

  if (cardsLoading || summaryLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-[#151C28] rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-[#151C28] rounded-2xl border border-[#222D3F]" />
          ))}
        </div>
      </div>
    );
  }

  const health = cards?.inventory_health;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/40 via-surface to-surface p-6 rounded-2xl border border-[#222D3F]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Store Performance Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time financial metrics and inventory health aggregated from PostgreSQL database queries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            100% Verified Backend SQL Metrics
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Revenue */}
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Sales</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3">
            ${cards ? cards.todays_sales.toLocaleString() : '0'}
          </div>
          <p className="text-xs text-slate-400 mt-1">Today's Total Revenue</p>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3">
            ${cards ? cards.total_revenue.toLocaleString() : '0'}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-emerald-400">
            <span>Profit: ${cards ? cards.total_profit.toLocaleString() : '0'}</span>
          </div>
        </div>

        {/* Card 3: Inventory Retail Value */}
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Inventory Value</span>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3">
            ${cards ? cards.total_inventory_value_retail.toLocaleString() : '0'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cost Value: ${cards ? cards.total_inventory_value_cost.toLocaleString() : '0'}
          </p>
        </div>

        {/* Card 4: Low Stock Alerts */}
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Low Stock Warnings</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3">
            {cards ? cards.products_running_low : 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Expiring Items: {cards ? cards.products_expiring : 0}
          </p>
        </div>
      </div>

      {/* Main Grid: Inventory Health + Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Health Breakdown */}
        <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-indigo-400" />
                Inventory Status Breakdown
              </h2>
            </div>
            {health ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#0E1420] border border-[#222D3F]">
                  <span className="text-sm font-medium text-emerald-400">Healthy Stock</span>
                  <span className="text-sm font-bold text-white">{health.healthy_count}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#0E1420] border border-[#222D3F]">
                  <span className="text-sm font-medium text-amber-400">Low Stock</span>
                  <span className="text-sm font-bold text-white">{health.low_stock_count}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#0E1420] border border-[#222D3F]">
                  <span className="text-sm font-medium text-rose-400">Out Of Stock</span>
                  <span className="text-sm font-bold text-white">{health.out_of_stock_count}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#0E1420] border border-[#222D3F]">
                  <span className="text-sm font-medium text-violet-400">Overstock</span>
                  <span className="text-sm font-bold text-white">{health.overstock_count}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#0E1420] border border-[#222D3F]">
                  <span className="text-sm font-medium text-slate-400">Expired / Expiring Soon</span>
                  <span className="text-sm font-bold text-white">{health.expired_count + health.expiring_soon_count}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No Data Available</p>
            )}
          </div>
        </div>

        {/* Top Low Stock Alerts Table */}
        <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Critical Low Stock Alerts
          </h2>

          {summary?.low_stock_alerts && summary.low_stock_alerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#0E1420] text-xs uppercase text-slate-400 border-b border-[#222D3F]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product Name</th>
                    <th className="px-4 py-3 font-semibold">Current Stock</th>
                    <th className="px-4 py-3 font-semibold">Min Stock</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222D3F]">
                  {summary.low_stock_alerts.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#1E2738]/50">
                      <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                      <td className="px-4 py-3 font-bold text-amber-400">{item.current_stock}</td>
                      <td className="px-4 py-3 text-slate-400">{item.minimum_stock || 5}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Low Stock
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#0E1420] rounded-xl border border-[#222D3F]">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium">All items are at healthy inventory levels.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Selling Products Table */}
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Top Selling Products (SQL Aggregated)
          </span>
        </h2>

        {analytics?.best_sellers && analytics.best_sellers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0E1420] text-xs uppercase text-slate-400 border-b border-[#222D3F]">
                <tr>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Product Name</th>
                  <th className="px-4 py-3 font-semibold">Qty Sold</th>
                  <th className="px-4 py-3 font-semibold">Total Revenue</th>
                  <th className="px-4 py-3 font-semibold">Profit</th>
                  <th className="px-4 py-3 font-semibold">Stock Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222D3F]">
                {analytics.best_sellers.map((p) => (
                  <tr key={p.product_id} className="hover:bg-[#1E2738]/50">
                    <td className="px-4 py-3 text-xs font-mono text-indigo-400">{p.sku}</td>
                    <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3 font-bold text-white">{p.total_quantity_sold}</td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">${p.total_revenue}</td>
                    <td className="px-4 py-3 text-indigo-400 font-medium">${p.total_profit}</td>
                    <td className="px-4 py-3 font-medium">{p.current_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 p-4 bg-[#0E1420] rounded-xl border border-[#222D3F]">
            No Data Available
          </p>
        )}
      </div>
    </div>
  );
}
