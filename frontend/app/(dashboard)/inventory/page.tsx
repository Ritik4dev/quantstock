'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { productService } from '@/services/productService';
import { Boxes, Search, Edit3, Plus, AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingInv, setEditingInv] = useState<any | null>(null);
  const [stock, setStock] = useState(0);
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);

  const { data: inventoryList, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryService.getInventory,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingInv) return;
      return inventoryService.updateInventory(editingInv.id, {
        current_stock: stock,
        buying_price: cost,
        selling_price: price,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCards'] });
      setEditingInv(null);
    },
  });

  const getProductName = (productId: number) => {
    const p = products?.find((prod) => prod.id === productId);
    return p ? p.name : `Product #${productId}`;
  };

  const getProductSKU = (productId: number) => {
    const p = products?.find((prod) => prod.id === productId);
    return p ? p.sku : `SKU-${productId}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Healthy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Low Stock':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Out Of Stock':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Overstock':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'Expired':
      case 'Expiring Soon':
        return 'bg-slate-700 text-slate-300 border-slate-600';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const filteredInventory = inventoryList
    ? inventoryList.filter((inv) => {
        const name = getProductName(inv.product_id).toLowerCase();
        const sku = getProductSKU(inv.product_id).toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || sku.includes(q) || inv.status.toLowerCase().includes(q);
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151C28] p-6 rounded-2xl border border-[#222D3F]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-violet-400" />
            Inventory Stock Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time stock levels, pricing parameters, and dynamic status badges.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter stock records by product name, SKU, or status (Healthy, Low Stock, Overstock)..."
          className="w-full bg-[#151C28] border border-[#222D3F] rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Stock Table */}
      <div className="bg-[#151C28] border border-[#222D3F] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading Inventory Stock...</div>
        ) : filteredInventory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0E1420] text-xs uppercase text-slate-400 border-b border-[#222D3F]">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">SKU</th>
                  <th className="px-4 py-3.5 font-semibold">Product Name</th>
                  <th className="px-4 py-3.5 font-semibold">Current Stock</th>
                  <th className="px-4 py-3.5 font-semibold">Buying Cost</th>
                  <th className="px-4 py-3.5 font-semibold">Selling Price</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222D3F]">
                {filteredInventory.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#1E2738]/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-indigo-400 font-semibold">
                      {getProductSKU(inv.product_id)}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-white">{getProductName(inv.product_id)}</td>
                    <td className="px-4 py-3.5 font-bold text-white">{inv.current_stock}</td>
                    <td className="px-4 py-3.5 text-slate-400">${inv.buying_price.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-emerald-400 font-semibold">${inv.selling_price.toFixed(2)}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          inv.status
                        )}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setEditingInv(inv);
                          setStock(inv.current_stock);
                          setCost(inv.buying_price);
                          setPrice(inv.selling_price);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#1E2738] text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 ml-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">No Data Available</div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {editingInv && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#151C28] border border-[#222D3F] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#222D3F] pb-3">
              <h2 className="text-lg font-bold text-white">Adjust Stock & Pricing</h2>
              <button onClick={() => setEditingInv(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-[#0E1420] rounded-xl border border-[#222D3F]">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Target Item</div>
              <div className="text-sm font-bold text-white">{getProductName(editingInv.product_id)}</div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Current Stock Units
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Buying Price ($ Cost)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={cost}
                  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Selling Price ($ Retail)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingInv(null)}
                  className="px-4 py-2 rounded-xl bg-[#1E2738] text-slate-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Save Stock Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
