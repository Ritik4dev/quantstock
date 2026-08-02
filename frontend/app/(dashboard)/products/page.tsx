'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, CreateProductPayload } from '@/services/productService';
import { Package, Plus, Search, Trash2, Edit3, X, Check } from 'lucide-react';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');

  // 1. Fetch Products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts(),
  });

  // 2. Add/Edit Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return productService.updateProduct(editingId, { name, sku, category, description });
      }
      return productService.createProduct({ name, sku, category, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCards'] });
      closeModal();
    },
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCards'] });
    },
  });

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setSku('');
    setCategory('General');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setName(p.name);
    setSku(p.sku);
    setCategory(p.category || 'General');
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const filteredProducts = products
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-[#C6FF00]" />
            Product Catalog
          </h1>
          <p className="text-xs text-[#8E8E8E] mt-1">
            Manage store catalog, SKU numbers, and category classifications.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-[#C6FF00] hover:bg-[#9DFF00] text-black font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(198,255,0,0.4)] flex items-center gap-2 text-xs shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4 text-black" />
          Add New Product
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-[#555555] absolute left-4 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name, SKU, or category..."
          className="w-full bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-[#555555] focus:outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        />
      </div>

      {/* Products Table */}
      <div className="card-inspo p-6 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#8E8E8E] font-mono">Loading Product Catalog...</div>
        ) : filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#8E8E8E]">
              <thead className="text-[11px] font-semibold text-[#555555] uppercase border-b border-white/5">
                <tr>
                  <th className="pb-3 px-3 font-semibold">SKU</th>
                  <th className="pb-3 px-3 font-semibold">Product Name</th>
                  <th className="pb-3 px-3 font-semibold">Category</th>
                  <th className="pb-3 px-3 font-semibold">Current Stock</th>
                  <th className="pb-3 px-3 font-semibold">Selling Price</th>
                  <th className="pb-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="py-3.5 px-3 font-mono text-xs text-[#C6FF00] font-semibold">{p.sku}</td>
                    <td className="py-3.5 px-3 font-medium text-white">{p.name}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#101010] text-[#8E8E8E] border border-white/5">
                        {p.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-white font-mono">
                      {p.inventory ? p.inventory.current_stock : 0}
                    </td>
                    <td className="py-3.5 px-3 text-[#C6FF00] font-bold font-mono">
                      ${p.inventory ? p.inventory.selling_price : '0.00'}
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-xl bg-[#101010] border border-white/10 text-[#8E8E8E] hover:text-[#C6FF00] transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete '${p.name}'?`)) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                        className="p-1.5 rounded-xl bg-[#FF5B5B]/10 text-[#FF5B5B] hover:bg-[#FF5B5B]/20 transition-colors border border-[#FF5B5B]/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-[#8E8E8E]">No Data Available</div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#151515] border border-white/10 rounded-3xl p-6 shadow-[0_30px_60px_rgba(0,0,0,0.9)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-base font-bold text-white tracking-tight">
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={closeModal} className="text-[#8E8E8E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#555555] mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Organic Almond Milk 1L"
                  className="w-full bg-[#101010] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6FF00]/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#555555] mb-1">
                  SKU Code (Auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SKU-MILK-101"
                  className="w-full bg-[#101010] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#C6FF00]/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#555555] mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Dairy, Beverages, Bakery"
                  className="w-full bg-[#101010] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6FF00]/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#555555] mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product description notes..."
                  className="w-full bg-[#101010] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6FF00]/50 h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-[#101010] border border-white/10 text-[#8E8E8E] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#C6FF00] hover:bg-[#9DFF00] text-black text-xs font-bold shadow-[0_4px_15px_rgba(198,255,0,0.4)] disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
