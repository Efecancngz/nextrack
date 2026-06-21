"use client";

import React, { useState } from "react";
import { TRACKING_STATUS_LABELS, type TrackingStatus, type UserItemEntry } from "@/types/user-item";
import UserItemCard from "./UserItemCard";
import UserItemRow from "./UserItemRow";

const TABS: { value: "ALL" | TrackingStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: TRACKING_STATUS_LABELS.ACTIVE },
  { value: "PLANNED", label: TRACKING_STATUS_LABELS.PLANNED },
  { value: "COMPLETED", label: TRACKING_STATUS_LABELS.COMPLETED },
  { value: "PAUSED", label: TRACKING_STATUS_LABELS.PAUSED },
  { value: "DROPPED", label: TRACKING_STATUS_LABELS.DROPPED },
];

interface TrackingBoardProps {
  initialEntries: UserItemEntry[];
}

export default function TrackingBoard({ initialEntries }: TrackingBoardProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [tab, setTab] = useState<"ALL" | TrackingStatus>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    try {
      const stored = window.localStorage.getItem("my-items-view-mode");
      if (stored === "grid" || stored === "list") return stored;
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — keep default "grid"
    }
    return "grid";
  });

  function handleViewModeChange(mode: "grid" | "list") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("my-items-view-mode", mode);
    } catch {
      // localStorage unavailable — preference just won't persist this session
    }
  }

  const visible = entries.filter((e) => tab === "ALL" || e.status === tab);

  function handleRemoved(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleUpdated(updated: UserItemEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  return (
    <div>
      <div className="explore-toolbar">
        <div className="explore-tabs" role="tablist">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={`explore-tab ${tab === value ? "explore-tab-active" : ""}`}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="explore-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "grid" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("grid")}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "list" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("list")}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="explore-empty">
          <p>No items in this status yet.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="series-grid">
          {visible.map((entry) => (
            <UserItemCard key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      ) : (
        <div className="library-list">
          {visible.map((entry) => (
            <UserItemRow key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}
