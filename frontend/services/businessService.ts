import { apiClient } from './apiClient';
import { Business } from '@/types/api';

export interface CreateBusinessPayload {
  business_name: string;
  business_type: string;
}

export const businessService = {
  getBusinesses: async (): Promise<Business[]> => {
    const res = await apiClient.get<Business[]>('/business');
    return res.data;
  },

  createBusiness: async (payload: CreateBusinessPayload): Promise<Business> => {
    const res = await apiClient.post<Business>('/business', payload);
    return res.data;
  },

  getBusinessById: async (id: number): Promise<Business> => {
    const res = await apiClient.get<Business>(`/business/${id}`);
    return res.data;
  },
};
