/**
 * GET /api/search/suggest — Lightweight autocomplete suggestions
 *
 * Query params:
 *   q     - search query (required, min 2 chars)
 *   type  - content type filter: "all" | "tv" | "anime" | "manga" (default: "all")
 *
 * Mirrors /api/search's source-bucketing logic but returns a trimmed shape
 * capped at 8 results, for a fast dropdown rather than the full results grid.
 */

import { type NextRequest } from "next/server";
import { searchTvSeries } from "@/lib/api/tmdb";
import { searchAniList } from "@/lib/api/anilist";
import { searchManga } from "@/lib/api/mangadex";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";
import type { SearchResult } from "@/types/series";

const SUGGESTION_LIMIT = 8;

interface SearchSuggestion {
  id: string;
  title: string;
  contentType: SearchResult["contentType"];
  year?: number;
  coverImage?: string;
}

function toSuggestion(item: SearchResult): SearchSuggestion {
  return {
    id: `${item.source}-${item.externalId}`,
    title: item.title,
    contentType: item.contentType,
    year: item.year,
    coverImage: item.coverImage,
  };
}

const EMPTY: { results: SearchResult[]; total: number; totalPages: number } = {
  results: [],
  total: 0,
  totalPages: 0,
};

async function handler(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "all";

  if (!query || query.length < 2) {
    return Responses.badRequest("Search query must be at least 2 characters");
  }

  const fetches: Promise<{ results: SearchResult[]; total: number; totalPages: number }>[] = [];

  if (type === "all" || type === "tv") {
    fetches.push(
      searchTvSeries(query, 1).catch((err) => {
        console.error("[Search Suggest] TMDB error:", err);
        return EMPTY;
      })
    );
  }

  if (type === "all" || type === "anime") {
    fetches.push(
      searchAniList(query, "ANIME", 1).catch((err) => {
        console.error("[Search Suggest] AniList anime error:", err);
        return EMPTY;
      })
    );
  }

  if (type === "all" || type === "manga") {
    fetches.push(
      searchManga(query, 1).catch((err) => {
        console.error("[Search Suggest] MangaDex error:", err);
        return EMPTY;
      }),
      searchAniList(query, "MANGA", 1).catch((err) => {
        console.error("[Search Suggest] AniList manga error:", err);
        return EMPTY;
      })
    );
  }

  const sources = await Promise.all(fetches);
  const results: SearchResult[] = [];
  for (const source of sources) {
    results.push(...source.results);
  }

  results.sort((a, b) => (b.ratingExternal ?? 0) - (a.ratingExternal ?? 0));

  const suggestions = results.slice(0, SUGGESTION_LIMIT).map(toSuggestion);

  return successResponse({ suggestions });
}

export const GET = compose(withErrorHandler, withRateLimit)(handler);
