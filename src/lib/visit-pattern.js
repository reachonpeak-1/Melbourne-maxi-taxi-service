// How often an IP comes back, plus a plain-English suggestion for the owner.
// Built from the gap histogram /api/nav records between an IP's page loads.
// Safe to import from both server and client code.

// Page loads closer together than this are several tabs opened at once,
// not a separate arrival.
export const BURST_SEC = 20;

// Upper bound (exclusive) of each gap bucket, in seconds.
export const GAP_BUCKETS = [
  { key: 'm2', maxSec: 120, label: 'Every minute' },
  { key: 'm15', maxSec: 900, label: 'Every few minutes' },
  { key: 'h2', maxSec: 7200, label: 'Every hour' },
  { key: 'h20', maxSec: 72000, label: 'Several times a day' },
  { key: 'd3', maxSec: 259200, label: 'Daily' },
  { key: 'd10', maxSec: 864000, label: 'Weekly' },
  { key: 'long', maxSec: Infinity, label: 'Now and then' },
];

// Need at least this many gaps (4+ arrivals) before calling it a pattern.
const MIN_GAPS = 3;
// Two ad clicks closer than this are not normal customer behaviour.
const QUICK_AD_REPEAT_SEC = 3600;

export function gapBucketKey(sec) {
  return GAP_BUCKETS.find((b) => sec < b.maxSec).key;
}

export function formatDuration(sec) {
  if (sec < 60) return `${Math.round(sec)} sec`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  if (sec < 86400) {
    const hours = Math.round(sec / 360) / 10;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.round(sec / 8640) / 10;
  return `${days} day${days === 1 ? '' : 's'}`;
}

// The median gap's bucket = the IP's typical return interval.
function typicalBucket(gapBuckets, total) {
  let seen = 0;
  for (const bucket of GAP_BUCKETS) {
    seen += gapBuckets[bucket.key] || 0;
    if (seen * 2 >= total) return bucket;
  }
  return GAP_BUCKETS[GAP_BUCKETS.length - 1];
}

// tone: 'danger' (suggest blocking) · 'warn' (watch) · 'info' · 'ok' · 'muted'
export function assessIp(row) {
  const gapBuckets = row.gapBuckets || {};
  const gapCount = Object.values(gapBuckets).reduce((a, b) => a + b, 0);
  const bucket = gapCount >= MIN_GAPS ? typicalBucket(gapBuckets, gapCount) : null;
  const activeDays = Object.keys(row.days || {}).length;
  const ads = row.adClicks || 0;
  const adsText = `${ads} time${ads === 1 ? '' : 's'}`;

  let pattern;
  if (bucket) {
    pattern = { key: bucket.key, label: bucket.label, rank: GAP_BUCKETS.indexOf(bucket) };
  } else if (activeDays >= 2) {
    pattern = { key: 'returning', label: `Came back on ${activeDays} days`, rank: 7 };
  } else if (row.visits > 1) {
    pattern = { key: 'few', label: `${row.visits} visits`, rank: 8 };
  } else {
    pattern = { key: 'once', label: 'One visit', rank: 9 };
  }

  const stats = {
    gapCount,
    avgGapSec: gapCount ? row.gapSumSec / gapCount : null,
    minGapSec: row.minGapSec ?? null,
    minAdGapSec: row.minAdGapSec ?? null,
  };

  if (row.status === 'blocked') {
    return { ...pattern, ...stats, tone: 'muted', advice: 'Already blocked in Google Ads.' };
  }
  if (row.status === 'safe') {
    return { ...pattern, ...stats, tone: 'muted', advice: 'Marked safe — never flagged.' };
  }

  const every = pattern.label.toLowerCase();
  let tone = 'ok';
  let advice = 'Normal visitor — nothing to do.';

  if (ads >= 2 && stats.minAdGapSec !== null && stats.minAdGapSec < QUICK_AD_REPEAT_SEC) {
    tone = 'danger';
    const total = ads > 2 ? ` (${adsText} in total)` : '';
    advice = `Clicked your ads twice within ${formatDuration(stats.minAdGapSec)}${total}. Real customers rarely do this — likely a competitor. Block this IP in Google Ads.`;
  } else if (pattern.key === 'm2' || pattern.key === 'm15') {
    if (ads >= 2) {
      tone = 'danger';
      advice = `Comes back ${every} and has clicked your ads ${adsText} — almost certainly a competitor or click bot. Block this IP in Google Ads.`;
    } else {
      tone = 'warn';
      advice = `Opens your site ${every} — looks automated (a bot or monitoring tool). It hasn't been clicking your ads, so it isn't costing you money.`;
    }
  } else if (pattern.key === 'h2' || pattern.key === 'h20') {
    if (ads >= 2) {
      tone = 'danger';
      advice = `Visits ${every} and has clicked your ads ${adsText} — very likely a competitor. Block this IP in Google Ads.`;
    } else {
      tone = 'warn';
      advice = `Visits ${every} without clicking your ads — maybe a competitor watching your prices, or you/staff. If you know who it is, mark it Safe.`;
    }
  } else if (pattern.key === 'd3') {
    if (ads >= 2) {
      tone = 'danger';
      advice = `Visits daily and has clicked your ads ${adsText} — likely a competitor. Consider blocking it in Google Ads.`;
    } else {
      tone = 'info';
      advice = 'Visits daily — a regular. If it is you, staff or a driver, mark it Safe.';
    }
  } else if (ads >= 3) {
    tone = 'warn';
    advice = `Has clicked your ads ${adsText} on different visits — keep an eye on it.`;
  } else if (pattern.rank <= 7) {
    advice = 'Normal returning visitor — nothing to do.';
  }

  return { ...pattern, ...stats, tone, advice };
}
