'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesService, ProductFinancialItem } from '@/services/salesService';
import { productService } from '@/services/productService';
import { TrendingUp, DollarSign, ShoppingBag, Percent, Filter } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface IndividualProductRevenueChartProps {
  selectedProductId?: number;
  productsList?: ProductFinancialItem[];
  onSelectProduct?: (id: number) => void;
}

export default function IndividualProductRevenueChart({
  selectedProductId,
  productsList,
  onSelectProduct
}: IndividualProductRevenueChartProps) {
  const [activeProductId, setActiveProductId] = useState<number | null>(selectedProductId || null);
  const [days, setDays] = useState(30);

  const { data: allProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts(),
  });

  useEffect(() => {
    if (selectedProductId) {
      setActiveProductId(selectedProductId);
    } else if (allProducts && allProducts.length > 0 && !activeProductId) {
      setActiveProductId(allProducts[0].id);
    }
  }, [selectedProductId, allProducts]);

  const { data: trendData, isLoading } = useQuery({
    queryKey: ['individualProductTrend', activeProductId, days],
    queryFn: () => (activeProductId ? salesService.getProductSalesTrend(activeProductId, days) : null),
    enabled: !!activeProductId,
  });

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    if (id) {
      setActiveProductId(id);
      if (onSelectProduct) onSelectProduct(id);
    }
  };

  const chartPoints = trendData?.trend_points || [];

  return (
    <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl space-y-6 shadow-xl">
      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222D3F] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Individual Product Revenue & Profit Chart
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select any registered product to inspect its specific revenue, profit, units sold, and margin trends.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Dropdown Product Selector */}
          <div className="relative">
            <select
              value={activeProductId || ''}
              onChange={handleProductChange}
              className="bg-[#0E1420] border border-[#222D3F] rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 pr-8"
            >
              {allProducts?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Days Selector */}
          <div className="flex items-center gap-1 bg-[#0E1420] p-1 rounded-xl border border-[#222D3F]">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  days === d
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Product Summary Cards */}
      {trendData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#0E1420] p-3 rounded-xl border border-[#222D3F]">
            <span className="text-slate-400 block font-medium flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Product Revenue
            </span>
            <span className="text-base font-bold text-emerald-400 mt-1 block">
              ${trendData.total_revenue.toFixed(2)}
            </span>
          </div>

          <div className="bg-[#0E1420] p-3 rounded-xl border border-[#222D3F]">
            <span className="text-slate-400 block font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              Product Net Profit
            </span>
            <span className="text-base font-bold text-indigo-400 mt-1 block">
              ${trendData.total_profit.toFixed(2)}
            </span>
          </div>

          <div className="bg-[#0E1420] p-3 rounded-xl border border-[#222D3F]">
            <span className="text-slate-400 block font-medium flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              Units Sold
            </span>
            <span className="text-base font-bold text-white mt-1 block">
              {trendData.total_units_sold} units
            </span>
          </div>

          <div className="bg-[#0E1420] p-3 rounded-xl border border-[#222D3F]">
            <span className="text-slate-400 block font-medium flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-purple-400" />
              Avg Profit Margin
            </span>
            <span className="text-base font-bold text-purple-400 mt-1 block">
              {trendData.avg_margin_pct.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading Product Revenue Trends...</div>
      ) : chartPoints.length > 0 ? (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartPoints} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="prodRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="prodProf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222D3F" />
              <XAxis dataKey="date_label" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#151C28',
                  borderColor: '#222D3F',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#prodRev)" name="Revenue ($)" />
              <Area type="monotone" dataKey="profit" stroke="#6366F1" fillOpacity={1} fill="url(#prodProf)" name="Profit ($)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 bg-[#0E1420] rounded-xl border border-[#222D3F]">
          No Sales Data Recorded for this Product in the Last {days} Days.
        </div>
      )}
    </div>
  );
}
