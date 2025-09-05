import * as Sentry from '@sentry/react-native'
import { CaptureContext } from '@sentry/types'
import { logger } from './logger'

interface ErrorMetadata {
  userId?: string
  action?: string
  context?: Record<string, any>
}

class ErrorMonitor {
  private initialized = false
  private userId: string | null = null

  initialize(dsn?: string) {
    if (this.initialized || !dsn) return

    Sentry.init({
      dsn,
      environment: __DEV__ ? 'development' : 'production',
      debug: __DEV__,
      tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 10% in production like Twitter
      integrations: [
        new Sentry.ReactNativeTracing({
          routingInstrumentation: Sentry.reactNavigationIntegration(),
          tracingOrigins: ['localhost', /^\//],
        }),
      ],
      beforeSend: (event, hint) => {
        // Sanitize sensitive data
        if (event.request?.cookies) {
          delete event.request.cookies
        }
        if (event.extra?.password) {
          delete event.extra.password
        }
        if (event.extra?.token) {
          event.extra.token = '[REDACTED]'
        }
        
        // Don't send events in development unless critical
        if (__DEV__ && event.level !== 'fatal' && event.level !== 'error') {
          return null
        }

        return event
      },
      beforeBreadcrumb: (breadcrumb) => {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null
        }
        
        // Sanitize data in breadcrumbs
        if (breadcrumb.data?.password) {
          breadcrumb.data.password = '[REDACTED]'
        }

        return breadcrumb
      }
    })

    this.initialized = true
  }

  setUser(userId: string | null, walletAddress?: string) {
    this.userId = userId
    
    if (userId) {
      Sentry.setUser({
        id: userId,
        username: walletAddress?.slice(0, 8) // Only store truncated wallet
      })
    } else {
      Sentry.setUser(null)
    }
  }

  captureException(error: Error, metadata?: ErrorMetadata) {
    logger.error('Error captured:', error)

    if (!this.initialized) {
      logger.warn('Error monitoring not initialized')
      return
    }

    const context: CaptureContext = {
      level: 'error',
      tags: {
        action: metadata?.action || 'unknown'
      },
      extra: {
        ...metadata?.context,
        timestamp: new Date().toISOString()
      }
    }

    Sentry.captureException(error, context)
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    if (!this.initialized) return

    Sentry.captureMessage(message, level)
  }

  addBreadcrumb(message: string, category: string, data?: any) {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
      timestamp: Date.now() / 1000
    })
  }

  // Track performance like Twitter does
  startTransaction(name: string, op: string = 'navigation') {
    if (!this.initialized) return null

    return Sentry.startTransaction({
      name,
      op,
      trimEnd: true
    })
  }

  // Crash analytics
  async logCrash(error: Error) {
    this.captureException(error, {
      action: 'crash',
      context: {
        fatal: true,
        userId: this.userId
      }
    })

    // Ensure it's sent before crash
    await Sentry.flush(2000)
  }
}

export const errorMonitor = new ErrorMonitor()

// React Error Boundary integration
export const errorBoundaryOnError = (error: Error, errorInfo: { componentStack: string }) => {
  errorMonitor.captureException(error, {
    action: 'react_error_boundary',
    context: {
      componentStack: errorInfo.componentStack
    }
  })
}