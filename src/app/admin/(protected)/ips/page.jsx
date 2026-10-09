'use client';
import { useMemo, useState } from 'react';
import { useIpVisitors } from '@/hooks/useAdminData';
import { LeadsSkeleton } from '@/components/admin/AdminSkeleton';
import IpDetailModal, { PatternChip, StatusBadge, locationText } from '@/components/admin/IpDetailModal';
import { assessIp } from '@/lib/visit-pattern';
import { lastDays, formatMelbourne, timeAgo } from '@/lib/melbourne-time';

const PERIODS = [
  { value: '1', label: 'Today', short: 'today' },
  { value: '7', label: 'Last 7 days', short: '7d' },
  { value: '30', label: 'Last 30 days', short: '30d' },
  { value: 'all', label: 'All time', short: 'all' },
];

const VIEWS = [
  { value: 'all', label: 'All IPs' },
  { value: 'suspicious', label: 'Suspicious' },
  { value: 'block', label: 'Suggested to block' },
  { value: 'frequent', label: 'Visits every minute / hour' },
  { value: 'ads', label: 'Clicked a Google Ad' },
  { value: 'repeat', label: 'Came back (2+ days)' },
  { value: 'once', label: 'One-time visitors' },
  { value: 'blocked', label: 'Blocked in Google Ads' },
  { value: 'safe', label: 'Marked safe' },
];

const SORTS = [
  { value: 'visits', label: 'Most visits' },
  { value: 'ads', label: 'Most ad clicks' },
  { value: 'days', label: 'Most days active' },
  { value: 'frequency', label: 'Most frequent' },
  { value: 'recent', label: 'Most recent' },
];

// An IP is "suspicious" in the selected period when it hits either threshold.
const SUSPICIOUS_AD_CLICKS = 2;
const SUSPICIOUS_VISITS_PER_DAY = 4;

const sumDays = (map, keys) =>
  keys ? keys.reduce((total, k) => total + (map[k] || 0), 0) : Object.values(map).reduce((a, b) => a + b, 0);

function summarise(row, periodKeys, keys7, keys30, today) {
  const periodDays = periodKeys || Object.keys(row.days);
  const periodVisits = sumDays(row.days, periodKeys);
  const periodAds = sumDays(row.adDays, periodKeys);
  const activeDays = periodDays.filter((k) => row.days[k] || row.adDays[k]).length;
  const busiestDay = Math.max(0, ...periodDays.map((k) => row.days[k] || 0));

  const reasons = [];
  if (periodAds >= SUSPICIOUS_AD_CLICKS) reasons.push(`${periodAds} ad clicks`);
  if (busiestDay >= SUSPICIOUS_VISITS_PER_DAY) reasons.push(`${busiestDay} visits in one day`);
  const pattern = assessIp(row);

  return {
    ...row,
    today: row.days[today] || 0,
    week: sumDays(row.days, keys7),
    month: sumDays(row.days, keys30),
    periodVisits,
    periodAds,
    activeDays,
    reasons,
    pattern,
    // Already blocked or marked safe = dealt with, so no longer flagged.
    suspicious: row.status === 'none' && (reasons.length > 0 || pattern.tone === 'danger'),
  };
}

function matchesView(row, view) {
  switch (view) {
    case 'suspicious': return row.suspicious;
    case 'block': return row.pattern.tone === 'danger';
    case 'frequent': return ['m2', 'm15', 'h2'].includes(row.pattern.key);
    case 'ads': return row.periodAds > 0;
    case 'repeat': return row.activeDays >= 2;
    case 'once': return row.activeDays <= 1 && row.periodVisits <= 1;
    case 'blocked': return row.status === 'blocked';
    case 'safe': return row.status === 'safe';
    default: return true;
  }
}

const SORTERS = {
  visits: (a, b) => b.periodVisits - a.periodVisits || b.periodAds - a.periodAds,
  ads: (a, b) => b.periodAds - a.periodAds || b.periodVisits - a.periodVisits,
  days: (a, b) => b.activeDays - a.activeDays || b.periodVisits - a.periodVisits,
  frequency: (a, b) => a.pattern.rank - b.pattern.rank || b.periodVisits - a.periodVisits,
  recent: () => 0,
};

function StatCard({ label, value, color }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-value" style={color ? { color } : {}}>{value}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}

export default function IpVisitorsPage() {
  const { ips, trackingStart, loading, error, refetch, setStatus } = useIpVisitors();
  const [period, setPeriod] = useState('7');
  const [view, setView] = useState('all');
  const [sort, setSort] = useState('visits');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [openIp, setOpenIp] = useState(null);
  const [notice, setNotice] = useState(null);

  const periodInfo = PERIODS.find((p) => p.value === period);

  const rows = useMemo(() => {
    const keys7 = lastDays(7);
    const keys30 = lastDays(30);
    const today = keys7[keys7.length - 1];
    const periodKeys = period === 'all' ? null : lastDays(Number(period));
    const q = search.trim().toLowerCase();

    return ips
      .map((row) => summarise(row, periodKeys, keys7, keys30, today))
      .filter((row) => (period === 'all' || row.periodVisits > 0 || row.periodAds > 0))
      .filter((row) => matchesView(row, view))
      .filter((row) => !q || row.ip.toLowerCase().includes(q) || locationText(row).toLowerCase().includes(q))
      .sort(SORTERS[sort]);
  }, [ips, period, view, sort, search]);

  const totals = useMemo(() => ({
    ips: rows.length,
    visits: rows.reduce((t, r) => t + r.periodVisits, 0),
    ads: rows.reduce((t, r) => t + r.periodAds, 0),
    suspicious: rows.filter((r) => r.suspicious).length,
  }), [rows]);

  const hasLegacy = ips.some((r) => r.legacyVisits > 0);
  const openRow = openIp ? rows.find((r) => r.ip === openIp) || null : null;
  const visibleSelected = rows.filter((r) => selected.has(r.ip)).map((r) => r.ip);
  const allVisibleSelected = rows.length > 0 && visibleSelected.length === rows.length;

  const toggle = (ip) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(ip) ? next.delete(ip) : next.add(ip);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(rows.map((r) => r.ip)));
  };

  const copyIps = async (list) => {
    try {
      await navigator.clipboard.writeText(list.join('\n'));
      setNotice(`Copied ${list.length} IP${list.length === 1 ? '' : 's'}. In Google Ads open the campaign → Settings → IP exclusions, paste, save — then mark them "Blocked in Ads" here.`);
    } catch {
      setNotice('Could not copy — your browser blocked clipboard access.');
    }
  };

  const markSelected = async (status) => {
    try {
      await setStatus(visibleSelected, status);
      setSelected(new Set());
      setNotice(null);
    } catch {
      setNotice('Could not update those IPs. Please try again.');
    }
  };

  if (loading) return <LeadsSkeleton />;
  if (error) return <div className="admin-page-error">Error: {error}</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">IP Visitors</h1>
        <span className="admin-lead-count">{rows.length} of {ips.length} IPs · Melbourne time</span>
        <button type="button" className="ipv-btn ipv-refresh" onClick={refetch}>Refresh</button>
      </div>

      <div className="admin-stat-grid">
        <StatCard label={`Unique IPs · ${periodInfo.short}`} value={totals.ips} />
        <StatCard label={`Visits · ${periodInfo.short}`} value={totals.visits} />
        <StatCard label={`Google Ad clicks · ${periodInfo.short}`} value={totals.ads} color="#f26522" />
        <StatCard label="Suspicious IPs" value={totals.suspicious} color={totals.suspicious ? '#dc2626' : undefined} />
      </div>

      <div className="admin-filter-bar ipv-filters">
        <div className="admin-filter-item">
          <label className="admin-filter-label" htmlFor="ipv-period">Period</label>
          <select id="ipv-period" className="admin-filter-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="admin-filter-item">
          <label className="admin-filter-label" htmlFor="ipv-view">Show</label>
          <select id="ipv-view" className="admin-filter-select" value={view} onChange={(e) => setView(e.target.value)}>
            {VIEWS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        <div className="admin-filter-item">
          <label className="admin-filter-label" htmlFor="ipv-sort">Sort by</label>
          <select id="ipv-sort" className="admin-filter-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="admin-filter-item">
          <label className="admin-filter-label" htmlFor="ipv-search">Search</label>
          <input
            id="ipv-search"
            className="admin-filter-select ipv-search"
            type="search"
            placeholder="IP or suburb"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {visibleSelected.length > 0 && (
        <div className="ipv-actions">
          <span className="ipv-actions-count">{visibleSelected.length} selected</span>
          <button type="button" className="ipv-btn ipv-btn-primary" onClick={() => copyIps(visibleSelected)}>Copy IPs for Google Ads</button>
          <button type="button" className="ipv-btn" onClick={() => markSelected('blocked')}>Mark blocked in Ads</button>
          <button type="button" className="ipv-btn" onClick={() => markSelected('safe')}>Mark safe</button>
          <button type="button" className="ipv-btn" onClick={() => markSelected('none')}>Clear mark</button>
          <button type="button" className="ipv-btn ipv-btn-ghost" onClick={() => setSelected(new Set())}>Deselect</button>
        </div>
      )}

      {notice && (
        <div className="ipv-notice">
          <span>{notice}</span>
          <button type="button" className="ipv-btn ipv-btn-ghost" onClick={() => setNotice(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="admin-table-empty">
          {ips.length === 0
            ? 'No visits logged yet. New visits appear here as soon as people open the website.'
            : 'No IPs match these filters.'}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="admin-table-wrap ipv-desktop">
            <table className="admin-table ipv-table">
              <thead>
                <tr>
                  <th className="ipv-check-col">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th>IP address</th>
                  <th>Pattern</th>
                  <th className="ipv-num">Today</th>
                  <th className="ipv-num">7 days</th>
                  <th className="ipv-num">30 days</th>
                  <th className="ipv-num">All time</th>
                  <th className="ipv-num">Ad clicks · {periodInfo.short}</th>
                  <th className="ipv-num">Days · {periodInfo.short}</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.ip}
                    className={`admin-table-row${row.suspicious ? ' ipv-row-suspicious' : ''}`}
                    onClick={() => setOpenIp(row.ip)}
                  >
                    <td className="ipv-check-col" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(row.ip)} onChange={() => toggle(row.ip)} aria-label={`Select ${row.ip}`} />
                    </td>
                    <td>
                      <div className="ipv-ip-cell">
                        <span className="ipv-ip">{row.ip}</span>
                        <StatusBadge status={row.status} />
                        {row.suspicious && <span className="admin-badge ipv-badge-suspicious" title={row.reasons.join(', ')}>Suspicious</span>}
                      </div>
                      <div className="ipv-sub">
                        {[locationText(row) || 'Location unknown', row.device].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td><PatternChip pattern={row.pattern} /></td>
                    <td className="ipv-num">{row.today || '—'}</td>
                    <td className="ipv-num">{row.week || '—'}</td>
                    <td className="ipv-num">{row.month || '—'}</td>
                    <td className="ipv-num">{row.visits}</td>
                    <td className={`ipv-num${row.periodAds ? ' ipv-ads' : ''}`}>{row.periodAds || '—'}</td>
                    <td className="ipv-num">{row.activeDays}</td>
                    <td className="admin-td-date" title={row.lastSeen ? formatMelbourne(row.lastSeen, { dateStyle: 'full', timeStyle: 'short' }) : ''}>
                      {row.lastSeen ? timeAgo(row.lastSeen) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="ipv-cards">
            {rows.map((row) => (
              <div
                key={row.ip}
                className={`ipv-card${row.suspicious ? ' ipv-row-suspicious' : ''}`}
                onClick={() => setOpenIp(row.ip)}
              >
                <div className="ipv-card-top">
                  <input
                    type="checkbox"
                    checked={selected.has(row.ip)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggle(row.ip)}
                    aria-label={`Select ${row.ip}`}
                  />
                  <span className="ipv-ip">{row.ip}</span>
                  <StatusBadge status={row.status} />
                  {row.suspicious && <span className="admin-badge ipv-badge-suspicious">Suspicious</span>}
                </div>
                <div className="ipv-sub">
                  {[locationText(row), row.device].filter(Boolean).join(' · ') || 'Location unknown'}
                </div>
                <div className="ipv-card-pattern"><PatternChip pattern={row.pattern} /></div>
                <div className="ipv-card-stats">
                  <span><strong>{row.today}</strong> today</span>
                  <span><strong>{row.week}</strong> 7d</span>
                  <span><strong>{row.visits}</strong> total</span>
                  <span className={row.periodAds ? 'ipv-ads' : ''}><strong>{row.periodAds}</strong> ad clicks</span>
                  <span><strong>{row.activeDays}</strong> days</span>
                </div>
                <div className="ipv-sub">Last seen {row.lastSeen ? timeAgo(row.lastSeen) : '—'}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="ipv-footnote">
        A visit = one session (a new visit starts after 30 minutes of inactivity, or with every Google Ad click).
        Suspicious = {SUSPICIOUS_AD_CLICKS}+ ad clicks or {SUSPICIOUS_VISITS_PER_DAY}+ visits in one day within the selected period,
        or a pattern we suggest blocking. Pattern = how often the IP usually comes back, from the time between its visits
        (needs 4+ visits; tabs opened within 20 seconds count as one).
        Mobile-network IPs are shared and change often, so check an IP&apos;s history before blocking it.
        {hasLegacy && trackingStart && (
          <> Visits before {formatMelbourne(trackingStart, { day: 'numeric', month: 'short', year: 'numeric' })} only include people who allowed location access.</>
        )}
      </p>

      {openRow && (
        <IpDetailModal
          row={openRow}
          onClose={() => setOpenIp(null)}
          onStatusChange={(status) => setStatus([openRow.ip], status)}
          onCopy={() => copyIps([openRow.ip])}
        />
      )}
    </div>
  );
}
