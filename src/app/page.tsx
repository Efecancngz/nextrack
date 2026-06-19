import React from "react";
import Link from "next/link";
import SeriesCard from "@/components/SeriesCard";
import HeroSlider from "@/components/HeroSlider";
import { getTrendingTvSeries } from "@/lib/api/tmdb";
import { getTrendingAnime, getTrendingManga, getTrendingManhwa, getTrendingNovel } from "@/lib/api/anilist";
import type { SearchResult } from "@/types/series";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { getUpcomingReleases, type CalendarEntry } from "@/lib/calendar";
import AiringTodaySection from "@/components/AiringTodaySection";
import type { LibraryEntry } from "@/types/library";

export const dynamic = "force-dynamic";

const CONTENT_TYPES = [
  { slug: "tv",          label: "TV Series",   source: "TMDB"     },
  { slug: "anime",       label: "Anime",        source: "AniList"  },
  { slug: "manga",       label: "Manga",        source: "MangaDex" },
  { slug: "manhwa",      label: "Manhwa",       source: "MangaDex" },
  { slug: "light-novel", label: "Light Novel",  source: "AniList"  },
  { slug: "webtoon",     label: "Webtoon",      source: "AniList"  },
] as const;

// Fetch trending data at the server level (dynamic)
async function getTrendingData(): Promise<{
  tv: SearchResult[];
  anime: SearchResult[];
  manga: SearchResult[];
  manhwa: SearchResult[];
  novel: SearchResult[];
}> {
  let tv: SearchResult[] = [];
  let anime: SearchResult[] = [];
  let manga: SearchResult[] = [];
  let manhwa: SearchResult[] = [];
  let novel: SearchResult[] = [];

  try {
    tv = await getTrendingTvSeries();
  } catch (err) {
    console.error("[Home] TMDB trending error:", err);
  }

  try {
    anime = await getTrendingAnime();
  } catch (err) {
    console.error("[Home] AniList trending error:", err);
  }

  try {
    manga = await getTrendingManga();
  } catch (err) {
    console.error("[Home] AniList trending manga error:", err);
  }

  try {
    manhwa = await getTrendingManhwa();
  } catch (err) {
    console.error("[Home] AniList trending manhwa error:", err);
  }

  try {
    novel = await getTrendingNovel();
  } catch (err) {
    console.error("[Home] AniList trending novel error:", err);
  }

  return {
    tv: tv.slice(0, 12),
    anime: anime.slice(0, 12),
    manga: manga.slice(0, 12),
    manhwa: manhwa.slice(0, 12),
    novel: novel.slice(0, 12),
  };
}

async function getMyReleases(): Promise<CalendarEntry[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const items = await prisma.libraryItem.findMany({
    where: { userId: user.id },
    include: { series: true },
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

  return getUpcomingReleases(entries);
}

export default async function HomePage() {
  const { tv, anime, manga, manhwa, novel } = await getTrendingData();
  const myReleases = await getMyReleases();

  return (
    <div className="page-enter">
      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="container-content hero-grid">
          {/* Left — copy */}
          <div className="hero-copy">
            <p className="hero-eyebrow-text">
              Free tracker for every format
            </p>

            <h1 className="hero-title">
              Track every series.<br />
              <span className="hero-title-accent">Know where to watch.</span>
            </h1>

            <p className="hero-body">
              TV, anime, manga, manhwa, light novels, webtoons — one place to
              track your progress and find which legal platform has each one.
            </p>

            <div className="hero-actions">
              <Link href="/explore" className="btn btn-primary btn-lg">
                Browse catalogue
              </Link>
              <Link href="/auth/signin" className="btn btn-ghost btn-lg">
                Sign in
              </Link>
            </div>

            <div className="platform-strip">
              <span className="platform-strip-label">Available on</span>
              <div className="platform-strip-logos">
                {["Netflix", "Crunchyroll", "Disney+", "Amazon", "Apple TV+", "Funimation"].map((p) => (
                  <span key={p} className="platform-chip">{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — visual slider */}
          <div className="hero-visual">
            <HeroSlider tv={tv} anime={anime} manga={manga} novel={novel} />
            <div className="hero-visual-fade" />
          </div>
        </div>
      </section>

      <div className="container-content">
        {/* ── Stats ── */}
        <section className="stats-row">
          {[
            { n: "6",     label: "Content types"    },
            { n: "100%",  label: "Legal sources only" },
            { n: "Free",  label: "Always, no catches" },
            { n: "0",     label: "Pirated links"      },
          ].map(({ n, label }, i, arr) => (
            <React.Fragment key={label}>
              <div className="stat-item">
                <span className="stat-number">{n}</span>
                <span className="stat-label">{label}</span>
              </div>
              {i < arr.length - 1 && <div className="stat-divider" />}
            </React.Fragment>
          ))}
        </section>

        <AiringTodaySection releases={myReleases} />

        {/* ── Trending TV Series ── */}
        {tv.length > 0 && (
          <section className="trending-section" id="trending-tv">
            <div className="section-header">
              <h2 className="section-title">Trending TV Series</h2>
              <Link href="/explore?type=tv" className="section-see-all">
                See all →
              </Link>
            </div>
            <div className="series-grid">
              {tv.map((item) => (
                <SeriesCard key={`${item.source}-${item.externalId}`} series={item} />
              ))}
            </div>
          </section>
        )}

        {/* ── Trending Anime ── */}
        {anime.length > 0 && (
          <section className="trending-section" id="trending-anime">
            <div className="section-header">
              <h2 className="section-title">Trending Anime</h2>
              <Link href="/explore?type=anime" className="section-see-all">
                See all →
              </Link>
            </div>
            <div className="series-grid">
              {anime.map((item) => (
                <SeriesCard key={`${item.source}-${item.externalId}`} series={item} />
              ))}
            </div>
          </section>
        )}

        {/* ── Trending Manga ── */}
        {manga.length > 0 && (
          <section className="trending-section" id="trending-manga">
            <div className="section-header">
              <h2 className="section-title">Trending Manga</h2>
              <Link href="/explore?type=manga" className="section-see-all">
                See all →
              </Link>
            </div>
            <div className="series-grid">
              {manga.map((item) => (
                <SeriesCard key={`${item.source}-${item.externalId}`} series={item} />
              ))}
            </div>
          </section>
        )}

        {/* ── Trending Manhwa & Webtoons ── */}
        {manhwa.length > 0 && (
          <section className="trending-section" id="trending-manhwa">
            <div className="section-header">
              <h2 className="section-title">Trending Manhwa & Webtoons</h2>
              <Link href="/explore?type=manga" className="section-see-all">
                See all →
              </Link>
            </div>
            <div className="series-grid">
              {manhwa.map((item) => (
                <SeriesCard key={`${item.source}-${item.externalId}`} series={item} />
              ))}
            </div>
          </section>
        )}

        {/* ── Trending Light Novels ── */}
        {novel.length > 0 && (
          <section className="trending-section" id="trending-novel">
            <div className="section-header">
              <h2 className="section-title">Trending Light Novels</h2>
              <Link href="/explore?type=manga" className="section-see-all">
                See all →
              </Link>
            </div>
            <div className="series-grid">
              {novel.map((item) => (
                <SeriesCard key={`${item.source}-${item.externalId}`} series={item} />
              ))}
            </div>
          </section>
        )}

        {/* ── What you can track ── */}
        <section className="content-types-section">
          <h2 className="section-label">What you can track</h2>
          <div className="content-type-grid">
            {CONTENT_TYPES.map(({ slug, label, source }) => (
              <div key={slug} className="content-type-card">
                <span className={`badge badge-${slug}`}>{label}</span>
                <span className="content-type-source">via {source}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
