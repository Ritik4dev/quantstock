import { apiClient } from './apiClient';
import { Supplier } from '@/types/api';

export interface CreateSupplierPayload {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  lead_time_days?: number;
}

export const supplierService = {
  getSuppliers: async (): Promise<Supplier[]> => {
    const res = await apiClient.get<Supplier[]>('/suppliers');
    return res.data;
  },

  createSupplier: async (payload: CreateSupplierPayload): Promise<Supplier> => {
    const res = await apiClient.post<Supplier>('/suppliers', payload);
    return res.data;
  },

  updateSupplier: async (id: number, payload: Partial<CreateSupplierPayload>): Promise<Supplier> => {
    const res = await apiClient.put<Supplier>(`/suppliers/${id}`, payload);
    return res.data;
  },

  deleteSupplier: async (id: number): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};
