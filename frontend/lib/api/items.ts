import api from '../api';

// ============================================================================
// ITEM INTERFACES
// ============================================================================

export interface Item {
  item_id: number;
  batch_id: number;
  item_code: string;
  item_name: string;
  size?: string;
  color?: string;
  unit_type: 'pcs' | 'box' | 'pack' | 'set';
  qr_code?: string;
  barcode?: string;
  min_stock: number;
  max_stock: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by?: string;
  year_code?: string;
  type_name?: string;
  total_stock?: number;
}

export interface ItemCreate {
  batch_id: number;
  item_code: string;
  item_name: string;
  size?: string;
  color?: string;
  unit_type?: 'pcs' | 'box' | 'pack' | 'set';
  min_stock?: number;
  max_stock?: number;
  status?: 'active' | 'inactive';
}

export interface ItemUpdate {
  item_name?: string;
  size?: string;
  color?: string;
  min_stock?: number;
  max_stock?: number;
  status?: 'active' | 'inactive';
}

// ============================================================================
// INVENTORY INTERFACES
// ============================================================================

export interface Inventory {
  inventory_id: number;
  item_id: number;
  store_id: number;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_level: number;
  max_level: number;
  location_in_store?: string;
  last_counted_at?: string;
  last_counted_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  item_code?: string;
  item_name?: string;
  size?: string;
  year_code?: string;
  store_name?: string;
  box_reference?: string;  // Box code (e.g., BOX-2025-0005)
  box_id?: number;  // Box ID for linking to box details
  category_id?: number;  // Category ID
  category_name?: string;  // Category name
  item_type_id?: number;  // Item type ID
  item_type_name?: string;  // Item type name
}

// ============================================================================
// STOCK TRANSACTION INTERFACES
// ============================================================================

export interface StockTransaction {
  transaction_id: number;
  transaction_type: 'box_checkin' | 'stock_out' | 'transfer_out' | 'transfer_in' | 'adjustment' | 'return' | 'damage' | 'disposal';
  box_id?: number;
  item_id: number;
  from_store_id?: number;
  from_store_name?: string;
  to_store_id?: number;
  quantity: number;
  reference_number?: string;
  reference_type?: string;
  request_by?: string;
  employee_name?: string;
  employee_id?: string;
  department?: string;
  reason?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  item_code?: string;
  item_name?: string;
}

// ============================================================================
// ITEMS SERVICE
// ============================================================================

export const itemsService = {
  // Get all items
  async list(params?: {
    skip?: number;
    limit?: number;
    batch_id?: number;
    type_id?: number;
    year_code?: string;
    status?: 'active' | 'inactive';
    search?: string;
    include_stock?: boolean;
  }): Promise<Item[]> {
    const response = await api.get<Item[]>('/api/items/', { params });
    return response.data;
  },

  // Get single item
  async get(id: number, includeStock = false): Promise<Item> {
    const response = await api.get<Item>(`/api/items/${id}`, {
      params: { include_stock: includeStock }
    });
    return response.data;
  },

  // Create item
  async create(data: ItemCreate): Promise<Item> {
    const response = await api.post<Item>('/api/items/', data);
    return response.data;
  },

  // Update item
  async update(id: number, data: ItemUpdate): Promise<Item> {
    const response = await api.put<Item>(`/api/items/${id}`, data);
    return response.data;
  },

  // Delete item
  async delete(id: number, force = false): Promise<void> {
    await api.delete(`/api/items/${id}`, { params: { force } });
  },
};

// ============================================================================
// INVENTORY SERVICE
// ============================================================================

export const inventoryService = {
  // Get inventory records
  async list(params?: {
    skip?: number;
    limit?: number;
    item_id?: number;
    store_id?: number;
    low_stock?: boolean;
  }): Promise<Inventory[]> {
    const response = await api.get<Inventory[]>('/api/items/inventory', { params });
    return response.data;
  },

  // Delete single inventory record
  // Axios interceptor already converts errors to simple Error objects
  async delete(inventoryId: number, force = false): Promise<void> {
    await api.delete(`/api/items/inventory/${inventoryId}`, { params: { force } });
  },

  // Bulk delete inventory records
  // Axios interceptor already converts errors to simple Error objects
  async bulkDelete(inventoryIds: number[], force = false): Promise<{ message: string; deleted_count: number; deleted_ids: number[] }> {
    const response = await api.post<{ message: string; deleted_count: number; deleted_ids: number[] }>('/api/items/inventory/bulk-delete', {
      inventory_ids: inventoryIds,
      force
    });
    return response.data;
  },
};

// ============================================================================
// STOCK TRANSACTIONS SERVICE
// ============================================================================

export const stockTransactionsService = {
  // Get stock transactions
  async list(params?: {
    skip?: number;
    limit?: number;
    item_id?: number;
    store_id?: number;
    transaction_type?: string;
    reference_number?: string;
  }): Promise<StockTransaction[]> {
    const response = await api.get<StockTransaction[]>('/api/items/transactions', { params });
    return response.data;
  },

  // Create stock transaction
  async create(data: {
    transaction_type: string;
    item_id: number;
    from_store_id?: number;
    to_store_id?: number;
    quantity: number;
    employee_name?: string;
    employee_id?: string;
    department?: string;
    reason?: string;
    reference_number?: string;
    reference_type?: string;
    notes?: string;
    box_id?: number;
  }): Promise<StockTransaction> {
    // Ensure quantity is positive and greater than 0
    const quantity = Math.abs(data.quantity);
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    
    // Build payload with only defined values
    const payload: any = {
      transaction_type: data.transaction_type,
      item_id: data.item_id,
      quantity: quantity,
    };
    
    // Add optional fields only if they have values
    if (data.from_store_id !== undefined && data.from_store_id !== null) {
      payload.from_store_id = data.from_store_id;
    }
    if (data.to_store_id !== undefined && data.to_store_id !== null) {
      payload.to_store_id = data.to_store_id;
    }
    if (data.employee_name) payload.employee_name = data.employee_name;
    if (data.employee_id) payload.employee_id = data.employee_id;
    if (data.department) payload.department = data.department;
    if (data.reason) payload.reason = data.reason;
    if (data.reference_number) payload.reference_number = data.reference_number;
    if (data.reference_type) payload.reference_type = data.reference_type;
    if (data.notes) payload.notes = data.notes;
    if (data.box_id !== undefined && data.box_id !== null) {
      payload.box_id = data.box_id;
    }
    
    console.log('[StockTransaction] Sending payload:', payload);
    const response = await api.post<StockTransaction>('/api/items/transactions', payload);
    return response.data;
  },
};
