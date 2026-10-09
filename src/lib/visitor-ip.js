import { db } from '@/lib/firebase-admin';

// IPv4 / IPv6 characters only. Also keeps the value safe as a Firestore doc id.
const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;

export function cleanIp(value) {
  return typeof value === 'string' && IP_RE.test(value.trim()) ? value.trim() : null;
}

// Vercel overwrites x-forwarded-for / x-real-ip at its edge, so visitors can't spoof them.
export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return cleanIp(forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip'));
}

export function getGeo(request) {
  let city = request.headers.get('x-vercel-ip-city') || null;
  if (city) {
    try {
      city = decodeURIComponent(city);
    } catch {
      // keep raw value
    }
  }
  return {
    city,
    region: request.headers.get('x-vercel-ip-country-region') || null,
    country: request.headers.get('x-vercel-ip-country') || null,
  };
}

// Short "iPhone · Safari" style label from next/server's userAgent() result.
export function deviceLabel({ device, os, browser }) {
  const kind = device?.model || os?.name || (device?.type === 'mobile' ? 'Mobile' : 'Desktop');
  return [kind, browser?.name].filter(Boolean).join(' · ');
}

// Full page-view tracking started when the first ip_stats doc was written.
// Older `visitors` docs (location-share events) before that moment are merged
// in as history; after it they would double-count, so they're ignored.
export async function getTrackingStart() {
  const snap = await db.collection('ip_stats').orderBy('firstSeen', 'asc').limit(1).get();
  return snap.empty ? new Date() : snap.docs[0].data().firstSeen.toDate();
}
