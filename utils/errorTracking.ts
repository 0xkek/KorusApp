/**
 * Error tracking utility
 * Placeholder for Sentry integration
 * 
 * To enable Sentry:
 * 1. npm install @sentry/react-native
 * 2. Add SENTRY_DSN to environment variables
 * 3. Initialize in App.tsx
 */

interface ErrorTracker {
  captureException: (error: Error, context?: any) => void;
  captureMessage: (message: string, level?: 'info' | 'warning' | 'error') => void;
  setUser: (user: { id?: string; username?: string; wallet?: string }) => void;
  clearUser: () => void;
}

class ErrorTracking implements ErrorTracker {
  private isProduction = process.env.NODE_ENV === 'production';

  captureException(error: Error, context?: any): void {
    if (this.isProduction) {
      // In production, this would send to Sentry
      // Sentry.captureException(error, { extra: context });
    } else {
      console.error('Error captured:', error, context);
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (this.isProduction) {
      // In production, this would send to Sentry
      // Sentry.captureMessage(message, level);
    } else {
      console.warn(`[${level.toUpperCase()}]:`, message);
    }
  }

  setUser(user: { id?: string; username?: string; wallet?: string }): void {
    if (this.isProduction) {
      // Sentry.setUser(user);
    }
  }

  clearUser(): void {
    if (this.isProduction) {
      // Sentry.setUser(null);
    }
  }
}

export const errorTracker = new ErrorTracking();