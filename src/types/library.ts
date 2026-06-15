import type { LibraryStatus } from "./common";
import type { SeriesCard } from "./series";

/** Full library entry with series data */
export interface LibraryEntry {
  id: string;
  userId: string;
  seriesId: string;
  status: LibraryStatus;

  // Progress
  currentSeason?: number;
  currentEpisode?: number;
  currentChapter?: number;
  currentVolume?: number;

  startedAt?: string;    // ISO date string
  completedAt?: string;

  createdAt: string;
  updatedAt: string;

  // Joined series data
  series: SeriesCard;

  // User's personal rating (if exists)
  userScore?: number;
}

/** Progress update payload */
export interface ProgressUpdate {
  currentSeason?: number;
  currentEpisode?: number;
  currentChapter?: number;
  currentVolume?: number;
  status?: LibraryStatus;
}

/** Library counts by status */
export interface LibraryStats {
  total: number;
  watching: number;
  planToWatch: number;
  completed: number;
  onHold: number;
  dropped: number;
}
