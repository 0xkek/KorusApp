import { DatabaseError } from './AppError';
import { logger } from './logger';

/**
 * Wrapper for safe database operations with error handling
 * Automatically catches and transforms Prisma errors into AppErrors
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Database error${context ? ` in ${context}` : ''}:`, error);
    throw new DatabaseError('Database operation failed', error);
  }
}

/**
 * Execute a database transaction safely
 */
export async function safeTransaction<T>(
  prisma: any,
  operations: (tx: any) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(operations);
  } catch (error) {
    logger.error('Transaction failed:', error);
    throw new DatabaseError('Transaction failed', error);
  }
}