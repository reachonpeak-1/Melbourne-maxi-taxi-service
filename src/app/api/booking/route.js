import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';
import { EMAIL, PHONE, PHONE_DISPLAY } from '@/lib/site';
import { Timestamp } from 'firebase-admin/firestore';
import { validateEmailBasics, getEmailDomain } from '@/lib/emailValidation';
import { db } from '@/lib/firebase-admin';

// Confirms the email's domain actually has mail servers (rejects fake/typo domains).
async function domainAcceptsMail(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function buildBookingHtml({ name, email, phone, pickup, dropoff, date, time, passengers, vehicle, babySeat, returnTrip, notes }) {
  const dateFormatted = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not specified';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Booking — MelbourneMaxiTaxi</title>
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
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:14px;">New booking request</p>
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
              A new booking request has been submitted. Please review and confirm the ride details below.
            </p>

            <!-- Customer Info -->
            <div style="margin-bottom:24px;">
              <div style="display:inline-block;background:rgba(242,101,34,0.08);border-radius:6px;padding:4px 12px;margin-bottom:12px;">
                <span style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#f26522;">Customer Details</span>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                <tr>
                  <td style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;width:50%;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">Full Name</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${name}</span>
                  </td>
                  <td style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;border-left:1px solid #e2e8f0;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">Phone Number</span>
                    <a href="tel:${phone}" style="font-size:15px;font-weight:600;color:#f26522;text-decoration:none;">${phone}</a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="background:#f8fafc;padding:14px 20px;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">Email Address</span>
                    <a href="mailto:${email}" style="font-size:15px;font-weight:600;color:#f26522;text-decoration:none;">${email}</a>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Trip Info -->
            <div style="margin-bottom:24px;">
              <div style="display:inline-block;background:rgba(242,101,34,0.08);border-radius:6px;padding:4px 12px;margin-bottom:12px;">
                <span style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#f26522;">Trip Details</span>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                <tr>
                  <td style="background:#ffffff;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">📍 Pickup Location</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${pickup}</span>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">📍 Drop-off Location</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${dropoff}</span>
                  </td>
                </tr>
                <tr>
                  <td style="background:#ffffff;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%;">
                          <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">📅 Date</span>
                          <span style="font-size:15px;font-weight:600;color:#0f172a;">${dateFormatted}</span>
                        </td>
                        <td>
                          <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">🕐 Time</span>
                          <span style="font-size:15px;font-weight:600;color:#0f172a;">${time || 'Not specified'}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Vehicle & Options -->
            <div style="margin-bottom:24px;">
              <div style="display:inline-block;background:rgba(242,101,34,0.08);border-radius:6px;padding:4px 12px;margin-bottom:12px;">
                <span style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#f26522;">Vehicle & Options</span>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                <tr>
                  <td style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;width:50%;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">🚐 Vehicle Type</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${vehicle || 'Not specified'}</span>
                  </td>
                  <td style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;border-left:1px solid #e2e8f0;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">👥 Passengers</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${passengers || '1'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="background:#ffffff;padding:14px 20px;width:50%;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">🍼 Baby/Booster Seat</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${babySeat || 'No'}</span>
                  </td>
                  <td style="background:#ffffff;padding:14px 20px;border-left:1px solid #e2e8f0;">
                    <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">🔄 Return Trip</span>
                    <span style="font-size:15px;font-weight:600;color:#0f172a;">${returnTrip === 'Yes' ? 'Yes — Return' : 'One way'}</span>
                  </td>
                </tr>
              </table>
            </div>

            ${notes ? `
            <!-- Notes -->
            <div style="margin-bottom:24px;">
              <div style="display:inline-block;background:rgba(242,101,34,0.08);border-radius:6px;padding:4px 12px;margin-bottom:12px;">
                <span style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#f26522;">Additional Notes</span>
              </div>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;">
                <p style="margin:0;font-size:15px;color:#334155;line-height:1.65;">${notes.replace(/\n/g, '<br />')}</p>
              </div>
            </div>
            ` : ''}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr>
                <td align="center">
                  <a href="tel:${phone}" style="display:inline-block;background:#f26522;color:#ffffff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">📞 Call ${name}</a>
                  <span style="display:inline-block;width:12px;"></span>
                  <a href="https://wa.me/${phone.replace(/[^0-9+]/g, '')}" style="display:inline-block;background:#25d366;color:#ffffff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">💬 WhatsApp</a>
                </td>
              </tr>
            </table>

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
    const { name, email, phone, pickup, dropoff, date, time, passengers, vehicle, babySeat, returnTrip, notes, website } = body;

    // Server-side Honeypot Check: Silently ignore spam bots
    if (website) {
      console.warn('Spam submission filtered via booking form honeypot.');
      return Response.json({ success: true });
    }

    if (!name || !email || !phone || !pickup || !dropoff || !date || !time) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const emailCheck = validateEmailBasics(email);
    if (emailCheck.error) {
      return Response.json({ error: emailCheck.error }, { status: 400 });
    }

    if (!(await domainAcceptsMail(getEmailDomain(String(email).trim())))) {
      return Response.json({ error: "This email domain can't receive mail. Please check your email address." }, { status: 400 });
    }

    // Save to Firestore first so the admin dashboard gets the lead even if email fails
    let saved = false;
    try {
      await db.collection('leads').add({
        type: 'booking',
        source: '/book',
        status: 'unverified',
        name,
        email,
        phone,
        booking: { pickup, dropoff, date, time, vehicle, passengers, babySeat, returnTrip, notes },
        contact: null,
        ipLocation: null,
        submittedFrom: '/book',
        createdAt: Timestamp.now(),
      });
      saved = true;
    } catch (fsErr) {
      console.error('Firestore save failed (booking):', fsErr);
    }

    try {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment variables.');
      }
      await transporter.sendMail({
        from: `"MelbourneMaxiTaxi Booking" <${process.env.GMAIL_USER}>`,
        to: EMAIL,
        replyTo: email,
        subject: `New Booking: ${pickup} → ${dropoff} — ${name}`,
        html: buildBookingHtml({ name, email, phone, pickup, dropoff, date, time, passengers, vehicle, babySeat, returnTrip, notes }),
      });
    } catch (mailErr) {
      console.error('Booking email failed:', mailErr);
      if (!saved) throw mailErr;
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Booking form error:', err);
    return Response.json({ error: 'Failed to submit booking. Please try again.' }, { status: 500 });
  }
}
