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

export interface ExtractedProductItem {
  product_name: string;
  sku?: string;
  category?: string;
  quantity: number;
  buying_price: number;
  selling_price: number;
  expiry_date?: string;
  supplier_name?: string;
  existing_stock: number;
  new_total_stock: number;
  is_existing_product: boolean;
}

export interface DocumentPreviewResponse {
  filename: string;
  file_format: string;
  total_rows: number;
  valid_rows_count: number;
  invalid_rows_count: number;
  preview_data: any[];
  extracted_items: ExtractedProductItem[];
  is_ready_for_import: boolean;
  requires_clarification: boolean;
  missing_fields_prompt?: string;
  ask_expiry_date: boolean;
  clarification_questions: string[];
}

export interface LastUploadStatusResponse {
  has_uploaded: boolean;
  last_upload_time?: string;
  filename?: string;
  file_format?: string;
  items_imported: number;
  items_failed: number;
  status?: string;
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

  confirmImport: async (payload: { filename: string; column_mapping: Record<string, string>; confirm: boolean }): Promise<ImportHistory> => {
    const res = await apiClient.post<ImportHistory>('/upload/confirm-csv', payload);
    return res.data;
  },

  uploadDocument: async (file: File): Promise<DocumentPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<DocumentPreviewResponse>('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  clarifyDocument: async (
    filename: string,
    answers: Record<string, any>,
    extractedItems: ExtractedProductItem[]
  ): Promise<DocumentPreviewResponse> => {
    const res = await apiClient.post<DocumentPreviewResponse>('/upload/clarify', {
      filename,
      answers,
      extracted_items: extractedItems,
    });
    return res.data;
  },

  confirmDocumentImport: async (
    filename: string,
    extractedItems: ExtractedProductItem[]
  ): Promise<ImportHistory> => {
    const res = await apiClient.post<ImportHistory>('/upload/confirm', {
      filename,
      extracted_items: extractedItems,
      confirm: true,
    });
    return res.data;
  },

  getLastUploadStatus: async (): Promise<LastUploadStatusResponse> => {
    const res = await apiClient.get<LastUploadStatusResponse>('/upload/last-status');
    return res.data;
  },

  getImportHistory: async (): Promise<ImportHistory[]> => {
    const res = await apiClient.get<ImportHistory[]>('/upload/history');
    return res.data;
  },
};
