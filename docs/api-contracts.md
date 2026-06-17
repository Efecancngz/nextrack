# API Contracts — Free Serie Tracker

## Base URL

```
Production: https://free-serie-tracker.pages.dev/api
Development: http://localhost:3000/api
```

## Response Format

All endpoints return:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;    // e.g., "UNAUTHORIZED", "NOT_FOUND", "VALIDATION_ERROR"
    message: string; // Human-readable message
  };
  meta?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}
```

## Authentication

- **Method**: JWT via Auth.js HttpOnly cookies
- **Protected routes**: All `/api/library/*` and `/api/ratings/*` endpoints
- **Public routes**: `/api/series/*`, `/api/search/*`, `/api/auth/*`

---

## Auth Endpoints

### POST `/api/auth/register`

Create a new account with email/password.

```typescript
// Request
{
  email: string;      // valid email
  password: string;   // min 8 chars, 1 uppercase, 1 number
  name: string;       // min 2 chars
}

// Response 201
{
  success: true,
  data: {
    id: string;
    email: string;
    name: string;
  }
}
```

### POST `/api/auth/signin`

Sign in with credentials or OAuth (handled by Auth.js).

### GET `/api/auth/session`

Get current session (handled by Auth.js).

---

## Series Endpoints

### GET `/api/series/search`

Search across all content types.

```typescript
// Query Parameters
{
  q: string;                    // Search query
  type?: ContentType;           // "TV_SERIES" | "ANIME" | "MANGA" | "MANHWA" | "LIGHT_NOVEL" | "WEBTOON"
  page?: number;                // Default: 1
  pageSize?: number;            // Default: 20, max: 50
}

// Response 200
{
  success: true,
  data: SeriesCard[],
  meta: { page, pageSize, totalPages, totalItems }
}

interface SeriesCard {
  id: string;
  externalId: string;
  externalSource: string;
  contentType: ContentType;
  title: string;
  posterUrl: string | null;
  status: SeriesStatus;
  rating: number | null;        // Best available external rating (0-10)
  ratingSource: string;         // "tmdb" | "anilist" | "mal" | "imdb"
  genres: string[];
  year: number | null;
}
```

### GET `/api/series/trending`

Get trending series by content type.

```typescript
// Query Parameters
{
  type?: ContentType;           // Filter by type, omit for all
  page?: number;
  pageSize?: number;
}

// Response 200: Same format as search
```

### GET `/api/series/[id]`

Get detailed series information.

```typescript
// Response 200
{
  success: true,
  data: {
    id: string;
    externalId: string;
    externalSource: string;
    contentType: ContentType;
    title: string;
    originalTitle: string | null;
    description: string | null;
    posterUrl: string | null;
    bannerUrl: string | null;
    status: SeriesStatus;
    totalEpisodes: number | null;
    totalChapters: number | null;
    totalSeasons: number | null;
    totalVolumes: number | null;
    startDate: string | null;    // ISO date
    endDate: string | null;
    genres: string[];
    platforms: Platform[];
    ratings: ExternalRatingInfo[];
    averageUserRating: number | null;  // Average from our users
    userRatingCount: number;
  }
}

interface Platform {
  name: string;          // "Netflix", "Crunchyroll"
  logo: string | null;   // URL to platform logo
  url: string | null;    // Deep link
  region: string;        // "US", "TR"
}

interface ExternalRatingInfo {
  source: string;        // "tmdb", "imdb", "anilist", "mal"
  score: number;         // Normalized 0-10
  voteCount: number;
}
```

### GET `/api/series/[id]/similar`

Get similar series recommendations.

```typescript
// Response 200
{
  success: true,
  data: SeriesCard[]     // Max 12 items
}
```

---

## Explore / Filter Endpoints

### POST `/api/explore/ai-search` (🔒 Authenticated)

AI-powered semantic search and recommendations using the 3-way security blend. Capped at 10 requests per user per day.

```typescript
// Request Body
{
  genres?: string[];            // Optional genres list
  contentType?: ContentType;   // Optional content type filter
  platforms?: string[];         // Optional watch platforms list
  hint?: string;                // AI context hint (Max 80 chars, e.g. "anti-hero")
}

// Response 200
{
  success: true,
  data: {
    explanation: string;        // AI-generated reasoning text
    results: SeriesCard[];      // SeriesCard results list ranked by vector similarity
  }
}
```

### GET `/api/explore`

Browse with advanced filters.

```typescript
// Query Parameters
{
  type?: ContentType;
  genre?: string;               // Genre name
  status?: SeriesStatus;
  platform?: string;            // Platform name
  sortBy?: "trending" | "rating" | "newest" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// Response 200: Same format as search
```

### GET `/api/explore/genres`

Get available genres for a content type.

```typescript
// Query Parameters
{
  type?: ContentType;
}

// Response 200
{
  success: true,
  data: string[]  // ["Action", "Romance", "Sci-Fi", ...]
}
```

### GET `/api/explore/platforms`

Get available platforms.

```typescript
// Response 200
{
  success: true,
  data: {
    name: string;
    logo: string;
    contentTypes: ContentType[];  // Which types this platform has
  }[]
}
```

---

## Library Endpoints (🔒 Authenticated)

### GET `/api/library`

Get user's library.

```typescript
// Query Parameters
{
  status?: LibraryStatus;       // Filter by status
  type?: ContentType;           // Filter by content type
  sortBy?: "addedAt" | "updatedAt" | "title" | "rating";
  page?: number;
  pageSize?: number;
}

// Response 200
{
  success: true,
  data: LibraryEntry[],
  meta: { page, pageSize, totalPages, totalItems }
}

interface LibraryEntry {
  id: string;
  series: SeriesCard;
  status: LibraryStatus;
  isFavorite: boolean;
  waitLanguage: string | null;      // Preferred language to wait for releases (e.g. "tr")
  customSearchKeyword: string | null; // Custom preferred site search keyword (e.g. "tranimeizle")
  progress: {
    currentEpisode: number;
    currentSeason: number;
    currentChapter: number;
    currentVolume: number;
  } | null;
  userRating: number | null;
  addedAt: string;
  updatedAt: string;
}
```

### POST `/api/library`

Add series to library.

```typescript
// Request
{
  seriesId: string;             // Internal series ID (or externalId + source)
  externalId?: string;          // If series doesn't exist in DB yet
  externalSource?: string;
  status?: LibraryStatus;       // Default: "PLAN_TO_WATCH"
  waitLanguage?: string | null;
  customSearchKeyword?: string | null;
}

// Response 201
{
  success: true,
  data: LibraryEntry
}
```

### PATCH `/api/library/[id]`

Update library entry status.

```typescript
// Request
{
  status?: LibraryStatus;
  isFavorite?: boolean;
  waitLanguage?: string | null;
  customSearchKeyword?: string | null;
}

// Response 200
{
  success: true,
  data: LibraryEntry
}
```

### DELETE `/api/library/[id]`

Remove series from library.

```typescript
// Response 200
{
  success: true,
  data: { id: string }
}
```

### PATCH `/api/library/[id]/progress`

Update episode/chapter progress.

```typescript
// Request
{
  currentEpisode?: number;
  currentSeason?: number;
  currentChapter?: number;
  currentVolume?: number;
}

// Response 200
{
  success: true,
  data: {
    currentEpisode: number;
    currentSeason: number;
    currentChapter: number;
    currentVolume: number;
    lastUpdated: string;
  }
}
```

---

## Rating Endpoints (🔒 Authenticated)

### POST `/api/ratings`

Rate a series.

```typescript
// Request
{
  seriesId: string;
  score: number;          // 1-10
  review?: string;        // Optional text review
}

// Response 201
{
  success: true,
  data: {
    id: string;
    score: number;
    review: string | null;
    createdAt: string;
  }
}
```

### PATCH `/api/ratings/[id]`

Update a rating.

```typescript
// Request
{
  score?: number;
  review?: string;
}

// Response 200: Same format as POST
```

### DELETE `/api/ratings/[id]`

Delete a rating.

```typescript
// Response 200
{
  success: true,
  data: { id: string }
}
```

---

## Notes Endpoints (🔒 Authenticated)

### GET `/api/series/[id]/note`

Retrieve the current user's private note and custom link for a specific series.

```typescript
// Response 200
{
  success: true,
  data: {
    id: string;
    seriesId: string;
    content: string;
    customUrl: string | null;
    createdAt: string;
    updatedAt: string;
  } | null
}
```

### PUT `/api/series/[id]/note`

Create or update the current user's private note and custom link for a specific series.

```typescript
// Request
{
  content: string;           // Note text content
  customUrl?: string | null; // Optional custom/external URL (e.g., fan translation link)
}

// Response 200 (if updated) or 201 (if created)
{
  success: true,
  data: {
    id: string;
    seriesId: string;
    content: string;
    customUrl: string | null;
    createdAt: string;
    updatedAt: string;
  }
}
```

### DELETE `/api/series/[id]/note`

Delete the current user's private note and custom link for a specific series.

```typescript
// Response 200
{
  success: true,
  data: { id: string }
}
```

---

## Language Tracking Endpoints (🔒 Authenticated)

### GET `/api/series/[id]/languages`

Get detailed release tracking statistics of episodes or chapters per platform and language.

```typescript
// Response 200
{
  success: true,
  data: EpisodeLanguageInfo[]
}

interface EpisodeLanguageInfo {
  id: string;
  seriesId: string;
  episode: number | null;
  chapter: number | null;
  season: number | null;
  platform: string;           // "crunchyroll", "mangadex", etc.
  language: string;           // "tr", "en", etc.
  availableAt: string | null; // Timestamp when released at source
  detectedAt: string;         // Timestamp when detected by our sync cron
}
```

---

## Social Feed Endpoints (🔒 Authenticated)

### GET `/api/social/feed`

Get recent updates from friends (series watched, ratings given, reviews written).

```typescript
// Response 200
{
  success: true,
  data: ActivityItem[]
}

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  type: "WATCH" | "READ" | "RATING" | "REVIEW";
  seriesId: string;
  seriesTitle: string;
  detail: string;             // e.g. "watched Episode 1115", "rated 10/10"
  createdAt: string;          // ISO timestamp
}
```

### POST `/api/social/follow/[userId]`

Follow a user.

```typescript
// Response 200
{
  success: true,
  data: { success: true }
}
```

### DELETE `/api/social/follow/[userId]`

Unfollow a user.

```typescript
// Response 200
{
  success: true,
  data: { success: true }
}
```

---

## Gamification & Badges Endpoints

### GET `/api/users/[id]/badges`

Retrieve badges earned by a user.

```typescript
// Response 200
{
  success: true,
  data: UserBadgeInfo[]
}

interface UserBadgeInfo {
  badgeId: string;
  name: string;               // e.g. "Otaku"
  description: string;        // e.g. "Tracked over 50 anime series"
  icon: string;               // badge icon class or URL
  earnedAt: string;           // ISO timestamp
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Not authorized for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `CONFLICT` | 409 | Resource already exists (duplicate library entry) |
| `RATE_LIMITED` | 429 | Too many requests |
| `EXTERNAL_API_ERROR` | 502 | External API (TMDB/AniList) failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Validation Rules (Zod)

```typescript
// Auth
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  name: z.string().min(2).max(50),
});

// Library
const addToLibrarySchema = z.object({
  seriesId: z.string().optional(),
  externalId: z.string().optional(),
  externalSource: z.string().optional(),
  status: z.nativeEnum(LibraryStatus).default("PLAN_TO_WATCH"),
  waitLanguage: z.string().max(10).optional().nullable(),
  customSearchKeyword: z.string().max(100).optional().nullable(),
});

const updateLibrarySchema = z.object({
  status: z.nativeEnum(LibraryStatus).optional(),
  isFavorite: z.boolean().optional(),
  waitLanguage: z.string().max(10).optional().nullable(),
  customSearchKeyword: z.string().max(100).optional().nullable(),
});

// Notes
const updateNoteSchema = z.object({
  content: z.string().max(10000),
  customUrl: z.string().url().max(2000).optional().nullable(),
});

// Progress
const updateProgressSchema = z.object({
  currentEpisode: z.number().int().min(0).optional(),
  currentSeason: z.number().int().min(1).optional(),
  currentChapter: z.number().int().min(0).optional(),
  currentVolume: z.number().int().min(1).optional(),
});

// Rating
const ratingSchema = z.object({
  seriesId: z.string(),
  score: z.number().int().min(1).max(10),
  review: z.string().max(2000).optional(),
});

// Search
const searchSchema = z.object({
  q: z.string().min(1).max(100),
  type: z.nativeEnum(ContentType).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

// AI Search
const aiSearchSchema = z.object({
  genres: z.array(z.string()).optional(),
  contentType: z.nativeEnum(ContentType).optional(),
  platforms: z.array(z.string()).optional(),
  hint: z.string().max(80).optional(),
});
```,StartLine:589,TargetContent:
```
