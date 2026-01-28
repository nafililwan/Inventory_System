import api from '../api';
import { Item } from './items';

export interface ItemBatch {
  batch_id: number;
  type_id: number;
  year_code: string;
  batch_name?: string;
  specifications?: string;
  production_date?: string;
  status: 'active' | 'discontinued' | 'phasing_out';
  created_at: string;
  updated_at: string;
  created_by?: string;
  type_name?: string;
  item_count?: number;
}

export interface ItemBatchCreate {
  type_id: number;
  year_code: string;
  batch_name?: string;
  specifications?: string;
  production_date?: string;
  status?: 'active' | 'discontinued' | 'phasing_out';
}

export interface ItemBatchUpdate {
  batch_name?: string;
  specifications?: string;
  production_date?: string;
  status?: 'active' | 'discontinued' | 'phasing_out';
}

export const itemBatchesService = {
  // Create new batch
  async create(data: ItemBatchCreate): Promise<ItemBatch> {
    const response = await api.post<ItemBatch>('/api/item-batches/', data);
    return response.data;
  },

  // Get all batches
  async list(params?: {
    skip?: number;
    limit?: number;
    type_id?: number;
    year_code?: string;
    status?: string;
  }): Promise<ItemBatch[]> {
    const response = await api.get<ItemBatch[]>('/api/item-batches/', { params });
    return response.data;
  },

  // Get single batch
  async get(id: number): Promise<ItemBatch> {
    const response = await api.get<ItemBatch>(`/api/item-batches/${id}`);
    return response.data;
  },

  // Update batch
  async update(id: number, data: ItemBatchUpdate): Promise<ItemBatch> {
    const response = await api.put<ItemBatch>(`/api/item-batches/${id}`, data);
    return response.data;
  },

  // Delete batch
  async delete(id: number): Promise<void> {
    await api.delete(`/api/item-batches/${id}`);
  },

  // Get items in a batch
  async getItems(batch_id: number): Promise<Item[]> {
    const response = await api.get<Item[]>(`/api/item-batches/${batch_id}/items`);
    return response.data;
  },
};

