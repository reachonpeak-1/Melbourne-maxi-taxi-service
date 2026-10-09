'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Sends one page view per route change to /api/nav, which records the
// visitor's IP server-side for the admin "IP Visitors" page. Renders nothing.
export default function VisitTracker() {
  const pathname = usePathname();
  const lastSent = useRef(null);

  useEffect(() => {
    const key = pathname + window.location.search;
    // Guard against React re-running the effect for the same page.
    if (lastSent.current === key) return;
    const isFirst = lastSent.current === null;
    lastSent.current = key;

    try {
      fetch('/api/nav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // keepalive lets the request finish even if the visitor navigates away.
        keepalive: true,
        body: JSON.stringify({
          path: pathname,
          search: window.location.search,
          // Only the landing page has a meaningful external referrer.
          referrer: isFirst ? document.referrer || null : null,
          // First page of this page load (new tab, reload, ad click).
          landing: isFirst,
        }),
      }).catch(() => {});
    } catch {
      // Tracking must never break the page.
    }
  }, [pathname]);

  return null;
}
