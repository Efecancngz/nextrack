# API Data Sources & Integration Strategy

Free Serie Tracker relies on multiple external APIs to provide comprehensive tracking across different content types. Here is the detailed breakdown of where we get our data and how we use it.

## 1. TV Series & Movies
**Source:** [TMDB API (The Movie Database)](https://developer.themoviedb.org/docs)
- **What we pull:** Search results, metadata (title, overview, poster, release dates), seasons/episodes structure.
- **Why TMDB:** Industry standard, highly reliable, completely free, excellent multi-language support.
- **Platforms/Streaming:** We use TMDB's `watch/providers` endpoint (powered by JustWatch) to get legal streaming availability per country (Netflix, Disney+, etc.).

## 2. Anime, Light Novels & Webtoons
**Source:** [AniList GraphQL API](https://anilist.gitbook.io/anilist-apiv2-docs/)
- **What we pull:** Anime metadata, trending lists, scores, airing schedules, Light Novel & Webtoon metadata.
- **Why AniList:** GraphQL makes it highly efficient, rich metadata, fast updates for anime community, completely free.
- **Languages/Subtitles:** AniList provides basic language availability tags. For more real-time "Turkish Subtitle/Dub" availability, we will build a background cron job to scrape or query platform-specific data where available, matching it against AniList IDs.

## 3. Manga & Manhwa (Reading)
**Source:** [MangaDex API](https://api.mangadex.org/docs/)
- **What we pull:** Search, detailed metadata, and **chapter availability per language**.
- **Why MangaDex:** It is the largest legal/gray-area repository that specifically tracks fan-translations and official links. It has native support for querying chapters by language (e.g., `translatedLanguage[]=tr`).
- **How we use it for Turkish readers:** We can directly query MangaDex to see if a chapter has been uploaded/linked in Turkish.

## 4. Fallback Anime Data
**Source:** [Jikan API (MyAnimeList Unofficial)](https://docs.api.jikan.moe/)
- **What we pull:** MAL scores, fallback search if AniList is down.
- **Why Jikan:** To provide MyAnimeList scores alongside AniList scores.

## 5. Official Translation / Language Tracking (Phase 2)
To track when a specific episode or chapter gets a Turkish translation (or any other language) without hosting pirated links:
- **Manga/Manhwa:** Native support via MangaDex API.
- **Anime:** 
  - Periodic cron jobs fetching from official sources (Crunchyroll API if accessible, or community databases).
  - Storing the release timestamp of `language: tr` versus `language: en` in our database.
  - Sending a notification to users when the DB updates with a new language flag.

## 6. Personal Notes System (Phase 2)
To allow users to save their own custom links (e.g., to a specific fan-translation site) without making the platform liable:
- **Storage:** Stored entirely in our PostgreSQL DB (`UserNote` table).
- **Privacy:** `userId` strictly validated. Notes are 100% private and never exposed to the public or searchable by other users.
- **Format:** Simple text field and an optional URL field.

## Technical Architecture for API Fetching
- **Caching:** Next.js ISR (Incremental Static Regeneration).
- **Background Sync:** Cloudflare Workers Cron Triggers (for checking new language releases every 2 hours).
- **Rate Limiting:** Managed via a unified fetch wrapper to respect each API's limits.
