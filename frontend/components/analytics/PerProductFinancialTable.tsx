'use client';

import React, { useState } from 'react';
import { ProductFinancialItem } from '@/services/salesService';
import { DollarSign, TrendingUp, Layers, ArrowUpDown, CheckCircle2, AlertCircle } from 'lucide-react';

interface PerProductFinancialTableProps {
  products: ProductFinancialItem[];
  selectedProductId?: number;
  onSelectProduct: (productId: number) => void;
}

export default function PerProductFinancialTable({
  products,
  selectedProductId,
  onSelectProduct
}: PerProductFinancialTableProps) {
  const [sortField, setSortField] = useState<'total_revenue' | 'net_profit' | 'profit_margin_pct' | 'units_sold'>('total_revenue');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    return sortAsc ? valA - valB : valB - valA;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Healthy':
      case 'In Stock':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Low Stock':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Out Of Stock':
      case 'Out of Stock':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-[#151C28] border border-[#222D3F] rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#222D3F] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Per-Product Buying vs. Selling Financial Breakdown
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any row to inspect its individual revenue & profit chart above.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0E1420] uppercase text-[10px] text-slate-400 border-b border-[#222D3F]">
            <tr>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Product Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th
                onClick={() => handleSort('units_sold')}
                className="px-4 py-3 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  Units Sold <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold">Cost Price</th>
              <th className="px-4 py-3 font-semibold">Selling Price</th>
              <th
                onClick={() => handleSort('total_revenue')}
                className="px-4 py-3 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  Total Revenue ($) <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('net_profit')}
                className="px-4 py-3 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  Net Profit ($) <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('profit_margin_pct')}
                className="px-4 py-3 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  Margin (%) <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold">Remaining Stock</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222D3F]">
            {sortedProducts.map((p) => {
              const isSelected = selectedProductId === p.product_id;
              return (
                <tr
                  key={p.product_id}
                  onClick={() => onSelectProduct(p.product_id)}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-l-4 border-l-indigo-500 font-medium'
                      : 'hover:bg-[#1E2738]/50'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-indigo-400 font-semibold">{p.sku}</td>
                  <td className="px-4 py-3 font-bold text-white">{p.name}</td>
                  <td className="px-4 py-3 text-slate-400">{p.category}</td>
                  <td className="px-4 py-3 font-bold text-white">{p.units_sold} sold</td>
                  <td className="px-4 py-3 text-slate-400">${p.buying_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-300 font-medium">${p.selling_price.toFixed(2)}</td>
                  <td className="px-4 py-3 font-bold text-emerald-400">${p.total_revenue.toFixed(2)}</td>
                  <td className="px-4 py-3 font-bold text-indigo-400">${p.net_profit.toFixed(2)}</td>
                  <td className="px-4 py-3 font-bold text-purple-400">{p.profit_margin_pct.toFixed(1)}%</td>
                  <td className="px-4 py-3 font-semibold text-slate-200">{p.current_stock} units</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
