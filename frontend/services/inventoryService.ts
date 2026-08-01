import { apiClient } from './apiClient';
import { Inventory } from '@/types/api';

export interface CreateInventoryPayload {
  product_id: number;
  supplier_id?: number;
  current_stock: number;
  minimum_stock?: number;
  maximum_stock?: number;
  buying_price: number;
  selling_price: number;
  expiry_date?: string;
}

export const inventoryService = {
  getInventory: async (): Promise<Inventory[]> => {
    const res = await apiClient.get<Inventory[]>('/inventory');
    return res.data;
  },

  getInventoryById: async (id: number): Promise<Inventory> => {
    const res = await apiClient.get<Inventory>(`/inventory/${id}`);
    return res.data;
  },

  createInventory: async (payload: CreateInventoryPayload): Promise<Inventory> => {
    const res = await apiClient.post<Inventory>('/inventory', payload);
    return res.data;
  },

  updateInventory: async (id: number, payload: Partial<CreateInventoryPayload>): Promise<Inventory> => {
    const res = await apiClient.put<Inventory>(`/inventory/${id}`, payload);
    return res.data;
  },

  deleteInventory: async (id: number): Promise<void> => {
    await apiClient.delete(`/inventory/${id}`);
  },
};
