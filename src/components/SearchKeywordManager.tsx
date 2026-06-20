"use client";

import React, { useState } from "react";
import type { SearchKeyword } from "@/types/search-keyword";

interface SearchKeywordManagerProps {
  initialKeywords: SearchKeyword[];
}

export default function SearchKeywordManager({ initialKeywords }: SearchKeywordManagerProps) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!label.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/search-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => [...prev, data.data]);
        setLabel("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/search-keywords/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.filter((k) => k.id !== id));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSetDefault(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/search-keywords/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.map((k) => ({ ...k, isDefault: k.id === id })));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="search-keyword-manager">
      <div className="search-keyword-add-row">
        <input
          type="text"
          className="search-keyword-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Add a search keyword (e.g. tranimeizle)"
          disabled={busy}
        />
        <button type="button" className="btn btn-primary btn-sm" onClick={handleAdd} disabled={busy}>
          Add
        </button>
      </div>

      <ul className="search-keyword-list">
        {keywords.map((k) => (
          <li key={k.id} className="search-keyword-list-item">
            <span className="search-keyword-label">{k.label}</span>
            <button
              type="button"
              className={`btn btn-sm ${k.isDefault ? "btn-primary" : "btn-secondary"}`}
              onClick={() => handleSetDefault(k.id)}
              disabled={busy || k.isDefault}
            >
              {k.isDefault ? "Default" : "Set default"}
            </button>
            <button
              type="button"
              className="search-keyword-remove"
              onClick={() => handleDelete(k.id)}
              disabled={busy}
              aria-label={`Remove ${k.label}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
              </svg>
            </button>
          </li>
        ))}
        {keywords.length === 0 && (
          <li className="search-keyword-empty">No keywords saved yet.</li>
        )}
      </ul>
    </div>
  );
}
