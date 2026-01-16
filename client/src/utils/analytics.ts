/**
 * Visitor Analytics Tracking Utility
 * Tracks visitor sessions, referrers, UTM parameters, and page visits
 */

const ANALYTICS_SESSION_KEY = 'visitor_session_id';
const ANALYTICS_TRACKED_KEY = 'visitor_tracked';

/**
 * Generate a unique session ID
 */
const generateSessionId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Get or create a session ID
 */
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(ANALYTICS_SESSION_KEY);

  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(ANALYTICS_SESSION_KEY, sessionId);
  }

  return sessionId;
};

/**
 * Check if visitor has already been tracked in this session
 */
const isVisitorTracked = (): boolean => {
  return sessionStorage.getItem(ANALYTICS_TRACKED_KEY) === 'true';
};

/**
 * Mark visitor as tracked
 */
const markVisitorTracked = (): void => {
  sessionStorage.setItem(ANALYTICS_TRACKED_KEY, 'true');
};

/**
 * Get referrer source from document.referrer or UTM parameters
 */
const getReferrerData = () => {
  const urlParams = new URLSearchParams(window.location.search);

  return {
    referrer: document.referrer || null,
    utmSource: urlParams.get('utm_source'),
    utmMedium: urlParams.get('utm_medium'),
    utmCampaign: urlParams.get('utm_campaign'),
    utmTerm: urlParams.get('utm_term'),
    utmContent: urlParams.get('utm_content'),
  };
};

/**
 * Track visitor on website entry
 */
export const trackVisitor = async (): Promise<void> => {
  // Only track once per session
  if (isVisitorTracked()) {
    return;
  }

  try {
    const sessionId = getSessionId();
    const referrerData = getReferrerData();
    const landingPage = window.location.pathname + window.location.search;

    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        landingPage,
        ...referrerData,
      }),
    });

    if (response.ok) {
      markVisitorTracked();
      console.log('Visitor tracked successfully');
    } else {
      console.warn('Failed to track visitor:', response.status);
    }
  } catch (error) {
    console.error('Error tracking visitor:', error);
  }
};

/**
 * Hook to automatically track visitor
 * Call this from your App component or main entry point
 */
export const useVisitorTracking = () => {
  // Track on mount
  if (typeof window !== 'undefined') {
    trackVisitor();
  }
};

/**
 * Get current session ID (useful for debugging or linking events)
 */
export const getCurrentSessionId = (): string => {
  return getSessionId();
};

/**
 * Reset session (useful for testing)
 */
export const resetSession = (): void => {
  sessionStorage.removeItem(ANALYTICS_SESSION_KEY);
  sessionStorage.removeItem(ANALYTICS_TRACKED_KEY);
};
