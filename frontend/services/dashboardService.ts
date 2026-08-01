import { apiClient } from './apiClient';
import { DashboardCards, DashboardSummary } from '@/types/api';

export const dashboardService = {
  getCards: async (): Promise<DashboardCards> => {
    const res = await apiClient.get<DashboardCards>('/dashboard');
    return res.data;
  },

  getSummary: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return res.data;
  },
};
