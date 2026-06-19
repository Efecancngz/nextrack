"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const NAV_LINKS = [
  { href: "/explore", label: "Browse" },
  { href: "/library", label: "My List" },
  { href: "/calendar", label: "Calendar" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <header className="navbar-glass navbar">
      <div className="container-content navbar-inner">
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="7" height="10" rx="1" fill="currentColor" opacity="0.9"/>
            <rect x="11" y="2" width="7" height="6" rx="1" fill="currentColor" opacity="0.6"/>
            <rect x="11" y="10" width="7" height="8" rx="1" fill="currentColor" opacity="0.4"/>
            <rect x="2" y="14" width="7" height="4" rx="1" fill="currentColor" opacity="0.6"/>
          </svg>
          <span>Serie Tracker</span>
        </Link>

        {/* Desktop nav */}
        <nav className="navbar-links" aria-label="Primary navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`navbar-link ${pathname === href ? "navbar-link-active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth buttons */}
        <div className="navbar-auth">
          {session?.user ? (
            <>
              {session.user.username ? (
                <Link href={`/profile/${session.user.username}`} className="navbar-user-email">
                  @{session.user.username}
                </Link>
              ) : (
                <span className="navbar-user-email">{session.user.name || session.user.email}</span>
              )}
              <button onClick={() => signOut()} className="btn btn-secondary btn-sm">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="btn btn-secondary btn-sm">
                Sign in
              </Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm navbar-cta">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            {mobileOpen ? (
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            ) : (
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="navbar-mobile-menu">
          <nav className="navbar-mobile-links">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`navbar-mobile-link ${pathname === href ? "navbar-link-active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="navbar-mobile-auth">
              {session?.user ? (
                <>
                  {session.user.username ? (
                    <Link
                      href={`/profile/${session.user.username}`}
                      className="navbar-user-email block mb-2 text-sm opacity-75"
                      onClick={() => setMobileOpen(false)}
                    >
                      @{session.user.username}
                    </Link>
                  ) : (
                    <span className="navbar-user-email block mb-2 text-sm opacity-75">
                      {session.user.name || session.user.email}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      signOut();
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className="btn btn-secondary btn-sm" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                  <Link href="/auth/signup" className="btn btn-primary btn-sm" onClick={() => setMobileOpen(false)}>
                    Get started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
