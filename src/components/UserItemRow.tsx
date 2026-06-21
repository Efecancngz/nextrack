"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  TRACKING_STATUS_BADGE_CLASS,
  TRACKING_STATUS_LABELS,
  type TrackingStatus,
  type UserItemEntry,
} from "@/types/user-item";

const STATUS_OPTIONS: TrackingStatus[] = [
  "ACTIVE",
  "PLANNED",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
];

interface UserItemRowProps {
  entry: UserItemEntry;
  onRemoved: (id: string) => void;
  onUpdated: (entry: UserItemEntry) => void;
}

export default function UserItemRow({ entry, onRemoved, onUpdated }: UserItemRowProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const href = `/items/${entry.item.id}`;
  const progress = entry.progress ?? 0;

  async function handleIncrement() {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: progress + 1 }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, progress: progress + 1 });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onRemoved(entry.id);
      }
    } finally {
      setBusy(false);
      setConfirmingRemove(false);
    }
  }

  async function handleStatusChange(newStatus: TrackingStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, {
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
      const res = await fetch(`/api/user-items/${entry.id}`, {
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

  return (
    <article className="library-list-row">
      <Link href={href} className="library-list-row-link">
        <div className="series-list-thumb">
          {entry.item.coverImage ? (
            <Image
              src={entry.item.coverImage}
              alt={entry.item.title}
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
          <h3 className="series-list-title">{entry.item.title}</h3>
        </div>
      </Link>

      <div className="library-row-status-wrapper">
        <button
          type="button"
          className={`badge ${TRACKING_STATUS_BADGE_CLASS[entry.status]} library-status-badge`}
          onClick={() => setStatusMenuOpen((o) => !o)}
          disabled={busy}
        >
          {TRACKING_STATUS_LABELS[entry.status]}
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
                {TRACKING_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="library-row-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleIncrement}
          disabled={busy}
        >
          +1 unit ({progress})
        </button>
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
            aria-label="Remove from tracking"
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
