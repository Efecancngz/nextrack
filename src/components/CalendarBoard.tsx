"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { dayKeyOf, type CalendarEntry } from "@/lib/calendar";

interface CalendarBoardProps {
  entries: CalendarEntry[];
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthGridKeys(anchorKey: string): string[] {
  const [y, m] = anchorKey.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(y, m - 1, 1 - startOffset);
  const keys: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return keys;
}

export default function CalendarBoard({ entries }: CalendarBoardProps) {
  const [viewMode, setViewMode] = useState<"week" | "month">(() => {
    if (typeof window === "undefined") return "week";
    try {
      const stored = window.localStorage.getItem("calendar-view-mode");
      if (stored === "week" || stored === "month") return stored;
    } catch {
      // localStorage unavailable — keep default "week"
    }
    return "week";
  });

  function handleViewModeChange(mode: "week" | "month") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("calendar-view-mode", mode);
    } catch {
      // localStorage unavailable — preference just won't persist this session
    }
  }

  const { byDay, noScheduleData } = useMemo(() => {
    const byDay = new Map<string, CalendarEntry[]>();
    const noScheduleData: CalendarEntry[] = [];
    for (const entry of entries) {
      const key = dayKeyOf(entry);
      if (key === null) {
        noScheduleData.push(entry);
        continue;
      }
      const existing = byDay.get(key);
      if (existing) {
        existing.push(entry);
      } else {
        byDay.set(key, [entry]);
      }
    }
    return { byDay, noScheduleData };
  }, [entries]);

  const today = todayKey();
  const dayKeys = viewMode === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(today, i))
    : monthGridKeys(today);

  return (
    <div className="calendar-page">
      <div className="explore-toolbar">
        <h1 className="calendar-title">My Calendar</h1>
        <div className="explore-view-toggle" role="group" aria-label="Calendar view">
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "week" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("week")}
            aria-pressed={viewMode === "week"}
          >
            Week
          </button>
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "month" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("month")}
            aria-pressed={viewMode === "month"}
          >
            Month
          </button>
        </div>
      </div>

      <div className={viewMode === "week" ? "calendar-week-strip" : "calendar-month-grid"}>
        {dayKeys.map((key) => {
          const dayEntries = byDay.get(key) ?? [];
          const [, , dayNum] = key.split("-");
          return (
            <div key={key} className={`calendar-day-cell ${key === today ? "calendar-day-cell-today" : ""}`}>
              <span className="calendar-day-number">{Number(dayNum)}</span>
              <div className="calendar-day-entries">
                {dayEntries.map((entry) => (
                  <Link
                    key={entry.libraryItemId}
                    href={`/series/${entry.series.source}-${entry.series.externalId}`}
                    className="calendar-entry-chip"
                  >
                    {entry.series.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {noScheduleData.length > 0 && (
        <div className="calendar-no-schedule">
          <h2 className="calendar-no-schedule-title">No schedule data</h2>
          <div className="calendar-no-schedule-list">
            {noScheduleData.map((entry) => (
              <Link
                key={entry.libraryItemId}
                href={`/series/${entry.series.source}-${entry.series.externalId}`}
                className="calendar-entry-chip"
              >
                {entry.series.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
