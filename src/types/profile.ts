import type { ContentType } from "./common";

export interface ProfileStatsData {
  byContentType: Record<ContentType, number>;
  episodesWatched: number;
  chaptersRead: number;
  averageRating: number | null;
}
