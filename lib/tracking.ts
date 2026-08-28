declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];

  if (window.gtag) {
    window.gtag("event", eventName, params || {});
  } else {
    window.dataLayer.push({ event: eventName, ...params });
  }
}