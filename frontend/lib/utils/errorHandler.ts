/**
 * Safely extract error information without circular references
 * This prevents "Converting circular structure to JSON" errors
 * Uses only direct property access, never serialization
 */
export function safeErrorExtract(error: any): {
  message: string;
  detail: string;
  status?: number;
  statusText?: string;
} {
  // Use try-catch for each property access to be extra safe
  let message = 'Unknown error';
  let detail = 'An unexpected error occurred';
  let status: number | undefined;
  let statusText: string | undefined;

  try {
    if (error && typeof error === 'object') {
      // Extract message - only if it's a string
      try {
        const msg = error.message;
        if (typeof msg === 'string' && msg.length > 0) {
          message = msg;
        }
      } catch {
        // Ignore
      }

      // Extract response - only access direct properties
      try {
        const resp = error.response;
        if (resp && typeof resp === 'object') {
          // Extract status
          try {
            const st = resp.status;
            if (typeof st === 'number') {
              status = st;
            }
          } catch {
            // Ignore
          }

          // Extract statusText
          try {
            const stText = resp.statusText;
            if (typeof stText === 'string') {
              statusText = stText;
            }
          } catch {
            // Ignore
          }

          // Extract data.detail or data.message
          try {
            const data = resp.data;
            if (data && typeof data === 'object') {
              const detailVal = data.detail;
              if (typeof detailVal === 'string' && detailVal.length > 0) {
                detail = detailVal;
              } else {
                const msgVal = data.message;
                if (typeof msgVal === 'string' && msgVal.length > 0) {
                  detail = msgVal;
                }
              }
            }
          } catch {
            // Ignore
          }
        }
      } catch {
        // Ignore response extraction errors
      }

      // Use message as detail fallback if detail is still default
      if (message !== 'Unknown error' && detail === 'An unexpected error occurred') {
        detail = message;
      }
    }
  } catch {
    // If anything fails, return safe defaults
  }

  return {
    message,
    detail,
    status,
    statusText,
  };
}

/**
 * Safely log error without circular references
 * Uses console.error with only primitive values - never passes error object directly
 */
export function safeErrorLog(context: string, error: any): void {
  try {
    // Extract error info first (this never touches circular refs)
    const errorInfo = safeErrorExtract(error);
    
    // Log only primitive values as separate arguments, never as object
    console.error(
      `[${context}]`,
      `Message: ${errorInfo.message}`,
      `Detail: ${errorInfo.detail}`,
      errorInfo.status !== undefined ? `Status: ${errorInfo.status}` : '',
      errorInfo.statusText ? `StatusText: ${errorInfo.statusText}` : ''
    );
  } catch (e) {
    // Even extraction/logging failed - use minimal safe logging
    console.error(`[${context}]`, 'Error occurred (unable to extract details)');
  }
}

/**
 * Safely log any value without circular references
 * Never uses JSON.stringify to avoid circular reference errors
 */
export function safeLog(label: string, ...values: any[]): void {
  try {
    const safeValues = values.map(val => {
      // Primitives are safe
      if (val === null || val === undefined) return val;
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
      
      // Arrays - extract only primitives
      if (Array.isArray(val)) {
        return val.map(item => {
          if (item === null || item === undefined) return item;
          if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return item;
          // For objects in array, just show type
          return `[${typeof item}]`;
        });
      }
      
      // Objects - extract only primitive properties manually
      if (typeof val === 'object') {
        const safeObj: Record<string, any> = {};
        try {
          // Only extract own enumerable properties that are primitives
          for (const key in val) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
              try {
                const prop = val[key];
                if (prop === null || prop === undefined) {
                  safeObj[key] = prop;
                } else if (typeof prop === 'string' || typeof prop === 'number' || typeof prop === 'boolean') {
                  safeObj[key] = prop;
                } else if (Array.isArray(prop)) {
                  safeObj[key] = `[Array(${prop.length})]`;
                } else {
                  safeObj[key] = `[${typeof prop}]`;
                }
              } catch {
                // Skip this property if access fails
              }
            }
          }
          return safeObj;
        } catch {
          return '[Object]';
        }
      }
      
      return String(val);
    });
    console.log(`[${label}]`, ...safeValues);
  } catch (e) {
    // Even logging failed - just log the label
    console.log(`[${label}]`, 'Unable to log values');
  }
}

