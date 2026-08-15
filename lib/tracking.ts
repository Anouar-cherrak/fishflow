// Fonction de tracking légère, sans dépendance.
// Pousse les événements dans window.dataLayer, le format standard
// attendu par Google Ads / Google Analytics (gtag.js), qui pourra être
// branché plus tard sans toucher au code des pages.
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event: eventName, ...params });
}