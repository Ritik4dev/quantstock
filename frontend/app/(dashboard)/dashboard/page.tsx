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
  ArrowRight,
  Sparkles,
  Calendar,
  MoreHorizontal,
  MessageSquare,
  Send
} from 'lucide-react';
import Link from 'next/link';

import AIMorningBriefBanner from '@/components/ai/AIMorningBriefBanner';
import XGBoostSmartInsightsBanner from '@/components/ai/XGBoostSmartInsightsBanner';
import InventoryCapacityWidget from '@/components/dashboard/InventoryCapacityWidget';
import StockRunwayWidget from '@/components/dashboard/StockRunwayWidget';
import ExplainWithAIButton from '@/components/ai/ExplainWithAIButton';
import { whatsappService } from '@/services/whatsappService';
import { useMutation } from '@tanstack/react-query';
import { formatApiError } from '@/utils/error';

export default function DashboardPage() {
  const [waStatus, setWaStatus] = React.useState<string | null>(null);

  const sendWhatsAppAlertMutation = useMutation({
    mutationFn: async (alerts: any[]) => {
      return whatsappService.sendLowStockWhatsAppAlert(alerts);
    },
    onSuccess: (res) => {
      setWaStatus(res.message);
      setTimeout(() => setWaStatus(null), 5000);
    },
    onError: (err: any) => {
      setWaStatus(formatApiError(err, 'Failed to send WhatsApp alert. Check Settings.'));
      setTimeout(() => setWaStatus(null), 6000);
    },
  });

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
        <div className="h-32 bg-[#151515] rounded-3xl border border-white/5" />
        <div className="h-64 bg-[#151515] rounded-3xl border border-white/5" />
      </div>
    );
  }

  const health = cards?.inventory_health;

  return (
    <div className="space-y-8 fade-in-up">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Good Morning, Pranab 👋</h1>
          <p className="text-[#8E8E8E] text-sm">Here's what's happening with your business today.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#C6FF00]/10 text-[#C6FF00] border border-[#C6FF00]/20">
          <Calendar className="w-3.5 h-3.5" />
          This Month
        </div>
      </div>

      {/* 1. AI Morning Briefing & Voice Speech Hero Banner */}
      <AIMorningBriefBanner />

      {/* 2. XGBoost Smart Intelligence Banner (Spoilage Classifier & Footfall Predictor) */}
      <XGBoostSmartInsightsBanner />

      {/* 3. Core Metrics: Total Inventory Capacity & Stock Lasting Runway Estimate Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryCapacityWidget />
        <StockRunwayWidget />
      </div>

      {/* Metric Cards Grid with SVG Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Today's Revenue */}
        <div className="card-inspo p-6 flex flex-col justify-between h-[170px]">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-[#C6FF00]">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E8E]">Today's Sales</span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ${cards ? cards.todays_sales.toLocaleString() : '0'}
            </div>
            <p className="text-xs text-[#8E8E8E] mt-0.5">Today's Total Revenue</p>
          </div>
          <div className="w-full h-8 mt-auto overflow-hidden">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path d="M0,30 C20,25 40,35 60,20 C80,5 100,25 120,30 C140,35 160,15 180,20 C190,22 200,10 200,10" className="draw-path" fill="none" stroke="#C6FF00" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="card-inspo p-6 flex flex-col justify-between h-[170px]">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-[#C6FF00]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E8E]">Total Revenue</span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ${cards ? cards.total_revenue.toLocaleString() : '0'}
            </div>
            <p className="text-xs text-[#C6FF00] font-semibold mt-0.5">
              ↗ Profit: ${cards ? cards.total_profit.toLocaleString() : '0'}
            </p>
          </div>
          <div className="w-full h-8 mt-auto overflow-hidden">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path d="M0,35 C40,35 60,25 100,30 C130,35 160,10 200,5" className="draw-path" fill="none" stroke="#C6FF00" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Card 3: Inventory Retail Value */}
        <div className="card-inspo p-6 flex flex-col justify-between h-[170px]">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-[#C6FF00]">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E8E]">Inventory Value</span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ${cards ? cards.total_inventory_value_retail.toLocaleString() : '0'}
            </div>
            <p className="text-xs text-[#8E8E8E] mt-0.5">
              Cost: ${cards ? cards.total_inventory_value_cost.toLocaleString() : '0'}
            </p>
          </div>
          <div className="w-full h-8 mt-auto overflow-hidden">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path d="M0,25 C30,30 50,15 80,20 C110,25 130,5 160,15 C180,20 200,5 200,5" className="draw-path" fill="none" stroke="#C6FF00" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Card 4: Low Stock Alerts */}
        <div className="card-inspo p-6 flex flex-col justify-between h-[170px]">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-[#FFD84D]/10 border border-[#FFD84D]/20 flex items-center justify-center text-[#FFD84D]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E8E]">Low Stock Warnings</span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {cards ? cards.products_running_low : 0}
            </div>
            <p className="text-xs text-[#FFD84D] font-semibold mt-0.5">
              Expiring Items: {cards ? cards.products_expiring : 0}
            </p>
          </div>
          <div className="w-full h-8 mt-auto overflow-hidden">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path d="M0,30 L40,30 L50,10 L70,10 L80,30 L130,30 L140,10 L160,10 L170,30 L200,30" className="draw-path" fill="none" stroke="#FFD84D" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Grid: Inventory Health Breakdown + Low Stock Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Health Breakdown */}
        <div className="card-inspo p-6 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
                <PieIcon className="w-4 h-4 text-[#C6FF00]" />
                Inventory Status Breakdown
              </h2>
            </div>
            {health ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3.5 rounded-2xl bg-[#101010] border border-white/5">
                  <span className="text-xs font-semibold text-[#B7FF38]">Healthy Stock</span>
                  <span className="text-sm font-extrabold text-white font-mono">{health.healthy_count}</span>
                </div>
                <div className="flex justify-between items-center p-3.5 rounded-2xl bg-[#101010] border border-white/5">
                  <span className="text-xs font-semibold text-[#FFD84D]">Low Stock</span>
                  <span className="text-sm font-extrabold text-white font-mono">{health.low_stock_count}</span>
                </div>
                <div className="flex justify-between items-center p-3.5 rounded-2xl bg-[#101010] border border-white/5">
                  <span className="text-xs font-semibold text-[#FF5B5B]">Out Of Stock</span>
                  <span className="text-sm font-extrabold text-white font-mono">{health.out_of_stock_count}</span>
                </div>
                <div className="flex justify-between items-center p-3.5 rounded-2xl bg-[#101010] border border-white/5">
                  <span className="text-xs font-semibold text-[#C6FF00]">Overstock</span>
                  <span className="text-sm font-extrabold text-white font-mono">{health.overstock_count}</span>
                </div>
                <div className="flex justify-between items-center p-3.5 rounded-2xl bg-[#101010] border border-white/5">
                  <span className="text-xs font-semibold text-[#8E8E8E]">Expired / Expiring Soon</span>
                  <span className="text-sm font-extrabold text-white font-mono">{health.expired_count + health.expiring_soon_count}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#8E8E8E]">No Data Available</p>
            )}
          </div>
        </div>

        {/* Top Low Stock Alerts Table */}
        <div className="card-inspo p-6 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
              <AlertTriangle className="w-4 h-4 text-[#FFD84D]" />
              Critical Low Stock Alerts
            </h2>

            {summary?.low_stock_alerts && summary.low_stock_alerts.length > 0 && (
              <button
                onClick={() => sendWhatsAppAlertMutation.mutate(summary.low_stock_alerts)}
                disabled={sendWhatsAppAlertMutation.isPending}
                className="px-3.5 py-1.5 rounded-xl bg-[#101010] border border-[#B7FF38]/30 hover:bg-[#B7FF38]/10 text-[#B7FF38] text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{sendWhatsAppAlertMutation.isPending ? 'Sending...' : 'Dispatch to WhatsApp'}</span>
              </button>
            )}
          </div>

          {waStatus && (
            <div className="p-3 rounded-xl bg-[#B7FF38]/10 border border-[#B7FF38]/20 text-xs font-mono text-[#B7FF38] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{waStatus}</span>
            </div>
          )}

          {summary?.low_stock_alerts && summary.low_stock_alerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#8E8E8E]">
                <thead className="text-[11px] font-semibold text-[#555555] uppercase border-b border-white/5">
                  <tr>
                    <th className="pb-3 px-3 font-semibold">Product Name</th>
                    <th className="pb-3 px-3 font-semibold">Current Stock</th>
                    <th className="pb-3 px-3 font-semibold">Min Stock</th>
                    <th className="pb-3 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {summary.low_stock_alerts.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.025] transition-colors">
                      <td className="py-3.5 px-3 font-medium text-white">{item.name}</td>
                      <td className="py-3.5 px-3 font-bold text-[#FFD84D] font-mono">{item.current_stock}</td>
                      <td className="py-3.5 px-3 text-[#8E8E8E] font-mono">{item.minimum_stock || 5}</td>
                      <td className="py-3.5 px-3 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFD84D]/10 text-[#FFD84D] border border-[#FFD84D]/20">
                          Low Stock
                        </span>
                        <ExplainWithAIButton
                          topic={`Stockout Risk for '${item.name}'`}
                          contextData={{
                            product: item.name,
                            current_stock: item.current_stock,
                            minimum_stock: item.minimum_stock || 5,
                            status: 'Low Stock Warning',
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#101010] rounded-2xl border border-white/5">
              <CheckCircle2 className="w-8 h-8 text-[#B7FF38] mx-auto mb-2" />
              <p className="text-xs text-[#8E8E8E] font-medium">All items are at healthy inventory levels.</p>
            </div>
          )}
        </div>
      </div>

      {/* Grid Bottom: Top Selling Table + Radar Animation AI Assistant Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Selling Products Table */}
        <div className="card-inspo p-6 lg:col-span-8">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
              <TrendingUp className="w-4 h-4 text-[#C6FF00]" />
              Top Selling Products (SQL Aggregated)
            </h2>
            <Link href="/inventory" className="text-xs font-semibold text-[#8E8E8E] hover:text-[#C6FF00] transition-colors border border-white/5 hover:border-white/10 px-3 py-1 rounded-xl bg-white/[0.02]">
              View All
            </Link>
          </div>

          {analytics?.best_sellers && analytics.best_sellers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#8E8E8E]">
                <thead className="text-[11px] font-semibold text-[#555555] uppercase border-b border-white/5">
                  <tr>
                    <th className="pb-3 px-3 font-semibold">SKU</th>
                    <th className="pb-3 px-3 font-semibold">Product Name</th>
                    <th className="pb-3 px-3 font-semibold">Qty Sold</th>
                    <th className="pb-3 px-3 font-semibold">Total Revenue</th>
                    <th className="pb-3 px-3 font-semibold">Profit</th>
                    <th className="pb-3 px-3 font-semibold">Stock Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {analytics.best_sellers.map((p) => (
                    <tr key={p.product_id} className="hover:bg-white/[0.025] transition-colors">
                      <td className="py-3.5 px-3 font-mono text-[#C6FF00]">{p.sku}</td>
                      <td className="py-3.5 px-3 font-medium text-white">{p.name}</td>
                      <td className="py-3.5 px-3 font-bold text-white font-mono">{p.total_quantity_sold}</td>
                      <td className="py-3.5 px-3 text-[#C6FF00] font-bold font-mono">${p.total_revenue}</td>
                      <td className="py-3.5 px-3 text-[#B7FF38] font-bold font-mono">${p.total_profit}</td>
                      <td className="py-3.5 px-3 font-medium text-[#8E8E8E] font-mono">{p.current_stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#8E8E8E] p-4 bg-[#101010] rounded-2xl border border-white/5">
              No Data Available
            </p>
          )}
        </div>

        {/* 3D Radar Animation AI Assistant Entry Card */}
        <Link href="/chat" className="lg:col-span-4 block">
          <div className="card-inspo relative min-h-[280px] h-full p-8 flex flex-col justify-between bg-[#080a04] border border-[#C6FF00]/30 shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(198,255,0,0.08)] hover:border-[#C6FF00]/60 transition-all duration-400 group overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-extrabold text-white tracking-tight mb-2">AI Assistant</h3>
              <p className="text-xs text-[#8E8E8E] max-w-[220px] leading-relaxed">
                Get intelligent insights, real-time spoilage simulations, and auto-generate vendor orders.
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-[#C6FF00] flex items-center justify-center text-black shadow-[0_0_25px_rgba(198,255,0,0.4)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300 relative z-10 mt-6">
              <ArrowRight className="w-6 h-6" />
            </div>

            {/* Interactive Radar Visual Effect */}
            <div className="absolute top-1/2 right-[-10%] -translate-y-1/2 w-80 h-80 flex items-center justify-center pointer-events-none z-0">
              <div className="radar-ring r-1" />
              <div className="radar-ring r-2" />
              <div className="radar-ring r-3" />
              <div className="radar-ring r-4" />
              <div className="radar-ring r-5" />
              <div className="radar-sweep-beam" />
              <div className="radar-center-beacon" />
            </div>
            <div className="radar-grid-floor" />
          </div>
        </Link>
      </div>
    </div>
  );
}
