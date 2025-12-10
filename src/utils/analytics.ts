/**
 * Analytics Utility
 * Centralized analytics tracking
 */

interface AnalyticsEvent {
  [key: string]: any;
}

class Analytics {
  track(eventName: string, properties?: AnalyticsEvent): void {
    // In production, integrate with your analytics provider (GA, Mixpanel, etc.)
    if (import.meta.env.DEV) {
      console.log('[Analytics]', eventName, properties);
    }

    // Example: Send to analytics service
    // window.gtag?.('event', eventName, properties);
    // window.mixpanel?.track(eventName, properties);
  }

  error(message: string, properties?: AnalyticsEvent): void {
    console.error('[Analytics Error]', message, properties);
    
    // Send to error tracking service
    // window.Sentry?.captureException(new Error(message), { extra: properties });
  }
}

export const analytics = new Analytics();
export const logger = {
  error: (message: string, properties?: AnalyticsEvent) => {
    console.error(`[Logger] ${message}`, properties);
    analytics.error(message, properties);
  },
  warn: (message: string, properties?: AnalyticsEvent) => {
    console.warn(`[Logger] ${message}`, properties);
  },
  info: (message: string, properties?: AnalyticsEvent) => {
    console.info(`[Logger] ${message}`, properties);
  },
};
