"use client";

import React, { useState, useRef, useEffect } from "react";

interface SeriesNoteWidgetProps {
  seriesId: string;
  initialContent: string | null;
}

export default function SeriesNoteWidget({ seriesId, initialContent }: SeriesNoteWidgetProps) {
  const [content, setContent] = useState(initialContent ?? "");
  const [saved, setSaved] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setContent(next);
    setSaved(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/notes/${seriesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
      }
    }, 500);
  }

  return (
    <div className="series-note-widget">
      <label className="series-note-widget-label" htmlFor="series-note-textarea">
        Private note
      </label>
      <textarea
        id="series-note-textarea"
        className="series-note-widget-textarea"
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Add a private note about this series..."
        rows={3}
      />
      <span className="series-note-widget-status">{saved ? "Saved" : "Saving..."}</span>
    </div>
  );
}
