"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import SeriesCard from "./SeriesCard";
import { dayKeyOf, type CalendarEntry } from "@/lib/calendar";

interface AiringTodaySectionProps {
  releases: CalendarEntry[];
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AiringTodaySection({ releases }: AiringTodaySectionProps) {
  const airingToday = useMemo(() => {
    const today = todayKey();
    return releases.filter((entry) => dayKeyOf(entry) === today);
  }, [releases]);

  if (airingToday.length === 0) {
    return null;
  }

  return (
    <section className="trending-section" id="airing-today">
      <div className="section-header">
        <h2 className="section-title">Airing Today</h2>
        <Link href="/calendar" className="section-see-all">
          See calendar →
        </Link>
      </div>
      <div className="series-grid">
        {airingToday.map((entry) => (
          <SeriesCard key={entry.libraryItemId} series={entry.series} />
        ))}
      </div>
    </section>
  );
}
