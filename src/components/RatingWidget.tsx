"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface RatingWidgetProps {
  itemId: string;
  initialRating: { score: number; review: string | null } | null;
  isSignedIn: boolean;
}

export default function RatingWidget({ itemId, initialRating, isSignedIn }: RatingWidgetProps) {
  const router = useRouter();
  const [score, setScore] = useState(initialRating?.score ?? 0);
  const [review, setReview] = useState(initialRating?.review ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) return null;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/rating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, review: review || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to save rating");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Failed to save rating");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="detail-rating-widget">
      <h2 className="detail-section-title">Your Rating</h2>
      <div className="detail-rating-input-row">
        <select
          className="detail-rating-select"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
        >
          <option value={0}>Select a score</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving || score < 1}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <textarea
        className="detail-rating-review"
        placeholder="Optional review..."
        value={review}
        onChange={(e) => setReview(e.target.value)}
        maxLength={2000}
      />
      {saved && <p className="detail-rating-saved">Saved!</p>}
      {error && <p className="detail-add-error">{error}</p>}
    </div>
  );
}
