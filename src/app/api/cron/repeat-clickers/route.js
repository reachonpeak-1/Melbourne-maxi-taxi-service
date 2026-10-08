import nodemailer from 'nodemailer';
import { Timestamp } from 'firebase-admin/firestore';
import { EMAIL } from '@/lib/site';
import { db } from '@/lib/firebase-admin';
import { getSafeIps } from '@/lib/safe-ips';

// Daily cron (vercel.json): finds IPs that clicked Google Ads on 2+ different
// days in the last 7 days, saves them to `flaggedIps`, emails the owner a
// paste-ready list for Google Ads → Campaign settings → IP exclusions, and
// prunes adClicks older than 90 days.

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 7;
const RETENTION_DAYS = 90;
const MIN_DAYS_CLICKED = 2;
const GOOGLE_ADS_IP_LIMIT = 500; // max excluded IPs per campaign in Google Ads

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMelbourne(ts) {
  if (!ts?.toDate) return 'Unknown';
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ts.toDate());
}

function formatLocation({ city, region, country }) {
  return [city, region, country].filter(Boolean).join(', ') || 'Unknown';
}

function buildReportHtml({ flagged, totalFlagged }) {
  const rows = flagged
    .map(
      (f) => `
            <tr>
              <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-family:Menlo,Consolas,monospace;font-size:13px;color:#0f172a;white-space:nowrap;">${esc(f.ip)}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;text-align:center;">${esc(f.daysClicked)}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;text-align:center;">${esc(f.totalClicks)}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${esc(formatLocation(f))}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;max-width:220px;overflow:hidden;text-overflow:ellipsis;">${esc((f.userAgent || 'Unknown').slice(0, 90))}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;white-space:nowrap;">${esc(formatMelbourne(f.lastClick))}</td>
            </tr>`
    )
    .join('');

  const ipList = flagged.map((f) => esc(f.ip)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Repeat Ad Clickers — MelbourneMaxiTaxi</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">MelbourneMaxiTaxi</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:14px;">Repeat ad clicker report</p>
          </td>
        </tr>

        <!-- Orange accent bar -->
        <tr>
          <td style="background:#f26522;padding:4px 0;"></td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">

            <p style="margin:0 0 24px;color:#0f172a;font-size:16px;line-height:1.6;">
              <strong>${flagged.length}</strong> new IP${flagged.length === 1 ? '' : 's'} clicked your Google Ads on
              ${MIN_DAYS_CLICKED} or more different days in the last ${LOOKBACK_DAYS} days.
              These are likely competitors or bots wasting your ad budget.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
              <tr style="background:#f8fafc;">
                <th align="left" style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;border-bottom:1px solid #e2e8f0;">IP</th>
                <th style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;border-bottom:1px solid #e2e8f0;">Days</th>
                <th style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;border-bottom:1px solid #e2e8f0;">Clicks</th>
                <th align="left" style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;border-bottom:1px solid #e2e8f0;">Location</th>
                <th align="left" style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;border-bottom:1px solid #e2e8f0;">Device</th>
                <th align="left" style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;border-bottom:1px solid #e2e8f0;">Last click</th>
              </tr>${rows}
            </table>

            <!-- Paste-ready block -->
            <div style="margin-top:28px;">
              <div style="display:inline-block;background:rgba(242,101,34,0.08);border-radius:6px;padding:4px 12px;margin-bottom:12px;">
                <span style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#f26522;">Paste into Google Ads IP exclusions</span>
              </div>
              <pre style="margin:0;background:#0f172a;color:#e2e8f0;border-radius:12px;padding:16px 20px;font-family:Menlo,Consolas,monospace;font-size:13px;line-height:1.7;overflow-x:auto;">${ipList}</pre>
              <p style="margin:12px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
                Google Ads &rarr; your campaign &rarr; Settings &rarr; Additional settings &rarr; IP exclusions.
              </p>
            </div>

            <p style="margin:28px 0 0;color:#334155;font-size:14px;line-height:1.6;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
              <strong>${totalFlagged}</strong> IP${totalFlagged === 1 ? '' : 's'} flagged in total so far.
              Google Ads allows at most <strong>${GOOGLE_ADS_IP_LIMIT}</strong> excluded IPs per campaign.
              Review the full list in the admin panel under <strong>Ad Clickers</strong>.
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.35);font-size:12px;line-height:1.6;">
              Automated daily report &nbsp;&middot;&nbsp; MelbourneMaxiTaxi
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export async function GET(request) {
  // Only Vercel Cron (or someone holding CRON_SECRET) may trigger this.
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = Date.now();
    const lookbackStart = Timestamp.fromMillis(now - LOOKBACK_DAYS * DAY_MS);

    const [clicksSnap, flaggedSnap, safeIps] = await Promise.all([
      db.collection('adClicks').where('createdAt', '>=', lookbackStart).get(),
      db.collection('flaggedIps').get(),
      getSafeIps(),
    ]);

    const alreadyFlagged = new Set();
    flaggedSnap.forEach((doc) => {
      const ip = doc.data().ip;
      if (ip) alreadyFlagged.add(ip);
    });

    // Group the week's clicks by IP.
    const byIp = new Map();
    clicksSnap.forEach((doc) => {
      const click = doc.data();
      if (!click.ip || click.ip === 'unknown') return;
      let entry = byIp.get(click.ip);
      if (!entry) {
        entry = {
          ip: click.ip,
          days: new Set(),
          totalClicks: 0,
          firstClick: null,
          lastClick: null,
          city: null,
          region: null,
          country: null,
          userAgent: null,
        };
        byIp.set(click.ip, entry);
      }
      entry.totalClicks += 1;
      if (click.day) entry.days.add(click.day);
      const created = click.createdAt;
      if (created?.toMillis) {
        if (!entry.firstClick || created.toMillis() < entry.firstClick.toMillis()) {
          entry.firstClick = created;
        }
        if (!entry.lastClick || created.toMillis() > entry.lastClick.toMillis()) {
          entry.lastClick = created;
          // Keep the metadata from the most recent click.
          entry.city = click.city || null;
          entry.region = click.region || null;
          entry.country = click.country || null;
          entry.userAgent = click.userAgent || null;
        }
      }
    });

    const newlyFlagged = [];
    for (const entry of byIp.values()) {
      if (entry.days.size < MIN_DAYS_CLICKED) continue;
      if (safeIps.has(entry.ip)) continue;
      if (alreadyFlagged.has(entry.ip)) continue;
      newlyFlagged.push(entry);
    }
    newlyFlagged.sort((a, b) => b.totalClicks - a.totalClicks);

    // Save new flags. Doc id = encoded IP so each IP is flagged once.
    if (newlyFlagged.length) {
      const flaggedAt = Timestamp.now();
      for (let i = 0; i < newlyFlagged.length; i += 450) {
        const batch = db.batch();
        for (const entry of newlyFlagged.slice(i, i + 450)) {
          const ref = db.collection('flaggedIps').doc(encodeURIComponent(entry.ip));
          batch.set(ref, {
            ip: entry.ip,
            daysClicked: entry.days.size,
            totalClicks: entry.totalClicks,
            city: entry.city,
            region: entry.region,
            country: entry.country,
            userAgent: entry.userAgent,
            firstClick: entry.firstClick,
            lastClick: entry.lastClick,
            status: 'new',
            flaggedAt,
          });
        }
        await batch.commit();
      }
    }

    const totalFlagged = alreadyFlagged.size + newlyFlagged.length;

    // Email the owner — only when there is something new to act on.
    let emailError = null;
    if (newlyFlagged.length) {
      try {
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
          throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment variables.');
        }
        await transporter.sendMail({
          from: `"MelbourneMaxiTaxi Alerts" <${process.env.GMAIL_USER}>`,
          to: EMAIL,
          subject: `Repeat ad clickers: ${newlyFlagged.length} new IP${newlyFlagged.length === 1 ? '' : 's'}`,
          text:
            `${newlyFlagged.length} new repeat-clicker IP(s) in the last ${LOOKBACK_DAYS} days.\n\n` +
            `Paste into Google Ads IP exclusions:\n${newlyFlagged.map((f) => f.ip).join('\n')}\n\n` +
            `${totalFlagged} flagged in total (Google Ads limit: ${GOOGLE_ADS_IP_LIMIT} per campaign).`,
          html: buildReportHtml({ flagged: newlyFlagged, totalFlagged }),
        });
      } catch (mailErr) {
        console.error('Repeat clicker report email failed:', mailErr);
        emailError = mailErr.message;
      }
    }

    // Data retention: drop raw click logs older than 90 days.
    const retentionCutoff = Timestamp.fromMillis(now - RETENTION_DAYS * DAY_MS);
    let deletedOldClicks = 0;
    for (let i = 0; i < 10; i++) {
      const oldSnap = await db
        .collection('adClicks')
        .where('createdAt', '<', retentionCutoff)
        .limit(400)
        .get();
      if (oldSnap.empty) break;
      const batch = db.batch();
      oldSnap.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deletedOldClicks += oldSnap.size;
      if (oldSnap.size < 400) break;
    }

    return Response.json({
      newlyFlagged: newlyFlagged.length,
      totalFlagged,
      deletedOldClicks,
      ...(emailError ? { emailError } : {}),
    });
  } catch (err) {
    console.error('Repeat clicker cron failed:', err);
    return Response.json({ error: 'Cron failed' }, { status: 500 });
  }
}
