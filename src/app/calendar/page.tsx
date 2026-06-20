import React from "react";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { getUpcomingReleases } from "@/lib/calendar";
import CalendarBoard from "@/components/CalendarBoard";
import type { LibraryEntry } from "@/types/library";

export const metadata: Metadata = {
  title: "My Calendar",
  description: "When your tracked series air next",
};

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireAuth();

  const items = await prisma.libraryItem.findMany({
    where: { userId: user.id },
    include: { series: true },
    orderBy: { updatedAt: "desc" },
  });

  const entries: LibraryEntry[] = items.map((item) => ({
    id: item.id,
    userId: item.userId,
    seriesId: item.seriesId,
    status: item.status,
    isFavorite: item.isFavorite,
    currentSeason: item.currentSeason ?? undefined,
    currentEpisode: item.currentEpisode ?? undefined,
    currentChapter: item.currentChapter ?? undefined,
    currentVolume: item.currentVolume ?? undefined,
    startedAt: item.startedAt?.toISOString(),
    completedAt: item.completedAt?.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    series: {
      id: item.series.id,
      externalId: item.series.externalId,
      source: item.series.source,
      contentType: item.series.contentType,
      status: item.series.status,
      title: item.series.title,
      titleOriginal: item.series.titleOriginal ?? undefined,
      coverImage: item.series.coverImage ?? undefined,
      year: item.series.year ?? undefined,
      genres: item.series.genres,
      ratingExternal: item.series.ratingExternal ?? undefined,
      totalEpisodes: item.series.totalEpisodes ?? undefined,
      totalChapters: item.series.totalChapters ?? undefined,
      platforms: [],
    },
  }));

  const releases = await getUpcomingReleases(entries);

  return (
    <div className="container-content page-enter">
      {entries.length === 0 ? (
        <div className="library-empty">
          <div className="library-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <h2 className="library-empty-title">Your library is empty</h2>
          <p className="library-empty-text">
            Add series to your library to see their release schedule here.
          </p>
        </div>
      ) : (
        <CalendarBoard entries={releases} />
      )}
    </div>
  );
}
