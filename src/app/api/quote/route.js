import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';

// Saves the hero "Book your ride" quick-quote to the admin leads list.
// The customer is sent on to WhatsApp by the client, so no email is sent here.
export async function POST(request) {
  try {
    const { pickup, dropoff, datetime, pax, vehicle } = await request.json();

    if (!dropoff || !datetime) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const [date, time] = String(datetime).split('T');

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

    return Response.json({ success: true });
  } catch (err) {
    console.error('Quick quote save failed:', err);
    return Response.json({ error: 'Failed to save quote.' }, { status: 500 });
  }
}
