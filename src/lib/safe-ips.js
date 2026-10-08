import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';

// IPs that must never be flagged as repeat clickers: the owner's office/home,
// staff and drivers. Two sources, merged:
//   1. SAFE_IPS env var — comma-separated list set in Vercel.
//   2. Firestore doc settings/safeIps { ips: [] } — editable from the admin UI.
export async function getSafeIps() {
  const safe = new Set(
    (process.env.SAFE_IPS || '')
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean)
  );

  try {
    const doc = await db.collection('settings').doc('safeIps').get();
    const ips = doc.exists ? doc.data().ips : null;
    if (Array.isArray(ips)) {
      for (const ip of ips) {
        if (typeof ip === 'string' && ip.trim()) safe.add(ip.trim());
      }
    }
  } catch (err) {
    // Env-var list still applies if Firestore is unreachable.
    console.error('Failed to read settings/safeIps:', err);
  }

  return safe;
}

export async function addSafeIp(ip) {
  await db
    .collection('settings')
    .doc('safeIps')
    .set({ ips: FieldValue.arrayUnion(ip) }, { merge: true });
}
