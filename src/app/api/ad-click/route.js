import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';

// Google click ids are URL-safe tokens. Reject anything else to keep junk
// out of Firestore. Max 200 chars per spec.
const CLICK_ID_RE = /^[A-Za-z0-9_.~-]{1,200}$/;

function cleanClickId(value) {
  return typeof value === 'string' && CLICK_ID_RE.test(value) ? value : null;
}

function cleanText(value, maxLen) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

// 'YYYY-MM-DD' in Melbourne time, so "different days" means the owner's days.
function melbourneDay(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000; // same IP + click id within 10 min = duplicate

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(null, { status: 204 });
    }

    const gclid = cleanClickId(body?.gclid);
    const gbraid = cleanClickId(body?.gbraid);
    const wbraid = cleanClickId(body?.wbraid);
    const clickId = gclid || gbraid || wbraid;

    // No valid click id — not an ad click, nothing to log.
    if (!clickId) {
      return new Response(null, { status: 204 });
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : request.headers.get('x-real-ip') || 'unknown';

    let city = request.headers.get('x-vercel-ip-city') || null;
    if (city) {
      try {
        city = decodeURIComponent(city);
      } catch {
        // keep raw value
      }
    }
    const region = request.headers.get('x-vercel-ip-country-region') || null;
    const country = request.headers.get('x-vercel-ip-country') || null;
    const userAgent = cleanText(request.headers.get('user-agent'), 500);

    // Duplicate check: same IP + click id saved in the last 10 minutes.
    // Query by clickId only (single-field index, no composite needed) and
    // filter in memory — a click id maps to at most a handful of docs.
    const cutoff = Date.now() - DUPLICATE_WINDOW_MS;
    const recent = await db
      .collection('adClicks')
      .where('clickId', '==', clickId)
      .limit(20)
      .get();
    const isDuplicate = recent.docs.some((doc) => {
      const data = doc.data();
      return data.ip === ip && data.createdAt?.toMillis?.() >= cutoff;
    });
    if (isDuplicate) {
      return new Response(null, { status: 204 });
    }

    const now = new Date();
    await db.collection('adClicks').add({
      ip,
      clickId,
      gclid: gclid || null,
      gbraid: gbraid || null,
      wbraid: wbraid || null,
      page: cleanText(body?.page, 300),
      referrer: cleanText(body?.referrer, 500),
      userAgent,
      city,
      region,
      country,
      day: melbourneDay(now),
      createdAt: Timestamp.now(),
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    // Never surface tracking errors to the visitor.
    console.error('Ad click log failed:', err);
    return new Response(null, { status: 204 });
  }
}
