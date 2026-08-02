import { apiClient } from './apiClient';

export interface POSCheckoutResponse {
  sale_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity_sold: number;
  unit_price: number;
  buying_price: number;
  total_amount: number;
  previous_stock: number;
  remaining_stock: number;
  stock_status: string;
  sale_date: string;
  weather_condition?: string;
  is_holiday: boolean;
}

export interface ExtractedSaleLine {
  product_name: string;
  sku?: string;
  quantity_sold: number;
  unit_price: number;
  buying_price: number;
  total_amount: number;
  sale_date?: string;
}

export interface SalesDocumentPreviewResponse {
  filename: string;
  file_format: string;
  total_sales_count: number;
  extracted_sales: ExtractedSaleLine[];
  total_revenue_preview: number;
  is_ready_for_import: boolean;
}

export interface ProductFinancialItem {
  product_id: number;
  name: string;
  sku: string;
  category: string;
  units_sold: number;
  buying_price: number;
  selling_price: number;
  total_revenue: number;
  total_cost: number;
  net_profit: number;
  profit_margin_pct: number;
  current_stock: number;
  status: string;
}

export interface FinancialAnalyticsSummary {
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  overall_profit_margin_pct: number;
  total_units_sold: number;
  total_inventory_value: number;
  products: ProductFinancialItem[];
}

export interface ProductTrendPoint {
  date_label: string;
  units_sold: number;
  revenue: number;
  profit: number;
  margin_pct: number;
}

export interface ProductSalesTrendResponse {
  product_id: number;
  product_name: string;
  sku: string;
  days: number;
  total_revenue: number;
  total_profit: number;
  total_units_sold: number;
  avg_margin_pct: number;
  trend_points: ProductTrendPoint[];
}

export const salesService = {
  scanPOSCheckout: async (
    barcode_or_sku: string,
    quantity: number = 1,
    custom_unit_price?: number,
    notes?: string
  ): Promise<POSCheckoutResponse> => {
    const res = await apiClient.post<POSCheckoutResponse>('/sales/scan', {
      barcode_or_sku,
      quantity,
      custom_unit_price,
      notes,
    });
    return res.data;
  },

  recordManualSale: async (
    product_id: number,
    quantity: number = 1,
    unit_price?: number,
    notes?: string
  ): Promise<POSCheckoutResponse> => {
    const res = await apiClient.post<POSCheckoutResponse>('/sales/manual', {
      product_id,
      quantity,
      unit_price,
      notes,
    });
    return res.data;
  },

  uploadSalesDocument: async (file: File): Promise<SalesDocumentPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<SalesDocumentPreviewResponse>('/sales/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  confirmSalesUpload: async (filename: string, extractedSales: ExtractedSaleLine[]) => {
    const res = await apiClient.post<{ message: string; imported: number }>('/sales/upload/confirm', {
      filename,
      extracted_sales: extractedSales,
      confirm: true,
    });
    return res.data;
  },

  getFinancialAnalytics: async (): Promise<FinancialAnalyticsSummary> => {
    const res = await apiClient.get<FinancialAnalyticsSummary>('/sales/financials');
    return res.data;
  },

  getProductSalesTrend: async (productId: number, days: number = 30): Promise<ProductSalesTrendResponse> => {
    const res = await apiClient.get<ProductSalesTrendResponse>(`/sales/product/${productId}/trend`, {
      params: { days },
    });
    return res.data;
  },
};
