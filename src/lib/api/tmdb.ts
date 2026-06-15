/**
 * TMDB API Client (v3)
 * Docs: https://developer.themoviedb.org/reference/intro/getting-started
 *
 * Rate limit: 40 requests per 10 seconds
 * Images: https://image.tmdb.org/t/p/{size}/{path}
 * Sizes: w92, w154, w185, w342, w500, w780, original
 */

import { AppError } from "@/lib/utils/app-error";
import type { ContentType, ContentStatus } from "@/types/common";
import type { SearchResult, PlatformAvailability } from "@/types/series";

const TMDB_BASE = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const API_KEY = process.env.TMDB_API_KEY;

/** Map TMDB status string to our ContentStatus */
export function mapTmdbStatus(status: string): ContentStatus {
  const map: Record<string, ContentStatus> = {
    "Returning Series": "ONGOING",
    "In Production": "UPCOMING",
    Ended: "COMPLETED",
    Canceled: "CANCELLED",
    Planned: "UPCOMING",
    Pilot: "ONGOING",
  };
  return map[status] ?? "ONGOING";
}

/** Build full TMDB image URL */
export function tmdbImage(path: string | null | undefined, size = "w500"): string | undefined {
  if (!path) return undefined;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** Raw TMDB fetch with error handling */
async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  if (!API_KEY) throw new AppError("TMDB API key not configured", 500, "CONFIG_ERROR");

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 }, // Cache for 1 hour (ISR)
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    throw AppError.externalApiError(`TMDB (${res.status})`);
  }

  return res.json() as Promise<T>;
}

// ─── TMDB API Types ───────────────────────────────

interface TmdbTvResult {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  genre_ids: number[];
  vote_average: number;
  status?: string;
}

interface TmdbSearchResponse {
  results: TmdbTvResult[];
  total_results: number;
  total_pages: number;
  page: number;
}

interface TmdbTvDetail {
  id: number;
  name: string;
  original_name: string;
  tagline?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genres: { id: number; name: string }[];
  keywords?: { results: { id: number; name: string }[] };
  status: string;
  number_of_episodes: number;
  number_of_seasons: number;
  vote_average: number;
  vote_count: number;
  external_ids?: { imdb_id?: string };
  // Watch providers appended via /watch/providers
  watch_providers?: { results: Record<string, TmdbWatchProvider> };
}

interface TmdbWatchProvider {
  flatrate?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

// ─── Public API Functions ─────────────────────────

/** Search for TV series on TMDB */
export async function searchTvSeries(
  query: string,
  page = 1
): Promise<{ results: SearchResult[]; total: number; totalPages: number }> {
  const data = await tmdbFetch<TmdbSearchResponse>("/search/tv", {
    query,
    page: String(page),
    include_adult: "false",
    language: "en-US",
  });

  const results: SearchResult[] = data.results.map((item) => ({
    externalId: String(item.id),
    source: "tmdb",
    contentType: "TV_SERIES" as ContentType,
    title: item.name,
    titleOriginal: item.original_name !== item.name ? item.original_name : undefined,
    coverImage: tmdbImage(item.poster_path),
    year: item.first_air_date ? new Date(item.first_air_date).getFullYear() : undefined,
    genres: [], // genre_ids need a separate genres list mapping
    status: "ONGOING",
    ratingExternal: item.vote_average > 0 ? item.vote_average : undefined,
  }));

  return {
    results,
    total: data.total_results,
    totalPages: data.total_pages,
  };
}

/** Get TMDB TV series detail with watch providers */
export async function getTvSeriesDetail(tmdbId: string): Promise<{
  detail: Partial<TmdbTvDetail>;
  platforms: PlatformAvailability[];
}> {
  const [detail, providers] = await Promise.all([
    tmdbFetch<TmdbTvDetail>(`/tv/${tmdbId}`, {
      language: "en-US",
      append_to_response: "keywords,external_ids",
    }),
    tmdbFetch<{ results: Record<string, TmdbWatchProvider> }>(
      `/tv/${tmdbId}/watch/providers`
    ),
  ]);

  // Parse watch providers (US region by default)
  const usProviders = providers.results?.["US"] ?? providers.results?.["TR"] ?? {};
  const platforms: PlatformAvailability[] = [];

  const addProviders = (
    providerList: TmdbProvider[] | undefined,
    subType: PlatformAvailability["subscriptionType"]
  ) => {
    if (!providerList) return;
    for (const p of providerList) {
      if (!platforms.some((pl) => pl.platformId === String(p.provider_id))) {
        platforms.push({
          platformId: String(p.provider_id),
          platformName: p.provider_name,
          platformLogo: tmdbImage(p.logo_path, "w92"),
          subscriptionType: subType,
          region: ["US"],
        });
      }
    }
  };

  addProviders(usProviders.flatrate, "subscription");
  addProviders(usProviders.free, "free");
  addProviders(usProviders.ads, "free");
  addProviders(usProviders.rent, "rent");
  addProviders(usProviders.buy, "buy");

  return { detail, platforms };
}

/** Get trending TV series (week) */
export async function getTrendingTvSeries(): Promise<SearchResult[]> {
  const data = await tmdbFetch<TmdbSearchResponse>("/trending/tv/week", {
    language: "en-US",
  });

  return data.results.slice(0, 20).map((item) => ({
    externalId: String(item.id),
    source: "tmdb",
    contentType: "TV_SERIES" as ContentType,
    title: item.name,
    titleOriginal: item.original_name !== item.name ? item.original_name : undefined,
    coverImage: tmdbImage(item.poster_path),
    year: item.first_air_date ? new Date(item.first_air_date).getFullYear() : undefined,
    genres: [],
    status: "ONGOING" as ContentStatus,
    ratingExternal: item.vote_average > 0 ? item.vote_average : undefined,
  }));
}
