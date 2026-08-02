'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { csvImportService } from '@/services/csvImportService';
import { UploadCloud, Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface LastUploadStatusBannerProps {
  onOpenUploadModal: () => void;
}

export default function LastUploadStatusBanner({ onOpenUploadModal }: LastUploadStatusBannerProps) {
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['lastUploadStatus'],
    queryFn: csvImportService.getLastUploadStatus,
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'No uploads recorded yet';
    try {
      const dt = new Date(isoString);
      return dt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getFormatBadge = (fmt?: string) => {
    switch (fmt?.toUpperCase()) {
      case 'PDF':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'EXCEL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'IMAGE':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'TXT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div className="bg-[#151C28] border border-[#222D3F] rounded-2xl p-5 shadow-lg relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 mt-0.5">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white">Universal Document & Invoice Import</h3>
              {statusData?.has_uploaded && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getFormatBadge(statusData.file_format)}`}>
                  {statusData.file_format || 'CSV'}
                </span>
              )}
            </div>

            {isLoading ? (
              <p className="text-xs text-slate-400 mt-1">Checking upload history audit log...</p>
            ) : statusData?.has_uploaded ? (
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Last Updated: <strong className="text-white">{formatDate(statusData.last_upload_time)}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  File: <strong className="text-indigo-300">{statusData.filename}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {statusData.items_imported} items synced additively
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                No documents uploaded yet. Upload CSV, Excel, PDF, Image, or Text invoices to auto-generate & sync inventory.
              </p>
            )}
          </div>
        </div>

        {/* Right Upload Trigger Button */}
        <button
          onClick={onOpenUploadModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Document / Invoice
        </button>
      </div>
    </div>
  );
}
