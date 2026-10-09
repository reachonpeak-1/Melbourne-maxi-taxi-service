'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SERVICES = [
  'Airport Transfer (Arrival)',
  'Airport Transfer (Departure)',
  'Corporate Transfer',
  'Wedding / Special Event',
  'Long Distance / Regional',
  'Hourly Charter',
  'Other',
];

const initialState = { name: '', email: '', phone: '', service: '', date: '', message: '', website: '' };

export default function ContactForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  function validate() {
    const newErrors = {};
    if (!form.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(form.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const digits = form.phone.replace(/[^0-9]/g, '');
      if (digits.length < 8 || digits.length > 15) {
        newErrors.phone = 'Please enter a valid phone number (between 8 and 15 digits)';
      }
    }

    if (!form.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (form.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    const filteredValue = name === 'phone' ? value.replace(/[^0-9\s+\-()]/g, '') : value;
    setForm(prev => ({ ...prev, [name]: filteredValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!validate()) {
      return;
    }

    // Honeypot check to block automated spam submissions
    if (form.website) {
      setStatus('success');
      setForm(initialState);
      setTimeout(() => router.push('/thank-you'), 500);
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setStatus('success');
      setForm(initialState);
      setTimeout(() => router.push('/thank-you'), 500);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div style={styles.successBox}>
        <div style={styles.successIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 style={{ margin: '0 0 8px', color: 'var(--ink-light)', fontSize: '1.3rem', fontWeight: 800 }}>Message Sent!</h3>
        <p style={{ margin: 0, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
          Redirecting to thank you page...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form} noValidate>

      <div style={styles.row}>
        <div style={styles.fieldWrap}>
          <label style={styles.label}>Full Name <span style={styles.req}>*</span></label>
          <input
            name="name"
            type="text"
            placeholder="John Smith"
            value={form.name}
            onChange={handleChange}
            required
            style={{
              ...styles.input,
              borderColor: errors.name ? '#dc2626' : 'var(--border, #e2e8f0)',
              boxShadow: errors.name ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : 'none'
            }}
          />
          {errors.name && <span style={styles.errorText}>{errors.name}</span>}
        </div>
        <div style={styles.fieldWrap}>
          <label style={styles.label}>Email Address <span style={styles.req}>*</span></label>
          <input
            name="email"
            type="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={handleChange}
            required
            style={{
              ...styles.input,
              borderColor: errors.email ? '#dc2626' : 'var(--border, #e2e8f0)',
              boxShadow: errors.email ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : 'none'
            }}
          />
          {errors.email && <span style={styles.errorText}>{errors.email}</span>}
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.fieldWrap}>
          <label style={styles.label}>Phone Number <span style={styles.req}>*</span></label>
          <input
            name="phone"
            type="text"
            placeholder="04XX XXX XXX"
            value={form.phone}
            onChange={handleChange}
            required
            style={{
              ...styles.input,
              borderColor: errors.phone ? '#dc2626' : 'var(--border, #e2e8f0)',
              boxShadow: errors.phone ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : 'none'
            }}
          />
          {errors.phone && <span style={styles.errorText}>{errors.phone}</span>}
        </div>
        <div style={styles.fieldWrap}>
          <label style={styles.label}>Service Type</label>
          <select
            name="service"
            value={form.service}
            onChange={handleChange}
            style={{ ...styles.input, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '18px', paddingRight: 40 }}
          >
            <option value="">Select a service…</option>
            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.fieldWrap}>
        <label style={styles.label}>Preferred Date &amp; Time</label>
        <input
          name="date"
          type="text"
          placeholder="e.g. 15 June 2025 at 6:00 AM"
          value={form.date}
          onChange={handleChange}
          style={styles.input}
        />
      </div>

      <div style={styles.fieldWrap}>
        <label style={styles.label}>Message <span style={styles.req}>*</span></label>
        <textarea
          name="message"
          rows={5}
          placeholder="Tell us about your trip — pickup/dropoff locations, number of passengers, luggage, or any special requirements…"
          value={form.message}
          onChange={handleChange}
          required
          style={{
            ...styles.input,
            resize: 'vertical',
            minHeight: 130,
            borderColor: errors.message ? '#dc2626' : 'var(--border, #e2e8f0)',
            boxShadow: errors.message ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : 'none'
          }}
        />
        {errors.message && <span style={styles.errorText}>{errors.message}</span>}
      </div>

      {/* Honeypot field (hidden from users, bot trap) */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          value={form.website}
          onChange={handleChange}
          tabIndex="-1"
          autoComplete="off"
        />
      </div>

      {status === 'error' && (
        <div style={styles.errorBox}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          ...styles.submitBtn,
          opacity: status === 'loading' ? 0.7 : 1,
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'loading' ? (
          <>
            <span style={styles.spinner} />
            Sending…
          </>
        ) : (
          <>
            Send Message
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </>
        )}
      </button>

    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 20,
  },
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--ink-light)',
    letterSpacing: '0.01em',
  },
  req: {
    color: 'var(--accent)',
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 10,
    border: '1.5px solid var(--border, #e2e8f0)',
    background: 'var(--bg-alt-light, #f8fafc)',
    color: 'var(--ink-light)',
    fontSize: '0.97rem',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    boxSizing: 'border-box',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '15px 28px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    alignSelf: 'flex-start',
    transition: 'transform 0.2s, background 0.2s, box-shadow 0.2s',
  },
  successBox: {
    background: '#f0fdf4',
    border: '1.5px solid #86efac',
    borderRadius: 16,
    padding: '36px 32px',
    textAlign: 'center',
  },
  successIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: '#22c55e',
    color: '#fff',
    marginBottom: 16,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#fef2f2',
    border: '1.5px solid #fca5a5',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#dc2626',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  spinner: {
    display: 'inline-block',
    width: 16,
    height: 16,
    border: '2.5px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginTop: -2,
  },
};
