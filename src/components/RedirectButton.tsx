"use client";

import React, { useState, useEffect } from "react";
import { buildRedirectUrl } from "@/lib/redirect-url";
import type { SearchKeyword } from "@/types/search-keyword";

interface RedirectButtonProps {
  title: string;
  progress?: { label: "episode" | "chapter"; value: number } | null;
  variant: "full" | "compact";
}

export default function RedirectButton({ title, progress, variant }: RedirectButtonProps) {
  const [keywords, setKeywords] = useState<SearchKeyword[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/search-keywords")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        const list: SearchKeyword[] = data.data;
        setKeywords(list);
        const defaultKeyword = list.find((k) => k.isDefault);
        if (defaultKeyword) setSelectedId(defaultKeyword.id);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOpen(keywordLabel: string | null) {
    const url = buildRedirectUrl({ title, progress, keyword: keywordLabel });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (variant === "compact") {
    const defaultKeyword = keywords.find((k) => k.id === selectedId)?.label ?? null;
    return (
      <button
        type="button"
        className="redirect-button-compact"
        onClick={() => handleOpen(defaultKeyword)}
        aria-label="Search for this series"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>
    );
  }

  return (
    <div className="redirect-button-full">
      {keywords.length > 0 && (
        <select
          className="redirect-button-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label="Search keyword"
        >
          {keywords.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => handleOpen(keywords.find((k) => k.id === selectedId)?.label ?? null)}
      >
        Search
      </button>
    </div>
  );
}
