'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PHONE, PHONE_DISPLAY, WHATSAPP_URL } from '@/lib/site';
import { validateEmailBasics } from '@/lib/emailValidation';

const initialDetails = { name: '', email: '', phone: '', notes: '', website: '' };

// Normalise an Australian number to local 0-prefixed digits (+61 / 61 → 0)
const normalizeAuPhone = (raw) => {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+61')) d = '0' + d.slice(3);
  else if (d.startsWith('61') && d.length > 10) d = '0' + d.slice(2);
  return d.replace(/\D/g, '');
};

// Valid AU numbers: 10 digits, leading 0, mobile (04/05) or landline (02/03/07/08)
const isValidAuPhone = (raw) => /^0[2-578]\d{8}$/.test(normalizeAuPhone(raw));

const errorTextStyle = { color: '#ff4d4d', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' };

const errorBorderStyle = (hasError) => ({
  borderColor: hasError ? '#dc2626' : '',
  boxShadow: hasError ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : '',
});

const formatTripTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

export default function BookingCardHero() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [dropoff, setDropoff] = useState('');
  const [datetime, setDatetime] = useState('');
  const [trip, setTrip] = useState({ pickup: '', pax: '', vehicle: '' });
  const [details, setDetails] = useState(initialDetails);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverFailed, setServerFailed] = useState(false);
  const pickupRef = useRef(null);
  const nameRef = useRef(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    // datetime-local wants local wall-clock time; toISOString() on its own is UTC.
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setDatetime(local.toISOString().slice(0, 16));
  }, []);

  // After switching steps, focus the first field of the step now shown.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (step === 2 ? nameRef : pickupRef).current?.focus({ preventScroll: true });
  }, [step]);

  const goToStep = (next) => {
    moveFocus.current = true;
    setStep(next);
  };

  const validate = () => {
    const newErrors = {};
    if (!dropoff.trim()) {
      newErrors.dropoff = 'Drop-off location is required';
    }

    if (!datetime) {
      newErrors.datetime = 'Date and time is required';
    } else {
      const selected = new Date(datetime);
      const now = new Date();
      if (selected < now) {
        newErrors.datetime = 'Please select a future date and time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDetails = () => {
    const newErrors = {};
    const name = details.name.trim();
    if (!name) newErrors.name = 'Your name is required';
    else if (name.length < 2) newErrors.name = 'Name must be at least 2 characters';

    const emailError = validateEmailBasics(details.email).error;
    if (emailError) newErrors.email = emailError;

    if (!details.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!isValidAuPhone(details.phone)) newErrors.phone = 'Please enter a valid Australian phone number (e.g. 04xx xxx xxx)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    const filteredValue = name === 'phone' ? value.replace(/[^0-9\s+\-()]/g, '') : value;
    setDetails(prev => ({ ...prev, [name]: filteredValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Step 1: check the trip, then ask for contact details.
    if (step === 1) {
      if (!validate()) return;
      const fd = new FormData(e.currentTarget);
      setTrip({
        pickup: fd.get('pickup') || '',
        pax: fd.get('pax') || '',
        vehicle: fd.get('vehicle') || '',
      });
      setError('');
      setServerFailed(false);
      goToStep(2);
      return;
    }

    if (loading || !validateDetails()) return;

    setLoading(true);
    setError('');
    setServerFailed(false);

    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...trip, dropoff, datetime, ...details }),
      });
      const data = await res.json();

      if (!res.ok) {
        const reqErr = new Error(data.error || 'Something went wrong');
        reqErr.isInputError = res.status < 500;
        throw reqErr;
      }

      // Conversion tags fire on /thank-you (Google Ads tracks that URL)
      router.push('/thank-you');
    } catch (err) {
      // Server or network failure: offer WhatsApp/call so the quote isn't lost
      if (!err.isInputError) setServerFailed(true);
      setError(err.message || 'Failed to send your quote request. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="book-card-hero">
      <h2>{step === 1 ? 'Book your ride' : 'Your details'}</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div hidden={step !== 1}>
          <div className="book-field">
            <label>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
              Pickup location
            </label>
            <select className="book-control" name="pickup" ref={pickupRef}>
              <option>Melbourne Airport (Tullamarine)</option>
              <option>Melbourne CBD</option>
              <option>Southern Cross Station</option>
              <option>Flinders Street Station</option>
              <option>Other (specify in notes)</option>
            </select>
          </div>
          <div className="book-field">
            <label>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10l-2 6z"/></svg>
              Drop-off location
            </label>
            <input
              className="book-control"
              type="text"
              name="dropoff"
              placeholder="Enter drop-off location"
              value={dropoff}
              onChange={(e) => { setDropoff(e.target.value); if (errors.dropoff) setErrors(prev => ({ ...prev, dropoff: '' })); }}
              style={{
                borderColor: errors.dropoff ? '#dc2626' : '',
                boxShadow: errors.dropoff ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : ''
              }}
            />
            {errors.dropoff && <span style={{ color: '#ff4d4d', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>{errors.dropoff}</span>}
          </div>
          <div className="book-row">
            <div className="book-field">
              <label>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                Passengers
              </label>
              <select className="book-control" name="pax">
                {[...Array(13)].map((_, i) => (
                  <option key={i + 1}>{i + 1} {i === 0 ? 'Passenger' : 'Passengers'}</option>
                ))}
              </select>
            </div>
            <div className="book-field">
              <label>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                Date &amp; time
              </label>
              <input
                className="book-control"
                type="datetime-local"
                name="datetime"
                id="hero-datetime"
                value={datetime}
                onChange={(e) => { setDatetime(e.target.value); if (errors.datetime) setErrors(prev => ({ ...prev, datetime: '' })); }}
                style={{
                  borderColor: errors.datetime ? '#dc2626' : '',
                  boxShadow: errors.datetime ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : ''
                }}
              />
              {errors.datetime && <span style={{ color: '#ff4d4d', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>{errors.datetime}</span>}
            </div>
          </div>
          <div className="book-field">
            <label>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="6" width="22" height="12" rx="3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
              Vehicle type
            </label>
            <select className="book-control" name="vehicle">
              <option>Maxi Van (Up to 13 seats)</option>
              <option>Maxi 7 Seater</option>
              <option>SUV (1-5 passengers)</option>
              <option>Sedan (1-4 passengers)</option>
            </select>
          </div>
          <button type="submit" className="book-submit">
            Get Quote Now
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>

        <div hidden={step !== 2}>
          <div className="book-summary">
            <div>
              <p className="book-summary-route">{trip.pickup} → {dropoff}</p>
              <p className="book-summary-meta">{formatTripTime(datetime)} · {trip.pax}</p>
            </div>
            <button type="button" className="book-summary-edit" onClick={() => goToStep(1)}>
              Edit
            </button>
          </div>
          <div className="book-row">
            <div className="book-field">
              <label htmlFor="hero-name">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>
                Name
              </label>
              <input
                ref={nameRef}
                className="book-control"
                id="hero-name"
                type="text"
                name="name"
                placeholder="Full name"
                autoComplete="name"
                value={details.name}
                onChange={handleDetailChange}
                aria-invalid={Boolean(errors.name)}
                style={errorBorderStyle(errors.name)}
              />
              {errors.name && <span style={errorTextStyle}>{errors.name}</span>}
            </div>
            <div className="book-field">
              <label htmlFor="hero-phone">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Phone number
              </label>
              <input
                className="book-control"
                id="hero-phone"
                type="tel"
                name="phone"
                placeholder="04xx xxx xxx"
                autoComplete="tel"
                inputMode="tel"
                value={details.phone}
                onChange={handleDetailChange}
                aria-invalid={Boolean(errors.phone)}
                style={errorBorderStyle(errors.phone)}
              />
              {errors.phone && <span style={errorTextStyle}>{errors.phone}</span>}
            </div>
          </div>
          <div className="book-field">
            <label htmlFor="hero-email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Email
            </label>
            <input
              className="book-control"
              id="hero-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              value={details.email}
              onChange={handleDetailChange}
              aria-invalid={Boolean(errors.email)}
              style={errorBorderStyle(errors.email)}
            />
            {errors.email && <span style={errorTextStyle}>{errors.email}</span>}
          </div>
          <div className="book-field">
            <label htmlFor="hero-notes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
              Additional notes <span className="book-optional">(optional)</span>
            </label>
            <textarea
              className="book-control"
              id="hero-notes"
              name="notes"
              rows={2}
              maxLength={1000}
              placeholder="Flight number, luggage, special requests…"
              value={details.notes}
              onChange={handleDetailChange}
            />
          </div>
          {/* Honeypot field (hidden from users, bot trap) */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={details.website}
              onChange={handleDetailChange}
            />
          </div>

          {error && (
            <div className="book-alert" role="alert">
              {serverFailed ? "We couldn't send your request online. Please send it on WhatsApp or call us." : error}
              {serverFailed && (
                <div className="book-alert-actions">
                  <a
                    href={WHATSAPP_URL + '?text=' + encodeURIComponent([
                      'Quick Quote Request — MelbourneMaxiTaxi',
                      'Name: ' + details.name,
                      'Phone: ' + details.phone,
                      'Email: ' + details.email,
                      'Pickup: ' + trip.pickup,
                      'Drop-off: ' + dropoff,
                      'Date/Time: ' + formatTripTime(datetime),
                      'Passengers: ' + trip.pax,
                      'Vehicle: ' + trip.vehicle,
                      details.notes ? 'Notes: ' + details.notes : '',
                    ].filter(Boolean).join('\n'))}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-primary"
                  >
                    Send on WhatsApp
                  </a>
                  <a href={`tel:${PHONE}`} className="btn btn-outline">Call {PHONE_DISPLAY}</a>
                </div>
              )}
            </div>
          )}

          <button type="submit" className="book-submit" disabled={loading}>
            {loading ? (
              <>
                Submitting…
                <span className="btn-spinner" />
              </>
            ) : (
              <>
                Submit
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </>
            )}
          </button>
        </div>

        <div className="book-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          No hidden charges. 100% fixed fares.
        </div>
      </form>
    </div>
  );
}
