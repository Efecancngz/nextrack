import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CONTENT_TYPE_BADGE_CLASS, CONTENT_TYPE_LABELS } from "@/types/common";
import type { SeriesDetail, PlatformAvailability } from "@/types/series";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { parseCompoundId } from "@/lib/db/series-cache";
import AddToLibraryButton from "@/components/AddToLibraryButton";
import RatingWidget from "@/components/RatingWidget";
import type { LibraryStatus } from "@/types/common";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSeriesDetail(id: string): Promise<SeriesDetail | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const url = process.env.NODE_ENV === "development"
      ? `${baseUrl}/api/series/${id}?cb=${Date.now()}`
      : `${baseUrl}/api/series/${id}`;
      
    const res = await fetch(url, {
      next: { revalidate: process.env.NODE_ENV === "development" ? 0 : 3600 },
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const series = await getSeriesDetail(id);
  if (!series) return { title: "Series Not Found" };

  return {
    title: series.title,
    description: series.synopsis?.slice(0, 160) || `Track ${series.title} on Free Serie Tracker`,
    openGraph: {
      title: series.title,
      description: series.synopsis?.slice(0, 160),
      images: series.coverImage ? [{ url: series.coverImage }] : [],
    },
  };
}

export default async function SeriesDetailPage({ params }: PageProps) {
  const { id } = await params;
  const series = await getSeriesDetail(id);

  if (!series) {
    return (
      <div className="container-content page-enter">
        <div className="detail-not-found">
          <h1>Series Not Found</h1>
          <p>We couldn&apos;t find the series you&apos;re looking for.</p>
          <Link href="/explore" className="btn btn-primary">Back to Explore</Link>
        </div>
      </div>
    );
  }

  const user = await getCurrentUser();
  let existingItem: { id: string; status: LibraryStatus } | null = null;
  let existingRating: { score: number; review: string | null } | null = null;

  if (user) {
    const { source, externalId } = parseCompoundId(id);
    const seriesRow = await prisma.series.findUnique({
      where: { externalId_source: { externalId, source } },
    });
    if (seriesRow) {
      const [itemRow, ratingRow] = await Promise.all([
        prisma.libraryItem.findUnique({
          where: { userId_seriesId: { userId: user.id, seriesId: seriesRow.id } },
        }),
        prisma.userRating.findUnique({
          where: { userId_seriesId: { userId: user.id, seriesId: seriesRow.id } },
        }),
      ]);
      if (itemRow) existingItem = { id: itemRow.id, status: itemRow.status };
      if (ratingRow) existingRating = { score: ratingRow.score, review: ratingRow.review };
    }
  }

  const statusLabels: Record<string, string> = {
    ONGOING: "Ongoing",
    COMPLETED: "Completed",
    HIATUS: "On Hiatus",
    CANCELLED: "Cancelled",
    UPCOMING: "Upcoming",
  };

  const ratingsSources = [
    { label: "TMDB", value: series.ratingTmdb, color: "#01d277" },
    { label: "AniList", value: series.ratingAniList, color: "#02a9ff" },
    { label: "IMDb", value: series.ratingImdb, color: "#f5c518" },
    { label: "MAL", value: series.ratingMal, color: "#2e51a2" },
  ].filter((r) => r.value != null && r.value > 0);

  return (
    <div className="page-enter">
      {/* Hero banner */}
      <div className="detail-hero">
        {series.bannerImage && (
          <Image
            src={series.bannerImage}
            alt=""
            fill
            className="detail-hero-bg"
            priority
          />
        )}
        <div className="detail-hero-overlay" />
      </div>

      <div className="container-content detail-content">
        <div className="detail-layout">
          {/* Poster */}
          <aside className="detail-poster-col">
            <div className="detail-poster">
              {series.coverImage ? (
                <Image
                  src={series.coverImage}
                  alt={series.title}
                  width={300}
                  height={450}
                  className="detail-poster-img"
                  priority
                />
              ) : (
                <div className="detail-poster-placeholder">No Image</div>
              )}
            </div>

            <AddToLibraryButton
              compoundId={id}
              initialItem={existingItem}
              isSignedIn={!!user}
            />
          </aside>

          {/* Info */}
          <div className="detail-info">
            <div className="detail-meta-row">
              <span className={`badge ${CONTENT_TYPE_BADGE_CLASS[series.contentType]}`}>
                {CONTENT_TYPE_LABELS[series.contentType]}
              </span>
              <span className="detail-status">{statusLabels[series.status] || series.status}</span>
              {series.year && <span className="detail-year">{series.year}</span>}
            </div>

            <h1 className="detail-title">{series.title}</h1>

            {series.titleOriginal && series.titleOriginal !== series.title && (
              <p className="detail-title-original">{series.titleOriginal}</p>
            )}

            {/* Ratings */}
            {ratingsSources.length > 0 && (
              <div className="detail-ratings">
                {ratingsSources.map((r) => (
                  <div key={r.label} className="detail-rating-item">
                    <span className="detail-rating-score" style={{ color: r.color }}>
                      {r.value!.toFixed(1)}
                    </span>
                    <span className="detail-rating-label">{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <RatingWidget
              compoundId={id}
              initialRating={existingRating}
              isSignedIn={!!user}
            />

            {/* Episode / Chapter counts */}
            <div className="detail-counts">
              {series.totalEpisodes && (
                <span className="detail-count-item">
                  <strong>{series.totalEpisodes}</strong> episodes
                </span>
              )}
              {series.totalChapters && (
                <span className="detail-count-item">
                  <strong>{series.totalChapters}</strong> chapters
                </span>
              )}
              {series.totalVolumes && (
                <span className="detail-count-item">
                  <strong>{series.totalVolumes}</strong> volumes
                </span>
              )}
            </div>

            {/* Synopsis */}
            {series.synopsis && (
              <div className="detail-synopsis">
                <h2 className="detail-section-title">Synopsis</h2>
                <p>{series.synopsis}</p>
              </div>
            )}

            {/* Genres */}
            {series.genres.length > 0 && (
              <div className="detail-genres">
                <h2 className="detail-section-title">Genres</h2>
                <div className="detail-genre-list">
                  {series.genres.map((g) => (
                    <span key={g} className="detail-genre-tag">{g}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {series.tags && series.tags.length > 0 && (
              <div className="detail-tags">
                <h2 className="detail-section-title">Tags</h2>
                <div className="detail-tag-list">
                  {series.tags.map((t) => (
                    <span key={t} className="detail-tag-item">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Platforms */}
            {series.platforms && series.platforms.length > 0 && (
              <div className="detail-platforms">
                <h2 className="detail-section-title">Where to Watch</h2>
                <div className="detail-platform-list">
                  {series.platforms.map((p: PlatformAvailability) => (
                    <div key={p.platformId} className="platform-badge">
                      {p.platformLogo && (
                        <Image
                          src={p.platformLogo}
                          alt={p.platformName}
                          width={24}
                          height={24}
                          className="platform-badge-logo"
                        />
                      )}
                      <span>{p.platformName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
