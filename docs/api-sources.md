# Data Source Pattern

This starter ships with a single placeholder data source instead of real external API integrations — its job is to demonstrate the *pattern* for plugging one in, not to provide real content.

## `src/lib/api/example-source.ts`

A static, in-memory array of 12 example `Item`s plus four functions:

```typescript
export interface ExampleItem {
  externalId: string;
  title: string;
  description: string;
  category: "TYPE_A" | "TYPE_B" | "TYPE_C";
  status: "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" | "UPCOMING";
  totalUnits: number;
}

export const EXAMPLE_ITEMS: ExampleItem[] = [ /* 12 example rows */ ];

export async function searchExampleItems(query: string): Promise<ExampleItem[]>;
export async function getExampleItemDetail(externalId: string): Promise<ExampleItem | null>;
export async function getTrendingExampleItems(): Promise<ExampleItem[]>;
export async function simulateExampleItemUpdate(externalId: string): Promise<number | null>;
```

`prisma/seed.ts` loads `EXAMPLE_ITEMS` into the `Item` table once, on first setup (`npm run db:migrate` runs the seed script — see [getting-started.md](getting-started.md)), upserting on `Item`'s `(externalId, source)` unique constraint. After that, the app reads `Item` rows from Postgres directly (`src/app/api/items/route.ts` etc.) — `searchExampleItems()`/`getExampleItemDetail()`/`getTrendingExampleItems()` aren't called again at runtime. `simulateExampleItemUpdate()` is the one exception: `checkForItemUpdates()` (`src/lib/notifications.ts`) calls it on every notification check, once per tracked item, to simulate that item's content advancing — this is what the notification flow actually polls against, since there's no real external API to detect updates from.

## Swapping in a real external API

1. Write a client module under `src/lib/api/` (e.g. `your-api.ts`) that fetches from the real source and maps its response shape into the `Item` fields (`title`, `description`, `category`, `status`, `totalUnits`, `coverImage`, `ratingExternal`).
2. Replace `prisma/seed.ts`'s `EXAMPLE_ITEMS` loop with a call to your client, upserting on `Item`'s `(externalId, source)` unique constraint (`source` should become your API's name instead of `"example-source"`) — see [database-schema.md](database-schema.md) for the `Item` model.
3. If your real API has rate limits, add a `src/lib/api/your-api-mock.ts` fallback for local development without an API key, following the dependency-free pattern `example-source.ts` already demonstrates (no env var, no network call, works offline).
4. Replace `src/lib/notifications.ts`'s call to `simulateExampleItemUpdate()` with a real check against your API (e.g. comparing a freshly-fetched `totalUnits` to the stored value) — see [database-schema.md](database-schema.md)'s `Notification` model.
5. Decide whether item data should refresh live per-request (no caching, like today) or be periodically re-synced — there's no caching layer currently in this starter (see [architecture.md](architecture.md)'s Data Flow section).
