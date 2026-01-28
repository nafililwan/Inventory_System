import toast from 'react-hot-toast';

/**
 * Ultra-safe toast wrapper - prevents any serialization issues
 * This wrapper ensures only string messages are passed to toast library
 * and prevents circular reference errors
 */
export const safeToast = {
  success: (message: string) => {
    try {
      if (typeof message === 'string' && message.length > 0) {
        toast.success(message);
      }
    } catch {
      // Silently fail - prevent any error propagation that could cause circular references
    }
  },
  error: (message: string) => {
    try {
      if (typeof message === 'string' && message.length > 0) {
        toast.error(message);
      }
    } catch {
      // Silently fail - prevent any error propagation that could cause circular references
    }
  },
  info: (message: string) => {
    try {
      if (typeof message === 'string' && message.length > 0) {
        toast(message, { icon: 'ℹ️' });
      }
    } catch {
      // Silently fail - prevent any error propagation that could cause circular references
    }
  },
};

