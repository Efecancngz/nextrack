/**
 * GET /api/series/[id] — Get full series detail
 *
 * Route param format: {source}-{externalId}
 *   e.g. "tmdb-12345", "anilist-98765", "mangadex-abc-def-123"
 *
 * For MangaDex, the externalId is a UUID so we split on the first "-" only for source,
 * then the rest is the externalId.
 */

import { type NextRequest } from "next/server";
import { getTvSeriesDetail, tmdbImage, mapTmdbStatus } from "@/lib/api/tmdb";
import { getMangaChapters } from "@/lib/api/mangadex";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, compose } from "@/lib/utils/middleware";
import type { SeriesDetail } from "@/types/series";

export const dynamic = "force-dynamic";

async function handler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id } = await params;
  if (!id) {
    return Responses.badRequest("Missing series ID");
  }

  // Parse source and externalId from compound ID
  const dashIndex = id.indexOf("-");
  if (dashIndex === -1) {
    return Responses.badRequest("Invalid series ID format. Expected: {source}-{externalId}");
  }

  const source = id.substring(0, dashIndex);
  const externalId = id.substring(dashIndex + 1);

  if (!externalId) {
    return Responses.badRequest("Missing external ID");
  }

  let detail: SeriesDetail;

  switch (source) {
    case "tmdb": {
      const { detail: tmdbDetail, platforms } = await getTvSeriesDetail(externalId);
      detail = {
        id: id,
        externalId,
        source: "tmdb",
        contentType: "TV_SERIES",
        status: mapTmdbStatus(tmdbDetail.status || ""),
        title: tmdbDetail.name || "Unknown",
        titleOriginal: tmdbDetail.original_name !== tmdbDetail.name ? tmdbDetail.original_name : undefined,
        synopsis: tmdbDetail.overview,
        coverImage: tmdbImage(tmdbDetail.poster_path),
        bannerImage: tmdbImage(tmdbDetail.backdrop_path, "w780"),
        year: tmdbDetail.first_air_date ? new Date(tmdbDetail.first_air_date).getFullYear() : undefined,
        genres: tmdbDetail.genres?.map((g) => g.name) || [],
        tags: tmdbDetail.keywords?.results?.map((k) => k.name) || [],
        totalEpisodes: tmdbDetail.number_of_episodes,
        ratingExternal: tmdbDetail.vote_average && tmdbDetail.vote_average > 0 ? tmdbDetail.vote_average : undefined,
        ratingTmdb: tmdbDetail.vote_average && tmdbDetail.vote_average > 0 ? tmdbDetail.vote_average : undefined,
        platforms,
      };
      break;
    }

    case "anilist": {
      // AniList doesn't have a direct "get by ID" in our client,
      // so we use a direct GraphQL query
      const aniDetail = await fetchAniListDetail(externalId);
      detail = {
        id: id,
        externalId,
        source: "anilist",
        contentType: aniDetail.contentType,
        status: aniDetail.status,
        title: aniDetail.title,
        titleOriginal: aniDetail.titleOriginal,
        titleRomaji: aniDetail.titleRomaji,
        synopsis: aniDetail.synopsis,
        coverImage: aniDetail.coverImage,
        bannerImage: aniDetail.bannerImage,
        year: aniDetail.year,
        genres: aniDetail.genres,
        tags: aniDetail.tags,
        totalEpisodes: aniDetail.totalEpisodes,
        totalChapters: aniDetail.totalChapters,
        totalVolumes: aniDetail.totalVolumes,
        ratingExternal: aniDetail.ratingAniList,
        ratingAniList: aniDetail.ratingAniList,
        platforms: [],
      };
      break;
    }

    case "mangadex": {
      // For MangaDex, we get chapters
      const chapters = await getMangaChapters(externalId, 1, 10);
      detail = {
        id: id,
        externalId,
        source: "mangadex",
        contentType: "MANGA",
        status: "ONGOING",
        title: "Manga",
        genres: [],
        tags: [],
        platforms: [],
        totalChapters: chapters.total,
      };
      break;
    }

    default:
      return Responses.notFound("Series source");
  }

  return successResponse(detail);
}

export const GET = compose(withErrorHandler)(handler);

// ─── AniList direct detail fetch ──────────────────

const ANILIST_DETAIL_QUERY = `
  query MediaDetail($id: Int) {
    Media(id: $id) {
      id
      title { romaji english native }
      format
      status
      description(asHtml: false)
      coverImage { extraLarge large }
      bannerImage
      startDate { year }
      genres
      tags { name rank }
      episodes
      chapters
      volumes
      averageScore
      meanScore
    }
  }
`;

interface AniListDetailResponse {
  Media: {
    id: number;
    title: { romaji: string; english?: string; native?: string };
    format: string;
    status: string;
    description?: string;
    coverImage: { extraLarge?: string; large: string };
    bannerImage?: string;
    startDate: { year?: number };
    genres: string[];
    tags: { name: string; rank: number }[];
    episodes?: number;
    chapters?: number;
    volumes?: number;
    averageScore?: number;
    meanScore?: number;
  };
}

async function fetchAniListDetail(anilistId: string) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_DETAIL_QUERY, variables: { id: Number(anilistId) } }),
    next: { revalidate: 3600 },
  });

  const json = (await res.json()) as { data?: AniListDetailResponse };
  const media = json.data?.Media;

  if (!media) throw new Error("AniList media not found");

  const formatMap: Record<string, string> = {
    TV: "ANIME", TV_SHORT: "ANIME", MOVIE: "ANIME", SPECIAL: "ANIME",
    OVA: "ANIME", ONA: "ANIME", MUSIC: "ANIME", MANGA: "MANGA",
    NOVEL: "LIGHT_NOVEL", ONE_SHOT: "MANGA",
  };

  const statusMap: Record<string, string> = {
    FINISHED: "COMPLETED", RELEASING: "ONGOING", NOT_YET_RELEASED: "UPCOMING",
    CANCELLED: "CANCELLED", HIATUS: "HIATUS",
  };

  return {
    contentType: (formatMap[media.format] || "ANIME") as SeriesDetail["contentType"],
    status: (statusMap[media.status] || "ONGOING") as SeriesDetail["status"],
    title: media.title.english || media.title.romaji,
    titleOriginal: media.title.native,
    titleRomaji: media.title.romaji,
    synopsis: media.description?.replace(/<[^>]*>/g, "") || undefined,
    coverImage: media.coverImage.extraLarge || media.coverImage.large,
    bannerImage: media.bannerImage,
    year: media.startDate.year,
    genres: media.genres,
    tags: media.tags.filter((t) => t.rank >= 60).map((t) => t.name),
    totalEpisodes: media.episodes,
    totalChapters: media.chapters,
    totalVolumes: media.volumes,
    ratingAniList: media.averageScore ? media.averageScore / 10 : undefined,
  };
}
