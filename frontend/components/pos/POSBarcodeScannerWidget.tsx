'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { salesService, POSCheckoutResponse } from '@/services/salesService';
import { productService } from '@/services/productService';
import { Scan, ShoppingCart, CheckCircle2, AlertCircle, Sparkles, Tag, ArrowRight } from 'lucide-react';

interface POSBarcodeScannerWidgetProps {
  onSaleSuccess?: () => void;
}

export default function POSBarcodeScannerWidget({ onSaleSuccess }: POSBarcodeScannerWidgetProps) {
  const queryClient = useQueryClient();
  const [skuInput, setSkuInput] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [lastCheckout, setLastCheckout] = useState<POSCheckoutResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts(),
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const priceVal = customPrice ? parseFloat(customPrice) : undefined;
      return salesService.scanPOSCheckout(skuInput.trim(), quantity, priceVal);
    },
    onSuccess: (data) => {
      setLastCheckout(data);
      setErrorMsg(null);
      setSkuInput('');
      setQuantity(1);
      setCustomPrice('');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalytics'] });
      if (onSaleSuccess) onSaleSuccess();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.message || 'POS Checkout failed.';
      setErrorMsg(msg);
    },
  });

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuInput.trim()) return;
    scanMutation.mutate();
  };

  return (
    <div className="bg-[#151C28] border border-[#222D3F] rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left Section: Scanner Input */}
        <div className="space-y-3 flex-1 w-full">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Scan className="w-5 h-5" />
            </div>
            <span>Real-Time POS Barcode Scanner & Billing System</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Auto Stock Sync
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Scan item barcode, SKU, or select product. Scans instantly record sales & auto-decrement inventory stock in PostgreSQL.
          </p>

          <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="relative flex-1">
              <Scan className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                ref={inputRef}
                type="text"
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                placeholder="Scan barcode or type SKU (e.g. MILK-001, Maggi)..."
                className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Quick Product Select Dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value) setSkuInput(e.target.value);
              }}
              className="bg-[#0E1420] border border-[#222D3F] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Quick Select Item...</option>
              {products?.map((p) => (
                <option key={p.id} value={p.sku || p.name}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>

            {/* Quantity Input */}
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20 bg-[#0E1420] border border-[#222D3F] rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 text-center font-bold"
            />

            <button
              type="submit"
              disabled={scanMutation.isPending || !skuInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <ShoppingCart className="w-4 h-4" />
              {scanMutation.isPending ? 'Processing POS...' : 'Checkout Sale'}
            </button>
          </form>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Section: Recent POS Receipt Badge */}
        {lastCheckout && (
          <div className="bg-[#0E1420] border border-emerald-500/30 rounded-2xl p-4 min-w-[280px] space-y-2 shadow-lg shrink-0">
            <div className="flex items-center justify-between text-xs border-b border-[#222D3F] pb-2">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                POS Sale Completed!
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(lastCheckout.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-white">{lastCheckout.product_name}</div>
              <div className="text-xs text-indigo-400 font-mono">{lastCheckout.sku}</div>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 border-t border-[#222D3F]">
              <span className="text-slate-400">
                {lastCheckout.quantity_sold} x ${lastCheckout.unit_price.toFixed(2)}
              </span>
              <span className="text-emerald-400 font-extrabold text-sm">
                ${lastCheckout.total_amount.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] pt-1 text-slate-400">
              <span>
                Stock: {lastCheckout.previous_stock} → <strong className="text-white">{lastCheckout.remaining_stock} remaining</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300">
                {lastCheckout.stock_status}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
