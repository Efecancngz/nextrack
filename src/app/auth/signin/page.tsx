"use client";

import React from "react";
import Link from "next/link";


export default function SignInPage() {
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
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your account to continue tracking</p>
        </div>

        {/* Email/Password form (placeholder) */}
        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
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
              placeholder="••••••••"
              required
              disabled
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled>
            Sign In
          </button>
        </form>

        <p className="auth-notice">
          Authentication requires a database connection. <br/>
          Please set up Neon PostgreSQL to enable sign in.
        </p>

        <div className="auth-footer">
          <p>Don&apos;t have an account? <Link href="/auth/signup" className="auth-link">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}
