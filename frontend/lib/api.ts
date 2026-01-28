import axios, { AxiosError } from 'axios';

// Get API URL from environment or use production default
// For static export, we need to check if we're in browser and use production URL
export const getApiUrl = () => {
  // If in browser (client-side), use production API
  if (typeof window !== 'undefined') {
    // Check if we're on production domain
    const hostname = window.location.hostname;
    if (hostname === 'jabilinventory.store' || hostname === 'www.jabilinventory.store') {
      // Try HTTPS first, fallback to HTTP if SSL not ready
      // Check if we're on HTTPS, if yes use HTTPS for API, else HTTP
      if (window.location.protocol === 'https:') {
        return 'https://api.jabilinventory.store';
      } else {
        return 'http://api.jabilinventory.store';
      }
    }
  }
  // Use environment variable or fallback
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to safely extract error info without circular references
// Never accesses nested objects that might have circular refs
function safeErrorInfo(error: any) {
  try {
    const result: any = {
      message: 'Unknown error',
    };

    // Extract message safely
    try {
      if (error && typeof error.message === 'string') {
        result.message = error.message;
      }
    } catch {
      // Ignore
    }

    // Extract response info safely (only primitives)
    try {
      if (error?.response && typeof error.response === 'object') {
        const resp: any = {};
        if (typeof error.response.status === 'number') {
          resp.status = error.response.status;
        }
        if (typeof error.response.statusText === 'string') {
          resp.statusText = error.response.statusText;
        }
        // Extract data.detail or data.message only (strings)
        try {
          if (error.response.data && typeof error.response.data === 'object') {
            if (typeof error.response.data.detail === 'string') {
              resp.detail = error.response.data.detail;
            } else if (typeof error.response.data.message === 'string') {
              resp.message = error.response.data.message;
            }
          }
        } catch {
          // Ignore data extraction
        }
        if (Object.keys(resp).length > 0) {
          result.response = resp;
        }
      }
    } catch {
      // Ignore response extraction
    }

    return result;
  } catch {
    return { message: 'Error occurred' };
  }
}

// Request interceptor to add auth token and auto-refresh
api.interceptors.request.use(
  async (config) => {
    // Skip token refresh check for auth endpoints to avoid infinite loop
    if (config.url?.includes('/api/auth/login') || config.url?.includes('/api/auth/refresh')) {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }

    // Check and refresh token if needed before making request
    try {
      const { authService } = await import('./auth');
      await authService.checkAndRefreshToken();
    } catch (error) {
      // If refresh check fails, continue with existing token
      console.error('Token refresh check failed:', error);
    }

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Return a clean error object without circular references
    const cleanError = safeErrorInfo(error);
    return Promise.reject(new Error(cleanError.message || 'Request failed'));
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Try to refresh token first (if not already a refresh request)
      const originalRequest = error.config as any;
      if (!originalRequest._retry && !error.config?.url?.includes('/api/auth/refresh')) {
        originalRequest._retry = true;
        
        try {
          const { authService } = await import('./auth');
          const refreshed = await authService.refreshToken();
          
          if (refreshed) {
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${refreshed.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, proceed to logout
        }
      }
      
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('token_timestamp');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    
    // Extract error message before browser console can serialize error object
    // This prevents "Converting circular structure to JSON" errors
    let errorMessage = 'Request failed';
    
    try {
      if (error.response?.data && typeof error.response.data === 'object') {
        const data = error.response.data as any;
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (typeof data.message === 'string') {
          errorMessage = data.message;
        }
      } else if (typeof error.message === 'string') {
        errorMessage = error.message;
      }
    } catch {
      // If extraction fails, use default
    }
    
    // Return simple Error with message only - no axios error object with circular refs
    // This prevents browser console from trying to serialize complex error objects
    return Promise.reject(new Error(errorMessage));
  }
);

export default api;

