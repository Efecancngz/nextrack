/**
 * Common shared types used across the application.
 */

export type ContentType =
  | "TV_SERIES"
  | "ANIME"
  | "MANGA"
  | "MANHWA"
  | "LIGHT_NOVEL"
  | "WEBTOON";

export type ContentStatus =
  | "ONGOING"
  | "COMPLETED"
  | "HIATUS"
  | "CANCELLED"
  | "UPCOMING";

export type LibraryStatus =
  | "WATCHING"
  | "PLAN_TO_WATCH"
  | "COMPLETED"
  | "ON_HOLD"
  | "DROPPED";

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Paginated response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

/** Content type display info */
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  TV_SERIES: "TV Series",
  ANIME: "Anime",
  MANGA: "Manga",
  MANHWA: "Manhwa",
  LIGHT_NOVEL: "Light Novel",
  WEBTOON: "Webtoon",
};

export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
  WATCHING: "Watching",
  PLAN_TO_WATCH: "Plan to Watch",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  DROPPED: "Dropped",
};

export const CONTENT_TYPE_BADGE_CLASS: Record<ContentType, string> = {
  TV_SERIES: "badge-tv",
  ANIME: "badge-anime",
  MANGA: "badge-manga",
  MANHWA: "badge-manhwa",
  LIGHT_NOVEL: "badge-light-novel",
  WEBTOON: "badge-webtoon",
};

export const LIBRARY_STATUS_BADGE_CLASS: Record<LibraryStatus, string> = {
  WATCHING: "badge-watching",
  PLAN_TO_WATCH: "badge-plan",
  COMPLETED: "badge-completed",
  ON_HOLD: "badge-on-hold",
  DROPPED: "badge-dropped",
};
