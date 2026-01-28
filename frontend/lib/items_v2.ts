import api from './api';

export interface SizeConfig {
  size: string;
  quantity: number;
}

export interface ItemV2 {
  item_id: number;
  item_name: string;
  category: string;
  type: string;
  unit_type: 'piece' | 'box' | 'set' | 'pair' | 'dozen' | 'carton';
  sizes?: SizeConfig[];
  total_quantity: number;
  qr_code?: string;
  created_at: string;
  created_by?: string;
  status: 'active' | 'inactive';
}

export interface ItemCreateV2 {
  item_name: string;
  category: string;
  type: string;
  unit_type: 'piece' | 'box' | 'set' | 'pair' | 'dozen' | 'carton';
  sizes?: SizeConfig[];
  total_quantity?: number;
  status?: 'active' | 'inactive';
}

export interface ItemUpdateV2 {
  item_name?: string;
  category?: string;
  type?: string;
  unit_type?: 'piece' | 'box' | 'set' | 'pair' | 'dozen' | 'carton';
  sizes?: SizeConfig[];
  total_quantity?: number;
  status?: 'active' | 'inactive';
}

export const itemsV2Service = {
  async getAll(params?: {
    skip?: number;
    limit?: number;
    category?: string;
    status?: string;
    search?: string;
  }): Promise<ItemV2[]> {
    const response = await api.get<ItemV2[]>('/api/v2/items', { params });
    return response.data;
  },

  async getById(itemId: number): Promise<ItemV2> {
    const response = await api.get<ItemV2>(`/api/v2/items/${itemId}`);
    return response.data;
  },

  async create(item: ItemCreateV2): Promise<ItemV2> {
    const response = await api.post<ItemV2>('/api/v2/items', item);
    return response.data;
  },

  async update(itemId: number, item: ItemUpdateV2): Promise<ItemV2> {
    const response = await api.put<ItemV2>(`/api/v2/items/${itemId}`, item);
    return response.data;
  },

  async delete(itemId: number): Promise<void> {
    await api.delete(`/api/v2/items/${itemId}`);
  },
};









