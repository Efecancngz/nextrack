"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SetUsernamePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.username) {
      router.push("/");
    }
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleaned = username.trim().toLowerCase();

    // Client-side quick check
    if (cleaned.length < 3 || cleaned.length > 20) {
      setError("Username must be between 3 and 20 characters");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleaned)) {
      setError("Username can only contain lowercase letters, numbers, and underscores");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/user/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleaned }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Failed to set username");
        setLoading(false);
        return;
      }

      // Update the active session client-side to propagate the new username
      await update({ username: cleaned });

      // Redirect home
      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="auth-page">
        <div className="auth-card flex flex-col items-center justify-center p-8">
          <p className="text-secondary font-medium">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-logo">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="7" height="10" rx="1" fill="currentColor" opacity="0.9"/>
              <rect x="11" y="2" width="7" height="6" rx="1" fill="currentColor" opacity="0.6"/>
              <rect x="11" y="10" width="7" height="8" rx="1" fill="currentColor" opacity="0.4"/>
              <rect x="2" y="14" width="7" height="4" rx="1" fill="currentColor" opacity="0.6"/>
            </svg>
          </div>
          <h1 className="auth-title">Choose your username</h1>
          <p className="auth-subtitle">Please select a unique username for your profile</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="username" className="auth-label">Username</label>
            <input
              id="username"
              type="text"
              className="input text-lowercase"
              placeholder="e.g. johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              autoFocus
              disabled={loading}
            />
            <p className="auth-notice mt-2 text-xs opacity-75">
              3 to 20 characters. Lowercase letters, numbers, and underscores only.
            </p>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Saving..." : "Save and Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
