/**
 * Sprint 3: Enhanced Error Utilities
 * 
 * Provides robust error handling, retry logic, and user-friendly messages.
 */

/**
 * Safely extracts an error message from an unknown error type.
 * This is useful for React Query v5 where onError receives unknown type.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    // Handle Supabase errors
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    // Handle PostgrestError
    if ('details' in error && typeof error.details === 'string') {
      return error.details;
    }
    // Handle API errors with code
    if ('code' in error && typeof error.code === 'string') {
      return translateErrorCode(error.code);
    }
  }
  return 'Error desconocido';
}

/**
 * Translate common error codes to user-friendly Spanish messages
 */
export function translateErrorCode(code: string): string {
  const translations: Record<string, string> = {
    // Auth errors
    'auth/invalid-email': 'Correo electrónico inválido',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'Este correo ya está registrado',
    'auth/weak-password': 'La contraseña es demasiado débil',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
    
    // Database errors
    '23505': 'Este registro ya existe',
    '23503': 'No se puede eliminar porque hay registros relacionados',
    '42501': 'No tienes permisos para esta acción',
    '42P01': 'Tabla no encontrada',
    'PGRST116': 'No se encontró el registro',
    'PGRST301': 'Error de conexión a la base de datos',
    
    // Network errors
    'NETWORK_ERROR': 'Error de conexión. Verifica tu internet.',
    'TIMEOUT': 'La operación tardó demasiado. Intenta de nuevo.',
    
    // Rate limiting
    '429': 'Demasiadas solicitudes. Espera un momento.',
    
    // AI/Edge function errors
    '402': 'Créditos insuficientes. Contacta al administrador.',
    '500': 'Error del servidor. Intenta de nuevo.',
    '503': 'Servicio no disponible temporalmente.',
  };

  return translations[code] || `Error: ${code}`;
}

/**
 * Error categories for different handling strategies
 */
export type ErrorCategory = 
  | 'auth'        // Authentication issues - redirect to login
  | 'permission'  // Permission denied - show access error
  | 'validation'  // Invalid input - show field errors
  | 'network'     // Network issues - offer retry
  | 'rate_limit'  // Too many requests - show wait message
  | 'server'      // Server error - generic retry message
  | 'not_found'   // Resource not found - navigate away
  | 'unknown';    // Unknown error

/**
 * Categorize an error for appropriate handling
 */
export function categorizeError(error: unknown): ErrorCategory {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);

  // Auth errors
  if (message.includes('auth') || message.includes('login') || 
      message.includes('session') || code?.startsWith('auth/')) {
    return 'auth';
  }

  // Permission errors
  if (message.includes('permission') || message.includes('denied') || 
      code === '42501' || message.includes('policy')) {
    return 'permission';
  }

  // Validation errors
  if (message.includes('invalid') || message.includes('required') || 
      code === '23505' || code === '23503') {
    return 'validation';
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch') || 
      message.includes('connection') || code === 'NETWORK_ERROR') {
    return 'network';
  }

  // Rate limiting
  if (message.includes('rate') || message.includes('too many') || 
      code === '429') {
    return 'rate_limit';
  }

  // Not found
  if (message.includes('not found') || code === 'PGRST116') {
    return 'not_found';
  }

  // Server errors
  if (code === '500' || code === '502' || code === '503') {
    return 'server';
  }

  return 'unknown';
}

/**
 * Extract error code from various error types
 */
function getErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object') {
    if ('code' in error && (typeof error.code === 'string' || typeof error.code === 'number')) {
      return String(error.code);
    }
    if ('status' in error && typeof error.status === 'number') {
      return String(error.status);
    }
  }
  return null;
}

/**
 * Check if an error is retryable
 */
export function isRetryable(error: unknown): boolean {
  const category = categorizeError(error);
  return category === 'network' || category === 'server' || category === 'rate_limit';
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Calculate delay for exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: Partial<RetryConfig> = {}
): number {
  const { baseDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  const delay = exponentialDelay + jitter;

  return Math.min(delay, maxDelay);
}

/**
 * Execute a function with automatic retry on retryable errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries } = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isRetryable(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = calculateRetryDelay(attempt, config);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * User-friendly action suggestions based on error category
 */
export function getErrorSuggestion(category: ErrorCategory): string {
  const suggestions: Record<ErrorCategory, string> = {
    auth: 'Por favor, inicia sesión nuevamente.',
    permission: 'Contacta al administrador para obtener acceso.',
    validation: 'Revisa los datos ingresados e intenta de nuevo.',
    network: 'Verifica tu conexión a internet e intenta de nuevo.',
    rate_limit: 'Has realizado muchas acciones. Espera un momento.',
    server: 'Hay un problema temporal. Intenta de nuevo en unos minutos.',
    not_found: 'El recurso solicitado no existe o fue eliminado.',
    unknown: 'Si el problema persiste, contacta al soporte técnico.',
  };

  return suggestions[category];
}

/**
 * Format error for toast notification
 */
export function formatErrorForToast(error: unknown): {
  title: string;
  description: string;
} {
  const category = categorizeError(error);
  const message = getErrorMessage(error);
  
  const titles: Record<ErrorCategory, string> = {
    auth: 'Error de autenticación',
    permission: 'Acceso denegado',
    validation: 'Error de validación',
    network: 'Error de conexión',
    rate_limit: 'Límite excedido',
    server: 'Error del servidor',
    not_found: 'No encontrado',
    unknown: 'Error',
  };

  return {
    title: titles[category],
    description: message,
  };
}

/**
 * Create a standardized error handler for mutations
 */
export function createErrorHandler(
  toast: (props: { title: string; description: string; variant?: 'destructive' }) => void,
  onAuthError?: () => void
) {
  return (error: unknown) => {
    const category = categorizeError(error);
    const { title, description } = formatErrorForToast(error);

    toast({
      title,
      description,
      variant: 'destructive',
    });

    // Handle auth errors specially
    if (category === 'auth' && onAuthError) {
      onAuthError();
    }

    // Log for debugging
    console.error('Error:', {
      category,
      message: getErrorMessage(error),
      original: error,
    });
  };
}
