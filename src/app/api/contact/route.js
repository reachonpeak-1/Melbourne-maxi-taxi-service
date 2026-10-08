import nodemailer from 'nodemailer';
import { Timestamp } from 'firebase-admin/firestore';
import { EMAIL, PHONE, PHONE_DISPLAY } from '@/lib/site';
import { db } from '@/lib/firebase-admin';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// HTML-escape user-controlled values before they land in the email markup.
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml({ name, email, phone, service, date, message }) {
  // Escape everything user-controlled up front; falsy values stay falsy.
  name = esc(name);
  email = esc(email);
  phone = esc(phone);
  service = esc(service);
  date = esc(date);
  message = esc(message);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Enquiry — MelbourneMaxiTaxi</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%);padding:36px 40px;text-align:center;">
            <div style="display:inline-block;background:#f26522;border-radius:8px;padding:6px 14px;margin-bottom:16px;">
              <span style="color:#fff;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">New Enquiry</span>
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">MelbourneMaxiTaxi</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:14px;">You have received a new website enquiry</p>
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
              A new enquiry has been submitted through the website contact form. Details are below.
            </p>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
              <tr>
                <td style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                  <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">Full Name</span>
                  <span style="font-size:15px;font-weight:600;color:#0f172a;">${name}</span>
                </td>
              </tr>
              <tr>
                <td style="background:#ffffff;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                  <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">Email Address</span>
                  <a href="mailto:${email}" style="font-size:15px;font-weight:600;color:#f26522;text-decoration:none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                  <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">Phone Number</span>
                  <a href="tel:${phone}" style="font-size:15px;font-weight:600;color:#f26522;text-decoration:none;">${phone}</a>
                </td>
              </tr>
              <tr>
                <td style="background:#ffffff;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                  <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">Service Type</span>
                  <span style="font-size:15px;font-weight:600;color:#0f172a;">${service || 'Not specified'}</span>
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                  <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px;">Preferred Date / Time</span>
                  <span style="font-size:15px;font-weight:600;color:#0f172a;">${date || 'Not specified'}</span>
                </td>
              </tr>
              <tr>
                <td style="background:#ffffff;padding:14px 20px;">
                  <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Message</span>
                  <span style="font-size:15px;color:#334155;line-height:1.65;">${message.replace(/\n/g, '<br />')}</span>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr>
                <td align="center">
                  <a href="mailto:${email}" style="display:inline-block;background:#f26522;color:#ffffff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">Reply to ${name}</a>
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
    const { name, email, phone, service, date, message, website } = body;

    // Server-side Honeypot Check: Silently ignore spam bots
    if (website) {
      console.warn('Spam submission filtered via contact form honeypot.');
      return Response.json({ success: true });
    }

    if (!name || !email || !phone || !message) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Save to Firestore first so the admin dashboard gets the lead even if email fails
    let saved = false;
    try {
      await db.collection('leads').add({
        type: 'contact',
        source: '/contact',
        status: 'verified',
        emailVerified: false,
        name,
        email,
        phone,
        booking: null,
        contact: {
          service: service || null,
          requestedDate: date || null,
          message,
        },
        ipLocation: null,
        submittedFrom: '/contact',
        createdAt: Timestamp.now(),
      });
      saved = true;
    } catch (fsErr) {
      console.error('Firestore write failed (contact):', fsErr);
    }

    try {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment variables.');
      }
      await transporter.sendMail({
        from: `"MelbourneMaxiTaxi Website" <${process.env.GMAIL_USER}>`,
        to: EMAIL,
        replyTo: email,
        subject: `New Enquiry from ${name} — MelbourneMaxiTaxi`,
        html: buildHtml({ name, email, phone, service, date, message }),
      });
    } catch (mailErr) {
      console.error('Contact email failed:', mailErr);
      if (!saved) throw mailErr;
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return Response.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }
}
