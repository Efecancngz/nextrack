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
function mapFormat(format: string): ContentType {
  const map: Record<string, ContentType> = {
    TV: "ANIME",
    TV_SHORT: "ANIME",
    MOVIE: "ANIME",
    SPECIAL: "ANIME",
    OVA: "ANIME",
    ONA: "ANIME",
    MUSIC: "ANIME",
    MANGA: "MANGA",
    NOVEL: "LIGHT_NOVEL",
    ONE_SHOT: "MANGA",
  };
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
      }
    }
  }
`;

const TRENDING_QUERY = `
  query TrendingAnime($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
        id
        title { romaji english native }
        format
        status
        coverImage { large }
        startDate { year }
        genres
        averageScore
        episodes
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
    contentType: mapFormat(item.format),
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

/** Get trending anime from AniList */
export async function getTrendingAnime(): Promise<SearchResult[]> {
  const data = await anilistFetch<AniListPage<AniListMedia>>(TRENDING_QUERY, {
    page: 1,
    perPage: 20,
  });

  return data.Page.media.map((item) => ({
    externalId: String(item.id),
    source: "anilist",
    contentType: mapFormat(item.format),
    title: item.title.english ?? item.title.romaji,
    titleOriginal: item.title.native,
    coverImage: item.coverImage.large,
    year: item.startDate.year,
    genres: item.genres,
    status: mapStatus(item.status),
    ratingExternal: item.averageScore ? item.averageScore / 10 : undefined,
  }));
}
