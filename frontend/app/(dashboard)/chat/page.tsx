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
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151C28] p-5 rounded-2xl border border-[#222D3F] shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-400" />
            AI Business Copilot & NL Operations Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Grounded Q&A over PostgreSQL database metrics and instant Natural Language Command execution.
          </p>
        </div>
      </div>

      {/* Natural Language Command Bar */}
      <div className="bg-gradient-to-r from-indigo-950/50 via-surface to-surface p-4 rounded-2xl border border-indigo-500/30 shrink-0">
        <form onSubmit={handleExecuteCommand} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs shrink-0">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>NL Command Bar:</span>
          </div>
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="e.g. 'I sold 12 Coke bottles' or 'Add 30 Milk packets' (Executes stock updates in SQL)..."
              className="w-full bg-[#0E1420] border border-[#222D3F] rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={commandMutation.isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <span>{commandMutation.isPending ? 'Executing SQL...' : 'Execute Stock Update'}</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>

        {commandResult && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{commandResult}</span>
          </div>
        )}
      </div>

      {/* Chat Conversation Body */}
      <div className="flex-1 bg-[#151C28] border border-[#222D3F] rounded-2xl p-4 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
              m.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-br-none'
                : 'bg-[#0E1420] text-slate-200 border border-[#222D3F] rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap">{m.text}</p>

              {/* Grounding Sources Badge */}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#222D3F] flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Sources:</span>
                  {m.sources.map((src, sIdx) => (
                    <span key={sIdx} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-300 border border-slate-700">
                      {src}
                    </span>
                  ))}
                </div>
              )}

              {/* Followup suggestion pills */}
              {m.suggestedFollowups && m.suggestedFollowups.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#222D3F] space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Suggested Questions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.suggestedFollowups.map((sug, sugIdx) => (
                      <button
                        key={sugIdx}
                        onClick={() => {
                          setInput(sug);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs bg-[#1E2738] hover:bg-indigo-600/20 text-indigo-300 border border-[#222D3F] transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3 rounded-xl bg-[#0E1420] border border-[#222D3F] text-xs text-slate-400">
              Querying ground-truth PostgreSQL tables & generating grounded response...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          {suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => setInput(sug)}
              className="px-3 py-1.5 rounded-full text-xs bg-[#151C28] hover:bg-[#1E2738] text-slate-300 border border-[#222D3F] whitespace-nowrap transition-colors"
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
          className="flex-1 bg-[#151C28] border border-[#222D3F] rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={chatMutation.isPending || !input.trim()}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
