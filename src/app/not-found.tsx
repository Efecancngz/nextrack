import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-content page-enter">
      <div className="error-page">
        <span className="error-code">404</span>
        <h1 className="error-title">Page not found</h1>
        <p className="error-text">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="error-actions">
          <Link href="/" className="btn btn-primary">Go Home</Link>
          <Link href="/explore" className="btn btn-secondary">Browse Series</Link>
        </div>
      </div>
    </div>
  );
}
