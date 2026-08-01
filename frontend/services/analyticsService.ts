import { apiClient } from './apiClient';
import { AnalyticsOverview, ProductPerformanceItem, SalesTrendPoint } from '@/types/api';

export const analyticsService = {
  getOverview: async (days: number = 30): Promise<AnalyticsOverview> => {
    const res = await apiClient.get<AnalyticsOverview>(`/analytics?days=${days}`);
    return res.data;
  },

  getRevenueAnalytics: async (days: number = 30): Promise<SalesTrendPoint[]> => {
    const res = await apiClient.get<SalesTrendPoint[]>(`/analytics/revenue?days=${days}`);
    return res.data;
  },

  getProductRankings: async (limit: number = 10, ascending: boolean = false): Promise<ProductPerformanceItem[]> => {
    const res = await apiClient.get<ProductPerformanceItem[]>(`/analytics/products?limit=${limit}&ascending=${ascending}`);
    return res.data;
  },
};
