'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiDiscoveryService, ExtractedProfile } from '@/services/aiDiscoveryService';
import { businessService } from '@/services/businessService';
import { useAuthStore } from '@/store/useAuthStore';
import { formatApiError } from '@/utils/error';
import { Store, Bot, Check, Sparkles, AlertCircle, UploadCloud } from 'lucide-react';
import UniversalDocumentUploadModal from '@/components/inventory/UniversalDocumentUploadModal';
import SalesDocumentUploadModal from '@/components/pos/SalesDocumentUploadModal';

export default function AIDiscoveryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeBusiness } = useAuthStore();

  const [input, setInput] = useState('');
  const [salesInput, setSalesInput] = useState('');
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Document Upload Modal states
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);

  const interviewMutation = useMutation({
    mutationFn: (userText: string) => {
      const combinedText = salesInput.trim()
        ? `${userText}\n\nSales History & Daily Revenue Notes:\n${salesInput.trim()}`
        : userText;
      return aiDiscoveryService.interview(combinedText, extractedProfile || undefined);
    },
    onSuccess: (data) => {
      setExtractedProfile(data.extracted_profile);
      setMissingFields(data.missing_fields || []);
      setFollowupQuestions(data.followup_questions || []);
      setInput('');
      setSalesInput('');
      setError(null);
    },
    onError: (err: any) => {
      setError(formatApiError(err, 'Interview processing failed.'));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!extractedProfile) {
        throw new Error('No profile data to confirm.');
      }
      let bizId = activeBusiness?.id;
      if (!bizId) {
        const businesses = await businessService.getBusinesses();
        if (businesses.length > 0) {
          bizId = businesses[0].id;
        } else {
          throw new Error('No store registered. Please register a store first.');
        }
      }
      return aiDiscoveryService.confirm({
        business_id: bizId,
        confirmed: true,
        confirmed_profile: extractedProfile,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProfile'] });
      setIsConfirmed(true);
      setError(null);
      setTimeout(() => {
        router.push('/ai-discovery/analysis-summary');
      }, 1200);
    },
    onError: (err: any) => {
      setError(formatApiError(err, 'Confirmation failed.'));
    },
  });

  const isSubmitEnabled = input.trim().length > 0 || salesInput.trim().length > 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#C6FF00]/10 text-[#C6FF00] flex items-center justify-center border border-[#C6FF00]/20 font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">AI Store Discovery & Document Onboarding</h1>
            <p className="text-xs text-[#8E8E8E] mt-0.5">
              Describe your store, provide sales history, or upload product receipts to auto-populate inventory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsSalesModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-[0_4px_15px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2 shrink-0"
          >
            <UploadCloud className="w-4 h-4 text-white" />
            Upload Sales Log / Receipts
          </button>
          <button
            onClick={() => setIsDocModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#C6FF00] hover:bg-[#9DFF00] text-black text-xs font-bold shadow-[0_4px_15px_rgba(198,255,0,0.4)] transition-all flex items-center gap-2 shrink-0"
          >
            <UploadCloud className="w-4 h-4 text-black" />
            Upload Inventory CSV
          </button>
        </div>
      </div>

      {/* Embedded Quick Upload Box Banner */}
      <div className="bg-[#101010] border border-[#C6FF00]/20 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#C6FF00]/10 rounded-2xl text-[#C6FF00] border border-[#C6FF00]/20">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Have Inventory or Sales CSV / Receipt Files?</h3>
            <p className="text-xs text-[#8E8E8E] mt-0.5">
              Upload sales registers or product inventory files. AI will extract transactions and auto-sync directly to PostgreSQL.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSalesModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#151515] hover:bg-white/[0.04] text-indigo-400 border border-white/10 text-xs font-bold transition-all"
          >
            Sales CSV Upload
          </button>
          <button
            onClick={() => setIsDocModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#151515] hover:bg-white/[0.04] text-[#C6FF00] border border-white/10 text-xs font-bold transition-all"
          >
            Inventory CSV Upload
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4.5 rounded-2xl bg-[#FF5B5B]/10 border border-[#FF5B5B]/20 flex items-center gap-3 text-[#FF5B5B] text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Unified Registration Form Box */}
      <div className="card-inspo p-7 space-y-6">
        {/* Section 1: Store Description */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-2">
            1. Describe Your Store (Store Name, Location, Staff Size, Scale)
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. My store name is Metro Supermarket located in downtown area with 4 staff members..."
            className="w-full bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-2xl p-4 text-xs text-white placeholder-[#555555] focus:outline-none transition-all h-24"
          />
        </div>

        {/* Section 2: Sales History Input */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-2">
            2. Sales History & Revenue Notes (Optional / Enter details if available)
          </label>
          <textarea
            value={salesInput}
            onChange={(e) => setSalesInput(e.target.value)}
            placeholder="e.g. Average daily sales orders: ~50 orders, peak sales on weekends, top selling category: Beverages..."
            className="w-full bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-2xl p-4 text-xs text-white placeholder-[#555555] focus:outline-none transition-all h-20"
          />
        </div>

        {/* Submit to AI Engine Button (Enabled ONLY when input present) */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-[11px] text-[#8E8E8E]">
            {isSubmitEnabled ? 'Ready for AI Deep Analysis' : 'Please provide store description or sales notes above to enable AI Analysis'}
          </span>
          <button
            onClick={() => {
              if (isSubmitEnabled) interviewMutation.mutate(input.trim());
            }}
            disabled={interviewMutation.isPending || !isSubmitEnabled}
            className="px-6 py-3 bg-[#C6FF00] hover:bg-[#9DFF00] text-black font-bold rounded-2xl text-xs shadow-[0_4px_15px_rgba(198,255,0,0.4)] flex items-center gap-2 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4 text-black" />
            {interviewMutation.isPending ? 'Extracting Attributes...' : 'Submit to AI Engine'}
          </button>
        </div>

        {/* Extracted Profile Display */}
        {extractedProfile && (
          <div className="p-5 bg-[#101010] rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-[#B7FF38] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Extracted Store Attributes (Grounded)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#151515] p-3.5 rounded-xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-semibold">Category</span>
                <span className="text-white font-bold">{extractedProfile.business_type || 'Not Disclosed'}</span>
              </div>
              <div className="bg-[#151515] p-3.5 rounded-xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-semibold">Location</span>
                <span className="text-white font-bold">{extractedProfile.location_type || 'Not Disclosed'}</span>
              </div>
              <div className="bg-[#151515] p-3.5 rounded-xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-semibold">Daily Footfall</span>
                <span className="text-white font-bold font-mono">{extractedProfile.daily_customers || 'Not Disclosed'}</span>
              </div>
              <div className="bg-[#151515] p-3.5 rounded-xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-semibold">Scale</span>
                <span className="text-white font-bold">{extractedProfile.business_scale || 'Not Disclosed'}</span>
              </div>
              <div className="bg-[#151515] p-3.5 rounded-xl border border-white/5 col-span-2">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-semibold">Top Products</span>
                <span className="text-white font-bold">
                  {extractedProfile.top_products && extractedProfile.top_products.length > 0
                    ? extractedProfile.top_products.join(', ')
                    : 'Not Disclosed'}
                </span>
              </div>
            </div>

            {/* Follow up questions */}
            {followupQuestions && followupQuestions.length > 0 && (
              <div className="pt-3 border-t border-white/5">
                <span className="text-[10px] font-bold text-[#FFD84D] uppercase tracking-wider block mb-2">
                  Follow-up Questions (Click to answer):
                </span>
                <div className="space-y-2">
                  {followupQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => setInput(q)}
                      className="w-full text-left p-3 rounded-xl bg-[#151515] hover:bg-white/[0.04] text-xs text-[#C6FF00] border border-white/5 transition-colors font-medium"
                    >
                      ⚡ {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation Button */}
            <div className="pt-3 border-t border-white/5 flex justify-end">
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending || isConfirmed}
                className="px-6 py-3 bg-[#B7FF38] hover:bg-[#9DFF00] text-black font-bold rounded-2xl text-xs shadow-[0_4px_15px_rgba(183,255,56,0.3)] flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-black" />
                {isConfirmed ? 'Confirmed! Redirecting to Audit Report...' : 'Confirm & Save Store Profile to PostgreSQL'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Universal Document Upload Modal */}
      <UniversalDocumentUploadModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onUploadSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['storeAnalysisSummary'] });
        }}
      />

      {/* Sales Document Upload Modal */}
      <SalesDocumentUploadModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        onUploadSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['financialAnalytics'] });
          queryClient.invalidateQueries({ queryKey: ['storeAnalysisSummary'] });
          queryClient.invalidateQueries({ queryKey: ['dailyBrief'] });
        }}
      />
    </div>
  );
}
