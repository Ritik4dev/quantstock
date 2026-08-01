'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiDiscoveryService, ExtractedProfile } from '@/services/aiDiscoveryService';
import { businessService } from '@/services/businessService';
import { useAuthStore } from '@/store/useAuthStore';
import { formatApiError } from '@/utils/error';
import { Store, Bot, Check, Sparkles, AlertCircle } from 'lucide-react';

export default function AIDiscoveryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeBusiness } = useAuthStore();

  const [input, setInput] = useState('');
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interviewMutation = useMutation({
    mutationFn: (userText: string) => aiDiscoveryService.interview(userText, extractedProfile || undefined),
    onSuccess: (data) => {
      setExtractedProfile(data.extracted_profile);
      setMissingFields(data.missing_fields || []);
      setFollowupQuestions(data.followup_questions || []);
      setInput('');
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
        router.push('/dashboard');
      }, 1200);
    },
    onError: (err: any) => {
      setError(formatApiError(err, 'Confirmation failed.'));
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#151C28] p-6 rounded-2xl border border-[#222D3F]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Store Discovery Interview</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Describe your retail store naturally. The AI will extract key parameters and ask targeted follow-up questions.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Box */}
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl space-y-6">
        {/* Input box */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Describe Your Store (Location, Daily Customers, Top Products, Suppliers, Scale)
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. I own a grocery store near a college campus with ~150 daily customers. Cold drinks, Maggi, and biscuits sell the most..."
            className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 h-28"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                if (input.trim()) interviewMutation.mutate(input.trim());
              }}
              disabled={interviewMutation.isPending || !input.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              <Bot className="w-4 h-4" />
              {interviewMutation.isPending ? 'Extracting Attributes...' : 'Submit to AI Engine'}
            </button>
          </div>
        </div>

        {/* Extracted Profile Display */}
        {extractedProfile && (
          <div className="p-5 bg-[#0E1420] rounded-xl border border-[#222D3F] space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Extracted Store Attributes
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#151C28] p-3 rounded-lg border border-[#222D3F]">
                <span className="text-slate-400 block font-medium">Category</span>
                <span className="text-white font-bold">{extractedProfile.business_type || 'N/A'}</span>
              </div>
              <div className="bg-[#151C28] p-3 rounded-lg border border-[#222D3F]">
                <span className="text-slate-400 block font-medium">Location</span>
                <span className="text-white font-bold">{extractedProfile.location_type || 'N/A'}</span>
              </div>
              <div className="bg-[#151C28] p-3 rounded-lg border border-[#222D3F]">
                <span className="text-slate-400 block font-medium">Daily Customers</span>
                <span className="text-white font-bold">{extractedProfile.daily_customers || 'N/A'}</span>
              </div>
              <div className="bg-[#151C28] p-3 rounded-lg border border-[#222D3F]">
                <span className="text-slate-400 block font-medium">Scale</span>
                <span className="text-white font-bold">{extractedProfile.business_scale || 'N/A'}</span>
              </div>
              <div className="bg-[#151C28] p-3 rounded-lg border border-[#222D3F] col-span-2">
                <span className="text-slate-400 block font-medium">Top Products</span>
                <span className="text-white font-bold">
                  {extractedProfile.top_products ? extractedProfile.top_products.join(', ') : 'N/A'}
                </span>
              </div>
            </div>

            {/* Follow up questions */}
            {followupQuestions && followupQuestions.length > 0 && (
              <div className="pt-3 border-t border-[#222D3F]">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">
                  Follow-up Questions (Click to answer):
                </span>
                <div className="space-y-1.5">
                  {followupQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => setInput(q)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#151C28] hover:bg-[#1E2738] text-xs text-slate-300 border border-[#222D3F] transition-colors"
                    >
                      • {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation Button */}
            <div className="pt-3 border-t border-[#222D3F] flex justify-end">
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending || isConfirmed}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isConfirmed ? 'Confirmed! Redirecting...' : 'Confirm & Save Store Profile to PostgreSQL'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
