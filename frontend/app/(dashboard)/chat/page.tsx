'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';
import { Bot, Send, User, Sparkles, CheckCircle2, ShieldCheck, Zap, CornerDownLeft } from 'lucide-react';

interface ChatMsg {
  sender: 'user' | 'assistant';
  text: string;
  sources?: string[];
  intent?: string;
  suggestedFollowups?: string[];
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      sender: 'assistant',
      text: "Hello! I am Quadstock AI, your Senior Retail Operations Manager. Ask me anything about your PostgreSQL inventory levels, sales revenue, or reorder recommendations.",
    },
  ]);
  const [commandResult, setCommandResult] = useState<string | null>(null);

  const { data: suggestions } = useQuery({
    queryKey: ['chatSuggestions'],
    queryFn: chatService.getSuggestions,
  });

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
          intent: data.intent,
          suggestedFollowups: data.suggested_followups,
        },
      ]);
    },
  });

  const commandMutation = useMutation({
    mutationFn: (cmd: string) => chatService.parseCommand(cmd),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCards'] });
      setCommandResult(data.message);
      setCommandInput('');
    },
  });

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    chatMutation.mutate(userText);
  };

  const handleExecuteCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || commandMutation.isPending) return;

    setCommandResult(null);
    commandMutation.mutate(commandInput.trim());
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-7rem)] fade-in-up">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-6 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#C6FF00]" />
            AI Business Copilot & NL Operations Center
          </h1>
          <p className="text-xs text-[#8E8E8E] mt-1">
            Grounded Q&A over PostgreSQL database metrics and instant Natural Language Command execution.
          </p>
        </div>
      </div>

      {/* Natural Language Command Bar */}
      <div className="bg-gradient-to-r from-[#11140A] via-[#151515] to-[#101010] p-4.5 rounded-2xl border border-[#C6FF00]/20 shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <form onSubmit={handleExecuteCommand} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-[#C6FF00] font-bold text-xs shrink-0">
            <Zap className="w-4 h-4 text-[#FFD84D]" />
            <span>NL Command Bar:</span>
          </div>
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="e.g. 'I sold 12 Coke bottles' or 'Add 30 Milk packets' (Executes stock updates in SQL)..."
              className="w-full bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-xl px-4 py-2 text-xs text-white placeholder-[#555555] focus:outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={commandMutation.isPending}
            className="px-5 py-2 bg-[#C6FF00] hover:bg-[#9DFF00] text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50 transition-all shadow-[0_4px_15px_rgba(198,255,0,0.3)]"
          >
            <span>{commandMutation.isPending ? 'Executing SQL...' : 'Execute Stock Update'}</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>

        {commandResult && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#B7FF38]/10 border border-[#B7FF38]/20 text-xs text-[#B7FF38] flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{commandResult}</span>
          </div>
        )}
      </div>

      {/* Chat Conversation Body */}
      <div className="flex-1 card-inspo p-5 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.sender === 'assistant' && (
              <div className="w-9 h-9 rounded-2xl bg-[#C6FF00]/10 text-[#C6FF00] flex items-center justify-center border border-[#C6FF00]/20 shrink-0 font-bold">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <div className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
              m.sender === 'user'
                ? 'bg-[#C6FF00] text-black font-medium rounded-tr-xs shadow-[0_4px_20px_rgba(198,255,0,0.3)]'
                : 'bg-[#101010] text-[#ececec] border border-white/5 rounded-tl-xs shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
            }`}>
              <p className="whitespace-pre-wrap">{m.text}</p>

              {/* Grounding Sources Badge */}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-[#555555] uppercase font-bold tracking-wider">Sources:</span>
                  {m.sources.map((src, sIdx) => (
                    <span key={sIdx} className="px-2 py-0.5 rounded text-[10px] bg-[#151515] text-[#C6FF00] border border-white/5 font-mono">
                      {src}
                    </span>
                  ))}
                </div>
              )}

              {/* Followup suggestion pills */}
              {m.suggestedFollowups && m.suggestedFollowups.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1.5">
                  <span className="text-[10px] text-[#555555] uppercase font-bold block tracking-wider">Suggested Questions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.suggestedFollowups.map((sug, sugIdx) => (
                      <button
                        key={sugIdx}
                        onClick={() => {
                          setInput(sug);
                        }}
                        className="px-3 py-1 rounded-full text-xs bg-[#151515] hover:bg-[#C6FF00]/10 text-[#C6FF00] border border-[#C6FF00]/20 transition-all font-medium"
                      >
                        ⚡ {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-9 h-9 rounded-full bg-[#151515] text-[#C6FF00] flex items-center justify-center border border-white/10 shrink-0 font-bold">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#C6FF00]/10 text-[#C6FF00] flex items-center justify-center border border-[#C6FF00]/20">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl bg-[#101010] border border-white/5 text-xs text-[#8E8E8E] font-mono">
              Querying ground-truth PostgreSQL tables & generating grounded response...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 shrink-0">
          <Sparkles className="w-4 h-4 text-[#C6FF00] shrink-0" />
          {suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => setInput(sug)}
              className="px-3.5 py-1.5 rounded-full text-xs bg-[#101010] hover:bg-white/[0.04] text-[#8E8E8E] hover:text-[#C6FF00] border border-white/5 whitespace-nowrap transition-colors font-medium"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <form onSubmit={handleSendChat} className="flex gap-3 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Quadstock Copilot about inventory, sales, reorders, or forecasts..."
          className="flex-1 bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-2xl px-5 py-3.5 text-xs sm:text-sm text-white placeholder-[#555555] focus:outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        />
        <button
          type="submit"
          disabled={chatMutation.isPending || !input.trim()}
          className="px-6 py-3.5 bg-[#C6FF00] hover:bg-[#9DFF00] text-black font-bold rounded-2xl shadow-[0_4px_15px_rgba(198,255,0,0.4)] flex items-center gap-2 disabled:opacity-50 transition-all text-xs"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
