import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import LibraryBoard from "@/components/LibraryBoard";
import type { LibraryEntry } from "@/types/library";

export const metadata: Metadata = {
  title: "My Library",
  description: "Your personal series tracking library",
};

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
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
    waitLanguage: item.waitLanguage,
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

  return (
    <div className="container-content page-enter library-page">
      <div className="library-header">
        <h1 className="library-title">My Library</h1>
      </div>

      {entries.length === 0 ? (
        <div className="library-empty">
          <div className="library-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="m9 10 2 2 4-4" />
            </svg>
          </div>
          <h2 className="library-empty-title">Your library is empty</h2>
          <p className="library-empty-text">
            Start by exploring series and adding them to your watchlist.
          </p>
          <div className="library-empty-actions">
            <Link href="/explore" className="btn btn-primary">
              Browse Catalogue
            </Link>
          </div>
        </div>
      ) : (
        <LibraryBoard initialEntries={entries} />
      )}
    </div>
  );
}
