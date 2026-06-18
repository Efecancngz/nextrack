"use client";

import React from "react";
import Link from "next/link";


export default function SignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <Link href="/" className="auth-logo">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="7" height="10" rx="1" fill="currentColor" opacity="0.9"/>
              <rect x="11" y="2" width="7" height="6" rx="1" fill="currentColor" opacity="0.6"/>
              <rect x="11" y="10" width="7" height="8" rx="1" fill="currentColor" opacity="0.4"/>
              <rect x="2" y="14" width="7" height="4" rx="1" fill="currentColor" opacity="0.6"/>
            </svg>
          </Link>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Start tracking your favorite series for free</p>
        </div>

        {/* Registration form (placeholder) */}
        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <div className="auth-field">
            <label htmlFor="name" className="auth-label">Name</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="Your name"
              required
              disabled
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              required
              disabled
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="Minimum 8 characters"
              required
              disabled
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirm" className="auth-label">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              className="input"
              placeholder="Repeat your password"
              required
              disabled
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled>
            Create Account
          </button>
        </form>

        <p className="auth-notice">
          Authentication requires a database connection. <br/>
          Please set up Neon PostgreSQL to enable registration.
        </p>

        <div className="auth-footer">
          <p>Already have an account? <Link href="/auth/signin" className="auth-link">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
