import api from './api';

export interface Plant {
  plant_id: number;
  plant_name: string;
  location?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface PlantCreate {
  plant_name: string;
  location?: string;
  status?: 'active' | 'inactive';
}

export interface PlantUpdate {
  plant_name?: string;
  location?: string;
  status?: 'active' | 'inactive';
}

export const plantService = {
  async getAll(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<Plant[]> {
    const response = await api.get<Plant[]>('/api/plants/', { params });
    return response.data;
  },

  async getById(plantId: number): Promise<Plant> {
    const response = await api.get<Plant>(`/api/plants/${plantId}`);
    return response.data;
  },

  async create(plant: PlantCreate): Promise<Plant> {
    const response = await api.post<Plant>('/api/plants/', plant);
    return response.data;
  },

  async update(plantId: number, plant: PlantUpdate): Promise<Plant> {
    const response = await api.put<Plant>(`/api/plants/${plantId}`, plant);
    return response.data;
  },

  async delete(plantId: number, force: boolean = false): Promise<void> {
    await api.delete(`/api/plants/${plantId}`, { params: { force } });
  },

  async getStores(plantId: number, status?: string): Promise<any[]> {
    const response = await api.get(`/api/plants/${plantId}/stores`, { params: { status } });
    return response.data;
  },

  async getStats(): Promise<any> {
    const response = await api.get('/api/plants/stats/count');
    return response.data;
  },
};

