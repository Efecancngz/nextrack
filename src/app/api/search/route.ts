/**
 * GET /api/search — Unified multi-source series search
 *
 * Query params:
 *   q     - search query (required, min 2 chars)
 *   type  - content type filter: "all" | "tv" | "anime" | "manga" (default: "all")
 *   page  - pagination (default: 1)
 */

import { type NextRequest } from "next/server";
import { searchTvSeries } from "@/lib/api/tmdb";
import { searchAniList } from "@/lib/api/anilist";
import { searchManga } from "@/lib/api/mangadex";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";
import type { SearchResult } from "@/types/series";

async function handler(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "all";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  if (!query || query.length < 2) {
    return Responses.badRequest("Search query must be at least 2 characters");
  }

  const results: SearchResult[] = [];
  let total = 0;

  // Each source has its own try-catch so one failure doesn't block others
  if (type === "all" || type === "tv") {
    try {
      const tv = await searchTvSeries(query, page);
      results.push(...tv.results);
      total += tv.total;
    } catch (err) {
      console.error("[Search] TMDB error:", err);
    }
  }

  if (type === "all" || type === "anime") {
    try {
      const anime = await searchAniList(query, "ANIME", page);
      results.push(...anime.results);
      total += anime.total;
    } catch (err) {
      console.error("[Search] AniList anime error:", err);
    }
  }

  if (type === "all" || type === "manga") {
    const fetches = [
      searchManga(query, page).catch((err) => {
        console.error("[Search] MangaDex error:", err);
        return { results: [] as SearchResult[], total: 0, totalPages: 0 };
      }),
      searchAniList(query, "MANGA", page).catch((err) => {
        console.error("[Search] AniList manga error:", err);
        return { results: [] as SearchResult[], total: 0, totalPages: 0 };
      }),
    ];
    const [mangadex, anilistManga] = await Promise.all(fetches);
    results.push(...mangadex.results);
    results.push(...anilistManga.results);
    total += mangadex.total + anilistManga.total;
  }

  // Sort: prioritize results with cover images and higher ratings
  results.sort((a, b) => {
    if (a.coverImage && !b.coverImage) return -1;
    if (!a.coverImage && b.coverImage) return 1;
    return (b.ratingExternal ?? 0) - (a.ratingExternal ?? 0);
  });

  return successResponse({
    results,
    total,
    page,
    query,
    type,
  });
}

export const GET = compose(withErrorHandler, withRateLimit)(handler);
