import api from '../api';

export interface ItemType {
  type_id: number;
  category_id: number;
  type_name: string;
  description?: string | null;
  has_size: boolean;
  available_sizes: string[];
  has_color: boolean;
  available_colors?: string[] | null;
  status: 'active' | 'inactive';
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  category_name?: string;
  item_count?: number;
}

export interface ItemTypeCreate {
  category_id: number;
  type_name: string;
  description?: string;
  has_size?: boolean;
  available_sizes?: string[];
  has_color?: boolean;
  available_colors?: string[];
  status?: 'active' | 'inactive';
  display_order?: number;
}

export interface ItemTypeUpdate {
  type_name?: string;
  description?: string;
  has_size?: boolean;
  available_sizes?: string[];
  has_color?: boolean;
  available_colors?: string[];
  status?: 'active' | 'inactive';
  display_order?: number;
}

export const itemTypesService = {
  // Get all types
  list: (params?: {
    skip?: number;
    limit?: number;
    category_id?: number;
    status?: 'active' | 'inactive';
    search?: string;
  }) => api.get<ItemType[]>('/api/item-types/', { params }),

  // Get single type
  get: (id: number) => api.get<ItemType>(`/api/item-types/${id}`),

  // Create type
  create: (data: ItemTypeCreate) =>
    api.post<ItemType>('/api/item-types/', data),

  // Update type
  update: (id: number, data: Partial<ItemTypeCreate>) =>
    api.put<ItemType>(`/api/item-types/${id}`, data),

  // Delete type
  delete: (id: number, force = false) =>
    api.delete(`/api/item-types/${id}`, { params: { force } }),

  // Reorder type
  reorder: (id: number, newOrder: number) =>
    api.put(`/api/item-types/${id}/reorder`, null, {
      params: { new_order: newOrder }
    }),

  // Get stats
  getStats: () => api.get('/api/item-types/stats/count'),
};

