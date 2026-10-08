'use client';
import { useMemo, useState } from 'react';
import { useFlaggedIps } from '@/hooks/useAdminData';
import { LeadsSkeleton } from '@/components/admin/AdminSkeleton';

function StatusBadge({ status }) {
  const map = {
    new: 'admin-badge-new',
    blocked: 'admin-badge-blocked',
  };
  return <span className={`admin-badge ${map[status] || 'admin-badge-new'}`}>{status}</span>;
}

function formatDateTime(val) {
  if (!val) return '—';
  return new Date(val).toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLocation(row) {
  return [row.city, row.region, row.country].filter(Boolean).join(', ') || '—';
}

// Compact "OS · Browser" label so the table stays scannable; the full
// user-agent lives in the cell's title attribute.
function shortDevice(ua) {
  if (!ua) return '—';
  const os = /iPhone|iPad/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /Macintosh/.test(ua) ? 'Mac'
    : /Linux/.test(ua) ? 'Linux'
    : 'Other';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /SamsungBrowser/.test(ua) ? 'Samsung'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : '';
  return browser ? `${os} · ${browser}` : os;
}

export default function RepeatClickersPage() {
  const { ips, loading, error, markStatus } = useFlaggedIps();
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const newIps = useMemo(() => ips.filter((row) => row.status === 'new'), [ips]);

  const handleCopy = async () => {
    const text = newIps.map((row) => row.ip).join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API blocked — fall back to a hidden textarea.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async (id, action) => {
    setActionError('');
    setBusyId(id);
    try {
      await markStatus(id, action);
    } catch (e) {
      setActionError(e.message || 'Failed to update IP');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LeadsSkeleton />;
  if (error) return <div className="admin-page-error">Error: {error}</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Ad Clickers</h1>
        <span className="admin-lead-count">
          {ips.length} flagged · {newIps.length} new
        </span>
      </div>

      <div className="admin-ip-toolbar">
        <button
          type="button"
          className="admin-copy-btn"
          onClick={handleCopy}
          disabled={!newIps.length}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            {copied ? (
              <path d="M20 6L9 17l-5-5" />
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            )}
          </svg>
          {copied ? 'Copied!' : `Copy all new IPs (${newIps.length})`}
        </button>
        <span className="admin-ip-hint">
          Paste into Google Ads → Campaign settings → IP exclusions (max 500 per campaign).
        </span>
      </div>

      {actionError && (
        <div className="admin-page-error" style={{ marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      {!ips.length ? (
        <div className="admin-table-empty">
          No repeat clickers flagged yet. The daily report flags IPs that click your
          Google Ads on 2 or more different days.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>IP address</th>
                <th>Days</th>
                <th>Clicks</th>
                <th>Location</th>
                <th>Device</th>
                <th>Last click</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ips.map((row) => (
                <tr key={row.id} className="admin-table-row" style={{ cursor: 'default' }}>
                  <td><StatusBadge status={row.status} /></td>
                  <td className="admin-ip-mono">{row.ip}</td>
                  <td>{row.daysClicked ?? '—'}</td>
                  <td>{row.totalClicks ?? '—'}</td>
                  <td>{formatLocation(row)}</td>
                  <td title={row.userAgent || ''}>{shortDevice(row.userAgent)}</td>
                  <td className="admin-td-date">{formatDateTime(row.lastClick)}</td>
                  <td>
                    <div className="admin-ip-actions">
                      {row.status === 'new' && (
                        <button
                          type="button"
                          className="admin-ip-btn admin-ip-btn-danger"
                          disabled={busyId === row.id}
                          onClick={() => handleAction(row.id, 'blocked')}
                        >
                          Mark as blocked
                        </button>
                      )}
                      {row.status === 'blocked' && (
                        <button
                          type="button"
                          className="admin-ip-btn"
                          disabled={busyId === row.id}
                          onClick={() => handleAction(row.id, 'new')}
                        >
                          Unblock
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-ip-btn admin-ip-btn-safe"
                        disabled={busyId === row.id}
                        onClick={() => handleAction(row.id, 'safe')}
                      >
                        Mark as safe
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
