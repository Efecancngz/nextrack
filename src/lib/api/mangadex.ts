/**
 * MangaDex API Client
 * Docs: https://api.mangadex.org/docs/
 *
 * Rate limit: 5 requests per second
 * No API key required for public queries
 */

import { AppError } from "@/lib/utils/app-error";
import type { ContentType, ContentStatus } from "@/types/common";
import type { SearchResult } from "@/types/series";

const MANGADEX_BASE = process.env.MANGADEX_BASE_URL || "https://api.mangadex.org";

/** Map MangaDex status to our ContentStatus */
function mapMangaDexStatus(status: string): ContentStatus {
  const map: Record<string, ContentStatus> = {
    ongoing: "ONGOING",
    completed: "COMPLETED",
    hiatus: "HIATUS",
    cancelled: "CANCELLED",
  };
  return map[status] ?? "ONGOING";
}

/** Raw MangaDex fetch with error handling */
async function mangadexFetch<T>(
  endpoint: string,
  params: Record<string, string | string[]> = {}
): Promise<T> {
  const url = new URL(`${MANGADEX_BASE}${endpoint}`);
  
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((val) => url.searchParams.append(key, val));
    } else {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 }, // Cache for 1 hour (ISR)
    headers: {
      "Accept": "application/json",
      "User-Agent": "FreeSerieTracker/1.0.0 (https://github.com/EfecanCngzz/Free-Serie-Tracker)"
    },
  });

  if (!res.ok) {
    throw AppError.externalApiError(`MangaDex (${res.status})`);
  }

  return res.json() as Promise<T>;
}

// ─── MangaDex API Types ───────────────────────────

interface MangaDexRelationship {
  id: string;
  type: string;
  attributes?: {
    fileName?: string;
  };
}

interface MangaDexManga {
  id: string;
  type: "manga";
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    description: Record<string, string>;
    status: string;
    year?: number;
  };
  relationships: MangaDexRelationship[];
}

interface MangaDexSearchResponse {
  result: string;
  response: string;
  data: MangaDexManga[];
  limit: number;
  offset: number;
  total: number;
}

export interface MangaDexChapter {
  id: string;
  chapter: string | null;
  volume: string | null;
  title: string | null;
  publishAt: string;
}

interface MangaDexFeedResponse {
  result: string;
  response: string;
  data: {
    id: string;
    type: "chapter";
    attributes: {
      volume: string | null;
      chapter: string | null;
      title: string | null;
      publishAt: string;
      translatedLanguage: string;
    };
  }[];
  limit: number;
  offset: number;
  total: number;
}

// ─── Public API Functions ─────────────────────────

/** Search for Manga/Manhwa on MangaDex */
export async function searchManga(
  query: string,
  page = 1
): Promise<{ results: SearchResult[]; total: number; totalPages: number }> {
  const limit = 20;
  const offset = (page - 1) * limit;

  const data = await mangadexFetch<MangaDexSearchResponse>("/manga", {
    title: query,
    limit: String(limit),
    offset: String(offset),
    "includes[]": ["cover_art"],
    "contentRating[]": ["safe", "suggestive"],
  });

  const results: SearchResult[] = data.data.map((item) => {
    // Find cover art relation
    const coverArt = item.relationships.find((r) => r.type === "cover_art");
    const coverFileName = coverArt?.attributes?.fileName;
    const coverImage = coverFileName
      ? `https://uploads.mangadex.org/covers/${item.id}/${coverFileName}.256.jpg`
      : undefined;

    // Determine titles
    const title = item.attributes.title.en || Object.values(item.attributes.title)[0] || "Unknown Title";
    
    // Find a native/original title in altTitles
    let titleOriginal: string | undefined = undefined;
    const jaTitle = item.attributes.altTitles.find((t) => t.ja !== undefined || t["ja-ro"] !== undefined);
    if (jaTitle) {
      titleOriginal = jaTitle.ja || jaTitle["ja-ro"];
    }

    return {
      externalId: item.id,
      source: "mangadex",
      contentType: "MANGA" as ContentType, // Can also be Manhwa, but default is MANGA
      title,
      titleOriginal,
      coverImage,
      year: item.attributes.year,
      genres: [], // Mapping tags to genres can be added later if needed
      status: mapMangaDexStatus(item.attributes.status),
    };
  });

  return {
    results,
    total: data.total,
    totalPages: Math.ceil(data.total / limit),
  };
}

/** Get chapters feed for a Manga ID (English translation by default) */
export async function getMangaChapters(
  mangaId: string,
  page = 1,
  limit = 100
): Promise<{ chapters: MangaDexChapter[]; total: number }> {
  const offset = (page - 1) * limit;

  const data = await mangadexFetch<MangaDexFeedResponse>(`/manga/${mangaId}/feed`, {
    limit: String(limit),
    offset: String(offset),
    "translatedLanguage[]": ["en"],
    "order[chapter]": "asc",
  });

  const chapters: MangaDexChapter[] = data.data.map((ch) => ({
    id: ch.id,
    chapter: ch.attributes.chapter,
    volume: ch.attributes.volume,
    title: ch.attributes.title,
    publishAt: ch.attributes.publishAt,
  }));

  return {
    chapters,
    total: data.total,
  };
}
