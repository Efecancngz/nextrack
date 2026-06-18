import { describe, it, expect, vi, afterEach } from "vitest";
import { searchManga, getMangaChapters } from "@/lib/api/mangadex";

describe("mangadex client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("searchManga", () => {
    it("should fetch and normalize results including cover image mapping", async () => {
      const mockSearchResponse = {
        result: "ok",
        response: "collection",
        data: [
          {
            id: "manga-123",
            type: "manga",
            attributes: {
              title: { en: "Test Manga" },
              altTitles: [{ ja: "テスト漫画" }],
              description: { en: "A nice test manga" },
              status: "ongoing",
              year: 2026,
            },
            relationships: [
              {
                id: "cover-456",
                type: "cover_art",
                attributes: {
                  fileName: "cover_file.png",
                },
              },
            ],
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
      };

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const res = await searchManga("Test Query", 1);

      expect(fetchSpy).toHaveBeenCalled();
      expect(res.results.length).toBe(1);
      expect(res.results[0].externalId).toBe("manga-123");
      expect(res.results[0].title).toBe("Test Manga");
      expect(res.results[0].titleOriginal).toBe("テスト漫画");
      expect(res.results[0].coverImage).toBe("https://uploads.mangadex.org/covers/manga-123/cover_file.png.256.jpg");
      expect(res.results[0].status).toBe("ONGOING");
      expect(res.results[0].year).toBe(2026);
      expect(res.total).toBe(1);
      expect(res.totalPages).toBe(1);
    });

    it("should fallback to alternative titles when english title is missing", async () => {
      const mockSearchResponse = {
        result: "ok",
        response: "collection",
        data: [
          {
            id: "manga-abc",
            type: "manga",
            attributes: {
              title: { ja: "Original Title Only" },
              altTitles: [],
              description: {},
              status: "completed",
              year: 2020,
            },
            relationships: [],
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
      };

      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const res = await searchManga("Test Query", 1);
      expect(res.results[0].title).toBe("Original Title Only");
      expect(res.results[0].status).toBe("COMPLETED");
    });
  });

  describe("getMangaChapters", () => {
    it("should fetch chapters and map response keys correctly", async () => {
      const mockFeedResponse = {
        result: "ok",
        response: "collection",
        data: [
          {
            id: "chapter-1",
            type: "chapter",
            attributes: {
              volume: "1",
              chapter: "12",
              title: "Beginning of the end",
              publishAt: "2026-06-17T12:00:00Z",
              translatedLanguage: "en",
            },
          },
        ],
        limit: 100,
        offset: 0,
        total: 1,
      };

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockFeedResponse,
      } as Response);

      const res = await getMangaChapters("manga-123", 1, 100);

      expect(fetchSpy).toHaveBeenCalled();
      expect(res.chapters.length).toBe(1);
      expect(res.chapters[0].id).toBe("chapter-1");
      expect(res.chapters[0].volume).toBe("1");
      expect(res.chapters[0].chapter).toBe("12");
      expect(res.chapters[0].title).toBe("Beginning of the end");
      expect(res.chapters[0].publishAt).toBe("2026-06-17T12:00:00Z");
      expect(res.total).toBe(1);
    });
  });
});
