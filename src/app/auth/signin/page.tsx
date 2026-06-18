"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password");
      return;
    }

    router.push(searchParams.get("callbackUrl") || "/");
  }

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

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <button
          type="button"
          className="btn btn-secondary auth-submit"
          onClick={() => signIn("google", { callbackUrl: searchParams.get("callbackUrl") || "/" })}
        >
          Continue with Google
        </button>

        <div className="auth-footer">
          <p>Don&apos;t have an account? <Link href="/auth/signup" className="auth-link">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}
