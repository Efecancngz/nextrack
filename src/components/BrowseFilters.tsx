"use client";

import React from "react";
import { ITEM_CATEGORY_LABELS, ITEM_STATUS_LABELS, type ItemCategory, type ItemStatus } from "@/types/item";

const CATEGORY_OPTIONS: ItemCategory[] = ["TYPE_A", "TYPE_B", "TYPE_C"];
const STATUS_OPTIONS: ItemStatus[] = ["ONGOING", "COMPLETED", "HIATUS", "CANCELLED", "UPCOMING"];

interface BrowseFiltersProps {
  selectedCategories: ItemCategory[];
  onToggleCategory: (category: ItemCategory) => void;
  selectedStatuses: ItemStatus[];
  onToggleStatus: (status: ItemStatus) => void;
  active: boolean;
  onClear: () => void;
}

export default function BrowseFilters({
  selectedCategories,
  onToggleCategory,
  selectedStatuses,
  onToggleStatus,
  active,
  onClear,
}: BrowseFiltersProps) {
  return (
    <div className="explore-filters">
      <div className="explore-filter-group">
        <span className="explore-filter-label">Category</span>
        <div className="explore-filter-chips">
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category}
              type="button"
              className={`explore-filter-chip ${selectedCategories.includes(category) ? "explore-filter-chip-active" : ""}`}
              onClick={() => onToggleCategory(category)}
            >
              {ITEM_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-filter-group">
        <span className="explore-filter-label">Status</span>
        <div className="explore-filter-chips">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              className={`explore-filter-chip ${selectedStatuses.includes(status) ? "explore-filter-chip-active" : ""}`}
              onClick={() => onToggleStatus(status)}
            >
              {ITEM_STATUS_LABELS[status]}
            </button>
          ))}
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
