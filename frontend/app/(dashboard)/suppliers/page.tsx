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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151C28] p-6 rounded-2xl border border-[#222D3F]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Supplier & Vendor Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage vendor details, contact persons, and delivery lead time parameters.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Supplier Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-400">Loading Suppliers...</div>
      ) : suppliers && suppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-white">{s.name}</h3>
                  <button
                    onClick={() => {
                      if (confirm(`Delete supplier '${s.name}'?`)) {
                        deleteMutation.mutate(s.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {s.contact_person && (
                  <p className="text-xs text-indigo-400 font-medium mt-1">Contact: {s.contact_person}</p>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-[#0E1420] p-3.5 rounded-xl border border-[#222D3F]">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.email || 'No email specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.phone || 'No phone specified'}</span>
                </div>
                <div className="flex items-center gap-2 text-amber-400 font-semibold pt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Lead Time: {s.lead_time_days} days</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-[#151C28] rounded-2xl border border-[#222D3F] text-slate-400">
          No Data Available
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#151C28] border border-[#222D3F] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#222D3F] pb-3">
              <h2 className="text-lg font-bold text-white">Add New Supplier</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
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
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amul Dairy Distributors"
                  className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendor@supply.com"
                    className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Delivery Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={leadTime}
                  onChange={(e) => setLeadTime(parseInt(e.target.value) || 3)}
                  className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-[#1E2738] text-slate-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 disabled:opacity-50"
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
