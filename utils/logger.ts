// Logger utility for production-safe logging

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private isDevelopment = __DEV__;
  private logLevel: LogLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const safeMessage = message || '';
    return `[${timestamp}] [${level}] ${safeMessage}`;
  }

  log(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.log(this.formatMessage('LOG', message), ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.logLevel <= LogLevel.DEBUG && this.isDevelopment) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.logLevel <= LogLevel.INFO && this.isDevelopment) {
      console.info(this.formatMessage('INFO', message), ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  error(message: string | any, error?: Error | unknown, ...args: any[]) {
    if (this.logLevel <= LogLevel.ERROR) {
      // In production, this would send to an error reporting service
      // For now, we'll only log in development
      if (this.isDevelopment) {
        const errorMessage = typeof message === 'string' ? message : String(message);
        console.error(this.formatMessage('ERROR', errorMessage), error, ...args);
      }
      
      // In production, send to error reporting service
      // Example: Sentry.captureException(error);
    }
  }

  // Log network requests in development only
  network(method: string, url: string, data?: any) {
    if (this.isDevelopment) {
      this.debug(`Network ${method}: ${url}`, data);
    }
  }

  // Log performance metrics in development only
  performance(metric: string, duration: number) {
    if (this.isDevelopment) {
      this.debug(`Performance - ${metric}: ${duration}ms`);
    }
  }
}

export const logger = new Logger();