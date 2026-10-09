'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { isAdminEmail } from '@/lib/admin-email';

export default function AdminAuthGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/admin/login');
      } else if (!isAdminEmail(user.email)) {
        await signOut(auth);
        router.replace('/admin/login');
      } else {
        setAllowed(true);
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  if (checking) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-inner">
          <div className="admin-loading-spinner" />
          <span>Loading admin panel…</span>
        </div>
      </div>
    );
  }
  if (!allowed) return null;
  return children;
}
