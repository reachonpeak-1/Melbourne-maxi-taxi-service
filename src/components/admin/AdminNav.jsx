'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

const links = [
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
        <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
      </svg>
    ),
  },
  {
    href: '/admin/leads',
    label: 'Leads',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/admin/map',
    label: 'Visitor Map',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Top Header Bar */}
      <header className="admin-mobile-header">
        <div className="admin-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <img src="/assets/logo-white.webp" alt="MelbourneMaxiTaxi" style={{ height: '32px', width: 'auto' }} />
          <span className="admin-nav-tag">Admin</span>
        </div>
        <button className="admin-mobile-toggle" onClick={toggleMenu} aria-label="Toggle Menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
            {isOpen ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </header>

      {/* Backdrop for mobile navigation */}
      {isOpen && <div className="admin-nav-backdrop" onClick={closeMenu} />}

      {/* Navigation Sidebar */}
      <aside className={`admin-nav${isOpen ? ' open' : ''}`}>
        <div className="admin-nav-logo" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          <img src="/assets/logo-white.webp" alt="MelbourneMaxiTaxi" style={{ height: '40px', width: 'auto', marginBottom: 4 }} />
          <span className="admin-nav-tag">Admin</span>
        </div>
        <nav className="admin-nav-links">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className={`admin-nav-link${pathname === link.href || pathname.startsWith(link.href) ? ' active' : ''}`}
            >
              {link.icon}
              {link.label}
            </a>
          ))}
        </nav>
        <button className="admin-signout-btn" onClick={handleSignOut}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </aside>
    </>
  );
}
