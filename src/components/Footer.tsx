import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-content footer-inner">
        <div className="footer-brand">
          <Link href="/" className="footer-logo">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="7" height="10" rx="1" fill="currentColor" opacity="0.9"/>
              <rect x="11" y="2" width="7" height="6" rx="1" fill="currentColor" opacity="0.6"/>
              <rect x="11" y="10" width="7" height="8" rx="1" fill="currentColor" opacity="0.4"/>
              <rect x="2" y="14" width="7" height="4" rx="1" fill="currentColor" opacity="0.6"/>
            </svg>
            <span>Serie Tracker</span>
          </Link>
          <p className="footer-tagline">Track every series. Know where to watch.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4 className="footer-col-title">Navigate</h4>
            <Link href="/browse" className="footer-link">Browse</Link>
            <Link href="/my-items" className="footer-link">My Items</Link>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">Data Sources</h4>
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="footer-link">TMDB</a>
            <a href="https://anilist.co" target="_blank" rel="noopener noreferrer" className="footer-link">AniList</a>
            <a href="https://mangadex.org" target="_blank" rel="noopener noreferrer" className="footer-link">MangaDex</a>
            <a href="https://myanimelist.net" target="_blank" rel="noopener noreferrer" className="footer-link">MyAnimeList</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Free Serie Tracker. Not affiliated with any streaming platform.</p>
        </div>
      </div>
    </footer>
  );
}
