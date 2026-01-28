import api from '../api';

export interface BoxContentInput {
  type_id: number;
  year_code: string;
  size: string;
  color?: string;
  quantity: number;
}

export interface BoxContent {
  content_id: number;
  box_id: number;
  item_id: number;
  quantity: number;
  remaining: number;
  item_code?: string;
  item_name?: string;
  size?: string;
  color?: string;
}

export interface BoxCreate {
  supplier?: string;
  po_number?: string;
  do_number?: string;
  invoice_number?: string;
  received_date: string; // ISO date string
  contents: BoxContentInput[];
  notes?: string;
}

export interface BoxCheckIn {
  store_id: number;
  location_in_store?: string;
}

export interface Box {
  box_id: number;
  box_code: string;
  qr_code: string;
  supplier?: string;
  po_number?: string;
  do_number?: string;
  invoice_number?: string;
  store_id?: number;
  location_in_store?: string;
  status: 'pending_checkin' | 'checked_in' | 'in_use' | 'empty' | 'damaged' | 'returned' | 'stocked_out';
  received_date: string;
  received_by: string;
  checked_in_at?: string;
  checked_in_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  total_items?: number;
  store_name?: string;
}

export interface BoxWithContents extends Box {
  contents: BoxContent[];
}

export interface BoxInventory {
  inventory_id: number;
  item_id: number;
  item_code?: string;
  item_name?: string;
  size?: string;
  store_id: number;
  store_name?: string;
  quantity: number;
  available_quantity: number;
  location_in_store?: string;
  checked_in_at: string;
}

export const boxesService = {
  // Create new box (receive from supplier)
  create: (data: BoxCreate) => api.post<BoxWithContents>('/api/boxes/', data),

  // Get pending boxes
  getPending: (params?: { skip?: number; limit?: number }) =>
    api.get<BoxWithContents[]>('/api/boxes/pending', { params }),

  // Get box details
  get: (id: number) => api.get<BoxWithContents>(`/api/boxes/${id}`),

  // Get inventory items from box
  getInventory: (id: number) => api.get<BoxInventory[]>(`/api/boxes/${id}/inventory`),

  // Check-in box to store
  checkIn: (id: number, data: BoxCheckIn) =>
    api.put<Box>(`/api/boxes/${id}/checkin`, data),

  // List all boxes
  list: (params?: {
    skip?: number;
    limit?: number;
    status?: string;
    store_id?: number;
    search?: string;
  }) => api.get<Box[]>('/api/boxes/', { params }),
};

