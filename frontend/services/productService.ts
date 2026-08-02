import { apiClient } from './apiClient';
import { Product } from '@/types/api';

export type { Product };

export interface CreateProductPayload {
  name: string;
  sku?: string;
  category?: string;
  description?: string;
}

export const productService = {
  getProducts: async (search?: string): Promise<Product[]> => {
    const res = await apiClient.get<Product[]>('/products', { params: search ? { search } : undefined });
    return res.data;
  },

  getProductById: async (id: number): Promise<Product> => {
    const res = await apiClient.get<Product>(`/products/${id}`);
    return res.data;
  },

  createProduct: async (payload: CreateProductPayload): Promise<Product> => {
    const res = await apiClient.post<Product>('/products', payload);
    return res.data;
  },

  updateProduct: async (id: number, payload: Partial<CreateProductPayload>): Promise<Product> => {
    const res = await apiClient.put<Product>(`/products/${id}`, payload);
    return res.data;
  },

  deleteProduct: async (id: number): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },
};
