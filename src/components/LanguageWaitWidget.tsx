"use client";

import React, { useState } from "react";

interface LanguageWaitWidgetProps {
  libraryItemId: string;
  initialValue: string | null;
}

export default function LanguageWaitWidget({ libraryItemId, initialValue }: LanguageWaitWidgetProps) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  async function handleChange(next: string | null) {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${libraryItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitLanguage: next }),
      });
      const data = await res.json();
      if (data.success) {
        setValue(next);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="language-wait-widget">
      <span className="language-wait-widget-label">Get notified when available in:</span>
      <select
        className="language-wait-widget-select"
        value={value ?? ""}
        onChange={(e) => handleChange(e.target.value || null)}
        disabled={busy}
        aria-label="Wait for language"
      >
        <option value="">Don&apos;t notify</option>
        <option value="EN">English</option>
        <option value="TR">Turkish</option>
      </select>
    </div>
  );
}
