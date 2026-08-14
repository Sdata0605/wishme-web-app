/**
 * Performance monitoring utilities for 10M+ user scale
 * 
 * These utilities help track and optimize app performance
 * across millions of users
 */

/**
 * Log performance metrics in development
 * In production, these would be sent to analytics
 */
export const logPerformance = (metricName: string, duration: number) => {
  if (import.meta.env.DEV) {
    console.log(`[Performance] ${metricName}: ${duration.toFixed(2)}ms`);
  }
  
  // In production, send to analytics service:
  // analytics.track('performance', { metric: metricName, duration });
};

/**
 * Measure execution time of async functions
 */
export const measureAsync = async <T>(
  fn: () => Promise<T>,
  metricName: string
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    logPerformance(metricName, performance.now() - start);
    return result;
  } catch (error) {
    logPerformance(`${metricName} (error)`, performance.now() - start);
    throw error;
  }
};

/**
 * Report Web Vitals for performance monitoring
 * Tracks Core Web Vitals: LCP, FID, CLS
 */
export const reportWebVitals = (metric: any) => {
  if (import.meta.env.DEV) {
    console.log('[Web Vitals]', metric);
  }
  
  // In production, send to analytics:
  // analytics.track('web_vitals', {
  //   name: metric.name,
  //   value: metric.value,
  //   rating: metric.rating,
  // });
};

/**
 * Batch multiple API calls for efficiency
 */
export const batchRequests = <T>(
  requests: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> => {
  const batches: (() => Promise<T>)[][] = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    batches.push(requests.slice(i, i + batchSize));
  }
  
  return batches.reduce(
    async (promise, batch) => {
      const results = await promise;
      const batchResults = await Promise.all(batch.map(fn => fn()));
      return [...results, ...batchResults];
    },
    Promise.resolve<T[]>([])
  );
};

/**
 * Prefetch data for better perceived performance
 */
export const prefetchData = (url: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
};

/**
 * Check if device has limited resources
 * Useful for adaptive loading strategies
 */
export const isLowEndDevice = (): boolean => {
  // @ts-ignore - navigator.deviceMemory is experimental
  const memory = navigator.deviceMemory;
  // @ts-ignore - navigator.hardwareConcurrency
  const cores = navigator.hardwareConcurrency;
  
  return (
    (memory && memory < 4) || // Less than 4GB RAM
    (cores && cores < 4) || // Less than 4 CPU cores
    /Android.*Mobile|webOS|BlackBerry/i.test(navigator.userAgent) // Mobile devices
  );
};
