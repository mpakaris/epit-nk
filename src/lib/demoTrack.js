// Fire-and-forget analytics for the demo and landing page.
// No PII — session_id is a random token per browser tab.

function getSessionId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = sessionStorage.getItem('demo_sid');
    if (!id) {
      id = `d${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('demo_sid', id);
    }
    return id;
  } catch { return 'unknown'; }
}

/**
 * track(event, label, target?, props?)
 *
 * event  — 'page_view' | 'nav_click' | 'landing_click' | 'action'
 * label  — human-readable name, e.g. 'Projektek', 'Demo megtekintése'
 * target — href or action identifier
 * props  — any extra JSON context, e.g. { location: 'hero' }
 */
export function track(event, label = '', target = '', props = {}) {
  if (typeof window === 'undefined') return;
  const session_id = getSessionId();
  if (!session_id) return;
  const path = window.location.pathname;
  fetch('/api/demo/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, event, path, label, target, props }),
    keepalive: true,  // survives page navigation
  }).catch(() => {});
}
