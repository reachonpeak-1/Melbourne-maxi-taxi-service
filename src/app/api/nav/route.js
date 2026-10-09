import { after, userAgent } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { getClientIp, getGeo, deviceLabel } from '@/lib/visitor-ip';
import { melbourneDay } from '@/lib/melbourne-time';
import { BURST_SEC, gapBucketKey } from '@/lib/visit-pattern';

// Logs one public page view per call (sent by VisitTracker) for the admin
// "IP Visitors" page. Named /api/nav rather than "track"/"analytics" so
// common ad-blocker lists don't drop it.

const VISIT_GAP_MS = 30 * 60 * 1000; // same IP idle 30+ min = a new visit
const CLICK_ID_RE = /^[A-Za-z0-9_.~-]{1,200}$/;

function text(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const ua = userAgent(request);
  const ip = getClientIp(request);
  const path = text(body?.path, 300);
  if (ua.isBot || !ip || !path?.startsWith('/')) {
    return new Response(null, { status: 204 });
  }

  const params = new URLSearchParams(text(body?.search, 2000) || '');
  const clickId = [params.get('gclid'), params.get('gbraid'), params.get('wbraid')]
    .find((id) => id && CLICK_ID_RE.test(id)) || null;

  const hit = {
    page: path,
    referrer: text(body?.referrer, 300),
    source: text(params.get('utm_source'), 100),
    campaign: text(params.get('utm_campaign'), 150),
    term: text(params.get('utm_term') || params.get('keyword'), 150),
    device: deviceLabel(ua),
  };

  const geo = getGeo(request);
  const rawUa = text(request.headers.get('user-agent'), 400);
  // A full page load (new tab, reload, ad click) rather than in-site navigation.
  const landing = body?.landing === true;

  // Respond immediately; the Firestore write runs after the response is sent.
  after(() =>
    recordHit({ ip, hit, clickId, landing, geo, userAgent: rawUa }).catch((err) =>
      console.error('Visit log failed:', err)
    )
  );
  return new Response(null, { status: 204 });
}

async function recordHit({ ip, hit, clickId, landing, geo, userAgent }) {
  const now = new Date();
  const day = melbourneDay(now);
  const statsRef = db.collection('ip_stats').doc(ip);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(statsRef);
    const prev = snap.exists ? snap.data() : null;
    const sinceLast = prev?.lastSeen ? now.getTime() - prev.lastSeen.toMillis() : Infinity;

    // Reloading the same ad landing URL repeats the click id — count it once.
    const isAdClick = Boolean(clickId) && !(clickId === prev?.lastClickId && sinceLast < VISIT_GAP_MS);
    const isNewVisit = isAdClick || sinceLast > VISIT_GAP_MS;

    const update = {
      ip,
      lastSeen: Timestamp.fromDate(now),
      lastPage: hit.page,
      pageViews: FieldValue.increment(1),
      device: hit.device,
      userAgent,
    };
    if (!prev) update.firstSeen = Timestamp.fromDate(now);
    for (const [key, value] of Object.entries(geo)) {
      if (value) update[key] = value;
    }
    if (isNewVisit) {
      update.visits = FieldValue.increment(1);
      update.days = { [day]: FieldValue.increment(1) };
    }
    if (isAdClick) {
      update.adClicks = FieldValue.increment(1);
      update.adDays = { [day]: FieldValue.increment(1) };
      update.lastClickId = clickId;
      update.lastAdAt = Timestamp.fromDate(now);
      if (prev?.lastAdAt) {
        const adGapSec = Math.round((now.getTime() - prev.lastAdAt.toMillis()) / 1000);
        if (!(prev.minAdGapSec <= adGapSec)) update.minAdGapSec = adGapSec;
      }
    }

    // Gap since this IP's previous arrival, bucketed for the "visits every …"
    // pattern. Loads inside the burst window are extra tabs of the same arrival.
    if (landing) {
      const gapSec = prev?.lastLoadAt ? (now.getTime() - prev.lastLoadAt.toMillis()) / 1000 : null;
      if (gapSec === null || gapSec >= BURST_SEC) {
        update.arrivals = FieldValue.increment(1);
        update.lastLoadAt = Timestamp.fromDate(now);
        if (gapSec !== null) {
          const rounded = Math.round(gapSec);
          update.gapBuckets = { [gapBucketKey(gapSec)]: FieldValue.increment(1) };
          update.gapSumSec = FieldValue.increment(rounded);
          if (!(prev.minGapSec <= rounded)) update.minGapSec = rounded;
        }
      }
    }

    tx.set(statsRef, update, { merge: true });
    tx.set(statsRef.collection('hits').doc(), {
      ...hit,
      ad: isAdClick,
      newVisit: isNewVisit,
      at: Timestamp.fromDate(now),
    });
  });
}
