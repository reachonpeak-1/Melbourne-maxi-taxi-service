'use client';
import { useEffect, useState } from 'react';
import { WHATSAPP_URL } from '@/lib/site';

export default function BookingCardHero() {
  const [dropoff, setDropoff] = useState('');
  const [datetime, setDatetime] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    setDatetime(now.toISOString().slice(0, 16));
  }, []);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData(e.target);

    // Record the quote for the admin dashboard. Not awaited so window.open
    // still runs inside the click and isn't blocked as a popup.
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(fd)),
      keepalive: true,
    }).catch(() => {});

    const lines = [
      'Quick Quote Request — MelbourneMaxiTaxi', '',
      'Pickup: ' + (fd.get('pickup') || ''),
      'Drop-off: ' + (fd.get('dropoff') || ''),
      'Date/Time: ' + (fd.get('datetime') || ''),
      'Passengers: ' + (fd.get('pax') || ''),
      'Vehicle: ' + (fd.get('vehicle') || ''),
    ];
    window.open(
      WHATSAPP_URL + '?text=' + encodeURIComponent(lines.join('\n')),
      '_blank', 'noopener'
    );
  };

  return (
    <div className="book-card-hero">
      <h2>Book your ride</h2>
      <form onSubmit={handleSubmit}>
        <div className="book-field">
          <label>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
            Pickup location
          </label>
          <select className="book-control" name="pickup">
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
        <div className="book-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          No hidden charges. 100% fixed fares.
        </div>
      </form>
    </div>
  );
}
