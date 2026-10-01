'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PHONE, PHONE_DISPLAY, WHATSAPP_URL } from '@/lib/site';

export default function ThankYouPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Fire conversion + lead events on the thank-you view — every successful
    // form submission lands here, so this is the single reliable conversion point.
    // Google Ads conversion action: "Submit lead form (1)"
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-18217740838';
      window.gtag('event', 'conversion', {
        send_to: `${adsId}/WPyvCNK03owdEKbU8u5D`,
        value: 1.0,
        currency: 'AUD',
      });
      window.gtag('event', 'generate_lead', {
        currency: 'AUD',
        value: 1.0,
      });
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="eyebrow">Submission Received</span>
          <h1 className="h1">Thank You!</h1>
          <p className="lead">We've received your message and will get back to you shortly.</p>
        </div>
      </div>

      <section className="section-light" style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{
            maxWidth: 600,
            margin: '0 auto',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 40,
          }}>
            {/* Success Icon */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: '#22c55e',
              color: '#fff',
              margin: '0 auto',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="50" height="50">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* Message */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--ink-light)',
                margin: 0,
              }}>
                We've got your request
              </h2>
              <p style={{
                fontSize: '1rem',
                color: 'var(--ink-muted)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                Our team is reviewing your message and will respond within a few hours. For urgent bookings, please call us directly at <a href={`tel:${PHONE}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{PHONE_DISPLAY}</a>.
              </p>
            </div>

            {/* Countdown */}
            <div style={{
              padding: '20px 24px',
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1.5px solid rgba(37, 99, 235, 0.3)',
              borderRadius: 12,
              color: 'var(--ink-light)',
              fontWeight: 600,
            }}>
              Redirecting to home in <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{countdown}</span> seconds...
            </div>

            {/* CTAs */}
            <div style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <Link href="/" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 28px',
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 12,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                transition: 'transform 0.2s, background 0.2s',
              }}>
                Return Home
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link href="/book" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 28px',
                background: 'transparent',
                color: 'var(--ink-light)',
                border: '1.5px solid var(--border)',
                borderRadius: 12,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                transition: 'transform 0.2s, border-color 0.2s',
              }}>
                Book a Ride
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            {/* Trust signals */}
            <div style={{
              padding: '24px',
              background: 'var(--bg-light)',
              borderRadius: 12,
              border: '1px solid var(--line-light)',
            }}>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--ink-muted)',
                margin: '0 0 16px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Need immediate assistance?
              </p>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <a href={`tel:${PHONE}`} style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                }}>
                  📞 Call: {PHONE_DISPLAY}
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
                  color: '#25D366',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                }}>
                  💬 WhatsApp: {PHONE_DISPLAY}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  );
}
