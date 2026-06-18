"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LIBRARY_STATUS_LABELS, type LibraryStatus } from "@/types/common";

const STATUS_OPTIONS: LibraryStatus[] = [
  "WATCHING",
  "PLAN_TO_WATCH",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];

interface AddToLibraryButtonProps {
  compoundId: string;
  initialItem: { id: string; status: LibraryStatus } | null;
  isSignedIn: boolean;
}

export default function AddToLibraryButton({
  compoundId,
  initialItem,
  isSignedIn,
}: AddToLibraryButtonProps) {
  const router = useRouter();
  const [item, setItem] = useState(initialItem);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(status: LibraryStatus) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: compoundId, status }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to add to library");
        return;
      }
      setItem({ id: data.data.id, status: data.data.status });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to add to library");
    } finally {
      setLoading(false);
    }
  }

  if (!isSignedIn) {
    return (
      <a href="/auth/signin" className="btn btn-primary detail-add-btn">
        Sign in to add to library
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
        {item ? `In Library: ${LIBRARY_STATUS_LABELS[item.status]}` : "Add to Library"}
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
              {LIBRARY_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      )}
      {error && <p className="detail-add-error">{error}</p>}
    </div>
  );
}
