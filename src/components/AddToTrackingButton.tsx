"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TRACKING_STATUS_LABELS, type TrackingStatus } from "@/types/user-item";

const STATUS_OPTIONS: TrackingStatus[] = [
  "ACTIVE",
  "PLANNED",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
];

interface AddToTrackingButtonProps {
  itemId: string;
  initialEntry: { id: string; status: TrackingStatus } | null;
  isSignedIn: boolean;
}

export default function AddToTrackingButton({
  itemId,
  initialEntry,
  isSignedIn,
}: AddToTrackingButtonProps) {
  const router = useRouter();
  const [entry, setEntry] = useState(initialEntry);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(status: TrackingStatus) {
    setLoading(true);
    setError(null);
    try {
      const res = entry
        ? await fetch(`/api/user-items/${entry.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        : await fetch("/api/user-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId, status }),
          });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to update tracking status");
        return;
      }
      setEntry({ id: data.data.id, status: data.data.status });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to update tracking status");
    } finally {
      setLoading(false);
    }
  }

  if (!isSignedIn) {
    return (
      <a href="/auth/signin" className="btn btn-primary detail-add-btn">
        Sign in to track this item
      </a>
    );
  }

  return (
    <div className="detail-add-wrapper">
      <button
        type="button"
        className="btn btn-primary detail-add-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
      >
        {entry ? `Tracking: ${TRACKING_STATUS_LABELS[entry.status]}` : "Add to Tracking"}
      </button>
      {open && (
        <div className="detail-add-menu" role="menu">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              role="menuitem"
              className="detail-add-menu-item"
              onClick={() => handlePick(status)}
              disabled={loading}
            >
              {TRACKING_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      )}
      {error && <p className="detail-add-error">{error}</p>}
    </div>
  );
}
