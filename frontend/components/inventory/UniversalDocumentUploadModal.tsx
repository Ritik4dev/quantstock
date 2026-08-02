'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { csvImportService, DocumentPreviewResponse, ExtractedProductItem } from '@/services/csvImportService';
import {
  UploadCloud,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Bot,
  Send,
  PlusCircle,
  HelpCircle
} from 'lucide-react';

interface UniversalDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export default function UniversalDocumentUploadModal({
  isOpen,
  onClose,
  onUploadSuccess
}: UniversalDocumentUploadModalProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const [preview, setPreview] = useState<DocumentPreviewResponse | null>(null);
  const [items, setItems] = useState<ExtractedProductItem[]>([]);
  
  // Interactive AI Clarification Chat state
  const [clarificationChat, setClarificationChat] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showClarificationChat, setShowClarificationChat] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return csvImportService.uploadDocument(file);
    },
    onSuccess: (data) => {
      setPreview(data);
      setItems(data.extracted_items || []);

      if (data.requires_clarification || data.ask_expiry_date) {
        setShowClarificationChat(true);
        const initialAiMsgs = [];
        if (data.missing_fields_prompt) {
          initialAiMsgs.push({ role: 'ai' as const, text: data.missing_fields_prompt });
        }
        if (data.clarification_questions && data.clarification_questions.length > 0) {
          data.clarification_questions.forEach((q) => {
            initialAiMsgs.push({ role: 'ai' as const, text: q });
          });
        }
        setClarificationChat(initialAiMsgs);
      } else {
        setShowClarificationChat(false);
      }
    },
  });

  const clarifyMutation = useMutation({
    mutationFn: async (updatedItems: ExtractedProductItem[]) => {
      if (!preview) return;
      return csvImportService.clarifyDocument(preview.filename, {}, updatedItems);
    },
    onSuccess: (data) => {
      if (data) {
        setPreview(data);
        setItems(data.extracted_items);
      }
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!preview) return;
      return csvImportService.confirmDocumentImport(preview.filename, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['lastUploadStatus'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCards'] });
      if (onUploadSuccess) onUploadSuccess();
      handleReset();
      onClose();
    },
  });

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setItems([]);
    setClarificationChat([]);
    setShowClarificationChat(false);
    setChatInput('');
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      uploadMutation.mutate(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      uploadMutation.mutate(file);
    }
  };

  // 1. Price Margin Quick Handler (+30% or +50%)
  const handleApplyMargin = (marginPercent: number) => {
    const updated = items.map((item) => {
      let bPrice = item.buying_price;
      if (bPrice === 0) bPrice = 10.0;
      const sPrice = Math.round(bPrice * (1 + marginPercent / 100) * 100) / 100;
      return {
        ...item,
        buying_price: bPrice,
        selling_price: sPrice,
      };
    });

    setItems(updated);
    setClarificationChat((prev) => [
      ...prev,
      { role: 'user', text: `Auto-calculate selling prices with +${marginPercent}% profit margin.` },
      { role: 'ai', text: `✅ Applied +${marginPercent}% profit margin to all items! Updated prices are reflected in the table below.` }
    ]);

    clarifyMutation.mutate(updated);
  };

  // 2. Expiry Date Quick Handler (none, 6m, 1y)
  const handleSetExpiryMode = (mode: 'none' | '6m' | '1y') => {
    let expiryStr: string | undefined = undefined;
    let label = 'No Expiry Dates (Non-perishable)';

    if (mode === '6m') {
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      expiryStr = d.toISOString().split('T')[0];
      label = 'Default 6 Months Expiry';
    } else if (mode === '1y') {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      expiryStr = d.toISOString().split('T')[0];
      label = 'Default 1 Year Expiry';
    }

    const updated = items.map((item) => ({
      ...item,
      expiry_date: expiryStr,
    }));

    setItems(updated);
    setClarificationChat((prev) => [
      ...prev,
      { role: 'user', text: label },
      {
        role: 'ai',
        text: mode === 'none'
          ? '✅ Marked all products as non-perishable (No expiry date required).'
          : `✅ Applied default expiry date (${expiryStr}) to products!`
      }
    ]);

    clarifyMutation.mutate(updated);
  };

  const handleSendChatAnswer = (overrideText?: string) => {
    const text = overrideText || chatInput.trim();
    if (!text) return;

    setClarificationChat((prev) => [...prev, { role: 'user', text }]);
    setChatInput('');

    const textLower = text.toLowerCase();

    if (textLower.includes('no expiry') || textLower.includes('none') || textLower.includes('no')) {
      handleSetExpiryMode('none');
      return;
    }

    if (textLower.includes('30%') || textLower.includes('margin') || textLower.includes('price')) {
      handleApplyMargin(30);
      return;
    }

    // Generic answer acknowledgment
    setClarificationChat((prev) => [
      ...prev,
      { role: 'ai', text: '✅ Response recorded! You can answer remaining questions or review the preview table.' }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#151C28] border border-[#222D3F] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222D3F] bg-[#0E1420]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Universal Multi-Format Document Importer
              </h2>
              <p className="text-xs text-slate-400">
                Upload CSV, Excel, PDF, Images, or Text invoices. Groq AI extracts data with per-product additive stock sync.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1E2738] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Upload Area */}
          {!preview && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-[#222D3F] hover:border-indigo-500/50 bg-[#0E1420]/50'
              }`}
            >
              <input
                type="file"
                id="docUploadInput"
                className="hidden"
                accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={handleFileSelect}
              />
              <label htmlFor="docUploadInput" className="cursor-pointer block">
                <div className="w-16 h-16 mx-auto bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Drag & Drop Document or Click to Browse
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Supports <strong className="text-slate-200">CSV, Excel (.xlsx/.xls), PDF Invoices, Product Receipt Images (.jpg/.png/.webp)</strong> and <strong className="text-slate-200">Text files</strong>.
                </p>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all">
                  Browse Files
                </span>
              </label>

              {uploadMutation.isPending && (
                <div className="mt-6 flex items-center justify-center gap-3 text-sm text-indigo-400 font-medium">
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                  Groq AI is analyzing document & extracting inventory items...
                </div>
              )}
            </div>
          )}

          {/* AI Processing & Extracted Preview */}
          {preview && (
            <div className="space-y-6">
              {/* Document Summary Badge */}
              <div className="flex items-center justify-between p-4 bg-[#0E1420] border border-[#222D3F] rounded-xl flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="text-xs text-slate-400">Uploaded Document</div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {preview.filename}
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {preview.file_format}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <div className="text-slate-400">Total Extracted</div>
                    <div className="text-sm font-bold text-white">{items.length} items</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Additive Sync Mode</div>
                    <div className="text-sm font-bold text-emerald-400">Quantity Addition (5+5=10)</div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs text-indigo-400 hover:underline font-medium"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Interactive AI Clarification Chat Panel */}
              {showClarificationChat && (
                <div className="bg-[#0E1420] border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#222D3F] pb-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <Bot className="w-5 h-5" />
                      AI Data Clarification Assistant (Step-by-Step Response)
                    </div>
                    <button
                      onClick={() => setShowClarificationChat(false)}
                      className="px-3 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 text-xs font-bold transition-all"
                    >
                      Done Clarifying (Review Table)
                    </button>
                  </div>

                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {clarificationChat.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 text-xs ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {msg.role === 'ai' && (
                          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          className={`p-3 rounded-xl max-w-lg ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-[#151C28] text-slate-200 border border-[#222D3F] rounded-bl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Quick Action Buttons per Question */}
                  <div className="space-y-2 pt-2 border-t border-[#222D3F]/50">
                    <div className="text-[11px] text-slate-400 font-bold">Quick Answers (Click both one by one):</div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {/* Price Margin Buttons */}
                      <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        1. Prices:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyMargin(30)}
                        className="px-3 py-1.5 rounded-xl bg-[#151C28] hover:bg-indigo-600/20 border border-indigo-500/40 text-xs text-indigo-300 font-semibold transition-all hover:scale-105"
                      >
                        +30% Profit Margin
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyMargin(50)}
                        className="px-3 py-1.5 rounded-xl bg-[#151C28] hover:bg-indigo-600/20 border border-indigo-500/40 text-xs text-indigo-300 font-semibold transition-all hover:scale-105"
                      >
                        +50% Profit Margin
                      </button>

                      {/* Expiry Date Buttons */}
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 ml-2">
                        2. Expiry:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSetExpiryMode('none')}
                        className="px-3 py-1.5 rounded-xl bg-[#151C28] hover:bg-amber-600/20 border border-amber-500/40 text-xs text-amber-300 font-semibold transition-all hover:scale-105"
                      >
                        No Expiry Dates
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetExpiryMode('6m')}
                        className="px-3 py-1.5 rounded-xl bg-[#151C28] hover:bg-amber-600/20 border border-amber-500/40 text-xs text-amber-300 font-semibold transition-all hover:scale-105"
                      >
                        Default 6 Months Expiry
                      </button>
                    </div>
                  </div>

                  {/* Chat Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChatAnswer();
                    }}
                    className="flex gap-2 pt-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Or type a custom answer..."
                      className="flex-1 bg-[#151C28] border border-[#222D3F] rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={clarifyMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send
                    </button>
                  </form>
                </div>
              )}

              {/* Extracted Items & Per-Product Additive Preview Table */}
              <div className="bg-[#0E1420] border border-[#222D3F] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#222D3F] font-semibold text-xs text-slate-300 flex items-center justify-between">
                  <span>Per-Product Additive Stock Preview</span>
                  <span className="text-[11px] text-slate-400">
                    Matches existing products additively or creates new items
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#151C28] uppercase text-[10px] text-slate-400 border-b border-[#222D3F]">
                      <tr>
                        <th className="px-4 py-2.5">Product Name</th>
                        <th className="px-4 py-2.5">SKU</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Newly Arrived Qty</th>
                        <th className="px-4 py-2.5">Existing DB Stock</th>
                        <th className="px-4 py-2.5">Additive Total Stock</th>
                        <th className="px-4 py-2.5">Buying Cost</th>
                        <th className="px-4 py-2.5">Selling Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222D3F]">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#1E2738]/40 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-white flex items-center gap-2">
                            {item.product_name}
                            {item.is_existing_product ? (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Existing
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                New Item
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-indigo-400">
                            {item.sku || 'Auto-SKU'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400">{item.category || 'General'}</td>
                          <td className="px-4 py-2.5 font-bold text-indigo-400">+{item.quantity} units</td>
                          <td className="px-4 py-2.5 text-slate-400">{item.existing_stock} units</td>
                          <td className="px-4 py-2.5 font-bold text-emerald-400">
                            {item.new_total_stock} units
                          </td>
                          <td className="px-4 py-2.5 text-slate-400">${item.buying_price.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-emerald-400 font-semibold">
                            ${item.selling_price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {preview && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#222D3F] bg-[#0E1420]">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-[#1E2738] text-slate-300 text-xs font-medium hover:bg-[#253247] transition-colors"
            >
              Discard & Re-upload
            </button>

            <button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending || items.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirmMutation.isPending ? 'Syncing to PostgreSQL...' : `Confirm & Additively Sync (${items.length} Products)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
