"use client";

import React, { useState } from "react";
import { LIBRARY_STATUS_LABELS, type LibraryStatus } from "@/types/common";
import type { LibraryEntry } from "@/types/library";
import LibraryItemCard from "./LibraryItemCard";

const TABS: { value: "ALL" | LibraryStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "WATCHING", label: LIBRARY_STATUS_LABELS.WATCHING },
  { value: "PLAN_TO_WATCH", label: LIBRARY_STATUS_LABELS.PLAN_TO_WATCH },
  { value: "COMPLETED", label: LIBRARY_STATUS_LABELS.COMPLETED },
  { value: "ON_HOLD", label: LIBRARY_STATUS_LABELS.ON_HOLD },
  { value: "DROPPED", label: LIBRARY_STATUS_LABELS.DROPPED },
];

interface LibraryBoardProps {
  initialEntries: LibraryEntry[];
}

export default function LibraryBoard({ initialEntries }: LibraryBoardProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [tab, setTab] = useState<"ALL" | LibraryStatus>("ALL");

  const visible = tab === "ALL" ? entries : entries.filter((e) => e.status === tab);

  function handleRemoved(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleUpdated(updated: LibraryEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  return (
    <div>
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

      {visible.length === 0 ? (
        <div className="explore-empty">
          <p>No series in this status yet.</p>
        </div>
      ) : (
        <div className="series-grid">
          {visible.map((entry) => (
            <LibraryItemCard key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}
