import api from '../api';

export interface Plant {
  plant_id: number;
  plant_code: string;
  plant_name: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country: string;
  contact_person?: string;
  contact_number?: string;
  email?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  store_count?: number;
  stores?: Store[];
}

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

export interface PlantCreate {
  plant_code: string;
  plant_name: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  contact_person?: string;
  contact_number?: string;
  email?: string;
  status?: 'active' | 'inactive';
}

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

export const plantsService = {
  // Get all plants
  async list(params?: {
    skip?: number;
    limit?: number;
    status?: 'active' | 'inactive';
    search?: string;
    include_counts?: boolean;
  }): Promise<Plant[]> {
    const response = await api.get<Plant[]>('/api/plants/', { params });
    return response.data;
  },

  // Get single plant
  async get(id: number, includeStores = true): Promise<Plant> {
    const response = await api.get<Plant>(`/api/plants/${id}`, {
      params: { include_stores: includeStores }
    });
    return response.data;
  },

  // Create plant
  async create(data: PlantCreate): Promise<Plant> {
    const response = await api.post<Plant>('/api/plants/', data);
    return response.data;
  },

  // Update plant
  async update(id: number, data: Partial<PlantCreate>): Promise<Plant> {
    const response = await api.put<Plant>(`/api/plants/${id}`, data);
    return response.data;
  },

  // Delete plant
  async delete(id: number, force = false): Promise<any> {
    const response = await api.delete(`/api/plants/${id}`, { params: { force } });
    return response.data;
  },

  // Get plant stores
  async getStores(id: number, params?: {
    status?: string;
    store_type?: string;
  }): Promise<Store[]> {
    const response = await api.get<Store[]>(`/api/plants/${id}/stores`, { params });
    return response.data;
  },

  // Get stats
  async getStats(): Promise<any> {
    const response = await api.get('/api/plants/stats/count');
    return response.data;
  },
};

