import api from './api';

export interface User {
  user_id: number;
  username: string;
  full_name: string;
  email: string | null;
  profile_photo?: string | null;
  role: 'admin' | 'manager' | 'worker' | 'intern';
  status: 'active' | 'inactive';
  created_at: string;
  last_login: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/api/auth/login/json', {
      username,
      password,
    });
    
    // Store token and user info
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    // Store token timestamp for auto-refresh
    localStorage.setItem('token_timestamp', Date.now().toString());
    
    return response.data;
  },

  async refreshToken(): Promise<LoginResponse | null> {
    try {
      const response = await api.post<LoginResponse>('/api/auth/refresh');
      
      // Update token and user info
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('token_timestamp', Date.now().toString());
      
      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, logout user
      this.logout();
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_timestamp');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  },

  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  // Check if token is about to expire (within 5 minutes) and refresh if needed
  async checkAndRefreshToken(): Promise<boolean> {
    const tokenTimestamp = localStorage.getItem('token_timestamp');
    if (!tokenTimestamp) return false;

    const tokenAge = Date.now() - parseInt(tokenTimestamp);
    const tokenExpireTime = 30 * 60 * 1000; // 30 minutes in milliseconds
    const refreshThreshold = 25 * 60 * 1000; // Refresh if less than 25 minutes remaining (5 min buffer)

    // If token is about to expire, refresh it
    if (tokenAge >= refreshThreshold) {
      const refreshed = await this.refreshToken();
      return refreshed !== null;
    }

    return true;
  },
};

