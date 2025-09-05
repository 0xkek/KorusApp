import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

interface ErrorLog {
  timestamp: string;
  severity: ErrorSeverity;
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
  context?: {
    userId?: string;
    endpoint?: string;
    method?: string;
    ip?: string;
    userAgent?: string;
    body?: any;
  };
  environment: string;
}

class ErrorLogger {
  private logDir: string;
  
  constructor() {
    // Create logs directory if it doesn't exist
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log an error to file and console
   */
  logError(
    error: Error | any,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: any
  ): void {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      severity,
      error: {
        message: error.message || 'Unknown error',
        stack: error.stack,
        code: error.code,
      },
      context,
      environment: process.env.NODE_ENV || 'development',
    };

    // Console log in development
    if (process.env.NODE_ENV !== 'production') {
      logger.error('🔴 Error logged:', errorLog);
    }

    // Write to file
    this.writeToFile(errorLog);

    // In production, you would also send to external service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(errorLog);
    }
  }

  /**
   * Write error to log file
   */
  private writeToFile(errorLog: ErrorLog): void {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `errors-${date}.log`;
      const filepath = path.join(this.logDir, filename);
      
      const logLine = JSON.stringify(errorLog) + '\n';
      
      fs.appendFileSync(filepath, logLine);
    } catch (writeError) {
      logger.error('Failed to write error log:', writeError);
    }
  }

  /**
   * Send to external monitoring service (Sentry, DataDog, etc.)
   */
  private sendToMonitoringService(errorLog: ErrorLog): void {
    // TODO: Integrate with monitoring service
    // Example: Sentry, DataDog, CloudWatch, etc.
    
    if (errorLog.severity === ErrorSeverity.CRITICAL) {
      // Send alert for critical errors
      this.sendAlert(errorLog);
    }
  }

  /**
   * Send immediate alert for critical errors
   */
  private sendAlert(errorLog: ErrorLog): void {
    // TODO: Implement alerting (email, Slack, PagerDuty, etc.)
    logger.error('🚨 CRITICAL ERROR ALERT:', errorLog.error.message);
  }

  /**
   * Log API errors with request context
   */
  logApiError(
    error: Error | any,
    req: any,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): void {
    const context = {
      endpoint: req.path,
      method: req.method,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
      userId: req.userWallet,
      body: req.body,
    };

    this.logError(error, severity, context);
  }

  /**
   * Get error statistics for monitoring
   */
  async getErrorStats(): Promise<any> {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `errors-${date}.log`;
      const filepath = path.join(this.logDir, filename);
      
      if (!fs.existsSync(filepath)) {
        return { total: 0, bySeverity: {} };
      }

      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      const stats = {
        total: lines.length,
        bySeverity: {} as Record<string, number>,
        recent: [] as any[],
      };

      lines.forEach(line => {
        try {
          const log = JSON.parse(line);
          stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
        } catch {}
      });

      // Get last 10 errors
      stats.recent = lines.slice(-10).map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);

      return stats;
    } catch (error) {
      return { error: 'Failed to get error stats' };
    }
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Express error handling middleware
export const errorMiddleware = (err: any, req: any, res: any, next: any) => {
  // Determine severity based on status code
  let severity = ErrorSeverity.MEDIUM;
  
  if (err.status >= 500 || !err.status) {
    severity = ErrorSeverity.HIGH;
  } else if (err.status >= 400) {
    severity = ErrorSeverity.LOW;
  }

  // Log the error
  errorLogger.logApiError(err, req, severity);

  // Send response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code,
    ...(isDevelopment && { stack: err.stack }),
  });
};