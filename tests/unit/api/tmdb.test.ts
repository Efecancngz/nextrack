import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("tmdb client", () => {
  const originalApiKey = process.env.TMDB_API_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.TMDB_API_KEY = originalApiKey;
    vi.restoreAllMocks();
  });

  describe("mapTmdbStatus", () => {
    it("should map TMDB status to ContentStatus", async () => {
      const { mapTmdbStatus } = await import("@/lib/api/tmdb");
      expect(mapTmdbStatus("Returning Series")).toBe("ONGOING");
      expect(mapTmdbStatus("Ended")).toBe("COMPLETED");
      expect(mapTmdbStatus("Canceled")).toBe("CANCELLED");
      expect(mapTmdbStatus("In Production")).toBe("UPCOMING");
      expect(mapTmdbStatus("Planned")).toBe("UPCOMING");
      expect(mapTmdbStatus("Unknown Status")).toBe("ONGOING");
    });
  });

  describe("tmdbImage", () => {
    it("should return correct URL when path is valid", async () => {
      const { tmdbImage } = await import("@/lib/api/tmdb");
      expect(tmdbImage("/path.jpg")).toBe("https://image.tmdb.org/t/p/w500/path.jpg");
      expect(tmdbImage("/path.jpg", "w92")).toBe("https://image.tmdb.org/t/p/w92/path.jpg");
    });

    it("should return undefined when path is falsy", async () => {
      const { tmdbImage } = await import("@/lib/api/tmdb");
      expect(tmdbImage(null)).toBeUndefined();
      expect(tmdbImage(undefined)).toBeUndefined();
    });
  });

  describe("when TMDB_API_KEY is not configured", () => {
    beforeEach(() => {
      delete process.env.TMDB_API_KEY;
    });

    it("should return mock search results", async () => {
      const { searchTvSeries } = await import("@/lib/api/tmdb");
      const results = await searchTvSeries("Breaking Bad");
      expect(results.results.length).toBeGreaterThan(0);
      expect(results.results[0].source).toBe("tmdb");
      expect(results.results[0].title).toBe("Breaking Bad");
    });

    it("should return mock detail data", async () => {
      const { getTvSeriesDetail } = await import("@/lib/api/tmdb");
      const { detail, platforms } = await getTvSeriesDetail("1396"); // Breaking Bad ID in mock
      expect(detail.name).toBe("Breaking Bad");
      expect(platforms.length).toBeGreaterThan(0);
    });

    it("should return empty detail data for unknown id", async () => {
      const { getTvSeriesDetail } = await import("@/lib/api/tmdb");
      const { detail, platforms } = await getTvSeriesDetail("unknown_id");
      expect(detail).toEqual({});
      expect(platforms).toEqual([]);
    });

    it("should return mock trending list", async () => {
      const { getTrendingTvSeries } = await import("@/lib/api/tmdb");
      const list = await getTrendingTvSeries();
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].source).toBe("tmdb");
    });
  });

  describe("when TMDB_API_KEY is configured", () => {
    beforeEach(() => {
      process.env.TMDB_API_KEY = "test_key";
    });

    it("should call fetch and map results for searchTvSeries", async () => {
      const { searchTvSeries } = await import("@/lib/api/tmdb");

      const mockSearchData = {
        results: [
          {
            id: 12345,
            name: "Test Show",
            original_name: "Test Show Original",
            overview: "A test show",
            poster_path: "/test.jpg",
            first_air_date: "2026-01-01",
            genre_ids: [1, 2],
            vote_average: 8.5,
          },
        ],
        total_results: 1,
        total_pages: 1,
        page: 1,
      };

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockSearchData,
      } as Response);

      const data = await searchTvSeries("Test", 1);
      expect(fetchSpy).toHaveBeenCalled();
      expect(data.results[0].externalId).toBe("12345");
      expect(data.results[0].title).toBe("Test Show");
      expect(data.results[0].ratingExternal).toBe(8.5);
      expect(data.results[0].coverImage).toBe("https://image.tmdb.org/t/p/w500/test.jpg");
    });
  });
});
