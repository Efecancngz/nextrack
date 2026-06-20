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
import { getMockTrendingTvSeries, MOCK_TV_SHOWS, searchMockTvSeries } from "./tmdb-mock";

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
  popularity: number;
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

/** TMDB's official TV genre list — stable, rarely changes, not worth a live API call */
const TMDB_TV_GENRE_MAP: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

// ─── Public API Functions ─────────────────────────

/** Search for TV series on TMDB */
export async function searchTvSeries(
  query: string,
  page = 1
): Promise<{ results: SearchResult[]; total: number; totalPages: number }> {
  if (!API_KEY) {
    console.warn("[TMDB] TMDB_API_KEY is not configured. Returning matching mock results.");
    const results = searchMockTvSeries(query);
    return {
      results,
      total: results.length,
      totalPages: 1,
    };
  }

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
    genres: item.genre_ids
      .map((id) => TMDB_TV_GENRE_MAP[id])
      .filter((name): name is string => Boolean(name)),
    status: "ONGOING",
    ratingExternal: item.vote_average > 0 ? item.vote_average : undefined,
    popularity: item.popularity,
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
  if (!API_KEY) {
    const mock = MOCK_TV_SHOWS[tmdbId];
    if (mock) {
      console.warn(`[TMDB] TMDB_API_KEY is not configured. Returning mock details for series ID ${tmdbId}.`);
      return {
        detail: {
          id: mock.id,
          name: mock.name,
          original_name: mock.original_name,
          tagline: mock.tagline,
          overview: mock.overview,
          poster_path: mock.poster_path,
          backdrop_path: mock.backdrop_path,
          first_air_date: mock.first_air_date,
          genres: mock.genres,
          keywords: mock.keywords,
          status: mock.status,
          number_of_episodes: mock.number_of_episodes,
          number_of_seasons: mock.number_of_seasons,
          vote_average: mock.vote_average,
          vote_count: mock.vote_count,
        },
        platforms: mock.platforms.map((p) => ({
          ...p,
          platformLogo: tmdbImage(p.platformLogo, "w92"),
        })),
      };
    }
    console.warn("[TMDB] TMDB_API_KEY is not configured. Returning empty detail.");
    return { detail: {}, platforms: [] };
  }

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

/** Get the next episode air date for a TV series, or null if none scheduled / API key unset */
export async function getTvNextAirDate(tmdbId: string): Promise<string | null> {
  if (!API_KEY) return null; // no mock schedule data to synthesize — out of scope
  try {
    const detail = await tmdbFetch<{ next_episode_to_air: { air_date: string } | null }>(
      `/tv/${tmdbId}`,
      { language: "en-US" }
    );
    return detail.next_episode_to_air?.air_date ?? null;
  } catch (err) {
    console.error(`[TMDB] Failed to fetch next air date for series ${tmdbId}:`, err);
    return null;
  }
}

/** Get the current total episode count for a TV series, or null if unavailable / API key unset */
export async function getTvEpisodeCount(tmdbId: string): Promise<number | null> {
  if (!API_KEY) return null;
  try {
    const detail = await tmdbFetch<{ number_of_episodes: number | null }>(`/tv/${tmdbId}`, {
      language: "en-US",
    });
    return detail.number_of_episodes ?? null;
  } catch (err) {
    console.error(`[TMDB] Failed to fetch episode count for series ${tmdbId}:`, err);
    return null;
  }
}

/** Get trending TV series (week) */
export async function getTrendingTvSeries(): Promise<SearchResult[]> {
  if (!API_KEY) {
    console.warn("[TMDB] TMDB_API_KEY is not configured. Returning mock trending list.");
    return getMockTrendingTvSeries();
  }

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

