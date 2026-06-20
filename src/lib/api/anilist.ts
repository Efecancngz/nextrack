/**
 * AniList GraphQL Client
 * API: https://anilist.co/graphql
 * Docs: https://anilist.gitbook.io/anilist-apiv2-docs/
 *
 * Rate limit: 90 requests per minute
 * No API key required for public queries
 */

import { AppError } from "@/lib/utils/app-error";
import type { ContentType, ContentStatus } from "@/types/common";
import type { SearchResult } from "@/types/series";

const ANILIST_URL = "https://graphql.anilist.co";

/** Map AniList format to our ContentType */
function mapFormat(format: string, countryOfOrigin?: string): ContentType {
  const map: Record<string, ContentType> = {
    TV: "ANIME",
    TV_SHORT: "ANIME",
    MOVIE: "ANIME",
    SPECIAL: "ANIME",
    OVA: "ANIME",
    ONA: "ANIME",
    MUSIC: "ANIME",
    NOVEL: "LIGHT_NOVEL",
  };
  
  if (format === "MANGA" || format === "ONE_SHOT") {
    if (countryOfOrigin === "KR") return "MANHWA";
    if (countryOfOrigin === "CN") return "MANHWA";
    return "MANGA";
  }
  
  return map[format] ?? "ANIME";
}

/** Map AniList status to our ContentStatus */
function mapStatus(status: string): ContentStatus {
  const map: Record<string, ContentStatus> = {
    FINISHED: "COMPLETED",
    RELEASING: "ONGOING",
    NOT_YET_RELEASED: "UPCOMING",
    CANCELLED: "CANCELLED",
    HIATUS: "HIATUS",
  };
  return map[status] ?? "ONGOING";
}

/** Raw AniList GraphQL fetch */
async function anilistFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw AppError.externalApiError(`AniList (${res.status})`);

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new AppError(json.errors[0].message, 502, "ANILIST_ERROR");
  }
  return json.data as T;
}

// ─── Queries ──────────────────────────────────────

const SEARCH_QUERY = `
  query SearchMedia($search: String, $page: Int, $perPage: Int, $type: MediaType) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage }
      media(search: $search, type: $type, isAdult: false) {
        id
        title { romaji english native }
        format
        status
        coverImage { large }
        startDate { year }
        genres
        averageScore
        episodes
        chapters
        countryOfOrigin
      }
    }
  }
`;

const TRENDING_MEDIA_QUERY = `
  query TrendingMedia($type: MediaType, $format: MediaFormat, $countryOfOrigin: CountryCode, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: $type, format: $format, countryOfOrigin: $countryOfOrigin, sort: TRENDING_DESC, isAdult: false) {
        id
        title { romaji english native }
        format
        status
        coverImage { large }
        startDate { year }
        genres
        averageScore
        episodes
        chapters
        countryOfOrigin
      }
    }
  }
`;

// ─── AniList API Types ────────────────────────────

interface AniListMedia {
  id: number;
  title: { romaji: string; english?: string; native?: string };
  format: string;
  status: string;
  coverImage: { large: string };
  startDate: { year?: number };
  genres: string[];
  averageScore?: number;
  episodes?: number;
  chapters?: number;
  countryOfOrigin?: string;
}

interface AniListPage<T> {
  Page: {
    pageInfo: { total: number; currentPage: number; lastPage: number };
    media: T[];
  };
}

// ─── Public API Functions ─────────────────────────

/** Search anime/manga on AniList */
export async function searchAniList(
  query: string,
  type: "ANIME" | "MANGA" = "ANIME",
  page = 1
): Promise<{ results: SearchResult[]; total: number; totalPages: number }> {
  const data = await anilistFetch<AniListPage<AniListMedia>>(SEARCH_QUERY, {
    search: query,
    type,
    page,
    perPage: 20,
  });

  const results: SearchResult[] = data.Page.media.map((item) => ({
    externalId: String(item.id),
    source: "anilist",
    contentType: mapFormat(item.format, item.countryOfOrigin),
    title: item.title.english ?? item.title.romaji,
    titleOriginal: item.title.native,
    coverImage: item.coverImage.large,
    year: item.startDate.year,
    genres: item.genres,
    status: mapStatus(item.status),
    ratingExternal: item.averageScore ? item.averageScore / 10 : undefined,
  }));

  return {
    results,
    total: data.Page.pageInfo.total,
    totalPages: data.Page.pageInfo.lastPage,
  };
}

/** Get trending media (anime, manga, light novel, manhwa) from AniList */
async function getTrendingMedia(
  type: "ANIME" | "MANGA",
  format?: string,
  countryOfOrigin?: string
): Promise<SearchResult[]> {
  try {
    const data = await anilistFetch<AniListPage<AniListMedia>>(TRENDING_MEDIA_QUERY, {
      type,
      format,
      countryOfOrigin,
      page: 1,
      perPage: 12,
    });

    return data.Page.media.map((item) => ({
      externalId: String(item.id),
      source: "anilist",
      contentType: mapFormat(item.format, item.countryOfOrigin),
      title: item.title.english ?? item.title.romaji,
      titleOriginal: item.title.native,
      coverImage: item.coverImage.large,
      year: item.startDate.year,
      genres: item.genres,
      status: mapStatus(item.status),
      ratingExternal: item.averageScore ? item.averageScore / 10 : undefined,
    }));
  } catch (err) {
    console.error(`[AniList] Trending fetch failed for ${type} (${format}):`, err);
    return [];
  }
}

/** Get trending anime from AniList */
export async function getTrendingAnime(): Promise<SearchResult[]> {
  return getTrendingMedia("ANIME");
}

/** Get trending manga from AniList (specifically JP) */
export async function getTrendingManga(): Promise<SearchResult[]> {
  return getTrendingMedia("MANGA", "MANGA", "JP");
}

/** Get trending manhwa / webtoons from AniList (specifically KR) */
export async function getTrendingManhwa(): Promise<SearchResult[]> {
  return getTrendingMedia("MANGA", "MANGA", "KR");
}

/** Get trending light novels from AniList */
export async function getTrendingNovel(): Promise<SearchResult[]> {
  return getTrendingMedia("MANGA", "NOVEL");
}

const NEXT_AIRING_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      nextAiringEpisode { airingAt }
    }
  }
`;

/** Get the next airing episode's UTC instant (ISO string) for an anime, or null if none scheduled */
export async function getAnimeNextAiringEpisode(anilistId: string): Promise<string | null> {
  try {
    const data = await anilistFetch<{ Media: { nextAiringEpisode: { airingAt: number } | null } }>(
      NEXT_AIRING_QUERY,
      { id: Number(anilistId) }
    );
    const airingAt = data.Media?.nextAiringEpisode?.airingAt;
    return airingAt != null ? new Date(airingAt * 1000).toISOString() : null;
  } catch (err) {
    console.error(`[AniList] Failed to fetch next airing episode for media ${anilistId}:`, err);
    return null;
  }
}

const EPISODE_COUNT_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      nextAiringEpisode { episode }
    }
  }
`;

/**
 * Get the current episode count for an anime, or null if unavailable.
 *
 * AniList's `episodes` field is the *final/total* episode count, which is
 * null for any anime that hasn't finished airing yet — i.e. null for the
 * majority of actively-tracked, ongoing anime. When that happens, fall back
 * to `nextAiringEpisode.episode - 1`: the upcoming episode's number minus
 * one is exactly how many episodes have aired so far, which is the correct
 * baseline for detecting "a new episode just aired" on an ongoing series.
 */
export async function getAnimeEpisodeCount(anilistId: string): Promise<number | null> {
  try {
    const data = await anilistFetch<{
      Media: { episodes: number | null; nextAiringEpisode: { episode: number } | null };
    }>(EPISODE_COUNT_QUERY, { id: Number(anilistId) });

    if (data.Media?.episodes != null) return data.Media.episodes;

    const nextEpisode = data.Media?.nextAiringEpisode?.episode;
    return nextEpisode != null ? nextEpisode - 1 : null;
  } catch (err) {
    console.error(`[AniList] Failed to fetch episode count for media ${anilistId}:`, err);
    return null;
  }
}
