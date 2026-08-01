import { apiClient } from './apiClient';
import { ImportHistory } from '@/types/api';

export interface CSVPreviewResponse {
  filename: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  column_mapping: Record<string, string>;
  preview_data: any[];
}

export interface CSVConfirmPayload {
  filename: string;
  column_mapping: Record<string, string>;
  confirm: boolean;
}

export const csvImportService = {
  uploadCSV: async (file: File): Promise<CSVPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<CSVPreviewResponse>('/upload/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  confirmImport: async (payload: CSVConfirmPayload): Promise<{ rows_imported: number; message: string }> => {
    const res = await apiClient.post<{ rows_imported: number; message: string }>('/upload/csv/confirm', payload);
    return res.data;
  },

  getImportHistory: async (): Promise<ImportHistory[]> => {
    const res = await apiClient.get<ImportHistory[]>('/upload/history');
    return res.data;
  },
};
