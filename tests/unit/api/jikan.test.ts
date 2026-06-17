import { describe, it, expect, vi, afterEach } from "vitest";
import { searchAnimeOnMal, searchMangaOnMal, getAnimeDetailOnMal, getMangaDetailOnMal } from "@/lib/api/jikan";

describe("jikan client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockJikanMedia = (overrides = {}) => ({
    mal_id: 9999,
    title: "Test Media",
    title_english: "Test Media English",
    title_japanese: "テストメディア",
    images: {
      jpg: { image_url: "jpg.jpg", large_image_url: "jpg_large.jpg" },
      webp: { image_url: "webp.webp", large_image_url: "webp_large.jpg" },
    },
    status: "Currently Airing",
    score: 8.75,
    scored_by: 100,
    type: "TV",
    synopsis: "Description here",
    genres: [{ name: "Adventure" }],
    year: 2026,
    ...overrides,
  });

  const mockSearchResponse = (data: unknown[]) => ({
    data,
    pagination: {
      last_visible_page: 1,
      has_next_page: false,
      items: {
        count: data.length,
        total: data.length,
        per_page: 20,
      },
    },
  });

  describe("searchAnimeOnMal", () => {
    it("should fetch anime and map fields correctly", async () => {
      const mediaList = [
        mockJikanMedia({ status: "Currently Airing" }),
        mockJikanMedia({ mal_id: 100, status: "Finished Airing", score: null }),
      ];

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse(mediaList),
      } as Response);

      const res = await searchAnimeOnMal("test query", 1);

      expect(fetchSpy).toHaveBeenCalled();
      expect(res.results.length).toBe(2);
      expect(res.results[0].externalId).toBe("9999");
      expect(res.results[0].contentType).toBe("ANIME");
      expect(res.results[0].title).toBe("Test Media English");
      expect(res.results[0].coverImage).toBe("webp_large.jpg");
      expect(res.results[0].status).toBe("ONGOING");
      expect(res.results[0].ratingExternal).toBe(8.75);

      expect(res.results[1].status).toBe("COMPLETED");
      expect(res.results[1].ratingExternal).toBeUndefined();
    });

    it("should throw rate-limit warning when 429 is encountered", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue({
        status: 429,
        ok: false,
      } as Response);

      await expect(searchAnimeOnMal("test query")).rejects.toThrow("MyAnimeList API rate limit reached");
    });
  });

  describe("searchMangaOnMal", () => {
    it("should fetch manga and map status correctly", async () => {
      const mediaList = [
        mockJikanMedia({ status: "Currently Publishing" }),
        mockJikanMedia({ mal_id: 200, status: "Finished" }),
        mockJikanMedia({ mal_id: 300, status: "On Hiatus" }),
        mockJikanMedia({ mal_id: 400, status: "Discontinued" }),
      ];

      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse(mediaList),
      } as Response);

      const res = await searchMangaOnMal("test query", 1);
      expect(res.results[0].contentType).toBe("MANGA");
      expect(res.results[0].status).toBe("ONGOING");
      expect(res.results[1].status).toBe("COMPLETED");
      expect(res.results[2].status).toBe("HIATUS");
      expect(res.results[3].status).toBe("CANCELLED");
    });
  });

  describe("details getters", () => {
    it("should fetch details for anime", async () => {
      const mediaData = mockJikanMedia();
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ data: mediaData }),
      } as Response);

      const res = await getAnimeDetailOnMal("9999");
      expect(fetchSpy).toHaveBeenCalled();
      expect(res.mal_id).toBe(9999);
    });

    it("should fetch details for manga", async () => {
      const mediaData = mockJikanMedia({ type: "Manga" });
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ data: mediaData }),
      } as Response);

      const res = await getMangaDetailOnMal("8888");
      expect(fetchSpy).toHaveBeenCalled();
      expect(res.type).toBe("Manga");
    });
  });
});
