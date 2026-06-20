"use client";

import React from "react";
import type { ContentStatus } from "@/types/common";

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "HIATUS", label: "Hiatus" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "UPCOMING", label: "Upcoming" },
];

interface ExploreFiltersProps {
  availableGenres: string[];
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
  selectedStatuses: ContentStatus[];
  onToggleStatus: (status: ContentStatus) => void;
  yearMin: string;
  yearMax: string;
  onYearMinChange: (value: string) => void;
  onYearMaxChange: (value: string) => void;
  active: boolean;
  onClear: () => void;
}

export default function ExploreFilters({
  availableGenres,
  selectedGenres,
  onToggleGenre,
  selectedStatuses,
  onToggleStatus,
  yearMin,
  yearMax,
  onYearMinChange,
  onYearMaxChange,
  active,
  onClear,
}: ExploreFiltersProps) {
  return (
    <div className="explore-filters">
      {availableGenres.length > 0 && (
        <div className="explore-filter-group">
          <span className="explore-filter-label">Genre</span>
          <div className="explore-filter-chips">
            {availableGenres.map((genre) => (
              <button
                key={genre}
                type="button"
                className={`explore-filter-chip ${selectedGenres.includes(genre) ? "explore-filter-chip-active" : ""}`}
                onClick={() => onToggleGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="explore-filter-group">
        <span className="explore-filter-label">Status</span>
        <div className="explore-filter-chips">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`explore-filter-chip ${selectedStatuses.includes(value) ? "explore-filter-chip-active" : ""}`}
              onClick={() => onToggleStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-filter-group">
        <span className="explore-filter-label">Year</span>
        <div className="explore-filter-year-inputs">
          <input
            type="number"
            inputMode="numeric"
            placeholder="From"
            className="explore-filter-year-input"
            value={yearMin}
            onChange={(e) => onYearMinChange(e.target.value)}
          />
          <span>–</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="To"
            className="explore-filter-year-input"
            value={yearMax}
            onChange={(e) => onYearMaxChange(e.target.value)}
          />
        </div>
      </div>

      {active && (
        <button type="button" className="explore-filter-clear" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
