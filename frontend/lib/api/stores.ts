import api from '../api';

export interface Store {
  store_id: number;
  plant_id: number;
  store_code: string;
  store_name: string;
  store_type: 'main' | 'sub' | 'production' | 'warehouse' | 'defect' | 'quarantine';
  location_details?: string;
  capacity?: number;
  current_items: number;
  store_manager?: string;
  contact_number?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
  plant_name?: string;
  plant_code?: string;
  utilization_percentage?: number;
}

export interface StoreCreate {
  plant_id: number;
  store_code: string;
  store_name: string;
  store_type?: 'main' | 'sub' | 'production' | 'warehouse' | 'defect' | 'quarantine';
  location_details?: string;
  capacity?: number;
  store_manager?: string;
  contact_number?: string;
  notes?: string;
  status?: 'active' | 'inactive' | 'maintenance';
}

export const storesService = {
  // Get all stores
  async list(params?: {
    skip?: number;
    limit?: number;
    plant_id?: number;
    status?: string;
    store_type?: string;
    search?: string;
  }): Promise<Store[]> {
    const response = await api.get<Store[]>('/api/stores/', { params });
    return response.data;
  },

  // Get single store
  async get(id: number): Promise<Store> {
    const response = await api.get<Store>(`/api/stores/${id}`);
    return response.data;
  },

  // Create store
  async create(data: StoreCreate): Promise<Store> {
    const response = await api.post<Store>('/api/stores/', data);
    return response.data;
  },

  // Update store
  async update(id: number, data: Partial<StoreCreate>): Promise<Store> {
    const response = await api.put<Store>(`/api/stores/${id}`, data);
    return response.data;
  },

  // Delete store
  async delete(id: number, force = false): Promise<any> {
    const response = await api.delete(`/api/stores/${id}`, { params: { force } });
    return response.data;
  },

  // Get stats
  async getStats(): Promise<any> {
    const response = await api.get('/api/stores/stats/count');
    return response.data;
  },

  // Get stores by type
  async getByType(): Promise<any> {
    const response = await api.get('/api/stores/by-type/count');
    return response.data;
  },
};

