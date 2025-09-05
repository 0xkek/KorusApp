/**
 * Custom error class for application-specific errors
 * Provides consistent error handling across the application
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = true; // Operational errors are expected and handled
    this.code = code;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set the name for better debugging
    this.name = this.constructor.name;
  }
}

/**
 * Common error types for quick creation
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT');
  }
}

export class TokenError extends AppError {
  constructor(message: string = 'Token features temporarily disabled') {
    super(message, 503, 'TOKEN_FEATURES_DISABLED');
  }
}

/**
 * Database error wrapper
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    // Handle Prisma-specific errors
    if (originalError?.code === 'P2002') {
      super('Duplicate entry found', 409, 'DUPLICATE_ENTRY');
    } else if (originalError?.code === 'P2025') {
      super('Record not found', 404, 'RECORD_NOT_FOUND');
    } else if (originalError?.code === 'P2003') {
      super('Foreign key constraint failed', 400, 'FOREIGN_KEY_ERROR');
    } else if (originalError?.code === 'P2021') {
      super('Table does not exist', 500, 'TABLE_NOT_FOUND');
    } else {
      super(message || 'Database operation failed', 500, 'DATABASE_ERROR');
    }
  }
}

/**
 * External service error (e.g., blockchain, third-party APIs)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: any) {
    super(
      `External service error: ${service}`,
      503,
      'EXTERNAL_SERVICE_ERROR'
    );
  }
}

/**
 * Input validation error with field details
 */
export class InputValidationError extends AppError {
  public fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const message = Object.entries(fields)
      .map(([field, error]) => `${field}: ${error}`)
      .join(', ');
    
    super(message, 400, 'INPUT_VALIDATION_ERROR');
    this.fields = fields;
  }
}