"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ItemCard from "@/components/ItemCard";
import ItemListRow from "@/components/ItemListRow";
import BrowseSuggestions, { type BrowseSuggestion } from "@/components/BrowseSuggestions";
import BrowseFilters from "@/components/BrowseFilters";
import type { ItemCard as ItemCardData, ItemCategory, ItemStatus } from "@/types/item";

export default function BrowsePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const router = useRouter();
  const [suggestions, setSuggestionsState] = useState<BrowseSuggestion[]>([]);
  const suggestionsRef = useRef<BrowseSuggestion[]>([]);
  const setSuggestions = useCallback((next: BrowseSuggestion[]) => {
    suggestionsRef.current = next;
    setSuggestionsState(next);
  }, []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestRequestIdRef = useRef(0);
  const [selectedCategories, setSelectedCategories] = useState<ItemCategory[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<ItemStatus[]>([]);

  const filtersActive = selectedCategories.length > 0 || selectedStatuses.length > 0;

  function toggleCategory(category: ItemCategory) {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  }

  function toggleStatus(status: ItemStatus) {
    setSelectedStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  }

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedStatuses([]);
  }

  type SortOption = "relevance" | "rating";
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  const sortedResults = sortBy === "relevance"
    ? results
    : [...results].sort((a, b) => (b.ratingExternal ?? -1) - (a.ratingExternal ?? -1));

  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    try {
      const stored = window.localStorage.getItem("browse-view-mode");
      if (stored === "grid" || stored === "list") return stored;
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — keep default "grid"
    }
    return "grid";
  });

  function handleViewModeChange(mode: "grid" | "list") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("browse-view-mode", mode);
    } catch {
      // localStorage unavailable — preference just won't persist this session
    }
  }

  const buildQuery = useCallback((q: string, categories: ItemCategory[], statuses: ItemStatus[]) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    // /api/items accepts one category/status value — use the first selected filter chip
    if (categories.length > 0) params.set("category", categories[0]);
    if (statuses.length > 0) params.set("status", statuses[0]);
    return params.toString();
  }, []);

  const search = useCallback(async (q: string, categories: ItemCategory[], statuses: ItemStatus[]) => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/items?${buildQuery(q, categories, statuses)}`);
      const data = await res.json();
      if (requestIdRef.current !== requestId) return;
      setResults(data.success ? data.data : []);
    } catch {
      if (requestIdRef.current !== requestId) return;
      setResults([]);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [buildQuery]);

  function handleSuggestionSelect(id: string) {
    setShowSuggestions(false);
    router.push(`/items/${id}`);
  }

  function handleSearchInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[activeSuggestionIndex].id);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  // Debounced search — fires on query OR filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(query, selectedCategories, selectedStatuses);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedCategories, selectedStatuses, search]);

  // Debounced autocomplete suggestions
  useEffect(() => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);

    if (query.length < 2) {
      if (suggestionsRef.current.length > 0) setSuggestions([]);
      return;
    }

    suggestDebounceRef.current = setTimeout(async () => {
      const requestId = ++suggestRequestIdRef.current;
      try {
        const res = await fetch(`/api/items/suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (suggestRequestIdRef.current !== requestId) return;
        setSuggestions(data.success ? data.data : []);
        setActiveSuggestionIndex(-1);
      } catch {
        if (suggestRequestIdRef.current === requestId) setSuggestions([]);
      }
    }, 200);

    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [query, setSuggestions]);

  return (
    <div className="container-content page-enter explore-page">
      <div className="explore-header">
        <h1 className="explore-title">Browse</h1>
        <p className="explore-subtitle">Search and filter items by category and status</p>
      </div>

      <div className="explore-search-bar">
        <svg className="explore-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          id="search-input"
          type="text"
          className="explore-search-input"
          placeholder="Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setShowSuggestions(false)}
          onKeyDown={handleSearchInputKeyDown}
          autoFocus
        />
        {query && (
          <button
            className="explore-search-clear"
            onClick={() => {
              requestIdRef.current++;
              suggestRequestIdRef.current++;
              setQuery("");
              setResults([]);
              setSearched(false);
              setSuggestions([]);
              setShowSuggestions(false);
            }}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
        {showSuggestions && (
          <BrowseSuggestions
            suggestions={suggestions}
            activeIndex={activeSuggestionIndex}
            onSelect={handleSuggestionSelect}
            onHover={setActiveSuggestionIndex}
          />
        )}
      </div>

      <div className="explore-toolbar">
        <select
          className="explore-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          aria-label="Sort results"
        >
          <option value="relevance">Relevance</option>
          <option value="rating">Rating</option>
        </select>

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

      <BrowseFilters
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        selectedStatuses={selectedStatuses}
        onToggleStatus={toggleStatus}
        active={filtersActive}
        onClear={clearFilters}
      />

      <div className="explore-results">
        {loading ? (
          <div className="series-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="poster-card skeleton" />
            ))}
          </div>
        ) : results.length > 0 ? (
          viewMode === "grid" ? (
            <div className="series-grid">
              {sortedResults.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="series-list">
              {sortedResults.map((item) => (
                <ItemListRow key={item.id} item={item} />
              ))}
            </div>
          )
        ) : searched ? (
          <div className="explore-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <p>No items found</p>
            <span>Try a different search term or filter</span>
          </div>
        ) : (
          <div className="explore-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <p>Start typing to search, or pick a filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
