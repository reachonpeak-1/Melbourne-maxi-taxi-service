'use client';
import { useEffect } from 'react';

// Logs Google Ads clicks (gclid / gbraid / wbraid in the landing URL) to
// /api/ad-click so repeat clickers (competitors) can be flagged and the
// owner can exclude their IPs in Google Ads. Renders nothing.
export default function AdClickTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const gclid = params.get('gclid');
      const gbraid = params.get('gbraid');
      const wbraid = params.get('wbraid');
      const clickId = gclid || gbraid || wbraid;
      if (!clickId) return;

      // Don't re-send the same click id within this browser session.
      const storageKey = `adclick_${clickId}`;
      try {
        if (sessionStorage.getItem(storageKey)) return;
        sessionStorage.setItem(storageKey, '1');
      } catch {
        // sessionStorage unavailable (private mode) — the API dedupes anyway.
      }

      fetch('/api/ad-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // keepalive lets the request finish even if the visitor navigates away.
        keepalive: true,
        body: JSON.stringify({
          gclid,
          gbraid,
          wbraid,
          page: window.location.pathname,
          referrer: document.referrer || null,
        }),
      }).catch(() => {});
    } catch {
      // Tracking must never break the page.
    }
  }, []);

  return null;
}
