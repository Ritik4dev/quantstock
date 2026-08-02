'use client';

import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';
import { Sparkles, X, Bot, ShieldCheck, CheckCircle, Lightbulb, RefreshCw } from 'lucide-react';

interface AIExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  contextData: Record<string, any>;
}

export default function AIExplanationModal({
  isOpen,
  onClose,
  topic,
  contextData,
}: AIExplanationModalProps) {
  const explainMutation = useMutation({
    mutationFn: () => chatService.explainMetric({ topic, context_data: contextData }),
  });

  React.useEffect(() => {
    if (isOpen) {
      explainMutation.mutate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-xl bg-[#151C28] border border-[#222D3F] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-[#222D3F] flex items-center justify-between bg-[#0E1420]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                AI Metric Breakdown
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Groq LLM Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">Topic: {topic}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1E2738] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Context Data Badges */}
          {Object.keys(contextData).length > 0 && (
            <div className="p-3 rounded-xl bg-[#0E1420] border border-[#222D3F] space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Target Context Metrics
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(contextData).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-2 py-1 rounded-lg bg-[#182130] text-slate-300 text-xs font-mono border border-slate-700/60"
                  >
                    <strong className="text-indigo-400 font-semibold">{k.replace('_', ' ')}:</strong>{' '}
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {explainMutation.isPending && (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <div className="w-9 h-9 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 animate-pulse">
                Analyzing PostgreSQL data & generating AI explanation...
              </p>
            </div>
          )}

          {/* Error State */}
          {explainMutation.isError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
              <span>Failed to fetch AI explanation. Please try again.</span>
              <button
                onClick={() => explainMutation.mutate()}
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-white font-semibold text-[11px] transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}

          {/* Explanation Content */}
          {explainMutation.isSuccess && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0E1420] border border-[#222D3F] space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wide">
                  <Bot className="w-4 h-4" /> AI Operations Analysis
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {explainMutation.data.explanation}
                </p>
              </div>

              {/* Actionable Strategy Callout Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <Lightbulb className="w-4 h-4" /> Recommended Next Action
                </div>
                <p className="text-xs text-slate-300">
                  Review stock level indicators and apply suggested reorder or clearance rules to protect store margin.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#222D3F] bg-[#0E1420] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PostgreSQL Verified Context</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1E2738] hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
