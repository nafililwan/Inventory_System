import api from './api';

export interface Category {
  category_id: number;
  category_name: string;
  description?: string | null;
  icon: string;
  color: string;
  status: 'active' | 'inactive';
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  type_count?: number;
}

export interface CategoryCreate {
  category_name: string;
  description?: string;
  icon?: string;
  color?: string;
  status?: 'active' | 'inactive';
  display_order?: number;
}

export interface CategoryUpdate {
  category_name?: string;
  description?: string;
  icon?: string;
  color?: string;
  status?: 'active' | 'inactive';
  display_order?: number;
}

export interface SizeStockLevel {
  min: number;
  max: number;
}

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
  min_stock_level?: number;
  max_stock_level?: number;
  size_stock_levels?: Record<string, SizeStockLevel>; // {"S": {"min": 50, "max": 1000}}
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
  min_stock_level?: number;
  max_stock_level?: number;
  size_stock_levels?: Record<string, SizeStockLevel>;
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
  min_stock_level?: number;
  max_stock_level?: number;
  size_stock_levels?: Record<string, SizeStockLevel>;
}

export const categoryService = {
  // Get all categories
  async getAll(params?: {
    skip?: number;
    limit?: number;
    status?: 'active' | 'inactive';
    search?: string;
    include_counts?: boolean;
  }): Promise<Category[]> {
    const response = await api.get<Category[]>('/api/categories/', { params });
    return response.data;
  },

  // Get single category
  async getById(id: number, includeTypes = true): Promise<Category> {
    const response = await api.get<Category>(`/api/categories/${id}`, {
      params: { include_types: includeTypes }
    });
    return response.data;
  },

  // Create category
  async create(data: CategoryCreate): Promise<Category> {
    const response = await api.post<Category>('/api/categories/', data);
    return response.data;
  },

  // Update category
  async update(id: number, data: CategoryUpdate): Promise<Category> {
    const response = await api.put<Category>(`/api/categories/${id}`, data);
    return response.data;
  },

  // Delete category
  async delete(id: number, force = false): Promise<any> {
    const response = await api.delete(`/api/categories/${id}`, {
      params: { force }
    });
    return response.data;
  },

  // Reorder category
  async reorder(id: number, newOrder: number): Promise<any> {
    const response = await api.put(`/api/categories/${id}/reorder`, null, {
      params: { new_order: newOrder }
    });
    return response.data;
  },

  // Get category types
  async getTypes(categoryId: number, status?: 'active' | 'inactive'): Promise<ItemType[]> {
    const params = status ? { status } : {};
    const response = await api.get<ItemType[]>(`/api/categories/${categoryId}/types`, { params });
    return response.data;
  },

  // Get stats
  async getStats(): Promise<any> {
    const response = await api.get('/api/categories/stats/count');
    return response.data;
  },
};

// Alias for existing naming pattern
export const categoriesService = categoryService;

export const itemTypeService = {
  // Get all types (alias for getAll)
  async list(params?: {
    skip?: number;
    limit?: number;
    category_id?: number;
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<ItemType[]> {
    const response = await api.get<ItemType[]>('/api/item-types/', { params });
    return response.data;
  },
  
  // Get all types
  async getAll(params?: {
    skip?: number;
    limit?: number;
    category_id?: number;
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<ItemType[]> {
    const response = await api.get<ItemType[]>('/api/item-types/', { params });
    return response.data;
  },

  // Get single type
  async getById(id: number): Promise<ItemType> {
    const response = await api.get<ItemType>(`/api/item-types/${id}`);
    return response.data;
  },

  // Get types by category
  async getByCategory(categoryId: number, status?: string): Promise<ItemType[]> {
    const params = status ? { status } : {};
    const response = await api.get<ItemType[]>(`/api/categories/${categoryId}/types`, { params });
    return response.data;
  },

  // Create type
  async create(categoryId: number, data: ItemTypeCreate | Omit<ItemTypeCreate, 'category_id'>): Promise<ItemType> {
    // Ensure category_id is set
    const createData = { ...data, category_id: categoryId } as ItemTypeCreate;
    const response = await api.post<ItemType>('/api/item-types/', createData);
    return response.data;
  },

  // Update type
  async update(typeId: number, data: ItemTypeUpdate): Promise<ItemType> {
    const response = await api.put<ItemType>(`/api/item-types/${typeId}`, data);
    return response.data;
  },

  // Delete type
  async delete(typeId: number, force = false): Promise<any> {
    const response = await api.delete(`/api/item-types/${typeId}`, {
      params: { force }
    });
    return response.data;
  },

  // Reorder type
  async reorder(typeId: number, newOrder: number): Promise<any> {
    const response = await api.put(`/api/item-types/${typeId}/reorder`, null, {
      params: { new_order: newOrder }
    });
    return response.data;
  },

  // Get stats
  async getStats(): Promise<any> {
    const response = await api.get('/api/item-types/stats/count');
    return response.data;
  },
};

