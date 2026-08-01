import { apiClient } from './apiClient';
import { ForecastOverview, ProductForecast, WeeklyForecastDay } from '@/types/api';

export const forecastService = {
  getOverview: async (): Promise<ForecastOverview> => {
    const res = await apiClient.get<ForecastOverview>('/forecast');
    return res.data;
  },

  getProductForecast: async (productId: number): Promise<ProductForecast> => {
    const res = await apiClient.get<ProductForecast>(`/forecast/product/${productId}`);
    return res.data;
  },

  getWeeklyForecast: async (): Promise<WeeklyForecastDay[]> => {
    const res = await apiClient.get<WeeklyForecastDay[]>('/forecast/week');
    return res.data;
  },
};
