"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import SeriesCard from "@/components/SeriesCard";
import SeriesListRow from "@/components/SeriesListRow";
import SearchSuggestions, { type SearchSuggestion } from "@/components/SearchSuggestions";
import ExploreFilters from "@/components/ExploreFilters";
import type { SearchResult } from "@/types/series";
import type { ContentStatus } from "@/types/common";

const CONTENT_TABS = [
  { value: "all",   label: "All" },
  { value: "tv",    label: "TV Series" },
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
] as const;

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const router = useRouter();
  const [suggestions, setSuggestionsState] = useState<SearchSuggestion[]>([]);
  const suggestionsRef = useRef<SearchSuggestion[]>([]);
  const setSuggestions = useCallback((next: SearchSuggestion[]) => {
    suggestionsRef.current = next;
    setSuggestionsState(next);
  }, []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestRequestIdRef = useRef(0);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<ContentStatus[]>([]);
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => r.genres.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [results]);

  const filtersActive =
    selectedGenres.length > 0 || selectedStatuses.length > 0 || yearMin !== "" || yearMax !== "";

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      if (selectedGenres.length > 0 && !selectedGenres.some((g) => item.genres.includes(g))) {
        return false;
      }
      if (selectedStatuses.length > 0 && item.source !== "tmdb" && !selectedStatuses.includes(item.status)) {
        return false;
      }
      if (yearMin && item.year !== undefined && item.year < Number(yearMin)) return false;
      if (yearMax && item.year !== undefined && item.year > Number(yearMax)) return false;
      return true;
    });
  }, [results, selectedGenres, selectedStatuses, yearMin, yearMax]);

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  }

  function toggleStatus(status: ContentStatus) {
    setSelectedStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  }

  function clearFilters() {
    setSelectedGenres([]);
    setSelectedStatuses([]);
    setYearMin("");
    setYearMax("");
  }

  type SortOption = "relevance" | "rating" | "year" | "popularity";
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  const sortedResults = useMemo(() => {
    if (sortBy === "relevance") return filteredResults;
    const sorted = [...filteredResults];
    sorted.sort((a, b) => {
      if (sortBy === "rating") return (b.ratingExternal ?? -1) - (a.ratingExternal ?? -1);
      if (sortBy === "year") return (b.year ?? -1) - (a.year ?? -1);
      return (b.popularity ?? -1) - (a.popularity ?? -1);
    });
    return sorted;
  }, [filteredResults, sortBy]);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    try {
      const stored = window.localStorage.getItem("explore-view-mode");
      if (stored === "grid" || stored === "list") return stored;
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — keep default "grid"
    }
    return "grid";
  });

  function handleViewModeChange(mode: "grid" | "list") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("explore-view-mode", mode);
    } catch {
      // localStorage unavailable — preference just won't persist this session
    }
  }

  const search = useCallback(async (q: string, t: string) => {
    // Bump the request generation so any in-flight load-more fetch from a
    // previous search becomes stale and discards its response on arrival.
    const requestId = ++requestIdRef.current;

    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setPage(1);
      setTotal(0);
      return;
    }

    setLoading(true);
    setSearched(true);
    setLoadMoreError(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${t}&page=1`);
      const data = await res.json();
      if (requestIdRef.current !== requestId) return;
      if (data.success) {
        setResults(data.data.results || []);
        setTotal(data.data.total || 0);
        setPage(1);
      } else {
        setResults([]);
        setTotal(0);
      }
    } catch {
      if (requestIdRef.current !== requestId) return;
      setResults([]);
      setTotal(0);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, []);

  function handleSuggestionSelect(id: string) {
    setShowSuggestions(false);
    router.push(`/series/${id}`);
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

  async function handleLoadMore() {
    if (loadingMore) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    const nextPage = page + 1;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}&page=${nextPage}`);
      const data = await res.json();
      if (requestIdRef.current !== requestId) return;
      if (data.success) {
        setResults((prev) => [...prev, ...(data.data.results || [])]);
        setPage(nextPage);
      } else {
        setLoadMoreError(data.error || "Failed to load more results");
      }
    } catch {
      if (requestIdRef.current === requestId) setLoadMoreError("Failed to load more results");
    } finally {
      // Always release the loading flag, even if a newer search superseded
      // this request — otherwise the button stays disabled forever.
      setLoadingMore(false);
    }
  }

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(query, type);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, type, search]);

  // Debounced autocomplete suggestions (shorter delay, lighter payload than the main search)
  useEffect(() => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);

    if (query.length < 2) {
      if (suggestionsRef.current.length > 0) setSuggestions([]);
      return;
    }

    suggestDebounceRef.current = setTimeout(async () => {
      const requestId = ++suggestRequestIdRef.current;
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}&type=${type}`);
        const data = await res.json();
        if (suggestRequestIdRef.current !== requestId) return;
        setSuggestions(data.success ? data.data.suggestions : []);
        setActiveSuggestionIndex(-1);
      } catch {
        if (suggestRequestIdRef.current === requestId) setSuggestions([]);
      }
    }, 200);

    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [query, type, setSuggestions]);

  // Read initial query from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlQ = params.get("q");
    const urlType = params.get("type");
    Promise.resolve().then(() => {
      if (urlQ) setQuery(urlQ);
      if (urlType && CONTENT_TABS.some(t => t.value === urlType)) setType(urlType);
    });
  }, []);

  return (
    <div className="container-content page-enter explore-page">
      {/* Search header */}
      <div className="explore-header">
        <h1 className="explore-title">Explore</h1>
        <p className="explore-subtitle">Search across TV series, anime, manga, and more</p>
      </div>

      {/* Search bar */}
      <div className="explore-search-bar">
        <svg className="explore-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          id="search-input"
          type="text"
          className="explore-search-input"
          placeholder="Search for a series, anime, manga..."
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
              setPage(1);
              setTotal(0);
              setLoadMoreError(null);
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
          <SearchSuggestions
            suggestions={suggestions}
            activeIndex={activeSuggestionIndex}
            onSelect={handleSuggestionSelect}
            onHover={setActiveSuggestionIndex}
          />
        )}
      </div>

      {/* Content type tabs + view toggle */}
      <div className="explore-toolbar">
        <div className="explore-tabs" role="tablist">
          {CONTENT_TABS.map(({ value, label }) => (
            <button
              key={value}
              role="tab"
              aria-selected={type === value}
              className={`explore-tab ${type === value ? "explore-tab-active" : ""}`}
              onClick={() => setType(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          className="explore-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          aria-label="Sort results"
        >
          <option value="relevance">Relevance</option>
          <option value="rating">Rating</option>
          <option value="year">Year (newest)</option>
          <option value="popularity">Popularity</option>
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

      {/* Filters */}
      {results.length > 0 && (
        <ExploreFilters
          availableGenres={availableGenres}
          selectedGenres={selectedGenres}
          onToggleGenre={toggleGenre}
          selectedStatuses={selectedStatuses}
          onToggleStatus={toggleStatus}
          yearMin={yearMin}
          yearMax={yearMax}
          onYearMinChange={setYearMin}
          onYearMaxChange={setYearMax}
          active={filtersActive}
          onClear={clearFilters}
        />
      )}

      {/* Results */}
      <div className="explore-results">
        {loading ? (
          <div className="series-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="poster-card skeleton" />
            ))}
          </div>
        ) : results.length > 0 ? (
          filteredResults.length > 0 ? (
            <>
              {filtersActive && (
                <p className="explore-filter-summary">
                  Showing {sortedResults.length} of {results.length} loaded results
                </p>
              )}
              {viewMode === "grid" ? (
                <div className="series-grid">
                  {sortedResults.map((item) => (
                    <SeriesCard key={`${item.source}-${item.externalId}`} series={item} />
                  ))}
                </div>
              ) : (
                <div className="series-list">
                  {sortedResults.map((item) => (
                    <SeriesListRow key={`${item.source}-${item.externalId}`} series={item} />
                  ))}
                </div>
              )}

              {results.length < total && (
                <div className="explore-load-more">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                  {loadMoreError && (
                    <p className="explore-load-more-error">{loadMoreError}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="explore-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <p>No results match your filters</p>
              <span>Try removing a filter or widening the year range</span>
            </div>
          )
        ) : searched ? (
          <div className="explore-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <p>No results found for &ldquo;{query}&rdquo;</p>
            <span>Try a different search term or content type</span>
          </div>
        ) : (
          <div className="explore-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <p>Start typing to search</p>
            <span>Search across TMDB, AniList, MangaDex, and more</span>
          </div>
        )}
      </div>
    </div>
  );
}
