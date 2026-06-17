# Swagger / OpenAPI Setup — Free Serie Tracker

## Neden Swagger?

- API'yi interaktif olarak test edebilmek
- Frontend geliştirirken endpoint referansı
- İleride başka geliştiricilerle çalışırken dokümantasyon
- API contract'ın "canlı" ve güncel kalması

## Kullanılacak Araçlar

| Araç | Amaç |
|---|---|
| `swagger-jsdoc` | JSDoc comment'lerinden OpenAPI spec üretir |
| `swagger-ui-react` | Swagger UI'ı Next.js'te render eder |
| `@types/swagger-jsdoc` | TypeScript tipleri |

## Kurulum

```bash
npm install swagger-jsdoc swagger-ui-react
npm install -D @types/swagger-jsdoc
```

## OpenAPI Spec Konfigürasyonu

```typescript
// src/lib/swagger/config.ts
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Free Serie Tracker API",
      version: "1.0.0",
      description:
        "REST API for tracking TV series, anime, manga, manhwa, light novels and webtoons across official platforms.",
      contact: {
        name: "API Support",
      },
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Development",
      },
      {
        url: "https://free-serie-tracker.pages.dev/api",
        description: "Production",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "authjs.session-token",
          description: "Auth.js session cookie (HttpOnly)",
        },
      },
      schemas: {
        // --- Enums ---
        ContentType: {
          type: "string",
          enum: ["TV_SERIES", "ANIME", "MANGA", "MANHWA", "LIGHT_NOVEL", "WEBTOON"],
        },
        SeriesStatus: {
          type: "string",
          enum: ["ONGOING", "COMPLETED", "UPCOMING", "HIATUS", "CANCELLED"],
        },
        LibraryStatus: {
          type: "string",
          enum: ["WATCHING", "PLAN_TO_WATCH", "COMPLETED", "ON_HOLD", "DROPPED"],
        },

        // --- Core Models ---
        SeriesCard: {
          type: "object",
          properties: {
            id: { type: "string", example: "clxyz123..." },
            externalId: { type: "string", example: "1396" },
            externalSource: { type: "string", example: "tmdb" },
            contentType: { $ref: "#/components/schemas/ContentType" },
            title: { type: "string", example: "Breaking Bad" },
            posterUrl: { type: "string", nullable: true, example: "https://image.tmdb.org/..." },
            status: { $ref: "#/components/schemas/SeriesStatus" },
            rating: { type: "number", nullable: true, example: 9.5 },
            ratingSource: { type: "string", nullable: true, example: "tmdb" },
            genres: { type: "array", items: { type: "string" }, example: ["Drama", "Crime"] },
            year: { type: "integer", nullable: true, example: 2008 },
          },
        },

        SeriesDetail: {
          type: "object",
          properties: {
            id: { type: "string" },
            externalId: { type: "string" },
            externalSource: { type: "string" },
            contentType: { $ref: "#/components/schemas/ContentType" },
            title: { type: "string" },
            originalTitle: { type: "string", nullable: true },
            description: { type: "string", nullable: true },
            posterUrl: { type: "string", nullable: true },
            bannerUrl: { type: "string", nullable: true },
            status: { $ref: "#/components/schemas/SeriesStatus" },
            totalEpisodes: { type: "integer", nullable: true },
            totalChapters: { type: "integer", nullable: true },
            totalSeasons: { type: "integer", nullable: true },
            totalVolumes: { type: "integer", nullable: true },
            startDate: { type: "string", format: "date", nullable: true },
            endDate: { type: "string", format: "date", nullable: true },
            genres: { type: "array", items: { type: "string" } },
            platforms: {
              type: "array",
              items: { $ref: "#/components/schemas/Platform" },
            },
            ratings: {
              type: "array",
              items: { $ref: "#/components/schemas/ExternalRating" },
            },
            averageUserRating: { type: "number", nullable: true },
            userRatingCount: { type: "integer" },
          },
        },

        Platform: {
          type: "object",
          properties: {
            name: { type: "string", example: "Netflix" },
            logo: { type: "string", nullable: true },
            url: { type: "string", nullable: true },
            region: { type: "string", example: "US" },
          },
        },

        ExternalRating: {
          type: "object",
          properties: {
            source: { type: "string", example: "tmdb" },
            score: { type: "number", example: 9.5, description: "Normalized 0-10" },
            voteCount: { type: "integer", example: 18234 },
          },
        },

        LibraryEntry: {
          type: "object",
          properties: {
            id: { type: "string" },
            series: { $ref: "#/components/schemas/SeriesCard" },
            status: { $ref: "#/components/schemas/LibraryStatus" },
            isFavorite: { type: "boolean" },
            waitLanguage: { type: "string", nullable: true, example: "tr" },
            customSearchKeyword: { type: "string", nullable: true, example: "tranimeizle" },
            progress: { $ref: "#/components/schemas/Progress" },
            userRating: { type: "integer", nullable: true, minimum: 1, maximum: 10 },
            addedAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Progress: {
          type: "object",
          nullable: true,
          properties: {
            currentEpisode: { type: "integer", example: 5 },
            currentSeason: { type: "integer", example: 2 },
            currentChapter: { type: "integer", example: 45 },
            currentVolume: { type: "integer", example: 3 },
            lastUpdated: { type: "string", format: "date-time" },
          },
        },

        // --- Request Bodies ---
        RegisterRequest: {
          type: "object",
          required: ["email", "password", "name"],
          properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            password: {
              type: "string",
              minLength: 8,
              example: "SecurePass1",
              description: "Min 8 chars, 1 uppercase, 1 number",
            },
            name: { type: "string", minLength: 2, example: "John Doe" },
          },
        },

        AddToLibraryRequest: {
          type: "object",
          required: ["seriesId"],
          properties: {
            seriesId: { type: "string" },
            externalId: { type: "string", description: "If series not in DB yet" },
            externalSource: { type: "string" },
            status: {
              $ref: "#/components/schemas/LibraryStatus",
              default: "PLAN_TO_WATCH",
            },
            waitLanguage: { type: "string", nullable: true, example: "tr" },
            customSearchKeyword: { type: "string", nullable: true, example: "tranimeizle" },
          },
        },

        UpdateLibraryRequest: {
          type: "object",
          properties: {
            status: { $ref: "#/components/schemas/LibraryStatus" },
            isFavorite: { type: "boolean" },
            waitLanguage: { type: "string", nullable: true, example: "tr" },
            customSearchKeyword: { type: "string", nullable: true, example: "tranimeizle" },
          },
        },

        UpdateProgressRequest: {
          type: "object",
          properties: {
            currentEpisode: { type: "integer", minimum: 0 },
            currentSeason: { type: "integer", minimum: 1 },
            currentChapter: { type: "integer", minimum: 0 },
            currentVolume: { type: "integer", minimum: 1 },
          },
        },

        RatingRequest: {
          type: "object",
          required: ["seriesId", "score"],
          properties: {
            seriesId: { type: "string" },
            score: { type: "integer", minimum: 1, maximum: 10 },
            review: { type: "string", maxLength: 2000 },
          },
        },

        AiSearchRequest: {
          type: "object",
          properties: {
            genres: { type: "array", items: { type: "string" }, example: ["Action"] },
            contentType: { $ref: "#/components/schemas/ContentType" },
            platforms: { type: "array", items: { type: "string" }, example: ["Netflix"] },
            hint: { type: "string", maxLength: 80, example: "similar to Bleach" },
          },
        },

        UserNote: {
          type: "object",
          properties: {
            id: { type: "string" },
            seriesId: { type: "string" },
            content: { type: "string" },
            customUrl: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        UpdateNoteRequest: {
          type: "object",
          required: ["content"],
          properties: {
            content: { type: "string", maxLength: 10000 },
            customUrl: { type: "string", format: "uri", nullable: true, maxLength: 2000 },
          },
        },

        EpisodeLanguage: {
          type: "object",
          properties: {
            id: { type: "string" },
            seriesId: { type: "string" },
            episode: { type: "integer", nullable: true },
            chapter: { type: "integer", nullable: true },
            season: { type: "integer", nullable: true },
            platform: { type: "string" },
            language: { type: "string" },
            availableAt: { type: "string", format: "date-time", nullable: true },
            detectedAt: { type: "string", format: "date-time" },
          },
        },

        ActivityItem: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            userName: { type: "string" },
            userImage: { type: "string", nullable: true },
            type: { type: "string", enum: ["WATCH", "READ", "RATING", "REVIEW"] },
            seriesId: { type: "string" },
            seriesTitle: { type: "string" },
            detail: { type: "string", example: "watched Episode 1115" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        UserBadgeInfo: {
          type: "object",
          properties: {
            badgeId: { type: "string" },
            name: { type: "string", example: "Otaku" },
            description: { type: "string", example: "Tracked over 50 anime series" },
            icon: { type: "string", example: "otaku-badge-class" },
            earnedAt: { type: "string", format: "date-time" },
          },
        },

        // --- Response Wrappers ---
        ApiSuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            meta: { $ref: "#/components/schemas/PaginationMeta" },
          },
        },

        ApiErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string", example: "Invalid input" },
              },
            },
          },
        },

        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            pageSize: { type: "integer", example: 20 },
            totalPages: { type: "integer", example: 5 },
            totalItems: { type: "integer", example: 95 },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Series", description: "Series discovery & details" },
      { name: "Explore", description: "Browse & filter content" },
      { name: "Library", description: "User personal library management" },
      { name: "Ratings", description: "User ratings & reviews" },
      { name: "Notes", description: "User private notes & custom links" },
      { name: "Languages", description: "Language & translation tracking" },
      { name: "Social", description: "Friends tracking, follows and social feeds" },
      { name: "Badges", description: "Gamification & user achievements" },
    ],
  },
  apis: ["./src/app/api/**/route.ts"], // JSDoc comment'lerini bu dosyalardan oku
};

export const swaggerSpec = swaggerJsdoc(options);
```

## Swagger UI Sayfası

```typescript
// src/app/api-docs/page.tsx
"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SwaggerUI url="/api/docs" />
    </div>
  );
}

// src/app/api/docs/route.ts
import { NextResponse } from "next/server";
import { swaggerSpec } from "@/lib/swagger/config";

export async function GET() {
  return NextResponse.json(swaggerSpec);
}
```

## API Route JSDoc Annotations

Her API route'a JSDoc comment ekleyerek Swagger otomatik güncellenir:

```typescript
// src/app/api/series/route.ts

/**
 * @openapi
 * /series:
 *   get:
 *     tags: [Series]
 *     summary: Search series
 *     description: Search across all content types (TV, Anime, Manga, etc.)
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: "Breaking Bad"
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/ContentType'
 *         description: Filter by content type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Search results with pagination
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SeriesCard'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       429:
 *         description: Rate limited
 */
export async function GET(req: NextRequest) { /* ... */ }
```

```typescript
// src/app/api/series/[id]/route.ts

/**
 * @openapi
 * /series/{id}:
 *   get:
 *     tags: [Series]
 *     summary: Get series details
 *     description: Retrieve full details including platforms, ratings, and metadata
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Internal series ID
 *     responses:
 *       200:
 *         description: Series details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SeriesDetail'
 *       404:
 *         description: Series not found
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) { /* ... */ }
```

```typescript
// src/app/api/series/[id]/note/route.ts

/**
 * @openapi
 * /series/{id}/note:
 *   get:
 *     tags: [Notes]
 *     summary: Get user note for series
 *     description: Retrieve authenticated user's private note and custom link for a specific series
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User private note (or null if not set)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserNote'
 *                       nullable: true
 *       401:
 *         description: Not authenticated
 *   put:
 *     tags: [Notes]
 *     summary: Create or update user note
 *     description: Create or update the authenticated user's private note and custom link for a specific series
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateNoteRequest'
 *     responses:
 *       200:
 *         description: Note updated
 *       201:
 *         description: Note created
 *       401:
 *         description: Not authenticated
 *   delete:
 *     tags: [Notes]
 *     summary: Delete user note
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note deleted
 *       401:
 *         description: Not authenticated
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) { /* ... */ }
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) { /* ... */ }
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) { /* ... */ }
```

```typescript
// src/app/api/series/[id]/languages/route.ts

/**
 * @openapi
 * /series/{id}/languages:
 *   get:
 *     tags: [Languages]
 *     summary: Get series episode language releases
 *     description: Get release timestamps/status for all detected languages and subtitles of a series
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Release history list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/EpisodeLanguage'
 *       401:
 *         description: Not authenticated
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) { /* ... */ }
```

```typescript
// src/app/api/library/route.ts

/**
 * @openapi
 * /library:
 *   get:
 *     tags: [Library]
 *     summary: Get user library
 *     description: Retrieve authenticated user's series library
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/LibraryStatus'
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/ContentType'
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [addedAt, updatedAt, title, rating]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Library entries with pagination
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LibraryEntry'
 *       401:
 *         description: Not authenticated
 *   post:
 *     tags: [Library]
 *     summary: Add series to library
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToLibraryRequest'
 *     responses:
 *       201:
 *         description: Series added to library
 *       401:
 *         description: Not authenticated
 *       409:
 *         description: Series already in library
 */
```

```typescript
// src/app/api/library/[id]/progress/route.ts

/**
 * @openapi
 * /library/{id}/progress:
 *   patch:
 *     tags: [Library]
 *     summary: Update progress
 *     description: Update episode/chapter progress for a library entry
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProgressRequest'
 *     responses:
 *       200:
 *         description: Progress updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the owner of this library entry
 */
```

```typescript
// src/app/api/ratings/route.ts

/**
 * @openapi
 * /ratings:
 *   post:
 *     tags: [Ratings]
 *     summary: Rate a series
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RatingRequest'
 *     responses:
 *       201:
 *         description: Rating created
 *       401:
 *         description: Not authenticated
 *       409:
 *         description: Already rated this series
 */
```

```typescript
// src/app/api/explore/ai-search/route.ts

/**
 * @openapi
 * /explore/ai-search:
 *   post:
 *     tags: [Explore]
 *     summary: AI-powered semantic search and recommendations
 *     description: Perform semantic search on series descriptions using structured form filters and natural language hints. Logged-in users only, capped at 10 requests/day.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AiSearchRequest'
 *     responses:
 *       200:
 *         description: Search results returned successfully with AI reasoning
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         explanation:
 *                           type: string
 *                           example: "Based on your interest in action anime with time travel hints, I suggest these titles..."
 *                         results:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/SeriesCard'
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded (limit: 10/day)
 */
export async function POST(req: NextRequest) { /* ... */ }
```

```typescript
// src/app/api/social/feed/route.ts

/**
 * @openapi
 * /social/feed:
 *   get:
 *     tags: [Social]
 *     summary: Get friend activity feed
 *     description: Retrieve recent watching, reading, and rating activities of followed users.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Activity feed returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ActivityItem'
 *       401:
 *         description: Not authenticated
 */
export async function GET(req: NextRequest) { /* ... */ }
```

```typescript
// src/app/api/social/follow/[userId]/route.ts

/**
 * @openapi
 * /social/follow/{userId}:
 *   post:
 *     tags: [Social]
 *     summary: Follow a user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Followed user successfully
 *       401:
 *         description: Not authenticated
 *   delete:
 *     tags: [Social]
 *     summary: Unfollow a user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unfollowed user successfully
 *       401:
 *         description: Not authenticated
 */
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) { /* ... */ }
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) { /* ... */ }
```

```typescript
// src/app/api/users/[id]/badges/route.ts

/**
 * @openapi
 * /users/{id}/badges:
 *   get:
 *     tags: [Badges]
 *     summary: Get user badges
 *     description: Retrieve all achievement badges earned by a user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user badges returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserBadgeInfo'
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) { /* ... */ }
```

## Erişim

- **Development**: `http://localhost:3000/api-docs`
- **Production**: `https://free-serie-tracker.pages.dev/api-docs`
- **Raw JSON spec**: `GET /api/docs`

## Ortam Kontrolü (Opsiyonel)

Swagger'ı sadece development'ta göstermek istersen:

```typescript
// src/app/api-docs/page.tsx
import { redirect } from "next/navigation";

export default function ApiDocsPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }
  // ... Swagger UI render
}
```
