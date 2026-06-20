import { getTvNextAirDate } from "./api/tmdb";
import { getAnimeNextAiringEpisode } from "./api/anilist";
import type { LibraryEntry } from "@/types/library";

export interface CalendarEntry {
  libraryItemId: string;
  series: LibraryEntry["series"];
  airDate: string | null; // "YYYY-MM-DD" for TMDB, ISO instant for AniList, null if unknown
  hasExactTime: boolean;  // true = airDate is a UTC instant (AniList); false = date-only string or null
}

export async function getUpcomingReleases(entries: LibraryEntry[]): Promise<CalendarEntry[]> {
  return Promise.all(
    entries.map(async (entry): Promise<CalendarEntry> => {
      // getTvNextAirDate/getAnimeNextAiringEpisode already catch their own fetch errors
      // and resolve to null rather than throwing — no try/catch needed at this layer too.
      if (entry.series.source === "tmdb") {
        const airDate = await getTvNextAirDate(entry.series.externalId);
        return { libraryItemId: entry.id, series: entry.series, airDate, hasExactTime: false };
      }
      if (entry.series.source === "anilist" && entry.series.contentType === "ANIME") {
        const airDate = await getAnimeNextAiringEpisode(entry.series.externalId);
        return { libraryItemId: entry.id, series: entry.series, airDate, hasExactTime: true };
      }
      return { libraryItemId: entry.id, series: entry.series, airDate: null, hasExactTime: false };
    })
  );
}

/**
 * Returns the local calendar-day key ("YYYY-MM-DD") an entry falls on, or null if unknown.
 * Must only be called from client components — for `hasExactTime` entries it relies on
 * `Date`'s local getters, which resolve to the *caller's* timezone.
 */
export function dayKeyOf(entry: CalendarEntry): string | null {
  if (!entry.airDate) return null;
  if (entry.hasExactTime) {
    const d = new Date(entry.airDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return entry.airDate; // already "YYYY-MM-DD" — never re-parsed through `new Date()`
}
