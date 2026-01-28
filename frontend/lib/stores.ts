import api from './api';

export interface Store {
  store_id: number;
  plant_id: number;
  store_name: string;
  location?: string;
  store_type?: 'uniform' | 'safety' | 'office' | 'tools' | 'other';
  person_in_charge?: string;
  contact_number?: string;
  status: 'active' | 'inactive';
  stock_out_mode: 'trust' | 'casual' | 'strict';
  created_at: string;
}

export interface StoreCreate {
  plant_id: number;
  store_name: string;
  location?: string;
  store_type?: 'uniform' | 'safety' | 'office' | 'tools' | 'other';
  person_in_charge?: string;
  contact_number?: string;
  status?: 'active' | 'inactive';
  stock_out_mode?: 'trust' | 'casual' | 'strict';
}

export interface StoreUpdate {
  plant_id?: number;
  store_name?: string;
  location?: string;
  store_type?: 'uniform' | 'safety' | 'office' | 'tools' | 'other';
  person_in_charge?: string;
  contact_number?: string;
  status?: 'active' | 'inactive';
  stock_out_mode?: 'trust' | 'casual' | 'strict';
}

export const storeService = {
  async getAll(params?: {
    skip?: number;
    limit?: number;
    plant_id?: number;
    status?: string;
    store_type?: string;
    search?: string;
  }): Promise<Store[]> {
    const response = await api.get<Store[]>('/api/stores', { params });
    return response.data;
  },

  async getById(storeId: number): Promise<Store> {
    const response = await api.get<Store>(`/api/stores/${storeId}`);
    return response.data;
  },

  async create(store: StoreCreate): Promise<Store> {
    const response = await api.post<Store>('/api/stores', store);
    return response.data;
  },

  async update(storeId: number, store: StoreUpdate): Promise<Store> {
    const response = await api.put<Store>(`/api/stores/${storeId}`, store);
    return response.data;
  },

  async delete(storeId: number, force: boolean = false): Promise<void> {
    await api.delete(`/api/stores/${storeId}`, { params: { force } });
  },

  async getStats(): Promise<any> {
    const response = await api.get('/api/stores/stats/count');
    return response.data;
  },

  async getStoresByTypeCount(): Promise<any> {
    const response = await api.get('/api/stores/by-type/count');
    return response.data;
  },
};

