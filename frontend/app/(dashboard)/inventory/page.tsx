'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { productService } from '@/services/productService';
import { dashboardService } from '@/services/dashboardService';
import { Boxes, Search, Edit3, Plus, AlertCircle, CheckCircle2, X, UploadCloud, Sparkles, TrendingUp } from 'lucide-react';
import ExplainWithAIButton from '@/components/ai/ExplainWithAIButton';
import LastUploadStatusBanner from '@/components/inventory/LastUploadStatusBanner';
import UniversalDocumentUploadModal from '@/components/inventory/UniversalDocumentUploadModal';
import ItemStockIntelligenceBanner from '@/components/inventory/ItemStockIntelligenceBanner';
import IndividualProductForecastModal from '@/components/ai/IndividualProductForecastModal';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // State for Individual Product Prediction Modal
  const [forecastTarget, setForecastTarget] = useState<{
    id: number;
    name: string;
    sku: string;
    stock: number;
  } | null>(null);

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
    queryFn: () => productService.getProducts(),
  });

  const { data: stockSuggestions } = useQuery({
    queryKey: ['itemStockSuggestions'],
    queryFn: dashboardService.getItemStockSuggestions,
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
      queryClient.invalidateQueries({ queryKey: ['itemStockSuggestions'] });
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

  const getItemSuggestion = (productId: number) => {
    return stockSuggestions?.find((s) => s.product_id === productId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Healthy':
      case 'In Stock':
        return 'bg-[#B7FF38]/10 text-[#B7FF38] border-[#B7FF38]/20';
      case 'Low Stock':
        return 'bg-[#FFD84D]/10 text-[#FFD84D] border-[#FFD84D]/20';
      case 'Out Of Stock':
      case 'Out of Stock':
        return 'bg-[#FF5B5B]/10 text-[#FF5B5B] border-[#FF5B5B]/20';
      case 'Overstock':
        return 'bg-[#C6FF00]/10 text-[#C6FF00] border-[#C6FF00]/20';
      case 'Expired':
      case 'Expiring Soon':
        return 'bg-[#101010] text-[#8E8E8E] border-white/5';
      default:
        return 'bg-[#101010] text-[#8E8E8E] border-white/5';
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
    <div className="space-y-8 fade-in-up">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#C6FF00]" />
            Inventory Stock Management & Item Intelligence
          </h1>
          <p className="text-xs text-[#8E8E8E] mt-1">
            Real-time stock levels, XGBoost item-level restocking intelligence, multi-format document parsing, and additive stock sync.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-[#C6FF00] hover:bg-[#9DFF00] text-black text-xs font-bold shadow-[0_4px_15px_rgba(198,255,0,0.4)] transition-all flex items-center gap-2 shrink-0 self-start sm:self-center"
        >
          <UploadCloud className="w-4 h-4 text-black" />
          Upload Invoice / Document
        </button>
      </div>

      {/* Last Uploaded Document Status Audit Banner */}
      <LastUploadStatusBanner onOpenUploadModal={() => setIsUploadModalOpen(true)} />

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-[#555555] absolute left-4 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter stock records by product name, SKU, or status (Healthy, Low Stock, Overstock)..."
          className="w-full bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-[#555555] focus:outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        />
      </div>

      {/* Item-Level Cards */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#8E8E8E] bg-[#101010] rounded-2xl border border-white/5 font-mono">
            Loading Inventory Stock & Item Intelligence...
          </div>
        ) : filteredInventory.length > 0 ? (
          filteredInventory.map((inv) => {
            const suggestion = getItemSuggestion(inv.product_id);
            const pName = getProductName(inv.product_id);
            const pSKU = getProductSKU(inv.product_id);

            return (
              <div key={inv.id} className="card-inspo p-6 space-y-4">
                {/* 1. Item-Level Stock Intelligence Banner Directly Above Product */}
                <ItemStockIntelligenceBanner suggestion={suggestion} />

                {/* 2. Product Row Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded-xl text-[#C6FF00] font-bold font-mono text-xs">
                      {pSKU}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{pName}</h3>
                      <div className="flex items-center gap-3 text-xs text-[#8E8E8E] mt-0.5 font-mono">
                        <span>Cost: <strong className="text-white">${inv.buying_price.toFixed(2)}</strong></span>
                        <span>•</span>
                        <span>Retail: <strong className="text-[#C6FF00]">${inv.selling_price.toFixed(2)}</strong></span>
                        {inv.expiry_date && (
                          <>
                            <span>•</span>
                            <span>Expires: <strong className="text-[#FFD84D]">{new Date(inv.expiry_date).toLocaleDateString()}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <div className="text-right mr-3">
                      <div className="text-lg font-black text-white font-mono">{inv.current_stock} units</div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </div>

                    {/* Dedicated Predict Demand Button per Product */}
                    <button
                      onClick={() =>
                        setForecastTarget({
                          id: inv.product_id,
                          name: pName,
                          sku: pSKU,
                          stock: inv.current_stock,
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#C6FF00] hover:bg-[#9DFF00] text-black shadow-[0_4px_15px_rgba(198,255,0,0.3)] transition-all text-xs font-bold flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-black" />
                      Predict Demand
                    </button>

                    <ExplainWithAIButton
                      topic={`Inventory Item '${pName}' Status`}
                      contextData={{
                        product: pName,
                        current_stock: inv.current_stock,
                        minimum_stock: inv.minimum_stock,
                        buying_price: inv.buying_price,
                        status: inv.status,
                      }}
                    />

                    <button
                      onClick={() => {
                        setEditingInv(inv);
                        setStock(inv.current_stock);
                        setCost(inv.buying_price);
                        setPrice(inv.selling_price);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-[#C6FF00] hover:bg-white/[0.04] transition-colors text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Adjust
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-xs text-[#8E8E8E] bg-[#101010] rounded-2xl border border-white/5">
            No Inventory Items Found.{' '}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="text-[#C6FF00] underline hover:text-[#9DFF00] font-medium ml-1"
            >
              Upload a document or invoice to generate stock
            </button>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {editingInv && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#151515] border border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white tracking-tight">Adjust Stock for {getProductName(editingInv.product_id)}</h3>
              <button onClick={() => setEditingInv(null)} className="text-[#8E8E8E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#8E8E8E] block mb-1">Current Stock Quantity</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#101010] border border-white/5 rounded-xl px-3.5 py-2.5 text-white font-bold font-mono focus:border-[#C6FF00]/50 outline-none"
                />
              </div>

              <div>
                <label className="text-[#8E8E8E] block mb-1">Buying Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#101010] border border-white/5 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-[#C6FF00]/50 outline-none"
                />
              </div>

              <div>
                <label className="text-[#8E8E8E] block mb-1">Selling Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#101010] border border-white/5 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-[#C6FF00]/50 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
              <button
                onClick={() => setEditingInv(null)}
                className="px-4 py-2 rounded-xl bg-[#101010] border border-white/10 text-[#8E8E8E] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="px-5 py-2 rounded-xl bg-[#C6FF00] hover:bg-[#9DFF00] text-black text-xs font-bold shadow-[0_4px_15px_rgba(198,255,0,0.4)]"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Stock Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Product Forecast Modal */}
      {forecastTarget && (
        <IndividualProductForecastModal
          productId={forecastTarget.id}
          productName={forecastTarget.name}
          sku={forecastTarget.sku}
          currentStock={forecastTarget.stock}
          onClose={() => setForecastTarget(null)}
        />
      )}

      {/* Multi-Format Universal Document Upload Modal */}
      <UniversalDocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
