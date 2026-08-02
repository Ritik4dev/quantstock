'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AIExplanationModal from './AIExplanationModal';

interface ExplainWithAIButtonProps {
  topic: string;
  contextData: Record<string, any>;
  label?: string;
  size?: 'sm' | 'md';
}

export default function ExplainWithAIButton({
  topic,
  contextData,
  label = 'Explain with AI',
  size = 'sm',
}: ExplainWithAIButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all font-medium ${
          size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        }`}
        title={`Click to get AI explanation for ${topic}`}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        <span>{label}</span>
      </button>

      <AIExplanationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        topic={topic}
        contextData={contextData}
      />
    </>
  );
}
