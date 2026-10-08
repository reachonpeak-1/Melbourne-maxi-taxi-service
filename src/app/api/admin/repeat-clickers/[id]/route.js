import { Timestamp } from 'firebase-admin/firestore';
import { db, verifyAdmin } from '@/lib/firebase-admin';
import { addSafeIp } from '@/lib/safe-ips';

// 'blocked' — owner pasted the IP into Google Ads IP exclusions.
// 'safe'    — false positive: move the IP to settings/safeIps and unflag it.
// 'new'     — undo a "blocked" mark.
const VALID_ACTIONS = ['blocked', 'safe', 'new'];

export async function PATCH(request, { params }) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await request.json();

  if (!VALID_ACTIONS.includes(action)) {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const ref = db.collection('flaggedIps').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (action === 'safe') {
      const ip = snap.data().ip;
      if (ip) await addSafeIp(ip);
      await ref.delete();
    } else if (action === 'blocked') {
      await ref.update({ status: 'blocked', blockedAt: Timestamp.now() });
    } else {
      await ref.update({ status: 'new' });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Admin flagged IP update error:', err);
    return Response.json({ error: 'Failed to update IP' }, { status: 500 });
  }
}
