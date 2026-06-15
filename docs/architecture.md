# System Architecture — Free Serie Tracker

## High-Level Architecture

```mermaid
graph TB
    subgraph Client["Browser (Client)"]
        UI["Next.js React UI"]
        SC["Server Components"]
        CC["Client Components"]
    end

    subgraph Vercel["Vercel Platform"]
        subgraph NextJS["Next.js App"]
            AR["App Router"]
            API["API Routes<br/>/api/*"]
            MW["Middleware<br/>(Auth + Rate Limit)"]
            ISR["ISR Cache"]
        end
        
        subgraph Auth["Auth.js"]
            GO["Google OAuth"]
            EP["Email/Password"]
            JWT["JWT Sessions"]
        end
    end

    subgraph External["External APIs"]
        TMDB["TMDB API<br/>(TV Series)"]
        AL["AniList GraphQL<br/>(Anime/Manga/LN)"]
        MD["MangaDex API<br/>(Manga/Manhwa)"]
        JK["Jikan API<br/>(MAL backup)"]
    end

    subgraph Database["Neon PostgreSQL"]
        Users["Users"]
        Library["Library/Lists"]
        Progress["Episode Progress"]
        Ratings["User Ratings"]
        Cache["API Cache"]
    end

    UI --> AR
    AR --> SC
    AR --> CC
    AR --> API
    API --> MW
    MW --> Auth
    API --> ISR
    ISR --> External
    API --> Database

    style Client fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
    style Vercel fill:#0a0a1a,stroke:#16213e,color:#e0e0e0
    style External fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
    style Database fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
```

## Data Flow

### 1. Series Discovery (Home/Explore)

```mermaid
sequenceDiagram
    participant User
    participant NextJS as Next.js (ISR)
    participant Cache as ISR Cache
    participant TMDB
    participant AniList

    User->>NextJS: GET /explore?type=anime
    NextJS->>Cache: Check cache (revalidate: 3600s)
    
    alt Cache HIT
        Cache-->>NextJS: Return cached data
    else Cache MISS
        NextJS->>AniList: GraphQL query (trending anime)
        AniList-->>NextJS: Anime data + ratings
        NextJS->>Cache: Store in cache
    end
    
    NextJS-->>User: Render page with data
```

### 2. Add to Library & Track Progress

```mermaid
sequenceDiagram
    participant User
    participant API as API Route
    participant Auth as Auth.js
    participant DB as Neon PostgreSQL

    User->>API: POST /api/library/add
    API->>Auth: Verify JWT
    Auth-->>API: User authenticated
    API->>DB: INSERT into user_library
    DB-->>API: Success
    API-->>User: { success: true }

    User->>API: PATCH /api/library/progress
    API->>Auth: Verify JWT
    API->>DB: UPDATE progress (S2E5)
    DB-->>API: Updated
    API-->>User: { success: true, progress: "S2E5" }
```

## Layered Architecture

```
┌─────────────────────────────────────────────────┐
│                  Presentation Layer              │
│   (React Components, Server/Client Components)   │
├─────────────────────────────────────────────────┤
│                  API Layer                       │
│   (Next.js API Routes — /app/api/*)              │
├─────────────────────────────────────────────────┤
│                  Service Layer                   │
│   (Business Logic — /lib/services/*)             │
├─────────────────────────────────────────────────┤
│                  Data Access Layer               │
│   ┌──────────────┐  ┌────────────────────┐      │
│   │ Prisma ORM   │  │ External API       │      │
│   │ (PostgreSQL)  │  │ Clients            │      │
│   │              │  │ (TMDB, AniList,    │      │
│   │              │  │  MangaDex, Jikan)   │      │
│   └──────────────┘  └────────────────────┘      │
├─────────────────────────────────────────────────┤
│                  Infrastructure                  │
│   (Auth.js, Middleware, Rate Limiting, Caching)  │
└─────────────────────────────────────────────────┘
```

## Content Type Module System

Each content type is handled as a modular service:

```typescript
// lib/services/content/types.ts
interface ContentProvider {
  type: ContentType;
  search(query: string): Promise<SeriesResult[]>;
  getDetails(externalId: string): Promise<SeriesDetail>;
  getTrending(): Promise<SeriesResult[]>;
  getPlatforms(externalId: string): Promise<Platform[]>;
  getRatings(externalId: string): Promise<Rating[]>;
}

// lib/services/content/tv-provider.ts    → TMDB
// lib/services/content/anime-provider.ts → AniList + Jikan
// lib/services/content/manga-provider.ts → AniList + MangaDex
// lib/services/content/novel-provider.ts → AniList
```

## Caching Strategy

| Data Type | Cache Duration | Strategy |
|---|---|---|
| Trending lists | 1 hour | ISR revalidate |
| Series detail | 24 hours | ISR revalidate |
| Platform availability | 12 hours | ISR revalidate |
| Search results | 30 minutes | ISR revalidate |
| User library | Real-time | No cache (DB direct) |
| User progress | Real-time | No cache (DB direct) |

## Rate Limiting Strategy

| Endpoint | Limit | Window |
|---|---|---|
| `/api/auth/login` | 5 requests | 15 minutes |
| `/api/auth/register` | 3 requests | 1 hour |
| `/api/search` | 30 requests | 1 minute |
| `/api/library/*` | 60 requests | 1 minute |
| General API | 100 requests | 1 minute |

## Error Handling Pattern

```typescript
// Consistent API response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    totalPages: number;
    totalItems: number;
  };
}
```
