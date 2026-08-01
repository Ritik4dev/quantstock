import { apiClient } from './apiClient';
import { RiskScorecard } from '@/types/api';

export const riskService = {
  getScorecard: async (): Promise<RiskScorecard> => {
    const res = await apiClient.get<RiskScorecard>('/risk');
    return res.data;
  },
};
