"use client";

import React, { useState } from "react";
import { LIBRARY_STATUS_LABELS, type LibraryStatus, CONTENT_TYPE_LABELS, type ContentType } from "@/types/common";
import type { LibraryEntry } from "@/types/library";
import LibraryItemCard from "./LibraryItemCard";
import LibraryItemRow from "./LibraryItemRow";

const TABS: { value: "ALL" | LibraryStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "WATCHING", label: LIBRARY_STATUS_LABELS.WATCHING },
  { value: "PLAN_TO_WATCH", label: LIBRARY_STATUS_LABELS.PLAN_TO_WATCH },
  { value: "COMPLETED", label: LIBRARY_STATUS_LABELS.COMPLETED },
  { value: "ON_HOLD", label: LIBRARY_STATUS_LABELS.ON_HOLD },
  { value: "DROPPED", label: LIBRARY_STATUS_LABELS.DROPPED },
];

const CONTENT_TYPE_TABS: { value: "ALL" | ContentType; label: string }[] = [
  { value: "ALL", label: "All Types" },
  { value: "TV_SERIES", label: CONTENT_TYPE_LABELS.TV_SERIES },
  { value: "ANIME", label: CONTENT_TYPE_LABELS.ANIME },
  { value: "MANGA", label: CONTENT_TYPE_LABELS.MANGA },
  { value: "MANHWA", label: CONTENT_TYPE_LABELS.MANHWA },
  { value: "LIGHT_NOVEL", label: CONTENT_TYPE_LABELS.LIGHT_NOVEL },
  { value: "WEBTOON", label: CONTENT_TYPE_LABELS.WEBTOON },
];

interface LibraryBoardProps {
  initialEntries: LibraryEntry[];
}

export default function LibraryBoard({ initialEntries }: LibraryBoardProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [tab, setTab] = useState<"ALL" | LibraryStatus>("ALL");
  const [contentTypeTab, setContentTypeTab] = useState<"ALL" | ContentType>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    try {
      const stored = window.localStorage.getItem("library-view-mode");
      if (stored === "grid" || stored === "list") return stored;
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — keep default "grid"
    }
    return "grid";
  });

  function handleViewModeChange(mode: "grid" | "list") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("library-view-mode", mode);
    } catch {
      // localStorage unavailable — preference just won't persist this session
    }
  }

  const visible = entries.filter(
    (e) =>
      (tab === "ALL" || e.status === tab) &&
      (contentTypeTab === "ALL" || e.series.contentType === contentTypeTab)
  );

  function handleRemoved(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleUpdated(updated: LibraryEntry) {
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

      <div className="explore-tabs library-content-tabs" role="tablist">
        {CONTENT_TYPE_TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={contentTypeTab === value}
            className={`explore-tab ${contentTypeTab === value ? "explore-tab-active" : ""}`}
            onClick={() => setContentTypeTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="explore-empty">
          <p>No series in this status yet.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="series-grid">
          {visible.map((entry) => (
            <LibraryItemCard key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      ) : (
        <div className="library-list">
          {visible.map((entry) => (
            <LibraryItemRow key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}
