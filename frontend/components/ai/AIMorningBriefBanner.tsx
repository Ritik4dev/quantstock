'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';
import { Sparkles, Volume2, VolumeX, AlertTriangle, ArrowUpRight, ShoppingCart, Bot, ShieldCheck } from 'lucide-react';

export default function AIMorningBriefBanner() {
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: brief, isLoading } = useQuery({
    queryKey: ['dailyBrief'],
    queryFn: chatService.getDailyBrief,
  });

  const handleSpeak = () => {
    if (!brief || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const textToSpeak = `${brief.greeting}. Expected sales today are ${brief.expected_sales_today} units. You have ${brief.low_stock_count} low stock warnings. Key opportunities: ${brief.business_opportunities.join(', ')}. ${brief.business_summary}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleOpenCopilot = () => {
    window.dispatchEvent(new CustomEvent('open-ai-copilot-drawer'));
  };

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-[#151C28] border border-[#222D3F] animate-pulse flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-slate-800 rounded" />
          <div className="h-6 w-96 bg-slate-800 rounded" />
        </div>
        <div className="h-10 w-32 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#11140A] via-[#151515] to-[#101010] border border-[#C6FF00]/20 p-7 shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(198,255,0,0.05)]">
      {/* Background Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#C6FF00]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Column: Greeting & Summary */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C6FF00]/10 text-[#C6FF00] border border-[#C6FF00]/20">
              <Sparkles className="w-3.5 h-3.5 text-[#C6FF00] animate-pulse" />
              AI Morning Intelligence
            </span>
            <span className="text-xs text-[#8E8E8E] font-mono">{brief.date}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            {brief.greeting}
          </h2>

          <p className="text-xs sm:text-sm text-[#8E8E8E] leading-relaxed max-w-3xl">
            {brief.business_summary}
          </p>

          {/* Key Opportunities Pills */}
          {brief.business_opportunities && brief.business_opportunities.length > 0 && (
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-[#555555] tracking-wider">
                Priority Actions:
              </span>
              {brief.business_opportunities.map((opp, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl text-xs bg-[#101010] text-[#C6FF00] border border-white/5 flex items-center gap-1 font-medium"
                >
                  <ArrowUpRight className="w-3 h-3 text-[#B7FF38]" />
                  {opp}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Key Metrics & Audio Action */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
          <div className="flex items-center gap-4 bg-[#101010] p-4 rounded-2xl border border-white/5">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#555555] tracking-wider">
                Expected Sales Today
              </div>
              <div className="text-xl font-extrabold text-[#C6FF00] font-mono">
                {brief.expected_sales_today} <span className="text-xs font-normal text-[#8E8E8E]">units</span>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-white/5" />
            <div>
              <div className="text-[10px] uppercase font-bold text-[#555555] tracking-wider">
                Low Stock Warnings
              </div>
              <div className="text-xl font-extrabold text-[#FFD84D] flex items-center gap-1 font-mono">
                <AlertTriangle className="w-4 h-4 text-[#FFD84D] shrink-0" />
                {brief.low_stock_count}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Voice Audio Playback Button */}
            <button
              onClick={handleSpeak}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-semibold text-xs transition-all border flex items-center justify-center gap-2 ${
                isPlaying
                  ? 'bg-[#FFD84D]/20 text-[#FFD84D] border-[#FFD84D]/40 animate-pulse'
                  : 'bg-[#101010] hover:bg-white/[0.04] text-white border-white/10'
              }`}
            >
              {isPlaying ? <VolumeX className="w-4 h-4 text-[#FFD84D]" /> : <Volume2 className="w-4 h-4 text-[#C6FF00]" />}
              <span>{isPlaying ? 'Mute Speech' : 'Listen to Brief'}</span>
            </button>

            {/* Ask AI Copilot Button */}
            <button
              onClick={handleOpenCopilot}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-[#C6FF00] hover:bg-[#9DFF00] text-black rounded-xl font-bold text-xs shadow-[0_4px_15px_rgba(198,255,0,0.4)] transition-all flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4 text-black" />
              <span>Ask Copilot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
