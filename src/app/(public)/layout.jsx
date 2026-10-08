import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';
import LocationPrompt from '@/components/LocationPrompt';
import AdClickTracker from '@/components/AdClickTracker';
import { SITE_URL, SITE_NAME, PHONE, EMAIL, WHATSAPP_URL } from '@/lib/site';

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-WFKNTPL9LV';
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-18217740838';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'MelbourneMaxiTaxi — Airport & Group Transfers 24/7',
  description:
    'MelbourneMaxiTaxi for airport runs, groups up to 13 and citywide travel. Spacious, spotless vehicles 24/7 with professional local drivers, fixed fares and easy online booking.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'MelbourneMaxiTaxi — Airport & Group Transfers 24/7',
    description:
      'Spacious maxi cabs across Melbourne. Airport, corporate, hotel, event & wedding transfers. Up to 13 passengers. Book 24/7.',
    type: 'website',
    url: '/',
    siteName: 'MelbourneMaxiTaxi',
    locale: 'en_AU',
    images: [{ url: '/assets/hero-bg.webp', width: 1200, height: 630, alt: 'MelbourneMaxiTaxi' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MelbourneMaxiTaxi — Airport & Group Transfers 24/7',
    description:
      'Spacious maxi cabs across Melbourne. Airport, corporate, hotel, event & wedding transfers. Up to 13 passengers. Book 24/7.',
    images: ['/assets/hero-bg.webp'],
  },
};

export default function PublicLayout({ children }) {
  const businessId = `${SITE_URL}/#business`;

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'TaxiService'],
    '@id': businessId,
    name: SITE_NAME,
    description: 'Professional maxi cab and group transportation services across Melbourne, Australia. Airport transfers, corporate travel, weddings, and events.',
    image: `${SITE_URL}/assets/logo-white.webp`,
    logo: `${SITE_URL}/assets/logo-white.webp`,
    url: SITE_URL,
    telephone: PHONE,
    email: EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Craigieburn',
      addressLocality: 'Melbourne',
      addressRegion: 'VIC',
      postalCode: '3064',
      addressCountry: 'AU',
    },
    geo: { '@type': 'GeoCoordinates', latitude: -37.5994, longitude: 144.9404 },
    areaServed: { '@type': 'State', name: 'Victoria' },
    priceRange: '$$',
    currenciesAccepted: 'AUD',
    paymentAccepted: 'Cash, Credit Card, EFTPOS',
    sameAs: ['https://www.facebook.com/melbournemaxitaxi', WHATSAPP_URL],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      bestRating: '5',
      worstRating: '1',
      ratingCount: '150',
    },
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Maxi cab and airport transfer service',
    name: SITE_NAME,
    url: SITE_URL,
    provider: { '@id': businessId },
    areaServed: { '@type': 'State', name: 'Victoria' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Maxi cab services',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Airport transfers' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Corporate transfers' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Wedding & event transfers' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Group travel (up to 13 passengers)' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Parcel delivery' } },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID || GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          if ('${GA4_ID}') {
            gtag('config', '${GA4_ID}');
          }
          if ('${GOOGLE_ADS_ID}') {
            gtag('config', '${GOOGLE_ADS_ID}');
          }
        `}
      </Script>
      <ScrollReveal />
      <AdClickTracker />
      <Header />
      <LocationPrompt />
      <main>{children}</main>
      <Footer />
      <a className="fab" href={WHATSAPP_URL} target="_blank" rel="noopener" aria-label="WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zM6.597 20.13c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.707zM17.5 14.4c-.07-.12-.27-.19-.57-.34s-1.76-.87-2.03-.97c-.27-.1-.47-.15-.67.15s-.77.97-.94 1.16c-.17.2-.35.22-.64.07a8.1 8.1 0 0 1-2.39-1.47 9 9 0 0 1-1.66-2.06c-.17-.3 0-.46.13-.6.13-.14.3-.35.44-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41z" />
        </svg>
      </a>
    </>
  );
}
