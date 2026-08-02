'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { csvImportService, CSVPreviewResponse } from '@/services/csvImportService';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, History, Check } from 'lucide-react';

import { formatApiError } from '@/utils/error';

export default function CSVUploadPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: historyList, isLoading: historyLoading } = useQuery({
    queryKey: ['importHistory'],
    queryFn: csvImportService.getImportHistory,
  });

  const uploadMutation = useMutation({
    mutationFn: (f: File) => csvImportService.uploadCSV(f),
    onSuccess: (data) => {
      setPreview(data);
      setError(null);
    },
    onError: (err: any) => {
      setError(formatApiError(err, 'CSV upload and parsing failed.'));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!preview) return;
      return csvImportService.confirmImport({
        filename: preview.filename,
        column_mapping: preview.column_mapping,
        confirm: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importHistory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCards'] });
      alert('CSV Inventory Data successfully imported to PostgreSQL!');
      setFile(null);
      setPreview(null);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      uploadMutation.mutate(selected);
    }
  };

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-[#C6FF00]" />
            CSV Multi-Stage Import Pipeline
          </h1>
          <p className="text-xs text-[#8E8E8E] mt-1">
            Automated column mapping, row validation, preview report, and single-transaction database commit.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      {!preview ? (
        <div className="card-inspo border-2 border-dashed border-[#C6FF00]/30 hover:border-[#C6FF00] bg-[#C6FF00]/[0.02] hover:bg-[#C6FF00]/[0.06] p-12 rounded-3xl text-center transition-all flex flex-col items-center justify-center cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-[#C6FF00]/10 text-[#C6FF00] flex items-center justify-center mb-5 border border-[#C6FF00]/20 shadow-[0_0_20px_rgba(198,255,0,0.15)]">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Upload Inventory CSV File</h2>
          <p className="text-xs text-[#8E8E8E] max-w-md mb-6 leading-relaxed">
            Supports flexible headers (Item Name, SKU, Current Stock, Buying Price, Cost, Selling Price, Expiry Date, Supplier).
          </p>

          <label className="cursor-pointer px-6 py-3 bg-[#C6FF00] hover:bg-[#9DFF00] text-black font-bold rounded-2xl shadow-[0_4px_15px_rgba(198,255,0,0.4)] transition-all inline-flex items-center gap-2 text-xs">
            <UploadCloud className="w-4 h-4 text-black" />
            <span>Select CSV File</span>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>

          {uploadMutation.isPending && (
            <p className="text-xs text-[#C6FF00] font-semibold mt-5 animate-pulse font-mono">
              Parsing CSV delimiter, encoding & column mapping...
            </p>
          )}

          {error && <p className="text-xs text-[#FF5B5B] font-semibold mt-5">{error}</p>}
        </div>
      ) : (
        /* Preview & Confirmation Step */
        <div className="card-inspo p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#B7FF38] bg-[#B7FF38]/10 px-3 py-1 rounded-full border border-[#B7FF38]/20 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pipeline Validation & Mapping Completed
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Import Preview: {preview.filename}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-xl bg-[#101010] border border-white/10 text-[#8E8E8E] hover:text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-[#C6FF00] hover:bg-[#9DFF00] text-black text-xs font-bold shadow-[0_4px_15px_rgba(198,255,0,0.4)] flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                <Check className="w-4 h-4" />
                {confirmMutation.isPending ? 'Importing to SQL...' : 'Confirm & Import to PostgreSQL'}
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#101010] p-4 rounded-2xl border border-white/5">
              <div className="text-[10px] text-[#555555] uppercase font-bold tracking-wider">Total Rows</div>
              <div className="text-2xl font-extrabold text-white mt-1 font-mono">{preview.total_rows}</div>
            </div>
            <div className="bg-[#101010] p-4 rounded-2xl border border-white/5">
              <div className="text-[10px] text-[#B7FF38] uppercase font-bold tracking-wider">Valid Rows</div>
              <div className="text-2xl font-extrabold text-[#B7FF38] mt-1 font-mono">{preview.valid_rows}</div>
            </div>
            <div className="bg-[#101010] p-4 rounded-2xl border border-white/5">
              <div className="text-[10px] text-[#FF5B5B] uppercase font-bold tracking-wider">Invalid Rows</div>
              <div className="text-2xl font-extrabold text-[#FF5B5B] mt-1 font-mono">{preview.invalid_rows}</div>
            </div>
          </div>

          {/* Mapped Columns */}
          <div>
            <h3 className="text-xs font-bold text-[#8E8E8E] uppercase tracking-wider mb-3">Auto-Mapped Columns</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(preview.column_mapping).map(([standardCol, rawCol]) => (
                <span
                  key={standardCol}
                  className="px-3 py-1.5 rounded-xl bg-[#101010] border border-white/5 text-xs font-mono text-[#8E8E8E]"
                >
                  <span className="text-[#C6FF00] font-bold">{standardCol}</span> ← <span>{rawCol}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Sample Data Table */}
          {preview.preview_data && preview.preview_data.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#8E8E8E] uppercase tracking-wider mb-3">Preview Sample Rows</h3>
              <div className="overflow-x-auto rounded-2xl border border-white/5">
                <table className="w-full text-left text-xs text-[#8E8E8E]">
                  <thead className="bg-[#101010] uppercase text-[11px] font-semibold text-[#555555] border-b border-white/5">
                    <tr>
                      {Object.keys(preview.preview_data[0]).map((col) => (
                        <th key={col} className="px-3.5 py-3 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {preview.preview_data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.025] transition-colors">
                        {Object.values(row).map((val: any, vIdx) => (
                          <td key={vIdx} className="px-3.5 py-2.5 text-white font-mono">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Audit Trail History */}
      <div className="card-inspo p-7 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
          <History className="w-4 h-4 text-[#C6FF00]" />
          CSV Import Audit Logs
        </h2>

        {historyLoading ? (
          <div className="p-4 text-[#8E8E8E] text-xs font-mono">Loading audit logs...</div>
        ) : historyList && historyList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#8E8E8E]">
              <thead className="text-[11px] font-semibold text-[#555555] uppercase border-b border-white/5">
                <tr>
                  <th className="pb-3 px-3 font-semibold">Filename</th>
                  <th className="pb-3 px-3 font-semibold">Rows Imported</th>
                  <th className="pb-3 px-3 font-semibold">Status</th>
                  <th className="pb-3 px-3 font-semibold">Upload Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {historyList.map((h) => (
                  <tr key={h.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="py-3.5 px-3 font-medium text-white">{h.filename}</td>
                    <td className="py-3.5 px-3 font-bold text-[#B7FF38] font-mono">{h.rows_imported}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#B7FF38]/10 text-[#B7FF38] border border-[#B7FF38]/20">
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[#8E8E8E] text-xs font-mono">{new Date(h.upload_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#8E8E8E] bg-[#101010] rounded-2xl border border-white/5">
            No Data Available
          </div>
        )}
      </div>
    </div>
  );
}
