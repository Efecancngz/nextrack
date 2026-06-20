"use client";

import React from "react";
import Image from "next/image";
import type { ContentType } from "@/types/common";

export interface SearchSuggestion {
  id: string;
  title: string;
  contentType: ContentType;
  year?: number;
  coverImage?: string;
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  activeIndex: number;
  onSelect: (id: string) => void;
  onHover: (index: number) => void;
}

export default function SearchSuggestions({
  suggestions,
  activeIndex,
  onSelect,
  onHover,
}: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="search-suggestions" role="listbox">
      {suggestions.map((s, i) => (
        <button
          key={s.id}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          className={`search-suggestion-item ${i === activeIndex ? "search-suggestion-item-active" : ""}`}
          // onMouseDown (not onClick) fires before the input's onBlur closes the dropdown
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s.id);
          }}
          onMouseEnter={() => onHover(i)}
        >
          <div className="series-list-thumb">
            {s.coverImage ? (
              <Image src={s.coverImage} alt={s.title} fill sizes="32px" className="series-list-thumb-img" />
            ) : (
              <div className="series-list-thumb-placeholder">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
            )}
          </div>
          <span className="search-suggestion-title">{s.title}</span>
          {s.year && <span className="search-suggestion-year">{s.year}</span>}
        </button>
      ))}
    </div>
  );
}
