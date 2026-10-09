'use client';
import { useEffect, useMemo, useState } from 'react';
import { fetchIpHits } from '@/hooks/useAdminData';
import { lastDays, melbourneDay, melbourneHour, formatMelbourne, timeAgo } from '@/lib/melbourne-time';
import { formatDuration } from '@/lib/visit-pattern';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_TICKS = { 0: '12a', 3: '3a', 6: '6a', 9: '9a', 12: '12p', 15: '3p', 18: '6p', 21: '9p' };

const STATUS_OPTIONS = [
  { value: 'none', label: 'Not marked' },
  { value: 'blocked', label: 'Blocked in Google Ads' },
  { value: 'safe', label: 'Safe (me / staff / customer)' },
];

export function locationText(row) {
  return [row.city, row.region, row.country].filter(Boolean).join(', ');
}

export function StatusBadge({ status }) {
  if (status === 'blocked') return <span className="admin-badge ipv-badge-blocked">Blocked in Ads</span>;
  if (status === 'safe') return <span className="admin-badge ipv-badge-safe">Safe</span>;
  return null;
}

export function PatternChip({ pattern }) {
  return (
    <span className={`ipv-pattern tone-${pattern.tone}`} title={pattern.advice}>
      {pattern.label}
    </span>
  );
}

// Day keys are plain calendar dates; format them at UTC noon so no zone shifts them.
const dayDate = (key) => new Date(`${key}T12:00:00Z`);
const formatDayKey = (key, options) =>
  new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', ...options }).format(dayDate(key));

function sourceLabel(hit) {
  if (hit.legacy) return 'Shared location';
  if (hit.ad) return 'Google Ad';
  if (hit.referrer) {
    try {
      const host = new URL(hit.referrer).hostname.replace(/^www\./, '');
      if (host !== window.location.hostname.replace(/^www\./, '')) return host;
    } catch {
      // not a URL — ignore
    }
  }
  return hit.newVisit ? 'Direct' : null;
}

function InfoItem({ label, value }) {
  return (
    <div className="ldm-info-item">
      <span className="ldm-info-label">{label}</span>
      <span className="ldm-info-value">{value}</span>
    </div>
  );
}

function BarChart({ bars, height = 90 }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="ipd-chart">
      {bars.map((bar) => (
        <div key={bar.key} className="ipd-bar-col" title={bar.title}>
          <span className="ipd-bar-value">{bar.value || ''}</span>
          <div className="ipd-bar-track" style={{ height }}>
            <div className="ipd-bar" style={{ height: `${(bar.value / max) * 100}%` }}>
              {bar.accent > 0 && (
                <div className="ipd-bar-accent" style={{ height: `${(bar.accent / bar.value) * 100}%` }} />
              )}
            </div>
          </div>
          <span className="ipd-bar-label">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function IpDetailModal({ row, onClose, onStatusChange, onCopy }) {
  const [hits, setHits] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setHits(null);
    setError(null);
    fetchIpHits(row.ip)
      .then((data) => { if (!cancelled) setHits(data); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [row.ip]);

  const last14 = useMemo(() => lastDays(14).map((key) => {
    const visits = row.days[key] || 0;
    const ads = row.adDays[key] || 0;
    return {
      key,
      value: Math.max(visits, ads),
      accent: ads,
      label: <>{formatDayKey(key, { weekday: 'short' })}<br />{formatDayKey(key, { day: 'numeric' })}</>,
      title: `${formatDayKey(key, { weekday: 'long', day: 'numeric', month: 'short' })}: ${visits} visit${visits === 1 ? '' : 's'}${ads ? `, ${ads} ad click${ads === 1 ? '' : 's'}` : ''}`,
    };
  }), [row]);

  const byWeekday = useMemo(() => {
    const visits = Array(7).fill(0);
    const ads = Array(7).fill(0);
    for (const [key, n] of Object.entries(row.days)) visits[(dayDate(key).getUTCDay() + 6) % 7] += n;
    for (const [key, n] of Object.entries(row.adDays)) ads[(dayDate(key).getUTCDay() + 6) % 7] += n;
    return WEEKDAYS.map((label, i) => ({
      key: label,
      value: Math.max(visits[i], ads[i]),
      accent: ads[i],
      label,
      title: `${label}: ${visits[i]} visits${ads[i] ? `, ${ads[i]} ad clicks` : ''}`,
    }));
  }, [row]);

  const byHour = useMemo(() => {
    const visits = Array(24).fill(0);
    const ads = Array(24).fill(0);
    for (const hit of hits || []) {
      if (!hit.newVisit || !hit.at) continue;
      const hour = melbourneHour(new Date(hit.at));
      visits[hour] += 1;
      if (hit.ad) ads[hour] += 1;
    }
    return visits.map((value, hour) => ({
      key: hour,
      value,
      accent: ads[hour],
      label: HOUR_TICKS[hour] ?? '',
      title: `${hour}:00–${hour}:59: ${value} visits${ads[hour] ? `, ${ads[hour]} ad clicks` : ''}`,
    }));
  }, [hits]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const hit of hits || []) {
      if (!hit.at) continue;
      const key = melbourneDay(new Date(hit.at));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(hit);
    }
    return [...map.entries()];
  }, [hits]);

  const changeStatus = async (status) => {
    if (status === row.status) return;
    setSaving(true);
    try {
      await onStatusChange(status);
    } finally {
      setSaving(false);
    }
  };

  const location = locationText(row);
  const { pattern } = row;
  const facts = [
    pattern.avgGapSec !== null && `Average time between visits: ${formatDuration(pattern.avgGapSec)}`,
    pattern.minGapSec !== null && `Shortest gap: ${formatDuration(pattern.minGapSec)}`,
    pattern.minAdGapSec !== null && `Shortest gap between ad clicks: ${formatDuration(pattern.minAdGapSec)}`,
  ].filter(Boolean);

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-panel ldm-panel ipd-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ldm-header">
          <div className="ldm-header-top">
            <div className="ipd-title">
              <span className="ipv-ip ipd-ip">{row.ip}</span>
              <StatusBadge status={row.status} />
              {row.suspicious && <span className="admin-badge ipv-badge-suspicious">Suspicious</span>}
            </div>
            <button className="admin-modal-close" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="ipv-sub">{[location || 'Location unknown', row.device].filter(Boolean).join(' · ')}</div>
          {row.reasons.length > 0 && (
            <div className="ipd-reasons">Flagged for {row.reasons.join(' and ')} in the selected period.</div>
          )}
          <div className="ipd-toolbar">
            <button type="button" className="ipv-btn ipv-btn-primary" onClick={onCopy}>Copy IP</button>
            <a className="ipv-btn" href={`https://ipinfo.io/${encodeURIComponent(row.ip)}`} target="_blank" rel="noopener noreferrer">
              Who owns this IP? ↗
            </a>
          </div>
          <div className="ipd-status" role="radiogroup" aria-label="Mark this IP">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={row.status === opt.value}
                disabled={saving}
                className={`ipd-status-opt${row.status === opt.value ? ` active ${opt.value}` : ''}`}
                onClick={() => changeStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ldm-body">
          <div className={`ipd-advice tone-${pattern.tone}`}>
            <div className="ipd-advice-head">
              <span className="ipd-advice-kicker">Suggestion</span>
              <PatternChip pattern={pattern} />
            </div>
            <p className="ipd-advice-text">{pattern.advice}</p>
            {facts.length > 0 && (
              <div className="ipd-advice-facts">
                {facts.map((fact) => <span key={fact}>{fact}</span>)}
              </div>
            )}
          </div>

          <div className="ldm-info-grid ipd-info-grid">
            <InfoItem label="First seen" value={row.firstSeen ? formatMelbourne(row.firstSeen, { dateStyle: 'medium', timeStyle: 'short' }) : '—'} />
            <InfoItem label="Last seen" value={row.lastSeen ? timeAgo(row.lastSeen) : '—'} />
            <InfoItem label="Total visits" value={row.visits} />
            <InfoItem label="Pages viewed" value={row.pageViews} />
            <InfoItem label="Google Ad clicks" value={row.adClicks} />
            <InfoItem label="Days active" value={Object.keys(row.days).length} />
          </div>

          <div className="ldm-section">
            <div className="ldm-section-title">Last 14 days</div>
            <BarChart bars={last14} />
          </div>

          <div className="ipd-chart-row">
            <div className="ldm-section">
              <div className="ldm-section-title">By weekday · all time</div>
              <BarChart bars={byWeekday} height={60} />
            </div>
            <div className="ldm-section">
              <div className="ldm-section-title">Time of day · Melbourne</div>
              {hits ? <BarChart bars={byHour} height={60} /> : <div className="ipv-sub">Loading…</div>}
            </div>
          </div>
          <div className="ipd-legend">
            <span><i className="ipd-swatch" /> Visits</span>
            <span><i className="ipd-swatch accent" /> Google Ad clicks</span>
          </div>

          <div className="ldm-section">
            <div className="ldm-section-title">Visit log</div>
            {error && <div className="admin-page-error">{error}</div>}
            {!hits && !error && <div className="ipv-sub">Loading visit history…</div>}
            {hits && hits.length === 0 && <div className="ipv-sub">No individual visits recorded.</div>}
            {groups.map(([day, dayHits]) => {
              const visits = dayHits.filter((h) => h.newVisit).length;
              const ads = dayHits.filter((h) => h.ad).length;
              return (
                <div key={day} className="ipd-day">
                  <div className="ipd-day-head">
                    <span>{formatDayKey(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span className="ipv-sub">
                      {visits} visit{visits === 1 ? '' : 's'}
                      {ads > 0 && <span className="ipv-ads"> · {ads} ad click{ads === 1 ? '' : 's'}</span>}
                    </span>
                  </div>
                  {dayHits.map((hit) => {
                    const source = sourceLabel(hit);
                    return (
                      <div key={hit.id} className={`ipd-hit${hit.newVisit ? ' ipd-hit-new' : ''}`}>
                        <span className="ipd-hit-time">
                          {formatMelbourne(hit.at, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="ipd-hit-page">{hit.page}</span>
                        <span className="ipd-hit-meta">
                          {source && <span className={`ipd-source${hit.ad ? ' ad' : ''}`}>{source}</span>}
                          {[hit.campaign, hit.term].filter(Boolean).join(' · ')}
                          {hit.newVisit && hit.device && <span className="ipv-sub"> {hit.device}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
