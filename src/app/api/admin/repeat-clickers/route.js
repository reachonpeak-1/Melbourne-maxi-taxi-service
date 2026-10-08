import { db, verifyAdmin } from '@/lib/firebase-admin';

export async function GET(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const snapshot = await db
      .collection('flaggedIps')
      .orderBy('flaggedAt', 'desc')
      .limit(500)
      .get();
    const ips = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        flaggedAt: data.flaggedAt?.toDate?.().toISOString() ?? null,
        firstClick: data.firstClick?.toDate?.().toISOString() ?? null,
        lastClick: data.lastClick?.toDate?.().toISOString() ?? null,
        blockedAt: data.blockedAt?.toDate?.().toISOString() ?? null,
      };
    });
    return Response.json({ ips });
  } catch (err) {
    console.error('Admin flagged IPs fetch error:', err);
    return Response.json({ error: 'Failed to fetch flagged IPs' }, { status: 500 });
  }
}
