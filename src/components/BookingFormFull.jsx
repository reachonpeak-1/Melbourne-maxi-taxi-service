'use client';
import { useEffect, useState } from 'react';
import { PHONE, PHONE_DISPLAY, WHATSAPP_URL } from '@/lib/site';
import { validateEmailBasics } from '@/lib/emailValidation';

const initialValues = {
  pickup: '',
  dropoff: '',
  date: '',
  time: '',
  pax: '1 Passenger',
  vehicle: 'Maxi Van (Up to 13 seats)',
  baby: 'No',
  returnTrip: 'No',
  cname: '',
  cemail: '',
  cphone: '',
  notes: '',
  website: '',
};

// Normalise an Australian number to local 0-prefixed digits (+61 / 61 → 0)
const normalizeAuPhone = (raw) => {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+61')) d = '0' + d.slice(3);
  else if (d.startsWith('61') && d.length > 10) d = '0' + d.slice(2);
  return d.replace(/\D/g, '');
};

// Valid AU numbers: 10 digits, leading 0, mobile (04/05) or landline (02/03/07/08)
const isValidAuPhone = (raw) => /^0[2-578]\d{8}$/.test(normalizeAuPhone(raw));

export default function BookingFormFull() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverFailed, setServerFailed] = useState(false);
  const [minDate, setMinDate] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setMinDate(today);
    setValues(prev => ({ ...prev, date: today }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const filteredValue = name === 'cphone' ? value.replace(/[^0-9\s+\-()]/g, '') : value;
    setValues(prev => ({ ...prev, [name]: filteredValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Returns an error message for a single field, or '' if valid
  const validateField = (name, raw) => {
    const value = typeof raw === 'string' ? raw : '';
    switch (name) {
      case 'pickup':
        return value.trim() ? '' : 'Pickup location is required';
      case 'dropoff':
        return value.trim() ? '' : 'Drop-off location is required';
      case 'date':
        if (!value) return 'Date is required';
        if (value < minDate) return 'Date cannot be in the past';
        return '';
      case 'time':
        return value ? '' : 'Time is required';
      case 'cname':
        if (!value.trim()) return 'Your name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'cemail':
        return validateEmailBasics(value).error;
      case 'cphone':
        if (!value.trim()) return 'Phone number is required';
        if (!isValidAuPhone(value)) return 'Please enter a valid Australian phone number (e.g. 04xx xxx xxx)';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const message = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: message }));
  };

  const validate = () => {
    const fields = ['pickup', 'dropoff', 'date', 'time', 'cname', 'cemail', 'cphone'];
    const newErrors = {};
    fields.forEach((name) => {
      const message = validateField(name, values[name]);
      if (message) newErrors[name] = message;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Honeypot check to block automated spam submissions
    if (values.website) {
      setSubmitted(true);
      const today = new Date().toISOString().split('T')[0];
      setValues({ ...initialValues, date: today });
      return;
    }

    setLoading(true);
    setError('');
    setServerFailed(false);

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.cname,
          email: values.cemail,
          phone: values.cphone,
          pickup: values.pickup,
          dropoff: values.dropoff,
          date: values.date,
          time: values.time,
          passengers: values.pax,
          vehicle: values.vehicle,
          babySeat: values.baby,
          returnTrip: values.returnTrip,
          notes: values.notes,
          website: values.website,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const reqErr = new Error(data.error || 'Something went wrong');
        reqErr.isInputError = res.status < 500;
        throw reqErr;
      }

      setSubmitted(true);
      setValues(initialValues);

      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-18217740838';
        window.gtag('event', 'conversion', {
          send_to: `${adsId}/CONVERSION_LABEL`,
          value: 1.0,
          currency: 'AUD',
        });
        window.gtag('event', 'generate_lead', {
          currency: 'AUD',
          value: 1.0,
        });
      }
    } catch (err) {
      // Server or network failure: offer WhatsApp/call so the booking isn't lost
      if (!err.isInputError) setServerFailed(true);
      setError(err.message || 'Failed to submit booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAnother = () => {
    const today = new Date().toISOString().split('T')[0];
    setValues({ ...initialValues, date: today });
    setErrors({});
    setSubmitted(false);
    setError('');
    setServerFailed(false);
  };

  return (
    <section className="booking section-light" id="book">
      <div className="container">
        <div className="book-card">
          <div className="book-head">
            <div>
              <h2 className="h3" style={{ fontSize: '1.5rem' }}>Book your maxi cab</h2>
              <p>Get an instant confirmation — sent straight to your inbox.</p>
            </div>
            <span className="save">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/>
                <path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>
                <circle cx="16" cy="14" r="1.5" fill="currentColor"/>
              </svg>
              Save 15% on advance bookings
            </span>
          </div>
          <div className="book-body">
            {submitted ? (
              <div className="booking-success">
                <div className="success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3>Booking Submitted!</h3>
                <p>Thank you for choosing MelbourneMaxiTaxi. Your booking details have been received — our team will confirm your ride shortly.</p>
                <div className="success-details">
                  <div className="success-detail-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    <span>You&apos;ll receive a confirmation within minutes</span>
                  </div>
                  <div className="success-detail-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>Need help? Call <a href={`tel:${PHONE}`} style={{ color: 'var(--accent)', fontWeight: 700 }}>{PHONE_DISPLAY}</a></span>
                  </div>
                </div>
                <button type="button" className="btn btn-primary btn-lg" onClick={handleBookAnother} style={{ marginTop: 28 }}>
                  Book Another Ride
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 18, height: 18 }}>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            ) : (
            <form className="form-grid" id="bookingForm" noValidate onSubmit={handleSubmit}>
              <div className="field c2">
                <label htmlFor="pickup">Pickup location <span className="r">*</span></label>
                <input
                  className="control"
                  id="pickup"
                  name="pickup"
                  placeholder="e.g. Melbourne Airport"
                  required
                  value={values.pickup}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={errors.pickup ? { borderColor: '#dc2626', boxShadow: '0 0 0 1px rgba(220, 38, 38, 0.2)' } : {}}
                />
                {errors.pickup && <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>{errors.pickup}</span>}
              </div>
              <div className="field c2">
                <label htmlFor="dropoff">Drop-off location <span className="r">*</span></label>
                <input
                  className="control"
                  id="dropoff"
                  name="dropoff"
                  placeholder="e.g. Crown Hotel, Melbourne"
                  required
                  value={values.dropoff}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={errors.dropoff ? { borderColor: '#dc2626', boxShadow: '0 0 0 1px rgba(220, 38, 38, 0.2)' } : {}}
                />
                {errors.dropoff && <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>{errors.dropoff}</span>}
              </div>
              <div className="field">
                <label htmlFor="date">Date <span className="r">*</span></label>
                <input
                  className="control"
                  id="date"
                  name="date"
                  type="date"
                  required
                  value={values.date}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min={minDate}
                  style={errors.date ? { borderColor: '#dc2626', boxShadow: '0 0 0 1px rgba(220, 38, 38, 0.2)' } : {}}
                />
                {errors.date && <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>{errors.date}</span>}
              </div>
              <div className="field">
                <label htmlFor="time">Time <span className="r">*</span></label>
                <input
                  className="control"
                  id="time"
                  name="time"
                  type="time"
                  required
                  value={values.time}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={errors.time ? { borderColor: '#dc2626', boxShadow: '0 0 0 1px rgba(220, 38, 38, 0.2)' } : {}}
                />
                {errors.time && <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>{errors.time}</span>}
              </div>
              <div className="field">
                <label htmlFor="pax">Passengers</label>
                <select className="control" id="pax" name="pax" value={values.pax} onChange={handleChange}>
                  {[...Array(13)].map((_, i) => (
                    <option key={i + 1}>{i + 1} {i === 0 ? 'Passenger' : 'Passengers'}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="vehicle">Vehicle type</label>
                <select className="control" id="vehicle" name="vehicle" value={values.vehicle} onChange={handleChange}>
                  <option>Maxi Van (Up to 13 seats)</option>
                  <option>Maxi 7 Seater</option>
                  <option>SUV (1-5 passengers)</option>
                  <option>Sedan (1-4 passengers)</option>
                </select>
              </div>
              <div className="field c2">
                <label>Baby / booster seat?</label>
                <div className="seg">
                  <label><input type="radio" name="baby" value="No" checked={values.baby === 'No'} onChange={handleChange} /><span className="opt">No thanks</span></label>
                  <label><input type="radio" name="baby" value="Baby seat" checked={values.baby === 'Baby seat'} onChange={handleChange} /><span className="opt">Baby seat</span></label>
                  <label><input type="radio" name="baby" value="Booster" checked={values.baby === 'Booster'} onChange={handleChange} /><span className="opt">Booster</span></label>
                </div>
              </div>
              <div className="field c2">
                <label>Return trip?</label>
                <div className="seg">
                  <label><input type="radio" name="returnTrip" value="No" checked={values.returnTrip === 'No'} onChange={handleChange} /><span className="opt">One way</span></label>
                  <label><input type="radio" name="returnTrip" value="Yes" checked={values.returnTrip === 'Yes'} onChange={handleChange} /><span className="opt">Return</span></label>
                </div>
              </div>
              <div className="field c2">
                <label htmlFor="cname">Your name <span className="r">*</span></label>
                <input
                  className="control"
                  id="cname"
                  name="cname"
                  placeholder="Full name"
                  required
                  value={values.cname}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={errors.cname ? { borderColor: '#dc2626', boxShadow: '0 0 0 1px rgba(220, 38, 38, 0.2)' } : {}}
                />
                {errors.cname && <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>{errors.cname}</span>}
              </div>
              <div className="field c2">
                <label htmlFor="cemail">Email address <span className="r">*</span></label>
                <input
                  className="control"
                  id="cemail"
                  name="cemail"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={values.cemail}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={errors.cemail ? { borderColor: '#dc2626', boxShadow: '0 0 0 1px rgba(220, 38, 38, 0.2)' } : {}}
                />
                {errors.cemail && <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>{errors.cemail}</span>}
              </div>
              <div className="field c2">
                <label htmlFor="cphone">Phone number <span className="r">*</span></label>
                <input
                  className="control"
                  id="cphone"
                  name="cphone"
                  type="text"
                  placeholder="+61 4xx xxx xxx"
                  required
                  value={values.cphone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={errors.cphone ? { borderColor: '#dc2626', boxShadow: '0 0 0 1px rgba(220, 38, 38, 0.2)' } : {}}
                />
                {errors.cphone && <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>{errors.cphone}</span>}
              </div>
              <div className="field c4">
                <label htmlFor="notes">Additional notes</label>
                <textarea
                  className="control"
                  id="notes"
                  name="notes"
                  rows="3"
                  placeholder="Flight number, special requests, luggage details…"
                  style={{ resize: 'vertical' }}
                  value={values.notes}
                  onChange={handleChange}
                />
              </div>
              {/* Honeypot field (hidden from users, bot trap) */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  value={values.website}
                  onChange={handleChange}
                  tabIndex="-1"
                  autoComplete="off"
                />
              </div>

              {error && (
                <div className="field c4">
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontWeight: 600, fontSize: '.92rem' }}>
                    {serverFailed ? "We couldn't send your booking online. Please send it on WhatsApp or call us." : error}
                    {serverFailed && (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                        <a
                          href={WHATSAPP_URL + '?text=' + encodeURIComponent([
                            'Booking Request — MelbourneMaxiTaxi', '',
                            'Name: ' + values.cname,
                            'Phone: ' + values.cphone,
                            'Email: ' + values.cemail,
                            'Pickup: ' + values.pickup,
                            'Drop-off: ' + values.dropoff,
                            'Date/Time: ' + values.date + ' ' + values.time,
                            'Passengers: ' + values.pax,
                            'Vehicle: ' + values.vehicle,
                            'Baby seat: ' + values.baby,
                            'Return trip: ' + values.returnTrip,
                            values.notes ? 'Notes: ' + values.notes : '',
                          ].filter(Boolean).join('\n'))}
                          target="_blank"
                          rel="noopener"
                          className="btn btn-primary"
                        >
                          Send on WhatsApp
                        </a>
                        <a href={`tel:${PHONE}`} className="btn btn-dark">Call {PHONE_DISPLAY}</a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="book-foot">
                <div className="pay">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
                  Cash · Card · Digital wallets accepted
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? (
                    <>
                      Submitting…
                      <span className="btn-spinner" />
                    </>
                  ) : (
                    <>
                      Book Now
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 18, height: 18 }}>
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
