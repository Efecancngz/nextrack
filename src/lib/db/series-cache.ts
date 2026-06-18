import { getTvSeriesDetail, tmdbImage, mapTmdbStatus } from "@/lib/api/tmdb";
import { getMangaChapters } from "@/lib/api/mangadex";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/app-error";
import type { Prisma } from "@/generated/prisma/client";
import type { ContentType, ContentStatus } from "@/types/common";
import type { PlatformAvailability } from "@/types/series";

export function parseCompoundId(compoundId: string): { source: string; externalId: string } {
  const dashIndex = compoundId.indexOf("-");
  if (dashIndex === -1) {
    throw AppError.badRequest("Invalid series ID format. Expected: {source}-{externalId}");
  }
  const source = compoundId.substring(0, dashIndex);
  const externalId = compoundId.substring(dashIndex + 1);
  if (!externalId) {
    throw AppError.badRequest("Missing external ID");
  }
  return { source, externalId };
}

interface SeriesFields {
  contentType: ContentType;
  status: ContentStatus;
  title: string;
  titleOriginal?: string;
  titleRomaji?: string;
  synopsis?: string;
  coverImage?: string;
  bannerImage?: string;
  genres: string[];
  tags: string[];
  year?: number;
  totalEpisodes?: number;
  totalChapters?: number;
  totalVolumes?: number;
  ratingExternal?: number;
  ratingTmdb?: number;
  ratingAniList?: number;
  platforms: PlatformAvailability[];
}

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
  };
}

async function fetchAniListFields(externalId: string): Promise<SeriesFields> {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_DETAIL_QUERY, variables: { id: Number(externalId) } }),
    next: { revalidate: 3600 },
  });

  const json = (await res.json()) as { data?: AniListDetailResponse };
  const media = json.data?.Media;
  if (!media) throw AppError.notFound("AniList media");

  const formatMap: Record<string, ContentType> = {
    TV: "ANIME", TV_SHORT: "ANIME", MOVIE: "ANIME", SPECIAL: "ANIME",
    OVA: "ANIME", ONA: "ANIME", MUSIC: "ANIME", MANGA: "MANGA",
    NOVEL: "LIGHT_NOVEL", ONE_SHOT: "MANGA",
  };
  const statusMap: Record<string, ContentStatus> = {
    FINISHED: "COMPLETED", RELEASING: "ONGOING", NOT_YET_RELEASED: "UPCOMING",
    CANCELLED: "CANCELLED", HIATUS: "HIATUS",
  };

  return {
    contentType: formatMap[media.format] || "ANIME",
    status: statusMap[media.status] || "ONGOING",
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
    ratingExternal: media.averageScore ? media.averageScore / 10 : undefined,
    ratingAniList: media.averageScore ? media.averageScore / 10 : undefined,
    platforms: [],
  };
}

async function fetchSeriesFields(source: string, externalId: string): Promise<SeriesFields> {
  switch (source) {
    case "tmdb": {
      const { detail, platforms } = await getTvSeriesDetail(externalId);
      const rating = detail.vote_average && detail.vote_average > 0 ? detail.vote_average : undefined;
      return {
        contentType: "TV_SERIES",
        status: mapTmdbStatus(detail.status || ""),
        title: detail.name || "Unknown",
        titleOriginal: detail.original_name !== detail.name ? detail.original_name : undefined,
        synopsis: detail.overview,
        coverImage: tmdbImage(detail.poster_path),
        bannerImage: tmdbImage(detail.backdrop_path, "w780"),
        year: detail.first_air_date ? new Date(detail.first_air_date).getFullYear() : undefined,
        genres: detail.genres?.map((g) => g.name) || [],
        tags: detail.keywords?.results?.map((k) => k.name) || [],
        totalEpisodes: detail.number_of_episodes,
        ratingExternal: rating,
        ratingTmdb: rating,
        platforms,
      };
    }
    case "anilist":
      return fetchAniListFields(externalId);
    case "mangadex": {
      const chapters = await getMangaChapters(externalId, 1, 10);
      return {
        contentType: "MANGA",
        status: "ONGOING",
        title: "Manga",
        genres: [],
        tags: [],
        totalChapters: chapters.total,
        platforms: [],
      };
    }
    default:
      throw AppError.notFound("Series source");
  }
}

export async function getOrCreateSeriesFromCompoundId(compoundId: string) {
  const { source, externalId } = parseCompoundId(compoundId);

  const existing = await prisma.series.findUnique({
    where: { externalId_source: { externalId, source } },
  });
  if (existing) return existing;

  const fields = await fetchSeriesFields(source, externalId);

  return prisma.series.create({
    data: {
      externalId,
      source,
      contentType: fields.contentType,
      status: fields.status,
      title: fields.title,
      titleOriginal: fields.titleOriginal,
      titleRomaji: fields.titleRomaji,
      synopsis: fields.synopsis,
      coverImage: fields.coverImage,
      bannerImage: fields.bannerImage,
      genres: fields.genres,
      tags: fields.tags,
      year: fields.year,
      totalEpisodes: fields.totalEpisodes,
      totalChapters: fields.totalChapters,
      totalVolumes: fields.totalVolumes,
      ratingExternal: fields.ratingExternal,
      ratingTmdb: fields.ratingTmdb,
      ratingAniList: fields.ratingAniList,
      platforms: fields.platforms as unknown as Prisma.InputJsonValue,
    },
  });
}
