'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierService, CreateSupplierPayload } from '@/services/supplierService';
import { Users, Plus, Trash2, Mail, Phone, Clock, X } from 'lucide-react';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leadTime, setLeadTime] = useState(3);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: supplierService.getSuppliers,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSupplierPayload) => supplierService.createSupplier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplierService.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setLeadTime(3);
  };

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#C6FF00]" />
            Supplier & Vendor Directory
          </h1>
          <p className="text-xs text-[#8E8E8E] mt-1">
            Manage vendor details, contact persons, and delivery lead time parameters.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#C6FF00] hover:bg-[#9DFF00] text-black font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(198,255,0,0.4)] flex items-center gap-2 text-xs shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4 text-black" />
          Add Supplier
        </button>
      </div>

      {/* Supplier Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-[#8E8E8E] bg-[#101010] rounded-2xl border border-white/5 font-mono">Loading Suppliers...</div>
      ) : suppliers && suppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((s) => (
            <div key={s.id} className="card-inspo p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight">{s.name}</h3>
                  <button
                    onClick={() => {
                      if (confirm(`Delete supplier '${s.name}'?`)) {
                        deleteMutation.mutate(s.id);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-[#FF5B5B]/10 text-[#FF5B5B] hover:bg-[#FF5B5B]/20 transition-colors border border-[#FF5B5B]/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {s.contact_person && (
                  <p className="text-xs text-[#C6FF00] font-semibold mt-1 font-mono">Contact: {s.contact_person}</p>
                )}
              </div>

              <div className="space-y-2 text-xs text-[#8E8E8E] bg-[#101010] p-4 rounded-2xl border border-white/5 font-mono">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#555555]" />
                  <span>{s.email || 'No email specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#555555]" />
                  <span>{s.phone || 'No phone specified'}</span>
                </div>
                <div className="flex items-center gap-2 text-[#FFD84D] font-bold pt-1">
                  <Clock className="w-3.5 h-3.5 text-[#FFD84D]" />
                  <span>Lead Time: {s.lead_time_days} days</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-[#101010] rounded-2xl border border-white/5 text-xs text-[#8E8E8E]">
          No Data Available
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#151515] border border-white/10 rounded-3xl p-6 shadow-[0_30px_60px_rgba(0,0,0,0.9)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-base font-bold text-white tracking-tight">Add New Supplier</h2>
              <button onClick={closeModal} className="text-[#8E8E8E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  name,
                  contact_person: contactPerson,
                  email,
                  phone,
                  lead_time_days: leadTime,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#555555] mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amul Dairy Distributors"
                  className="w-full bg-[#101010] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6FF00]/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#555555] mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-[#101010] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6FF00]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#555555] mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendor@supply.com"
                    className="w-full bg-[#101010] border border-white/5 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#C6FF00]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#555555] mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#101010] border border-white/5 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#C6FF00]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#555555] mb-1">
                  Delivery Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={leadTime}
                  onChange={(e) => setLeadTime(parseInt(e.target.value) || 3)}
                  className="w-full bg-[#101010] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#C6FF00]/50"
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
                  disabled={createMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#C6FF00] hover:bg-[#9DFF00] text-black text-xs font-bold shadow-[0_4px_15px_rgba(198,255,0,0.4)] disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
