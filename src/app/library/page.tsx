import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Library",
  description: "Your personal series tracking library",
};

export default function LibraryPage() {
  return (
    <div className="container-content page-enter library-page">
      <div className="library-header">
        <h1 className="library-title">My Library</h1>
      </div>

      {/* Empty state — no auth / no DB yet */}
      <div className="library-empty">
        <div className="library-empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            <path d="m9 10 2 2 4-4"/>
          </svg>
        </div>
        <h2 className="library-empty-title">Your library is empty</h2>
        <p className="library-empty-text">
          Start by exploring series and adding them to your watchlist.
          Sign in to save your progress across devices.
        </p>
        <div className="library-empty-actions">
          <Link href="/explore" className="btn btn-primary">
            Browse Catalogue
          </Link>
          <Link href="/auth/signin" className="btn btn-secondary">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
