'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { productService, Product } from '@/services/productService';
import { Bell, User as UserIcon, ShieldCheck, Sparkles, Search, Package, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close search popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle live product search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsPopoverOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const products = await productService.getProducts(searchQuery.trim());
        setSearchResults(products || []);
        setIsPopoverOpen(true);
      } catch (err) {
        console.error('Universal product search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenCopilot = () => {
    window.dispatchEvent(new CustomEvent('open-ai-copilot-drawer'));
  };

  return (
    <header className="h-[80px] bg-[#151515]/70 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Center: Universal Product Search Bar */}
      <div className="hidden md:flex items-center relative" ref={popoverRef}>
        <div className="relative w-[400px]">
          <Search className="w-4 h-4 text-[#555555] absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setIsPopoverOpen(true);
            }}
            placeholder="Search products, orders, forecasts..."
            className="w-full bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-xl pl-11 pr-12 py-2.5 text-xs text-white placeholder-[#555555] focus:outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] font-medium focus:ring-1 focus:ring-[#C6FF00]/20"
          />
          <span className="absolute right-3 top-2.5 bg-[#151515] border border-white/5 px-2 py-0.5 rounded text-[10px] font-mono text-[#8E8E8E]">
            ⌘K
          </span>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsPopoverOpen(false);
              }}
              className="absolute right-12 top-3 text-[#555555] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Real-Time Search Results Popover */}
        {isPopoverOpen && (
          <div className="absolute top-14 left-0 w-[400px] bg-[#101010]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-white/5">
            <div className="px-4 py-2.5 bg-[#151515] text-[10px] uppercase font-bold text-[#8E8E8E] flex justify-between items-center">
              <span>Universal Database Search Results</span>
              <span className="text-[#C6FF00]">{searchResults.length} Products</span>
            </div>

            {isSearching ? (
              <div className="p-4 text-xs text-[#8E8E8E] text-center">Searching Database...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((product) => (
                <Link
                  key={product.id}
                  href={`/inventory?search=${encodeURIComponent(product.name)}`}
                  onClick={() => setIsPopoverOpen(false)}
                  className="p-3 hover:bg-white/[0.03] flex items-center justify-between transition-colors group block"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded-xl text-[#C6FF00] group-hover:scale-105 transition-transform">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-[#C6FF00] transition-colors">
                        {product.name}
                      </div>
                      <div className="text-[10px] text-[#8E8E8E] font-mono flex items-center gap-2">
                        <span>SKU: {product.sku}</span>
                        <span>•</span>
                        <span>{product.category || 'General'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-[#C6FF00]">
                      ${product.inventory?.selling_price ? product.inventory.selling_price.toFixed(2) : '0.00'}
                    </div>
                    <div className="text-[10px] text-[#8E8E8E]">
                      {product.inventory?.current_stock ?? 0} in stock
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-4 text-xs text-[#8E8E8E] text-center">
                No matching products found in database.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: AI Status, Notifications & User Profile */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 text-[#C6FF00] bg-[#C6FF00]/5 px-3 py-1.5 rounded-xl border border-[#C6FF00]/10 text-xs font-semibold">
          <div className="pulsing-orb" />
          AI Active
        </div>

        <button
          onClick={handleOpenCopilot}
          className="p-2.5 rounded-xl bg-transparent border border-white/5 text-[#8E8E8E] hover:text-[#C6FF00] hover:border-white/10 transition-all relative shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          title="Open AI Copilot"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <button className="p-2.5 rounded-xl bg-transparent border border-white/5 text-[#8E8E8E] hover:text-white hover:border-white/10 transition-all relative shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#C6FF00] absolute top-2 right-2 shadow-[0_0_8px_#C6FF00]" />
        </button>

        <div className="h-5 w-[1px] bg-white/5" />

        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-[#151515] text-[#C6FF00] flex items-center justify-center font-bold text-sm border border-white/10 shadow-[0_0_10px_rgba(198,255,0,0.1)]">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-bold text-white tracking-wide">{user?.name || 'Pranab Saini'}</div>
            <div className="text-[11px] text-[#8E8E8E]">Business Owner</div>
          </div>
        </div>
      </div>
    </header>
  );
}
