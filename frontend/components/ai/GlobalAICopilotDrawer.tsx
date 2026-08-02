'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';
import { Bot, X, Send, User, Sparkles, ShieldCheck, ChevronRight, Zap, CheckCircle2, AlertCircle, Command } from 'lucide-react';

interface ChatMsg {
  sender: 'user' | 'assistant';
  text: string;
  isCommandResult?: boolean;
  commandData?: {
    action?: string;
    product_name?: string;
    quantity?: number;
    executed?: boolean;
    result_message?: string;
  };
  sources?: string[];
  suggestedFollowups?: string[];
}

export default function GlobalAICopilotDrawer() {
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      sender: 'assistant',
      text: "Hello! I am Quadstock AI. I can answer operations questions OR execute live inventory commands (e.g., 'I sold 10 Milk', 'Add 50 Coke').",
    },
  ]);

  // Global Keyboard Shortcut (Cmd+K or Ctrl+K) & Custom Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-ai-copilot-drawer', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-ai-copilot-drawer', handleCustomOpen);
    };
  }, []);

  // Standard Q&A Chat Mutation
  const chatMutation = useMutation({
    mutationFn: (msg: string) => chatService.chat({ message: msg, session_id: sessionId }),
    onSuccess: (data) => {
      if (data.session_id) setSessionId(data.session_id);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: data.message,
          sources: data.grounding_sources,
          suggestedFollowups: data.suggested_followups,
        },
      ]);
    },
  });

  // Natural Language Inventory Command Parser & SQL Execution Mutation
  const commandMutation = useMutation({
    mutationFn: (commandText: string) => chatService.parseCommand(commandText),
    onSuccess: (res) => {
      const executed = res.executed ?? false;
      const msg = res.message || `Parsed action '${res.action}' for ${res.quantity} unit(s) of ${res.product_name}.`;

      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: msg,
          isCommandResult: true,
          commandData: {
            action: res.action,
            product_name: res.product_name,
            quantity: res.quantity,
            executed,
            result_message: msg,
          },
          sources: ['Natural Language Command Parser', 'PostgreSQL SQL Executor'],
        },
      ]);
    },
    onError: (err: any) => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: err?.response?.data?.detail || "Could not parse or execute command. Please specify action, product, and quantity.",
          isCommandResult: true,
        },
      ]);
    },
  });

  // Auto-detect if input is a natural language command vs standard Q&A chat
  const isCommandIntent = (text: string): boolean => {
    const t = text.toLowerCase().trim();
    const commandWords = ['sold', 'sale', 'add', 'added', 'restock', 'restocked', 'received', 'bought', 'remove', 'removed', 'expired', 'waste', 'deduct'];
    return commandWords.some((w) => t.includes(w));
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = input.trim();
    if (!userText || chatMutation.isPending || commandMutation.isPending) return;

    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');

    if (isCommandIntent(userText)) {
      commandMutation.mutate(userText);
    } else {
      chatMutation.mutate(userText);
    }
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Context-aware starter prompts depending on active pathname
  const getContextualPrompts = (): string[] => {
    switch (pathname) {
      case '/dashboard':
        return ["What are my top low stock alerts today?", "Summarize today's sales performance"];
      case '/products':
        return ["Which product category has the most items?", "Show total products in catalog"];
      case '/inventory':
        return ["I sold 5 bottles of Organic Milk", "Add 20 packets of White Bread", "Which items are in overstock?"];
      case '/analytics':
        return ["Explain my 30-day revenue trend", "Which items are slow moving?"];
      case '/forecast':
        return ["What is my 7-day predicted sales demand?", "Which products have high forecast confidence?"];
      case '/recommendations':
        return ["What reorders should I place first?", "Are there clearance recommendations?"];
      case '/risk':
        return ["Explain my current business risk score", "What is my inventory health percentage?"];
      case '/reports':
        return ["Summarize my 30-day executive performance", "Explain my daily brief"];
      default:
        return ["I sold 10 units of Coke", "Should I reorder stock today?"];
    }
  };

  const prompts = getContextualPrompts();
  const isLoading = chatMutation.isPending || commandMutation.isPending;

  return (
    <>
      {/* Floating Trigger Button on Bottom-Right */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all border border-indigo-400/30"
      >
        <div className="relative">
          <Bot className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="hidden sm:inline">Ask AI Copilot</span>
        <span className="px-1.5 py-0.5 rounded bg-indigo-800/80 text-[10px] font-mono text-indigo-200 border border-indigo-500/30 flex items-center gap-0.5">
          <Command className="w-2.5 h-2.5" />K
        </span>
      </button>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Slide-Over Side Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-[#151C28] border-l border-[#222D3F] shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#222D3F] flex items-center justify-between bg-[#0E1420]">
          <div className="flex items-center gap-3">
            <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                Quadstock Copilot
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SQL & Commands
                </span>
              </h2>
              <p className="text-xs text-slate-400">Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 font-mono">⌘K</kbd> anywhere to open</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl bg-[#1E2738] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Bar Chips */}
        <div className="px-4 py-2 bg-[#101724] border-b border-[#222D3F] flex gap-1.5 overflow-x-auto text-[11px]">
          <button
            onClick={() => setInput("I sold 5 Milk 1L")}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 shrink-0 flex items-center gap-1 transition-colors"
          >
            <Zap className="w-3 h-3 text-emerald-400" /> ⚡ Record Sale
          </button>
          <button
            onClick={() => setInput("Restock 20 Coke 500ml")}
            className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 shrink-0 flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" /> 📥 Add Stock
          </button>
          <button
            onClick={() => setInput("Remove 3 expired yogurt")}
            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 shrink-0 flex items-center gap-1 transition-colors"
          >
            <AlertCircle className="w-3 h-3 text-rose-400" /> 🗑️ Remove Stock
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                    : m.isCommandResult
                    ? 'bg-[#0F1D2F] border border-indigo-500/30 text-slate-200 rounded-bl-none shadow-lg'
                    : 'bg-[#0E1420] text-slate-200 border border-[#222D3F] rounded-bl-none'
                }`}
              >
                {/* Command Result Badge */}
                {m.isCommandResult && m.commandData && (
                  <div className="mb-2.5 p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white capitalize text-[11px]">
                        Action Executed: {m.commandData.action}
                      </span>
                      <p className="text-[10px] text-indigo-200">
                        Product: {m.commandData.product_name} | Qty: {m.commandData.quantity}
                      </p>
                    </div>
                  </div>
                )}

                <p className="whitespace-pre-wrap">{m.text}</p>

                {/* Grounding Sources Badge */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#222D3F] flex flex-wrap gap-1 items-center">
                    <span className="text-[9px] text-slate-400 uppercase font-semibold">Sources:</span>
                    {m.sources.map((src, sIdx) => (
                      <span key={sIdx} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-indigo-300 border border-slate-700">
                        {src}
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggested follow-up chips */}
                {m.suggestedFollowups && m.suggestedFollowups.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#222D3F] space-y-1">
                    <span className="text-[9px] text-slate-400 uppercase font-semibold block">Suggested Questions:</span>
                    <div className="flex flex-wrap gap-1">
                      {m.suggestedFollowups.map((sug, sugIdx) => (
                        <button
                          key={sugIdx}
                          onClick={() => setInput(sug)}
                          className="px-2 py-0.5 rounded text-[11px] bg-[#1E2738] hover:bg-indigo-600/20 text-indigo-300 border border-[#222D3F] transition-colors text-left"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Bot className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="p-2.5 rounded-xl bg-[#0E1420] border border-[#222D3F] text-xs text-slate-400">
                Processing intent & executing SQL database actions...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Contextual Starter Prompts */}
        {prompts.length > 0 && (
          <div className="p-3 bg-[#0E1420] border-t border-[#222D3F] space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Contextual Actions for {pathname}
            </div>
            <div className="flex flex-col gap-1">
              {prompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setInput(p)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-[#151C28] hover:bg-[#1E2738] text-indigo-300 border border-[#222D3F] transition-colors flex items-center justify-between"
                >
                  <span>{p}</span>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-[#151C28] border-t border-[#222D3F] flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type 'I sold 5 Milk' or ask a question..."
            className="flex-1 bg-[#0E1420] border border-[#222D3F] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-1 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </>
  );
}
