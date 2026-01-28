import api from '../api';

// ============================================================================
// USER INTERFACES
// ============================================================================

export interface User {
  user_id: number;
  username: string;
  email?: string;
  full_name?: string;
  profile_photo?: string | null;
  role: 'admin' | 'manager' | 'worker' | 'intern';
  status: 'active' | 'inactive';
  created_at: string;
  last_login?: string | null;
}

export interface UserCreate {
  username: string;
  email?: string;
  full_name?: string;
  role?: 'admin' | 'manager' | 'worker' | 'intern';
  password?: string; // Optional - backend will generate if not provided
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  role?: 'admin' | 'manager' | 'worker' | 'intern';
  status?: 'active' | 'inactive';
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  managers: number;
}

// ============================================================================
// USER SERVICE
// ============================================================================

export const usersService = {
  /**
   * Get all users with optional filtering
   */
  list: async (params?: {
    skip?: number;
    limit?: number;
    status?: 'active' | 'inactive';
    role?: 'admin' | 'manager' | 'worker' | 'intern';
    search?: string;
  }): Promise<User[]> => {
    const response = await api.get('/api/users/', { params });
    return response.data;
  },

  /**
   * Get single user by ID
   */
  get: async (userId: number): Promise<User> => {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  /**
   * Create new user
   * - Only admins can create users
   * - Email will be sent with temporary password if email is provided
   */
  create: async (user: UserCreate): Promise<User> => {
    const response = await api.post('/api/users/', user);
    return response.data;
  },

  /**
   * Update user
   */
  update: async (userId: number, user: UserUpdate): Promise<User> => {
    const response = await api.put(`/api/users/${userId}`, user);
    return response.data;
  },

  /**
   * Delete user
   * - Only admins can delete users
   */
  delete: async (userId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/api/users/${userId}`);
    return response.data;
  },

  /**
   * Get user statistics
   */
  getStats: async (): Promise<UserStats> => {
    const response = await api.get('/api/users/stats/count');
    return response.data;
  },
};

