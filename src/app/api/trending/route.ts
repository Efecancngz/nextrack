/**
 * GET /api/trending — Trending series from multiple sources
 *
 * Query params:
 *   type - "all" | "tv" | "anime" (default: "all")
 */

import { type NextRequest } from "next/server";
import { getTrendingTvSeries } from "@/lib/api/tmdb";
import { getTrendingAnime } from "@/lib/api/anilist";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, compose } from "@/lib/utils/middleware";
import type { SearchResult } from "@/types/series";

/** Cache trending data for 1 hour */
export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "all";

  const sections: { label: string; slug: string; items: SearchResult[] }[] = [];

  try {
    if (type === "all" || type === "tv") {
      const tvResults = await getTrendingTvSeries();
      sections.push({
        label: "Trending TV Series",
        slug: "tv",
        items: tvResults.slice(0, 12),
      });
    }
  } catch (err) {
    console.error("[Trending] TMDB error:", err);
  }

  try {
    if (type === "all" || type === "anime") {
      const animeResults = await getTrendingAnime();
      sections.push({
        label: "Trending Anime",
        slug: "anime",
        items: animeResults.slice(0, 12),
      });
    }
  } catch (err) {
    console.error("[Trending] AniList error:", err);
  }

  return successResponse({ sections });
}

export const GET = compose(withErrorHandler)(handler);
