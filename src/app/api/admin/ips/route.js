import { userAgentFromString } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db, verifyAdmin } from '@/lib/firebase-admin';
import { cleanIp, deviceLabel, getTrackingStart } from '@/lib/visitor-ip';
import { melbourneDay } from '@/lib/melbourne-time';
import { BURST_SEC, gapBucketKey } from '@/lib/visit-pattern';

const VALID_STATUSES = ['blocked', 'safe', 'none'];

const iso = (ts) => ts?.toDate?.().toISOString() ?? null;

function emptyRow(ip) {
  return {
    ip,
    visits: 0,
    pageViews: 0,
    adClicks: 0,
    days: {},
    adDays: {},
    firstSeen: null,
    lastSeen: null,
    city: null,
    region: null,
    country: null,
    device: null,
    lastPage: null,
    legacyVisits: 0,
    gapBuckets: {},
    gapSumSec: 0,
    minGapSec: null,
    minAdGapSec: null,
    status: 'none',
    note: null,
  };
}

// One row per IP: tracked page-view stats, plus older location-share visits.
export async function GET(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const trackingStart = await getTrackingStart();
    const [statsSnap, legacySnap, flagsSnap] = await Promise.all([
      db.collection('ip_stats').orderBy('lastSeen', 'desc').limit(3000).get(),
      db
        .collection('visitors')
        .where('createdAt', '<', Timestamp.fromDate(trackingStart))
        .orderBy('createdAt', 'desc')
        .limit(5000)
        .get(),
      db.collection('ip_flags').get(),
    ]);

    const rows = new Map();
    for (const doc of statsSnap.docs) {
      const d = doc.data();
      rows.set(doc.id, {
        ...emptyRow(doc.id),
        visits: d.visits || 0,
        pageViews: d.pageViews || 0,
        adClicks: d.adClicks || 0,
        days: d.days || {},
        adDays: d.adDays || {},
        firstSeen: iso(d.firstSeen),
        lastSeen: iso(d.lastSeen),
        city: d.city || null,
        region: d.region || null,
        country: d.country || null,
        device: d.device || null,
        lastPage: d.lastPage || null,
        gapBuckets: { ...(d.gapBuckets || {}) },
        gapSumSec: d.gapSumSec || 0,
        minGapSec: d.minGapSec ?? null,
        minAdGapSec: d.minAdGapSec ?? null,
      });
    }

    // Older location-share records: one doc per browsing session.
    const legacyTimes = new Map();

    for (const doc of legacySnap.docs) {
      const v = doc.data();
      const ip = cleanIp(v.ip);
      const at = v.createdAt?.toDate?.();
      if (!ip || !at) continue;

      if (!rows.has(ip)) {
        rows.set(ip, {
          ...emptyRow(ip),
          device: v.userAgent ? deviceLabel(userAgentFromString(v.userAgent)) : null,
          lastPage: v.page || null,
        });
      }
      const row = rows.get(ip);
      const day = melbourneDay(at);
      const atIso = at.toISOString();
      row.visits += 1;
      row.pageViews += 1;
      row.legacyVisits += 1;
      row.days[day] = (row.days[day] || 0) + 1;
      if (!row.firstSeen || atIso < row.firstSeen) row.firstSeen = atIso;
      if (!row.lastSeen || atIso > row.lastSeen) row.lastSeen = atIso;
      if (!legacyTimes.has(ip)) legacyTimes.set(ip, []);
      legacyTimes.get(ip).push(at.getTime());
    }

    // Add the gaps between those older sessions to the "visits every …" pattern.
    for (const [ip, times] of legacyTimes) {
      const row = rows.get(ip);
      times.sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) {
        const gapSec = Math.round((times[i] - times[i - 1]) / 1000);
        if (gapSec < BURST_SEC) continue;
        const key = gapBucketKey(gapSec);
        row.gapBuckets[key] = (row.gapBuckets[key] || 0) + 1;
        row.gapSumSec += gapSec;
        if (row.minGapSec === null || gapSec < row.minGapSec) row.minGapSec = gapSec;
      }
    }

    for (const doc of flagsSnap.docs) {
      const row = rows.get(doc.id);
      if (!row) continue;
      row.status = doc.data().status || 'none';
      row.note = doc.data().note || null;
    }

    const ips = [...rows.values()].sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));
    return Response.json({ ips, trackingStart: trackingStart.toISOString() });
  } catch (err) {
    console.error('Admin IPs fetch error:', err);
    return Response.json({ error: 'Failed to fetch IP visitors' }, { status: 500 });
  }
}

// Mark one or more IPs: 'blocked' (excluded in Google Ads), 'safe' (owner,
// staff, real customer) or 'none' to clear.
export async function PATCH(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  const ips = Array.isArray(body?.ips) ? [...new Set(body.ips.map(cleanIp).filter(Boolean))] : [];
  const { status } = body || {};
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 300) : undefined;

  if (!ips.length || ips.length > 500 || !VALID_STATUSES.includes(status)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const batch = db.batch();
    for (const ip of ips) {
      const ref = db.collection('ip_flags').doc(ip);
      if (status === 'none' && note === undefined) {
        batch.delete(ref);
      } else {
        batch.set(
          ref,
          {
            status,
            ...(note !== undefined && { note: note || null }),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
    await batch.commit();
    return Response.json({ success: true });
  } catch (err) {
    console.error('Admin IP flag update error:', err);
    return Response.json({ error: 'Failed to update IPs' }, { status: 500 });
  }
}
