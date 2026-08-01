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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151C28] p-6 rounded-2xl border border-[#222D3F]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-indigo-400" />
            CSV Multi-Stage Import Pipeline
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated column mapping, row validation, preview report, and single-transaction database commit.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      {!preview ? (
        <div className="bg-[#151C28] border-2 border-dashed border-[#222D3F] hover:border-indigo-500/50 p-10 rounded-2xl text-center transition-all flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Upload Inventory CSV File</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Supports flexible headers (Item Name, SKU, Current Stock, Buying Price, Cost, Selling Price, Expiry Date, Supplier).
          </p>

          <label className="cursor-pointer px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all inline-flex items-center gap-2 text-sm">
            <UploadCloud className="w-4 h-4" />
            <span>Select CSV File</span>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>

          {uploadMutation.isPending && (
            <p className="text-sm text-indigo-400 font-medium mt-4 animate-pulse">
              Parsing CSV delimiter, encoding & column mapping...
            </p>
          )}

          {error && <p className="text-sm text-rose-400 font-medium mt-4">{error}</p>}
        </div>
      ) : (
        /* Preview & Confirmation Step */
        <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222D3F] pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pipeline Validation & Mapping Completed
              </div>
              <h2 className="text-xl font-bold text-white">Import Preview: {preview.filename}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-xl bg-[#1E2738] text-slate-300 hover:text-white text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {confirmMutation.isPending ? 'Importing to SQL...' : 'Confirm & Import to PostgreSQL'}
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0E1420] p-4 rounded-xl border border-[#222D3F]">
              <div className="text-xs text-slate-400 uppercase font-semibold">Total Rows</div>
              <div className="text-xl font-bold text-white mt-1">{preview.total_rows}</div>
            </div>
            <div className="bg-[#0E1420] p-4 rounded-xl border border-[#222D3F]">
              <div className="text-xs text-emerald-400 uppercase font-semibold">Valid Rows</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{preview.valid_rows}</div>
            </div>
            <div className="bg-[#0E1420] p-4 rounded-xl border border-[#222D3F]">
              <div className="text-xs text-rose-400 uppercase font-semibold">Invalid Rows</div>
              <div className="text-xl font-bold text-rose-400 mt-1">{preview.invalid_rows}</div>
            </div>
          </div>

          {/* Mapped Columns */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Auto-Mapped Columns</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(preview.column_mapping).map(([standardCol, rawCol]) => (
                <span
                  key={standardCol}
                  className="px-3 py-1.5 rounded-lg bg-[#0E1420] border border-[#222D3F] text-xs font-mono text-slate-300"
                >
                  <span className="text-indigo-400">{standardCol}</span> ← <span className="text-slate-400">{rawCol}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Sample Data Table */}
          {preview.preview_data && preview.preview_data.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Preview Sample Rows</h3>
              <div className="overflow-x-auto rounded-xl border border-[#222D3F]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0E1420] uppercase text-slate-400 border-b border-[#222D3F]">
                    <tr>
                      {Object.keys(preview.preview_data[0]).map((col) => (
                        <th key={col} className="px-3 py-2.5 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222D3F]">
                    {preview.preview_data.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val: any, vIdx) => (
                          <td key={vIdx} className="px-3 py-2 text-slate-200">
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
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          CSV Import Audit Logs
        </h2>

        {historyLoading ? (
          <div className="p-4 text-slate-400 text-sm">Loading audit logs...</div>
        ) : historyList && historyList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0E1420] text-xs uppercase text-slate-400 border-b border-[#222D3F]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Filename</th>
                  <th className="px-4 py-3 font-semibold">Rows Imported</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Upload Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222D3F]">
                {historyList.map((h) => (
                  <tr key={h.id} className="hover:bg-[#1E2738]/50">
                    <td className="px-4 py-3 font-medium text-white">{h.filename}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">{h.rows_imported}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(h.upload_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 bg-[#0E1420] rounded-xl border border-[#222D3F]">
            No Data Available
          </div>
        )}
      </div>
    </div>
  );
}
