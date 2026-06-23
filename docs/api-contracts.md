# API Contracts — Generic SaaS Starter

## Base URL

```
Development: http://localhost:3000/api
```

## Response Format

Every endpoint returns this exact shape (`src/types/common.ts`):

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

There is no nested `error.code`/`error.message` object and no top-level `meta` — error responses are a flat string, success responses carry `data` directly. No endpoint currently paginates (`/api/items` returns all matches in one call); `PaginatedResponse<T>`/`PaginationMeta` exist in `src/types/common.ts` for future use but aren't wired into any route yet.

All error responses use the status code attached to the `AppError` that was thrown (`src/lib/utils/app-error.ts`) — `404` not-found, `401` unauthorized, `409` conflict, `422` validation, `429` rate-limited, `500` unexpected.

Every route below is wrapped in `compose(withErrorHandler, withRateLimit)(handler)` unless noted — a uniform 60 requests/60 seconds per IP.

---

## Auth

### `POST /api/auth/register`
Create a new email/password user. Does not sign the user in — the client redirects to `/auth/signin` afterward.

**Body** (`registerSchema`):
```typescript
{ name: string; email: string; password: string /* min 8 chars */ }
```

**Response `201`:** `{ success: true, data: { id, email, name } }`
**Errors:** `422` validation failure, `409` email already registered.

### `POST/GET /api/auth/[...nextauth]`
Auth.js catch-all handler (sign-in, sign-out, session, callback routes). Not a custom contract — see `src/lib/auth/config.ts`.

### `POST /api/user/username`
Set the current user's username (required before the rest of the app is accessible — enforced by `src/middleware.ts`). Auth via `getCurrentUser()`, not `requireAuth()` — throws its own `AppError.unauthorized()` with a custom message.

**Body:** `{ username: string }` — lowercased, trimmed, validated against `/^[a-z0-9_]+$/`, 3-20 characters.

**Response `200`:** `{ success: true, data: { username } }`
**Errors:** `400` invalid format/length, `401` not signed in, `409` username taken by another user.

---

## Items

### `GET /api/items`
List/search/filter items. No auth required.

**Query params (all optional):** `q` (title contains, case-insensitive), `category` (`itemCategoryEnum`: `TYPE_A`/`TYPE_B`/`TYPE_C`), `status` (`itemStatusEnum`: `ONGOING`/`COMPLETED`/`HIATUS`/`CANCELLED`/`UPCOMING`).

**Response `200`:** `{ success: true, data: Item[] }` (full Prisma `Item` rows, ordered by `title` ascending).
**Errors:** `400` invalid `category` or `status` value.

### `GET /api/items/suggest`
Autocomplete suggestions. No auth required.

**Query params:** `q` (required for results — empty/missing `q` returns `{ success: true, data: [] }`, not an error).

**Response `200`:** `{ success: true, data: Item[] }` — title-match, capped at 8 results.

### `GET /api/items/trending`
No params. No auth required.

**Response `200`:** `{ success: true, data: Item[] }` — `status: "ONGOING"` items, ordered by `updatedAt` descending, capped at 8.

### `GET /api/items/[id]`
**Response `200`:** `{ success: true, data: Item }`
**Errors:** `404` item not found.

### `PUT /api/items/[id]/rating`
Create or update the current user's rating for an item. Auth required (`requireAuth()`).

**Body** (`rateItemSchema`):
```typescript
{ score: number /* int, 1-10 */; review?: string /* max 2000 chars */ }
```

**Response `200`:** `{ success: true, data: Rating }` — upserted on the `(userId, itemId)` unique constraint.
**Errors:** `404` item not found, `422` validation failure, `401` not signed in.

---

## User Items (personal tracking)

### `GET /api/user-items`
The current user's tracking list. Auth required.

**Query params:** `status` (optional, `trackingStatusEnum`: `ACTIVE`/`PLANNED`/`COMPLETED`/`PAUSED`/`DROPPED`).

**Response `200`:** `{ success: true, data: UserItem[] }` — each row includes its related `item`, ordered by `updatedAt` descending.
**Errors:** `400` invalid `status` value, `401` not signed in.

### `POST /api/user-items`
Add an item to the current user's tracking list. Auth required.

**Body** (`addToTrackingSchema`):
```typescript
{ itemId: string; status?: TrackingStatus /* default "PLANNED" */ }
```

**Response `201`:** `{ success: true, data: UserItem }`
**Errors:** `404` item not found, `409` already tracked (unique `(userId, itemId)` constraint), `422` validation failure.

### `PATCH /api/user-items/[id]`
Updates exactly one of status, favorite, or progress per call — the body is tried against three schemas in order (status → favorite → progress); whichever parses first wins. Auth required; the entry must belong to the current user (cross-user access returns `404`, not `403`, deliberately, so existence isn't leaked).

**Body — one of:**
```typescript
{ status: TrackingStatus }                              // updateTrackingStatusSchema
{ isFavorite: boolean }                                 // updateTrackingFavoriteSchema
{ progress: number /* int >= 0 */; notes?: string }      // updateTrackingProgressSchema
```

**Response `200`:** `{ success: true, data: UserItem }`
**Errors:** `404` entry not found or not owned by caller, `422` body matches none of the three schemas.

### `DELETE /api/user-items/[id]`
Remove a tracking entry. Auth required, same ownership check as `PATCH`.

**Response `200`:** `{ success: true, data: { id } }`
**Errors:** `404` entry not found or not owned by caller.

---

## Notifications

### `GET /api/notifications`
Auth required.

**Response `200`:**
```typescript
{
  success: true,
  data: {
    notifications: Notification[];  // newest 20, each with its related `item`
    unreadCount: number;
    notificationsEnabled: boolean;
  }
}
```

### `POST /api/notifications/check`
Triggers `checkForItemUpdates(userId)` (`src/lib/notifications.ts`) — compares each tracked item's `totalUnits` against its last-known value and creates a `Notification` on any increase. Throttled server-side to once/hour/user via `User.lastNotificationCheckAt`. Auth required.

**Response `200`:** `{ success: true, data: <checkForItemUpdates() result> }`

### `PATCH /api/notifications/mark-read`
Marks every unread notification for the current user as read. Auth required, no body.

**Response `200`:** `{ success: true, data: { updated: number } }`

### `PATCH /api/notifications/settings`
Auth required.

**Body** (`updateNotificationSettingsSchema`): `{ notificationsEnabled: boolean }`

**Response `200`:** `{ success: true, data: { notificationsEnabled: boolean } }`
**Errors:** `422` validation failure.
