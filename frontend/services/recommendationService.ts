import { apiClient } from './apiClient';
import { ProductRecommendation, RecommendationOverview } from '@/types/api';

export const recommendationService = {
  getOverview: async (): Promise<RecommendationOverview> => {
    const res = await apiClient.get<RecommendationOverview>('/recommendations');
    return res.data;
  },

  getProductRecommendation: async (productId: number): Promise<ProductRecommendation> => {
    const res = await apiClient.get<ProductRecommendation>(`/recommendations/product/${productId}`);
    return res.data;
  },
};
