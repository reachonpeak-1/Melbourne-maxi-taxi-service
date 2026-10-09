import { userAgentFromString } from 'next/server';
import { db, verifyAdmin } from '@/lib/firebase-admin';
import { cleanIp, deviceLabel, getTrackingStart } from '@/lib/visitor-ip';

// Every logged page view for one IP, newest first.
export async function GET(request, { params }) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { ip: rawIp } = await params;
  const ip = cleanIp(decodeURIComponent(rawIp));
  if (!ip) {
    return Response.json({ error: 'Invalid IP' }, { status: 400 });
  }

  try {
    const [trackingStart, hitsSnap, legacySnap] = await Promise.all([
      getTrackingStart(),
      db.collection('ip_stats').doc(ip).collection('hits').orderBy('at', 'desc').limit(500).get(),
      db.collection('visitors').where('ip', '==', ip).limit(300).get(),
    ]);

    const hits = hitsSnap.docs.map((doc) => {
      const h = doc.data();
      return {
        id: doc.id,
        at: h.at?.toDate?.().toISOString() ?? null,
        page: h.page || '/',
        referrer: h.referrer || null,
        ad: Boolean(h.ad),
        source: h.source || null,
        campaign: h.campaign || null,
        term: h.term || null,
        device: h.device || null,
        newVisit: Boolean(h.newVisit),
        legacy: false,
      };
    });

    // Location-share records from before full tracking began.
    for (const doc of legacySnap.docs) {
      const v = doc.data();
      const at = v.createdAt?.toDate?.();
      if (!at || at >= trackingStart) continue;
      hits.push({
        id: doc.id,
        at: at.toISOString(),
        page: v.page || '/',
        referrer: null,
        ad: false,
        source: null,
        campaign: null,
        term: null,
        device: v.userAgent ? deviceLabel(userAgentFromString(v.userAgent)) : null,
        newVisit: true,
        legacy: true,
      });
    }

    hits.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    return Response.json({ ip, hits });
  } catch (err) {
    console.error('Admin IP detail fetch error:', err);
    return Response.json({ error: 'Failed to fetch IP history' }, { status: 500 });
  }
}
