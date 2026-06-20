"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LIBRARY_STATUS_BADGE_CLASS, LIBRARY_STATUS_LABELS, type LibraryStatus } from "@/types/common";
import type { LibraryEntry } from "@/types/library";
import RedirectButton from "@/components/RedirectButton";

const STATUS_OPTIONS: LibraryStatus[] = [
  "WATCHING",
  "PLAN_TO_WATCH",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];

interface LibraryItemRowProps {
  entry: LibraryEntry;
  onRemoved: (id: string) => void;
  onUpdated: (entry: LibraryEntry) => void;
}

function getProgressField(
  entry: LibraryEntry
): { key: "currentEpisode" | "currentChapter"; value: number; label: string } | null {
  if (entry.series.totalEpisodes != null || entry.currentEpisode != null) {
    return { key: "currentEpisode", value: entry.currentEpisode ?? 0, label: "episode" };
  }
  if (entry.series.totalChapters != null || entry.currentChapter != null) {
    return { key: "currentChapter", value: entry.currentChapter ?? 0, label: "chapter" };
  }
  return null;
}

export default function LibraryItemRow({ entry, onRemoved, onUpdated }: LibraryItemRowProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const href = `/series/${entry.series.source}-${entry.series.externalId}`;
  const progress = getProgressField(entry);

  async function handleIncrement() {
    if (!progress) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [progress.key]: progress.value + 1 }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, [progress.key]: progress.value + 1 });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onRemoved(entry.id);
      }
    } finally {
      setBusy(false);
      setConfirmingRemove(false);
    }
  }

  async function handleStatusChange(newStatus: LibraryStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, status: newStatus });
      }
    } finally {
      setBusy(false);
      setStatusMenuOpen(false);
    }
  }

  async function handleToggleFavorite() {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !entry.isFavorite }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, isFavorite: !entry.isFavorite });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSetWaitLanguage(next: string | null) {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitLanguage: next }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, waitLanguage: next });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="library-list-row">
      <Link href={href} className="library-list-row-link">
        <div className="series-list-thumb">
          {entry.series.coverImage ? (
            <Image
              src={entry.series.coverImage}
              alt={entry.series.title}
              fill
              sizes="48px"
              className="series-list-thumb-img"
            />
          ) : (
            <div className="series-list-thumb-placeholder">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="m21 15-5-5L5 21"/>
              </svg>
            </div>
          )}
        </div>
        <div className="series-list-info">
          <h3 className="series-list-title">{entry.series.title}</h3>
        </div>
      </Link>

      <div className="library-row-status-wrapper">
        <button
          type="button"
          className={`badge ${LIBRARY_STATUS_BADGE_CLASS[entry.status]} library-status-badge`}
          onClick={() => setStatusMenuOpen((o) => !o)}
          disabled={busy}
        >
          {LIBRARY_STATUS_LABELS[entry.status]}
        </button>
        {statusMenuOpen && (
          <div className="library-status-menu" role="menu">
            {STATUS_OPTIONS.filter((s) => s !== entry.status).map((status) => (
              <button
                key={status}
                type="button"
                role="menuitem"
                className="library-status-menu-item"
                onClick={() => handleStatusChange(status)}
                disabled={busy}
              >
                {LIBRARY_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="library-row-actions">
        {progress && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleIncrement}
            disabled={busy}
          >
            +1 {progress.label} ({progress.value})
          </button>
        )}
        <button
          type="button"
          className={`library-card-favorite ${entry.isFavorite ? "library-card-favorite-active" : ""}`}
          onClick={handleToggleFavorite}
          disabled={busy}
          aria-label={entry.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={entry.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
        <RedirectButton
          title={entry.series.title}
          progress={progress ? { label: progress.label as "episode" | "chapter", value: progress.value } : null}
          variant="compact"
        />
        {entry.series.source === "mangadex" && (
          <select
            className="library-card-language-select"
            value={entry.waitLanguage ?? ""}
            onChange={(e) => handleSetWaitLanguage(e.target.value || null)}
            disabled={busy}
            aria-label="Wait for language"
          >
            <option value="">No language wait</option>
            <option value="EN">Wait: English</option>
            <option value="TR">Wait: Turkish</option>
          </select>
        )}
        {confirmingRemove ? (
          <div className="library-card-confirm">
            <span>Remove?</span>
            <button type="button" className="btn btn-sm btn-danger" onClick={handleRemove} disabled={busy}>
              Yes
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setConfirmingRemove(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="library-card-remove"
            onClick={() => setConfirmingRemove(true)}
            disabled={busy}
            aria-label="Remove from library"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}
