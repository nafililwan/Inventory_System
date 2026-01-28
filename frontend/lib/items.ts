import api from './api';

export interface SizeConfig {
  size: string;
  quantity: number;
}

export interface Item {
  item_id: number;
  qr_code: string;
  item_name: string;
  category: string;
  type: string;
  unit_type: 'pcs' | 'box' | 'pack';
  sizes: SizeConfig[];
  total_quantity: number;
  status: 'active' | 'inactive';
  created_by: string;
  created_at: string;
  updated_at?: string;
  last_edit?: {
    edited_by: string;
    edited_at: string;
    change_summary: string;
  };
}

export interface ItemCreate {
  item_name: string;
  category: string;
  type: string;
  unit_type: 'pcs' | 'box' | 'pack';
  sizes: SizeConfig[];
}

export interface ItemUpdate {
  item_name?: string;
  category?: string;
  type?: string;
  unit_type?: 'pcs' | 'box' | 'pack';
  sizes?: SizeConfig[];
  status?: 'active' | 'inactive';
}

export interface ItemHistory {
  history_id: number;
  edited_by: string;
  edited_at: string;
  change_summary: string;
  changes: Record<string, any>;
}

export interface ItemHistoryResponse {
  item_id: number;
  item_name: string;
  qr_code: string;
  history: ItemHistory[];
  total_edits: number;
  page: number;
  pages: number;
}

export interface ItemListResponse {
  items: Item[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  filters_applied: Record<string, any>;
}

export interface ItemFilters {
  search?: string;
  category?: string;
  type?: string;
  unit_type?: string;
  status?: string;
  size_available?: string;
  stock_level?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'high_stock';
  created_from?: string;
  created_to?: string;
  sort_by?: 'item_name' | 'category' | 'total_quantity' | 'created_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  skip?: number;
}

export const itemService = {
  async getAll(filters?: ItemFilters): Promise<ItemListResponse> {
    const response = await api.get<ItemListResponse>('/api/items/list', { params: filters });
    return response.data;
  },

  async getById(itemId: number): Promise<Item> {
    const response = await api.get<Item>(`/api/items/${itemId}`);
    return response.data;
  },

  async create(item: ItemCreate): Promise<Item> {
    const response = await api.post<Item>('/api/items/', item);
    return response.data;
  },

  async update(itemId: number, item: ItemUpdate): Promise<Item> {
    const response = await api.put<Item>(`/api/items/${itemId}`, item);
    return response.data;
  },

  async delete(itemId: number): Promise<void> {
    await api.delete(`/api/items/${itemId}`);
  },

  async getHistory(itemId: number, limit = 10, skip = 0): Promise<ItemHistoryResponse> {
    const response = await api.get<ItemHistoryResponse>(
      `/api/items/${itemId}/history`,
      { params: { limit, skip } }
    );
    return response.data;
  },

  async export(format: 'csv' | 'excel', filters?: ItemFilters): Promise<Blob> {
    const response = await api.get(`/api/items/export`, {
      params: { format, ...filters },
      responseType: 'blob'
    });
    return response.data;
  },

  async getAvailableSizes(): Promise<{ sizes: { size: string; item_count: number }[] }> {
    const response = await api.get('/api/items/sizes');
    return response.data;
  }
};
