'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesService, SalesDocumentPreviewResponse, ExtractedSaleLine } from '@/services/salesService';
import { UploadCloud, X, FileText, CheckCircle2, AlertCircle, Sparkles, ShoppingBag } from 'lucide-react';

interface SalesDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export default function SalesDocumentUploadModal({
  isOpen,
  onClose,
  onUploadSuccess
}: SalesDocumentUploadModalProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<SalesDocumentPreviewResponse | null>(null);
  const [salesLines, setSalesLines] = useState<ExtractedSaleLine[]>([]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return salesService.uploadSalesDocument(file);
    },
    onSuccess: (data) => {
      setPreview(data);
      setSalesLines(data.extracted_sales || []);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!preview) return;
      return salesService.confirmSalesUpload(preview.filename, salesLines);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalytics'] });
      if (onUploadSuccess) onUploadSuccess();
      handleReset();
      onClose();
    },
  });

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setSalesLines([]);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#151C28] border border-[#222D3F] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222D3F] bg-[#0E1420]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Multi-Format Sales Document Uploader
              </h2>
              <p className="text-xs text-slate-400">
                Upload sales receipts, daily register PDFs, Excel/CSV sales logs, or image receipts. Auto-deducts inventory stock.
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
                id="salesUploadInput"
                className="hidden"
                accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={handleFileSelect}
              />
              <label htmlFor="salesUploadInput" className="cursor-pointer block">
                <div className="w-16 h-16 mx-auto bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Drag & Drop Sales Document or Click to Browse
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Supports <strong className="text-slate-200">CSV, Excel (.xlsx/.xls), Sales Register PDFs, Photo Receipts (.jpg/.png)</strong> and <strong className="text-slate-200">Text files</strong>.
                </p>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all">
                  Browse Files
                </span>
              </label>

              {uploadMutation.isPending && (
                <div className="mt-6 flex items-center justify-center gap-3 text-sm text-indigo-400 font-medium">
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                  Groq AI is extracting sales transactions & verifying items...
                </div>
              )}
            </div>
          )}

          {preview && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#0E1420] border border-[#222D3F] rounded-xl flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="text-xs text-slate-400">Uploaded Sales Document</div>
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
                    <div className="text-slate-400">Sales Transactions</div>
                    <div className="text-sm font-bold text-white">{salesLines.length} lines</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Total Revenue Preview</div>
                    <div className="text-sm font-bold text-emerald-400">${preview.total_revenue_preview.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Sales Preview Table */}
              <div className="bg-[#0E1420] border border-[#222D3F] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#151C28] uppercase text-[10px] text-slate-400 border-b border-[#222D3F]">
                    <tr>
                      <th className="px-4 py-2.5">Product Name</th>
                      <th className="px-4 py-2.5">SKU</th>
                      <th className="px-4 py-2.5">Quantity Sold</th>
                      <th className="px-4 py-2.5">Unit Selling Price</th>
                      <th className="px-4 py-2.5">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222D3F]">
                    {salesLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-[#1E2738]/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-white">{line.product_name}</td>
                        <td className="px-4 py-2.5 font-mono text-indigo-400">{line.sku || 'Auto-SKU'}</td>
                        <td className="px-4 py-2.5 font-bold text-white">{line.quantity_sold} sold</td>
                        <td className="px-4 py-2.5 text-slate-400">${line.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-bold text-emerald-400">${line.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              disabled={confirmMutation.isPending || salesLines.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirmMutation.isPending ? 'Syncing Sales & Deducting Stock...' : `Confirm & Save Sales (${salesLines.length} Records)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
