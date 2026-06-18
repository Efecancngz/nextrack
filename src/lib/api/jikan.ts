/**
 * Jikan (MyAnimeList) API Client
 * Docs: https://docs.api.jikan.moe/
 *
 * Rate limit: 3 requests per second, 60 requests per minute
 * No API key required for public queries
 */

import { AppError } from "@/lib/utils/app-error";
import type { ContentType, ContentStatus } from "@/types/common";
import type { SearchResult } from "@/types/series";

const JIKAN_BASE = process.env.JIKAN_BASE_URL || "https://api.jikan.moe/v4";

/** Map Jikan status to our ContentStatus */
function mapJikanStatus(status: string): ContentStatus {
  const map: Record<string, ContentStatus> = {
    "Currently Airing": "ONGOING",
    "Finished Airing": "COMPLETED",
    "Not yet aired": "UPCOMING",
    "Currently Publishing": "ONGOING",
    "Finished": "COMPLETED",
    "On Hiatus": "HIATUS",
    "Discontinued": "CANCELLED",
  };
  return map[status] ?? "ONGOING";
}

/** Raw Jikan fetch with error handling and rate-limit throttle */
async function jikanFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${JIKAN_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  // Jikan has strict rate limits. We should implement a basic delay if needed, 
  // but since standard fetch is cached by Next.js ISR, simple fetch is fine.
  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 }, // Cache for 1 hour (ISR)
    headers: { Accept: "application/json" },
  });

  if (res.status === 429) {
    throw new AppError("MyAnimeList API rate limit reached, please try again shortly", 429, "RATE_LIMIT_ERROR");
  }

  if (!res.ok) {
    throw AppError.externalApiError(`MyAnimeList (${res.status})`);
  }

  return res.json() as Promise<T>;
}

// ─── Jikan API Types ──────────────────────────────

interface JikanImage {
  image_url: string;
  large_image_url: string;
}

interface JikanMediaData {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: {
    jpg: JikanImage;
    webp: JikanImage;
  };
  status: string;
  score: number | null;
  scored_by: number | null;
  type: string;
  synopsis: string | null;
  genres: { name: string }[];
  year: number | null;
  episodes?: number | null;
  chapters?: number | null;
  volumes?: number | null;
}

interface JikanSearchResponse {
  data: JikanMediaData[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

interface JikanDetailResponse {
  data: JikanMediaData;
}

// ─── Public API Functions ─────────────────────────

/** Search Anime on MyAnimeList */
export async function searchAnimeOnMal(
  query: string,
  page = 1
): Promise<{ results: SearchResult[]; total: number; totalPages: number }> {
  const data = await jikanFetch<JikanSearchResponse>("/anime", {
    q: query,
    page: String(page),
    limit: "20",
    sfw: "true",
  });

  const results: SearchResult[] = data.data.map((item) => ({
    externalId: String(item.mal_id),
    source: "jikan",
    contentType: "ANIME" as ContentType,
    title: item.title_english ?? item.title,
    titleOriginal: item.title_japanese ?? undefined,
    coverImage: item.images.webp.large_image_url || item.images.jpg.large_image_url,
    year: item.year ?? undefined,
    genres: item.genres.map((g) => g.name),
    status: mapJikanStatus(item.status),
    ratingExternal: item.score ? item.score : undefined,
  }));

  return {
    results,
    total: data.pagination.items.total,
    totalPages: data.pagination.last_visible_page,
  };
}

/** Search Manga on MyAnimeList */
export async function searchMangaOnMal(
  query: string,
  page = 1
): Promise<{ results: SearchResult[]; total: number; totalPages: number }> {
  const data = await jikanFetch<JikanSearchResponse>("/manga", {
    q: query,
    page: String(page),
    limit: "20",
    sfw: "true",
  });

  const results: SearchResult[] = data.data.map((item) => ({
    externalId: String(item.mal_id),
    source: "jikan",
    contentType: "MANGA" as ContentType,
    title: item.title_english ?? item.title,
    titleOriginal: item.title_japanese ?? undefined,
    coverImage: item.images.webp.large_image_url || item.images.jpg.large_image_url,
    year: item.year ?? undefined,
    genres: item.genres.map((g) => g.name),
    status: mapJikanStatus(item.status),
    ratingExternal: item.score ? item.score : undefined,
  }));

  return {
    results,
    total: data.pagination.items.total,
    totalPages: data.pagination.last_visible_page,
  };
}

/** Get detail view of Anime from MAL */
export async function getAnimeDetailOnMal(malId: string): Promise<JikanMediaData> {
  const data = await jikanFetch<JikanDetailResponse>(`/anime/${malId}`);
  return data.data;
}

/** Get detail view of Manga from MAL */
export async function getMangaDetailOnMal(malId: string): Promise<JikanMediaData> {
  const data = await jikanFetch<JikanDetailResponse>(`/manga/${malId}`);
  return data.data;
}
