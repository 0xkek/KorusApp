/**
 * Web Vitals and Analytics Utilities
 * Monitors Core Web Vitals (CWV) for performance tracking
 */

export type Metric = {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
};

/**
 * Report Web Vitals to analytics service
 * Can be replaced with your analytics provider (Google Analytics, Vercel Analytics, etc.)
 */
export function reportWebVitals(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Web Vital:', {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
    });
  }

  // Send to analytics service
  // Example: Google Analytics
  if (typeof window !== 'undefined' && 'gtag' in window) {
    const gtag = (window as Window & { gtag: (...args: unknown[]) => void }).gtag;
    gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Example: Custom analytics endpoint
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
        timestamp: Date.now(),
      }),
      keepalive: true,
    }).catch(console.error);
  }
}

/**
 * Track custom events
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📈 Event:', eventName, properties);
  }

  // Google Analytics
  if (typeof window !== 'undefined' && 'gtag' in window) {
    const gtag = (window as Window & { gtag: (...args: unknown[]) => void }).gtag;
    gtag('event', eventName, properties);
  }

  // Custom analytics
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        properties,
        page: window.location.pathname,
        timestamp: Date.now(),
      }),
      keepalive: true,
    }).catch(console.error);
  }
}

/**
 * Track page views
 */
export function trackPageView(url: string) {
  trackEvent('page_view', { page_path: url });
}

/**
 * Track errors
 */
export function trackError(error: Error, errorInfo?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error tracked:', error, errorInfo);
  }

  trackEvent('error', {
    error_message: error.message,
    error_stack: error.stack,
    error_info: errorInfo,
  });
}

/**
 * Performance marks and measures
 */
export function performanceMark(name: string) {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(name);
  }
}

export function performanceMeasure(
  name: string,
  startMark: string,
  endMark?: string
) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      const measure = performance.measure(name, startMark, endMark);
      console.log(`⏱️  ${name}: ${Math.round(measure.duration)}ms`);
      return measure.duration;
    } catch (e) {
      console.warn('Performance measurement failed:', e);
    }
  }
  return 0;
}

/**
 * User interaction tracking
 */
export const analytics = {
  // Post interactions
  postCreated: () => trackEvent('post_created'),
  postLiked: () => trackEvent('post_liked'),
  postShared: () => trackEvent('post_shared'),
  postReposted: () => trackEvent('post_reposted'),

  // Reply interactions
  replyCreated: () => trackEvent('reply_created'),

  // Wallet interactions
  walletConnected: (walletType: string) => trackEvent('wallet_connected', { wallet_type: walletType }),
  walletDisconnected: () => trackEvent('wallet_disconnected'),

  // Tip interactions
  tipSent: (amount: number) => trackEvent('tip_sent', { amount }),

  // Shoutout interactions
  shoutoutCreated: (amount: number) => trackEvent('shoutout_created', { amount }),

  // Profile interactions
  profileViewed: (userId: string) => trackEvent('profile_viewed', { user_id: userId }),
  profileUpdated: () => trackEvent('profile_updated'),

  // Navigation
  pageView: (path: string) => trackPageView(path),
};
