import { describe, it, expect, vi, afterEach } from "vitest";
import { searchAniList, getTrendingAnime, getTrendingManga, getTrendingManhwa, getTrendingNovel } from "@/lib/api/anilist";

describe("anilist client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockMedia = (overrides = {}) => ({
    id: 1111,
    title: { romaji: "Romaji Title", english: "English Title", native: "Native Title" },
    format: "TV",
    status: "RELEASING",
    coverImage: { large: "cover.jpg" },
    startDate: { year: 2026 },
    genres: ["Action", "Sci-Fi"],
    averageScore: 85,
    episodes: 24,
    chapters: null,
    countryOfOrigin: "JP",
    ...overrides,
  });

  const mockResponse = (mediaList: unknown[]) => ({
    data: {
      Page: {
        pageInfo: { total: mediaList.length, currentPage: 1, lastPage: 1 },
        media: mediaList,
      },
    },
  });

  describe("searchAniList and mapping", () => {
    it("should fetch, normalize ratings to 0-10, and map status and formats correctly", async () => {
      const mediaItems = [
        mockMedia({ format: "TV", status: "RELEASING", averageScore: 85 }),
        mockMedia({ id: 2, format: "MANGA", countryOfOrigin: "JP", status: "FINISHED", averageScore: 90 }),
        mockMedia({ id: 3, format: "MANGA", countryOfOrigin: "KR", status: "HIATUS", averageScore: 78 }),
        mockMedia({ id: 4, format: "NOVEL", countryOfOrigin: "JP", status: "NOT_YET_RELEASED", averageScore: undefined }),
      ];

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponse(mediaItems),
      } as Response);

      const res = await searchAniList("test", "ANIME", 1);
      expect(fetchSpy).toHaveBeenCalled();
      expect(res.results.length).toBe(4);

      // Item 0: Anime (TV format), releasing -> ONGOING, rating 8.5
      expect(res.results[0].contentType).toBe("ANIME");
      expect(res.results[0].status).toBe("ONGOING");
      expect(res.results[0].ratingExternal).toBe(8.5);

      // Item 1: Manga from JP -> MANGA, finished -> COMPLETED, rating 9.0
      expect(res.results[1].contentType).toBe("MANGA");
      expect(res.results[1].status).toBe("COMPLETED");
      expect(res.results[1].ratingExternal).toBe(9.0);

      // Item 2: Manga from KR -> MANHWA, hiatus -> HIATUS, rating 7.8
      expect(res.results[2].contentType).toBe("MANHWA");
      expect(res.results[2].status).toBe("HIATUS");
      expect(res.results[2].ratingExternal).toBe(7.8);

      // Item 3: Novel from JP -> LIGHT_NOVEL, not yet released -> UPCOMING, rating undefined
      expect(res.results[3].contentType).toBe("LIGHT_NOVEL");
      expect(res.results[3].status).toBe("UPCOMING");
      expect(res.results[3].ratingExternal).toBeUndefined();
    });

    it("should throw custom operational error on GraphQL errors", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          errors: [{ message: "Invalid variables" }],
        }),
      } as Response);

      await expect(searchAniList("test")).rejects.toThrow("Invalid variables");
    });
  });

  describe("trending getters", () => {
    it("should query for trending anime", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponse([mockMedia()]),
      } as Response);

      const results = await getTrendingAnime();
      expect(results.length).toBe(1);
      expect(fetchSpy).toHaveBeenCalled();
      const fetchBody = JSON.parse(((fetchSpy.mock.calls[0][1] as RequestInit)?.body as string) || "{}");
      expect(fetchBody.variables.type).toBe("ANIME");
    });

    it("should query for trending manga (specifically JP)", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponse([mockMedia({ format: "MANGA" })]),
      } as Response);

      const results = await getTrendingManga();
      expect(results.length).toBe(1);
      expect(fetchSpy).toHaveBeenCalled();
      const fetchBody = JSON.parse(((fetchSpy.mock.calls[0][1] as RequestInit)?.body as string) || "{}");
      expect(fetchBody.variables.type).toBe("MANGA");
      expect(fetchBody.variables.format).toBe("MANGA");
      expect(fetchBody.variables.countryOfOrigin).toBe("JP");
    });

    it("should query for trending manhwa (specifically KR)", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponse([mockMedia({ format: "MANGA", countryOfOrigin: "KR" })]),
      } as Response);

      const results = await getTrendingManhwa();
      expect(results.length).toBe(1);
      expect(fetchSpy).toHaveBeenCalled();
      const fetchBody = JSON.parse(((fetchSpy.mock.calls[0][1] as RequestInit)?.body as string) || "{}");
      expect(fetchBody.variables.type).toBe("MANGA");
      expect(fetchBody.variables.format).toBe("MANGA");
      expect(fetchBody.variables.countryOfOrigin).toBe("KR");
    });

    it("should query for trending novels", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponse([mockMedia({ format: "NOVEL" })]),
      } as Response);

      const results = await getTrendingNovel();
      expect(results.length).toBe(1);
      expect(fetchSpy).toHaveBeenCalled();
      const fetchBody = JSON.parse(((fetchSpy.mock.calls[0][1] as RequestInit)?.body as string) || "{}");
      expect(fetchBody.variables.type).toBe("MANGA");
      expect(fetchBody.variables.format).toBe("NOVEL");
    });
  });
});
