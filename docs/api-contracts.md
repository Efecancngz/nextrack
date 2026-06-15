# API Contracts — Free Serie Tracker

## Base URL

```
Production: https://free-serie-tracker.vercel.app/api
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
```
