'use client';
import { useState, useEffect, useCallback } from 'react';
import { getIdToken, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { MapSkeleton } from '@/components/admin/AdminSkeleton';

/** Wait for Firebase Auth to restore the session before calling getIdToken */
function waitForCurrentUser() {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) { resolve(auth.currentUser); return; }
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      user ? resolve(user) : reject(new Error('Not authenticated'));
    }, (err) => { unsub(); reject(err); });
  });
}

export default function MapPage() {
  const [visitors, setVisitors] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await waitForCurrentUser();
      const token = await getIdToken(user, true);
      const headers = { Authorization: `Bearer ${token}` };

      const [visitorsRes, leadsRes] = await Promise.all([
        fetch('/api/admin/visitors', { headers }),
        fetch('/api/admin/leads', { headers }),
      ]);

      if (!visitorsRes.ok) throw new Error('Failed to fetch visitors');
      if (!leadsRes.ok) throw new Error('Failed to fetch leads');

      const visitorsData = await visitorsRes.json();
      const leadsData = await leadsRes.json();

      setVisitors(visitorsData.visitors || []);
      setLeads(leadsData.leads || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Dynamically load Leaflet CSS + JS
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => setMapReady(true);
      document.head.appendChild(script);
    } else {
      setMapReady(true);
    }
  }, []);

  // Initialize map once data + Leaflet are ready
  useEffect(() => {
    if (!mapReady || loading || typeof window === 'undefined' || !window.L) return;

    const container = document.getElementById('leads-map');
    if (!container) return;

    if (container._leaflet_id) {
      container._leaflet_id = undefined;
      container.innerHTML = '';
    }

    const L = window.L;
    const map = L.map('leads-map').setView([-37.8136, 144.9631], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const visitorIcon = L.divIcon({
      className: 'map-marker-visitor',
      html: '<div class="map-dot map-dot-blue"></div>',
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
    const leadIcon = L.divIcon({
      className: 'map-marker-lead',
      html: '<div class="map-dot map-dot-orange"></div>',
      iconSize: [18, 18], iconAnchor: [9, 9],
    });
    const verifiedIcon = L.divIcon({
      className: 'map-marker-verified',
      html: '<div class="map-dot map-dot-green"></div>',
      iconSize: [18, 18], iconAnchor: [9, 9],
    });

    visitors.forEach((v) => {
      if (typeof v.lat !== 'number' || typeof v.lng !== 'number') return;
      const time = v.createdAt ? new Date(v.createdAt).toLocaleString('en-AU') : 'Unknown';
      L.marker([v.lat, v.lng], { icon: visitorIcon }).addTo(map).bindPopup(
        `<div class="map-popup">
          <div class="map-popup-tag visitor">Visitor</div>
          <div class="map-popup-row"><strong>Page:</strong> ${v.page || '/'}</div>
          <div class="map-popup-row"><strong>Time:</strong> ${time}</div>
          <div class="map-popup-row"><strong>Coords:</strong> ${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}</div>
        </div>`
      );
    });

    leads.forEach((lead) => {
      if (!lead.location || typeof lead.location.lat !== 'number') return;
      const icon = lead.status === 'verified' ? verifiedIcon : leadIcon;
      const statusLabel = lead.status === 'verified' ? 'Verified Lead' : 'Unverified Lead';
      const statusClass = lead.status === 'verified' ? 'verified' : 'lead';
      const time = lead.createdAt ? new Date(lead.createdAt).toLocaleString('en-AU') : 'Unknown';
      L.marker([lead.location.lat, lead.location.lng], { icon }).addTo(map).bindPopup(
        `<div class="map-popup">
          <div class="map-popup-tag ${statusClass}">${statusLabel}</div>
          ${lead.name  ? `<div class="map-popup-row"><strong>Name:</strong> ${lead.name}</div>` : ''}
          ${lead.email ? `<div class="map-popup-row"><strong>Email:</strong> ${lead.email}</div>` : ''}
          ${lead.phone ? `<div class="map-popup-row"><strong>Phone:</strong> ${lead.phone}</div>` : ''}
          <div class="map-popup-row"><strong>Time:</strong> ${time}</div>
        </div>`
      );
    });

    // Only fit bounds to Australian coordinates so overseas outliers don't force a world-zoom
    const isAustralia = (lat, lng) => lat >= -44 && lat <= -10 && lng >= 112 && lng <= 155;
    const auPoints = [
      ...visitors.filter(v => typeof v.lat === 'number' && isAustralia(v.lat, v.lng)).map(v => [v.lat, v.lng]),
      ...leads.filter(l => l.location?.lat && isAustralia(l.location.lat, l.location.lng)).map(l => [l.location.lat, l.location.lng]),
    ];
    if (auPoints.length > 0) {
      map.fitBounds(auPoints, { padding: [40, 40], maxZoom: 13 });
    }

    return () => { map.remove(); };
  }, [mapReady, loading, visitors, leads]);

  if (loading) return <MapSkeleton />;
  if (error) return <div className="admin-page-error">Error: {error}</div>;

  const leadsWithLocation = leads.filter(l => l.location?.lat);

  return (
    <div className="admin-page map-page">
      {/* Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Visitor Map</h1>
        <span className="admin-lead-count">
          {visitors.length} visitors · {leadsWithLocation.length} leads
        </span>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <div className="map-legend-item">
          <span className="map-dot map-dot-blue"  style={{ width: 10, height: 10 }} />
          <span>Visitors ({visitors.length})</span>
        </div>
        <div className="map-legend-item">
          <span className="map-dot map-dot-orange" style={{ width: 10, height: 10 }} />
          <span>Unverified</span>
        </div>
        <div className="map-legend-item">
          <span className="map-dot map-dot-green" style={{ width: 10, height: 10 }} />
          <span>Verified</span>
        </div>
      </div>

      {/* Map */}
      <div className="map-container">
        <div id="leads-map" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Recent visitors — cards on mobile, table on desktop */}
      {visitors.length > 0 && (
        <div className="admin-section" style={{ marginTop: 20 }}>
          <div className="admin-section-title">Recent visitor locations</div>

          {/* Desktop table */}
          <div className="admin-table-wrap map-visitors-desktop">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Coordinates</th>
                  <th>Page</th>
                  <th>Date</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {visitors.slice(0, 50).map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {typeof v.lat === 'number' ? `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}` : '—'}
                    </td>
                    <td>{v.page || '/'}</td>
                    <td className="admin-td-date">
                      {v.createdAt ? new Date(v.createdAt).toLocaleString('en-AU') : '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{v.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="map-visitors-cards">
            {visitors.slice(0, 50).map((v) => (
              <div key={v.id} className="map-visitor-card">
                <div className="mvc-row">
                  <span className="mvc-label">Coords</span>
                  <span className="mvc-mono">
                    {typeof v.lat === 'number' ? `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}` : '—'}
                  </span>
                </div>
                <div className="mvc-row">
                  <span className="mvc-label">Page</span>
                  <span className="mvc-value">{v.page || '/'}</span>
                </div>
                <div className="mvc-row">
                  <span className="mvc-label">Date</span>
                  <span className="mvc-value">
                    {v.createdAt ? new Date(v.createdAt).toLocaleString('en-AU') : '—'}
                  </span>
                </div>
                {v.ip && (
                  <div className="mvc-row">
                    <span className="mvc-label">IP</span>
                    <span className="mvc-mono">{v.ip}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
