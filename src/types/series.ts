import type { ContentType, ContentStatus } from "./common";

/** Platform availability item (stored in Series.platforms JSON) */
export interface PlatformAvailability {
  platformId: string;       // e.g. "netflix", "crunchyroll"
  platformName: string;     // e.g. "Netflix", "Crunchyroll"
  platformLogo?: string;    // URL to logo
  url?: string;             // Direct link to the content
  region?: string[];        // Available regions e.g. ["US", "TR"]
  subscriptionType: "subscription" | "free" | "rent" | "buy" | "unknown";
}

/** External rating from one source */
export interface ExternalRating {
  source: "tmdb" | "anilist" | "imdb" | "mal";
  score: number;    // normalized 0-10
  votes?: number;   // number of votes/reviews
}

/** Card view — minimal data for grid/list display */
export interface SeriesCard {
  id: string;             // On SeriesDetail (from /api/series/[id]), this is the compound "{source}-{externalId}" route param, NOT a DB id -- only resolve a real Prisma Series.id via a DB lookup (e.g. prisma.series.findUnique by externalId+source) when one is needed as a foreign key
  externalId: string;
  source: string;
  contentType: ContentType;
  status: ContentStatus;
  title: string;
  titleOriginal?: string;
  coverImage?: string;
  year?: number;
  genres: string[];
  ratingExternal?: number;       // Aggregated 0-10
  totalEpisodes?: number;
  totalChapters?: number;
  platforms: PlatformAvailability[];
}

/** Detail view — full series info */
export interface SeriesDetail extends SeriesCard {
  titleRomaji?: string;
  synopsis?: string;
  bannerImage?: string;
  tags: string[];
  season?: string;
  totalVolumes?: number;
  ratingTmdb?: number;
  ratingAniList?: number;
  ratingImdb?: number;
  ratingMal?: number;
}

/** Search result from external API (before DB caching) */
export interface SearchResult {
  externalId: string;
  source: string;
  contentType: ContentType;
  title: string;
  titleOriginal?: string;
  coverImage?: string;
  year?: number;
  genres: string[];
  status: ContentStatus;
  ratingExternal?: number;
  popularity?: number;
}
