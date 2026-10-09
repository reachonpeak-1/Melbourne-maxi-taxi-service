'use client';
import { useState, useEffect, useCallback } from 'react';
import { getIdToken, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

/**
 * Wait for Firebase Auth to finish its async initialization and resolve
 * the current user from IndexedDB persistence. Without this, auth.currentUser
 * is null on first render and getIdToken(null) throws, causing a 403.
 */
function waitForCurrentUser() {
  return new Promise((resolve, reject) => {
    // If the user is already available (subsequent renders), resolve immediately.
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    // Otherwise wait for the first onAuthStateChanged emission.
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        unsub();
        if (user) {
          resolve(user);
        } else {
          reject(new Error('Not authenticated'));
        }
      },
      (err) => {
        unsub();
        reject(err);
      }
    );
  });
}

async function adminFetch(path, options = {}) {
  const user = await waitForCurrentUser();
  const token = await getIdToken(user, true);
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/leads');
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      setLeads(data.leads);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (id, status) => {
    await adminFetch(`/api/admin/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  return { leads, loading, error, refetch: fetchLeads, updateStatus };
}

export function useAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const res = await adminFetch('/api/admin/analytics');
        if (!res.ok) throw new Error('Failed to fetch analytics');
        setData(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { data, loading, error };
}
