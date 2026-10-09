import nodemailer from 'nodemailer';
import { Timestamp } from 'firebase-admin/firestore';
import { EMAIL, PHONE, PHONE_DISPLAY } from '@/lib/site';
import { db } from '@/lib/firebase-admin';

// Saves the hero "Book your ride" quick-quote to the admin leads list and
// emails it to the business inbox (same inbox as /api/booking). The customer
// is sent on to WhatsApp by the client.

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Every quote field is a single-line input: collapse whitespace (keeps the
// email subject on one line) and cap the length.
function clean(value, max) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildQuoteHtml({ pickup, dropoff, date, time, pax, vehicle }) {
  const parsedDate = date ? new Date(date + 'T00:00:00') : null;
  const dateFormatted = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : date || 'Not specified';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Quote Request — MelbourneMaxiTaxi</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">MelbourneMaxiTaxi</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:14px;">New quote request</p>
          </td>
        </tr>

        <!-- Orange accent bar -->
        <tr>
          <td style="background:#f26522;padding:4px 0;"></td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">

            <!-- Greeting -->
            <p style="margin:0 0 28px;color:#0f172a;font-size:16px;line-height:1.6;">
              A customer requested a quick quote from the <strong>Book your ride</strong> form on the homepage. Trip details are below.
            </p>

            <!-- Trip Info -->
            <div style="margin-bottom:24px;">
              <div style="display:inline-block;background:rgba(242,101,34,0.08);border-radius:6px;padding:4px 12px;margin-bottom:12px;">
                <span style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#f26522;">Trip Details</span>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                <tr>
                  <td style="background:#ffffff;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">📍 Pickup Location</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${esc(pickup || 'Not specified')}</span>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">📍 Drop-off Location</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${esc(dropoff)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="background:#ffffff;padding:14px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%;">
                          <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">📅 Date</span>
                          <span style="font-size:15px;font-weight:600;color:#0f172a;">${esc(dateFormatted)}</span>
                        </td>
                        <td>
                          <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">🕐 Time</span>
                          <span style="font-size:15px;font-weight:600;color:#0f172a;">${esc(time || 'Not specified')}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Vehicle -->
            <div style="margin-bottom:24px;">
              <div style="display:inline-block;background:rgba(242,101,34,0.08);border-radius:6px;padding:4px 12px;margin-bottom:12px;">
                <span style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#f26522;">Vehicle</span>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                <tr>
                  <td style="background:#f8fafc;padding:14px 20px;width:50%;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">🚐 Vehicle Type</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${esc(vehicle || 'Not specified')}</span>
                  </td>
                  <td style="background:#f8fafc;padding:14px 20px;border-left:1px solid #e2e8f0;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">👥 Passengers</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${esc(pax || 'Not specified')}</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- WhatsApp note -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;">
              <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">
                This form does not ask for a name or phone number. After tapping <strong>Get Quote Now</strong>, the customer was taken to WhatsApp with these details filled in. If they sent the message, their number is in your WhatsApp chats.
              </p>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.35);font-size:12px;line-height:1.6;">
              MelbourneMaxiTaxi &nbsp;·&nbsp; Craigieburn, Melbourne VIC<br/>
              <a href="tel:${PHONE}" style="color:#f26522;text-decoration:none;">${PHONE_DISPLAY}</a>
              &nbsp;·&nbsp;
              <a href="mailto:${EMAIL}" style="color:#f26522;text-decoration:none;">${EMAIL}</a>
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

export async function POST(request) {
  try {
    const body = await request.json();
    const pickup = clean(body.pickup, 200);
    const dropoff = clean(body.dropoff, 300);
    const datetime = clean(body.datetime, 40);
    const pax = clean(body.pax, 40);
    const vehicle = clean(body.vehicle, 100);

    if (!dropoff || !datetime) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const [date, time] = datetime.split('T');

    // Save to Firestore first so the admin dashboard gets the lead even if email fails
    let saved = false;
    try {
      await db.collection('leads').add({
        type: 'booking',
        source: '/',
        status: 'unverified',
        name: null,
        email: null,
        phone: null,
        booking: {
          pickup: pickup || null,
          dropoff,
          date: date || null,
          time: time || null,
          vehicle: vehicle || null,
          passengers: pax || null,
          babySeat: null,
          returnTrip: null,
          notes: 'Quick quote from homepage, sent to WhatsApp',
        },
        contact: null,
        ipLocation: null,
        submittedFrom: '/',
        createdAt: Timestamp.now(),
      });
      saved = true;
    } catch (fsErr) {
      console.error('Firestore save failed (quote):', fsErr);
    }

    try {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment variables.');
      }
      await transporter.sendMail({
        from: `"MelbourneMaxiTaxi Quote" <${process.env.GMAIL_USER}>`,
        to: EMAIL,
        subject: `New Quote Request: ${pickup || 'Pickup not set'} → ${dropoff}`,
        html: buildQuoteHtml({ pickup, dropoff, date, time, pax, vehicle }),
      });
    } catch (mailErr) {
      console.error('Quote email failed:', mailErr);
      if (!saved) throw mailErr;
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Quick quote save failed:', err);
    return Response.json({ error: 'Failed to save quote.' }, { status: 500 });
  }
}
