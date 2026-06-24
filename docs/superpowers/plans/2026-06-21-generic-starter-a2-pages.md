# Generic SaaS Starter — A2: Pages & Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the generic pages and components that consume Plan A1's backend (`Item`/`UserItem`/`Rating`/`Notification` models and `/api/items*` + `/api/user-items*` routes), replacing the domain-specific Library/Explore/Series-detail UI with `/my-items`, `/browse`, and `/items/[id]`.

**Architecture:** New components live alongside the old domain-specific ones under new names (`ItemCard.tsx`, `TrackingBoard.tsx`, etc.) — old components and pages are deleted in Plan A3, not here. A handful of existing components (`HeroSlider.tsx`, `ProfileStats.tsx`, `ProfileFavorites.tsx`, `NotificationBell.tsx`, `RatingWidget.tsx`) are genericized **in place** since they have no compound-ID/content-type-specific naming worth preserving and the old pages that still reference them are already non-functional post-A1 (they reference deleted Prisma models). `ProfileHeader.tsx` and `NotificationTrigger.tsx` need no changes — already fully generic.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (PostgreSQL), TypeScript, existing global CSS classes (reused as-is — no CSS rename in this plan).

## Global Constraints

- No domain-specific naming (Series/Library/episode/chapter) in any new file — use Item/UserItem/category/status/progress/unit throughout.
- Reuse existing global CSS class names (`poster-card`, `series-grid`, `explore-tabs`, `library-status-badge`, etc.) as-is — renaming CSS classes is out of scope for this plan.
- `Item` has no `genres`, `year`, or `popularity` fields (unlike the old `Series` model) — browse filtering/sorting is limited to `category`, `status`, and `ratingExternal`.
- `UserItem.progress` is a single generic `Int?` field (not separate episode/chapter/season/volume counters) — increment UI always shows "+1 unit (N)", no conditional logic for which counter to show.
- Dropped entirely (not carried over): `RedirectButton`, language-wait select, content-type sub-tabs, search-result pagination/Load More (`/api/items` has no pagination), genre filter chips, year range filter.
- Old pages (`/explore`, `/library`, `/series/[id]`, `/calendar`, `/settings`) and old components are **not deleted in this plan** — they already fail to compile post-A1 (reference deleted Prisma models) and are removed in Plan A3. Do not "fix" them.
- Every new client component that calls a mutating API route follows the existing fetch-then-`router.refresh()` pattern used by `AddToLibraryButton`/`RatingWidget`/`LibraryItemCard`.
- No new tests — this codebase has no component/page test convention (verified in Plan A1); verification is `npx tsc --noEmit <files>` per task plus a final manual browser walkthrough.

---

### Task 1: Generic display components — ItemCard, ItemListRow

**Files:**
- Create: `src/components/ItemCard.tsx`
- Create: `src/components/ItemListRow.tsx`
- Modify: `src/app/globals.css` (add 3 category badge classes + color vars)

**Interfaces:**
- Consumes: `ItemCard` type, `ITEM_CATEGORY_LABELS` (`src/types/item.ts`, from Plan A1).
- Produces: `<ItemCard item={ItemCard} showCategory?: boolean />` and `<ItemListRow item={ItemCard} showCategory?: boolean />`, both linking to `/items/${item.id}`. Consumed by Tasks 9 (browse page), 11 (home page), 12 (profile favorites).

- [ ] **Step 1: Add category badge CSS**

In `src/app/globals.css`, find the existing color variable block (near `--color-tv`, `--color-anime`, etc., around line 42) and add three new variables immediately after `--color-webtoon`:

```css
  --color-type-a:        #3b82f6;
  --color-type-b:        #10b981;
  --color-type-c:        #f59e0b;
```

Then find the badge class block (near `.badge-webtoon`, around line 346) and add three new classes immediately after it:

```css
.badge-type-a      { background: #3b82f620; color: var(--color-type-a); }
.badge-type-b      { background: #10b98120; color: var(--color-type-b); }
.badge-type-c      { background: #f59e0b20; color: var(--color-type-c); }
```

- [ ] **Step 2: Create `src/components/ItemCard.tsx`**

```tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { ItemCard as ItemCardData } from "@/types/item";

const CATEGORY_BADGE_CLASS: Record<ItemCardData["category"], string> = {
  TYPE_A: "badge-type-a",
  TYPE_B: "badge-type-b",
  TYPE_C: "badge-type-c",
};

interface ItemCardProps {
  item: ItemCardData;
  /** Show category badge (default: true) */
  showCategory?: boolean;
}

export default function ItemCard({ item, showCategory = true }: ItemCardProps) {
  const href = `/items/${item.id}`;

  return (
    <Link href={href} className="series-card-link" id={`item-${item.id}`}>
      <article className="poster-card">
        {item.coverImage ? (
          <Image
            src={item.coverImage}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            className="poster-card-img"
          />
        ) : (
          <div className="poster-card-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
        )}

        <div className="poster-overlay" />

        <div className="poster-card-info">
          {showCategory && (
            <span className={`badge ${CATEGORY_BADGE_CLASS[item.category]}`}>
              {item.category.replace("_", " ")}
            </span>
          )}

          {item.ratingExternal && item.ratingExternal > 0 && (
            <div className="poster-card-rating">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-star)">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>{item.ratingExternal.toFixed(1)}</span>
            </div>
          )}

          <h3 className="poster-card-title">{item.title}</h3>
        </div>
      </article>
    </Link>
  );
}
```

- [ ] **Step 3: Create `src/components/ItemListRow.tsx`**

```tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { ItemCard as ItemCardData } from "@/types/item";

const CATEGORY_BADGE_CLASS: Record<ItemCardData["category"], string> = {
  TYPE_A: "badge-type-a",
  TYPE_B: "badge-type-b",
  TYPE_C: "badge-type-c",
};

interface ItemListRowProps {
  item: ItemCardData;
  /** Show category badge (default: true) */
  showCategory?: boolean;
}

export default function ItemListRow({ item, showCategory = true }: ItemListRowProps) {
  const href = `/items/${item.id}`;

  return (
    <Link href={href} className="series-list-row" id={`item-list-${item.id}`}>
      <div className="series-list-thumb">
        {item.coverImage ? (
          <Image
            src={item.coverImage}
            alt={item.title}
            fill
            sizes="60px"
            className="series-list-thumb-img"
          />
        ) : (
          <div className="series-list-thumb-placeholder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
        )}
      </div>

      <div className="series-list-info">
        <h3 className="series-list-title">{item.title}</h3>
        <div className="series-list-meta">
          {showCategory && (
            <span className={`badge ${CATEGORY_BADGE_CLASS[item.category]}`}>
              {item.category.replace("_", " ")}
            </span>
          )}
        </div>
      </div>

      {item.ratingExternal && item.ratingExternal > 0 && (
        <div className="series-list-rating">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-star)">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>{item.ratingExternal.toFixed(1)}</span>
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 4: Verify with a type-check**

```bash
npx tsc --noEmit src/components/ItemCard.tsx src/components/ItemListRow.tsx 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to these two files.

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemCard.tsx src/components/ItemListRow.tsx src/app/globals.css
git commit -m "feat: add generic ItemCard/ItemListRow display components"
```

---

### Task 2: Item-detail interactive widgets — AddToTrackingButton, RatingWidget

**Files:**
- Create: `src/components/AddToTrackingButton.tsx`
- Modify: `src/components/RatingWidget.tsx` (in place — endpoint + prop rename only)

**Interfaces:**
- Consumes: `TRACKING_STATUS_LABELS`, `TrackingStatus` (`src/types/user-item.ts`, Plan A1). `POST /api/user-items`, `PUT /api/items/[id]/rating` (Plan A1).
- Produces: `<AddToTrackingButton itemId initialEntry isSignedIn />`, `<RatingWidget itemId initialRating isSignedIn />`. Consumed by Task 9 (`/items/[id]` page).

- [ ] **Step 1: Create `src/components/AddToTrackingButton.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TRACKING_STATUS_LABELS, type TrackingStatus } from "@/types/user-item";

const STATUS_OPTIONS: TrackingStatus[] = [
  "ACTIVE",
  "PLANNED",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
];

interface AddToTrackingButtonProps {
  itemId: string;
  initialEntry: { id: string; status: TrackingStatus } | null;
  isSignedIn: boolean;
}

export default function AddToTrackingButton({
  itemId,
  initialEntry,
  isSignedIn,
}: AddToTrackingButtonProps) {
  const router = useRouter();
  const [entry, setEntry] = useState(initialEntry);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(status: TrackingStatus) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to add to tracking list");
        return;
      }
      setEntry({ id: data.data.id, status: data.data.status });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to add to tracking list");
    } finally {
      setLoading(false);
    }
  }

  if (!isSignedIn) {
    return (
      <a href="/auth/signin" className="btn btn-primary detail-add-btn">
        Sign in to track this item
      </a>
    );
  }

  return (
    <div className="detail-add-wrapper">
      <button
        type="button"
        className="btn btn-primary detail-add-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
      >
        {entry ? `Tracking: ${TRACKING_STATUS_LABELS[entry.status]}` : "Add to Tracking"}
      </button>
      {open && (
        <div className="detail-add-menu" role="menu">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              role="menuitem"
              className="detail-add-menu-item"
              onClick={() => handlePick(status)}
              disabled={loading}
            >
              {TRACKING_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      )}
      {error && <p className="detail-add-error">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Modify `src/components/RatingWidget.tsx`**

Replace the `compoundId` prop and the fetch endpoint. Open the existing file and apply:

```tsx
interface RatingWidgetProps {
  itemId: string;
  initialRating: { score: number; review: string | null } | null;
  isSignedIn: boolean;
}

export default function RatingWidget({ itemId, initialRating, isSignedIn }: RatingWidgetProps) {
```

(replacing the existing `interface RatingWidgetProps { compoundId: string; ... }` and function signature), and inside `handleSave`, replace:

```tsx
const res = await fetch(`/api/series/${compoundId}/rating`, {
```

with:

```tsx
const res = await fetch(`/api/items/${itemId}/rating`, {
```

No other lines in this file change — `score`/`review` state, the save button, and the textarea stay exactly as they are today.

- [ ] **Step 3: Verify with a type-check**

```bash
npx tsc --noEmit src/components/AddToTrackingButton.tsx src/components/RatingWidget.tsx 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to these two files.

- [ ] **Step 4: Commit**

```bash
git add src/components/AddToTrackingButton.tsx src/components/RatingWidget.tsx
git commit -m "feat: add AddToTrackingButton, genericize RatingWidget to items endpoint"
```

---

### Task 3: My-items tracking components — UserItemCard, UserItemRow, TrackingBoard

**Files:**
- Create: `src/components/UserItemCard.tsx`
- Create: `src/components/UserItemRow.tsx`
- Create: `src/components/TrackingBoard.tsx`

**Interfaces:**
- Consumes: `UserItemEntry`, `TrackingStatus`, `TRACKING_STATUS_LABELS`, `TRACKING_STATUS_BADGE_CLASS` (`src/types/user-item.ts`, Plan A1). `PATCH /api/user-items/[id]`, `DELETE /api/user-items/[id]` (Plan A1).
- Produces: `<TrackingBoard initialEntries={UserItemEntry[]} />`. Consumed by Task 10 (`/my-items` page).

- [ ] **Step 1: Create `src/components/UserItemCard.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  TRACKING_STATUS_BADGE_CLASS,
  TRACKING_STATUS_LABELS,
  type TrackingStatus,
  type UserItemEntry,
} from "@/types/user-item";

const STATUS_OPTIONS: TrackingStatus[] = [
  "ACTIVE",
  "PLANNED",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
];

interface UserItemCardProps {
  entry: UserItemEntry;
  onRemoved: (id: string) => void;
  onUpdated: (entry: UserItemEntry) => void;
}

export default function UserItemCard({ entry, onRemoved, onUpdated }: UserItemCardProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const href = `/items/${entry.item.id}`;
  const progress = entry.progress ?? 0;

  async function handleIncrement() {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: progress + 1 }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, progress: progress + 1 });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onRemoved(entry.id);
      }
    } finally {
      setBusy(false);
      setConfirmingRemove(false);
    }
  }

  async function handleStatusChange(newStatus: TrackingStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, status: newStatus });
      }
    } finally {
      setBusy(false);
      setStatusMenuOpen(false);
    }
  }

  async function handleToggleFavorite() {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !entry.isFavorite }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, isFavorite: !entry.isFavorite });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="poster-card library-card">
      <div className="library-status-wrapper">
        <button
          type="button"
          className={`badge ${TRACKING_STATUS_BADGE_CLASS[entry.status]} library-status-badge`}
          onClick={() => setStatusMenuOpen((o) => !o)}
          disabled={busy}
        >
          {TRACKING_STATUS_LABELS[entry.status]}
        </button>
        {statusMenuOpen && (
          <div className="library-status-menu" role="menu">
            {STATUS_OPTIONS.filter((s) => s !== entry.status).map((status) => (
              <button
                key={status}
                type="button"
                role="menuitem"
                className="library-status-menu-item"
                onClick={() => handleStatusChange(status)}
                disabled={busy}
              >
                {TRACKING_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        )}
      </div>

      <Link href={href} className="series-card-link">
        {entry.item.coverImage ? (
          <Image
            src={entry.item.coverImage}
            alt={entry.item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            className="poster-card-img"
          />
        ) : (
          <div className="poster-card-placeholder">No Image</div>
        )}
        <div className="poster-overlay" />
        <div className="poster-card-info">
          <h3 className="poster-card-title">{entry.item.title}</h3>
        </div>
      </Link>

      <div className="library-card-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleIncrement}
          disabled={busy}
        >
          +1 unit ({progress})
        </button>
        <button
          type="button"
          className={`library-card-favorite ${entry.isFavorite ? "library-card-favorite-active" : ""}`}
          onClick={handleToggleFavorite}
          disabled={busy}
          aria-label={entry.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={entry.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
        {confirmingRemove ? (
          <div className="library-card-confirm">
            <span>Remove?</span>
            <button type="button" className="btn btn-sm btn-danger" onClick={handleRemove} disabled={busy}>
              Yes
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setConfirmingRemove(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="library-card-remove"
            onClick={() => setConfirmingRemove(true)}
            disabled={busy}
            aria-label="Remove from tracking"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Create `src/components/UserItemRow.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  TRACKING_STATUS_BADGE_CLASS,
  TRACKING_STATUS_LABELS,
  type TrackingStatus,
  type UserItemEntry,
} from "@/types/user-item";

const STATUS_OPTIONS: TrackingStatus[] = [
  "ACTIVE",
  "PLANNED",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
];

interface UserItemRowProps {
  entry: UserItemEntry;
  onRemoved: (id: string) => void;
  onUpdated: (entry: UserItemEntry) => void;
}

export default function UserItemRow({ entry, onRemoved, onUpdated }: UserItemRowProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const href = `/items/${entry.item.id}`;
  const progress = entry.progress ?? 0;

  async function handleIncrement() {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: progress + 1 }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, progress: progress + 1 });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onRemoved(entry.id);
      }
    } finally {
      setBusy(false);
      setConfirmingRemove(false);
    }
  }

  async function handleStatusChange(newStatus: TrackingStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, status: newStatus });
      }
    } finally {
      setBusy(false);
      setStatusMenuOpen(false);
    }
  }

  async function handleToggleFavorite() {
    setBusy(true);
    try {
      const res = await fetch(`/api/user-items/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !entry.isFavorite }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, isFavorite: !entry.isFavorite });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="library-list-row">
      <Link href={href} className="library-list-row-link">
        <div className="series-list-thumb">
          {entry.item.coverImage ? (
            <Image
              src={entry.item.coverImage}
              alt={entry.item.title}
              fill
              sizes="48px"
              className="series-list-thumb-img"
            />
          ) : (
            <div className="series-list-thumb-placeholder">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="m21 15-5-5L5 21"/>
              </svg>
            </div>
          )}
        </div>
        <div className="series-list-info">
          <h3 className="series-list-title">{entry.item.title}</h3>
        </div>
      </Link>

      <div className="library-row-status-wrapper">
        <button
          type="button"
          className={`badge ${TRACKING_STATUS_BADGE_CLASS[entry.status]} library-status-badge`}
          onClick={() => setStatusMenuOpen((o) => !o)}
          disabled={busy}
        >
          {TRACKING_STATUS_LABELS[entry.status]}
        </button>
        {statusMenuOpen && (
          <div className="library-status-menu" role="menu">
            {STATUS_OPTIONS.filter((s) => s !== entry.status).map((status) => (
              <button
                key={status}
                type="button"
                role="menuitem"
                className="library-status-menu-item"
                onClick={() => handleStatusChange(status)}
                disabled={busy}
              >
                {TRACKING_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="library-row-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleIncrement}
          disabled={busy}
        >
          +1 unit ({progress})
        </button>
        <button
          type="button"
          className={`library-card-favorite ${entry.isFavorite ? "library-card-favorite-active" : ""}`}
          onClick={handleToggleFavorite}
          disabled={busy}
          aria-label={entry.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={entry.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
        {confirmingRemove ? (
          <div className="library-card-confirm">
            <span>Remove?</span>
            <button type="button" className="btn btn-sm btn-danger" onClick={handleRemove} disabled={busy}>
              Yes
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setConfirmingRemove(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="library-card-remove"
            onClick={() => setConfirmingRemove(true)}
            disabled={busy}
            aria-label="Remove from tracking"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Create `src/components/TrackingBoard.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { TRACKING_STATUS_LABELS, type TrackingStatus, type UserItemEntry } from "@/types/user-item";
import UserItemCard from "./UserItemCard";
import UserItemRow from "./UserItemRow";

const TABS: { value: "ALL" | TrackingStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: TRACKING_STATUS_LABELS.ACTIVE },
  { value: "PLANNED", label: TRACKING_STATUS_LABELS.PLANNED },
  { value: "COMPLETED", label: TRACKING_STATUS_LABELS.COMPLETED },
  { value: "PAUSED", label: TRACKING_STATUS_LABELS.PAUSED },
  { value: "DROPPED", label: TRACKING_STATUS_LABELS.DROPPED },
];

interface TrackingBoardProps {
  initialEntries: UserItemEntry[];
}

export default function TrackingBoard({ initialEntries }: TrackingBoardProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [tab, setTab] = useState<"ALL" | TrackingStatus>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    try {
      const stored = window.localStorage.getItem("my-items-view-mode");
      if (stored === "grid" || stored === "list") return stored;
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — keep default "grid"
    }
    return "grid";
  });

  function handleViewModeChange(mode: "grid" | "list") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("my-items-view-mode", mode);
    } catch {
      // localStorage unavailable — preference just won't persist this session
    }
  }

  const visible = entries.filter((e) => tab === "ALL" || e.status === tab);

  function handleRemoved(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleUpdated(updated: UserItemEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  return (
    <div>
      <div className="explore-toolbar">
        <div className="explore-tabs" role="tablist">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={`explore-tab ${tab === value ? "explore-tab-active" : ""}`}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="explore-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "grid" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("grid")}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "list" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("list")}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="explore-empty">
          <p>No items in this status yet.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="series-grid">
          {visible.map((entry) => (
            <UserItemCard key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      ) : (
        <div className="library-list">
          {visible.map((entry) => (
            <UserItemRow key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify with a type-check**

```bash
npx tsc --noEmit src/components/UserItemCard.tsx src/components/UserItemRow.tsx src/components/TrackingBoard.tsx 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to these three files.

- [ ] **Step 5: Commit**

```bash
git add src/components/UserItemCard.tsx src/components/UserItemRow.tsx src/components/TrackingBoard.tsx
git commit -m "feat: add my-items tracking components (UserItemCard, UserItemRow, TrackingBoard)"
```

---

### Task 4: Browse support components — BrowseSuggestions, BrowseFilters

**Files:**
- Create: `src/components/BrowseSuggestions.tsx`
- Create: `src/components/BrowseFilters.tsx`

**Interfaces:**
- Consumes: `ItemCategory`, `ItemStatus`, `ITEM_CATEGORY_LABELS`, `ITEM_STATUS_LABELS` (`src/types/item.ts`, Plan A1).
- Produces: `<BrowseSuggestions suggestions={BrowseSuggestion[]} activeIndex onSelect onHover />`, exporting `interface BrowseSuggestion { id: string; title: string; category: ItemCategory; coverImage?: string }`. `<BrowseFilters .../>` with category + status chip toggles. Consumed by Task 9 (`/browse` page).

- [ ] **Step 1: Create `src/components/BrowseSuggestions.tsx`**

```tsx
"use client";

import React from "react";
import Image from "next/image";
import type { ItemCategory } from "@/types/item";

export interface BrowseSuggestion {
  id: string;
  title: string;
  category: ItemCategory;
  coverImage?: string;
}

interface BrowseSuggestionsProps {
  suggestions: BrowseSuggestion[];
  activeIndex: number;
  onSelect: (id: string) => void;
  onHover: (index: number) => void;
}

export default function BrowseSuggestions({
  suggestions,
  activeIndex,
  onSelect,
  onHover,
}: BrowseSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="search-suggestions" role="listbox">
      {suggestions.map((s, i) => (
        <button
          key={s.id}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          className={`search-suggestion-item ${i === activeIndex ? "search-suggestion-item-active" : ""}`}
          // onMouseDown (not onClick) fires before the input's onBlur closes the dropdown
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s.id);
          }}
          onMouseEnter={() => onHover(i)}
        >
          <div className="series-list-thumb">
            {s.coverImage ? (
              <Image src={s.coverImage} alt={s.title} fill sizes="32px" className="series-list-thumb-img" />
            ) : (
              <div className="series-list-thumb-placeholder">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
            )}
          </div>
          <span className="search-suggestion-title">{s.title}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/BrowseFilters.tsx`**

```tsx
"use client";

import React from "react";
import { ITEM_CATEGORY_LABELS, ITEM_STATUS_LABELS, type ItemCategory, type ItemStatus } from "@/types/item";

const CATEGORY_OPTIONS: ItemCategory[] = ["TYPE_A", "TYPE_B", "TYPE_C"];
const STATUS_OPTIONS: ItemStatus[] = ["ONGOING", "COMPLETED", "HIATUS", "CANCELLED", "UPCOMING"];

interface BrowseFiltersProps {
  selectedCategories: ItemCategory[];
  onToggleCategory: (category: ItemCategory) => void;
  selectedStatuses: ItemStatus[];
  onToggleStatus: (status: ItemStatus) => void;
  active: boolean;
  onClear: () => void;
}

export default function BrowseFilters({
  selectedCategories,
  onToggleCategory,
  selectedStatuses,
  onToggleStatus,
  active,
  onClear,
}: BrowseFiltersProps) {
  return (
    <div className="explore-filters">
      <div className="explore-filter-group">
        <span className="explore-filter-label">Category</span>
        <div className="explore-filter-chips">
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category}
              type="button"
              className={`explore-filter-chip ${selectedCategories.includes(category) ? "explore-filter-chip-active" : ""}`}
              onClick={() => onToggleCategory(category)}
            >
              {ITEM_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-filter-group">
        <span className="explore-filter-label">Status</span>
        <div className="explore-filter-chips">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              className={`explore-filter-chip ${selectedStatuses.includes(status) ? "explore-filter-chip-active" : ""}`}
              onClick={() => onToggleStatus(status)}
            >
              {ITEM_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {active && (
        <button type="button" className="explore-filter-clear" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify with a type-check**

```bash
npx tsc --noEmit src/components/BrowseSuggestions.tsx src/components/BrowseFilters.tsx 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to these two files.

- [ ] **Step 4: Commit**

```bash
git add src/components/BrowseSuggestions.tsx src/components/BrowseFilters.tsx
git commit -m "feat: add BrowseSuggestions, BrowseFilters components"
```

---

### Task 5: Genericize NotificationBell, update Navbar nav links

**Files:**
- Modify: `src/components/NotificationBell.tsx` (in place)
- Modify: `src/components/Navbar.tsx` (in place — `NAV_LINKS` only)

**Interfaces:**
- Consumes: `GET /api/notifications` (Plan A1, already returns `item` instead of `series` per Task 6's `include: { item: true }`).
- Produces: no new exports — both components keep their existing signatures (`<NotificationBell />`, `<Navbar />`), only internal data shape and links change.

- [ ] **Step 1: Modify `src/components/NotificationBell.tsx`**

Replace the `NotificationItem` interface and the notification link's `href`:

```tsx
interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  item: { id: string };
}
```

(replacing the existing `interface NotificationItem { ...; series: { source: string; externalId: string } }`), and in the JSX where notifications render, replace:

```tsx
href={`/series/${n.series.source}-${n.series.externalId}`}
```

with:

```tsx
href={`/items/${n.item.id}`}
```

No other lines in this file change — `fetchNotifications`, the open/close state, the mark-read call, and the enabled-toggle all stay exactly as they are today.

- [ ] **Step 2: Modify `src/components/Navbar.tsx`**

Replace the `NAV_LINKS` constant:

```tsx
const NAV_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/my-items", label: "My Items" },
] as const;
```

(replacing the existing 4-entry array that includes `/explore`, `/library`, `/calendar`, `/settings`). No other lines in this file change — the logo, mobile menu, auth buttons, and `NotificationBell` usage all stay exactly as they are today.

- [ ] **Step 3: Verify with a type-check**

```bash
npx tsc --noEmit src/components/NotificationBell.tsx src/components/Navbar.tsx 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to these two files.

- [ ] **Step 4: Commit**

```bash
git add src/components/NotificationBell.tsx src/components/Navbar.tsx
git commit -m "feat: genericize NotificationBell to items, update Navbar links to Browse/My Items"
```

---

### Task 6: Genericize profile statistics — types/profile.ts, ProfileStats, ProfileFavorites

**Files:**
- Modify: `src/types/profile.ts` (in place)
- Modify: `src/components/ProfileStats.tsx` (in place)
- Modify: `src/components/ProfileFavorites.tsx` (in place)

**Interfaces:**
- Consumes: `ItemCategory`, `ITEM_CATEGORY_LABELS` (`src/types/item.ts`, Plan A1), `ItemCard` component (Task 1 of this plan).
- Produces: `ProfileStatsData { byCategory: Record<ItemCategory, number>; totalProgress: number; averageRating: number | null }`. `<ProfileStats stats={ProfileStatsData} />`, `<ProfileFavorites favorites={ItemCard[]} />`. Consumed by Task 12 (`/profile/[username]` page). `ProfileHeader.tsx` is unchanged — already fully generic (`displayName`/`username`/`image`/`joinedAt`, no domain fields).

- [ ] **Step 1: Rewrite `src/types/profile.ts`**

```ts
import type { ItemCategory } from "./item";

export interface ProfileStatsData {
  byCategory: Record<ItemCategory, number>;
  totalProgress: number;
  averageRating: number | null;
}
```

- [ ] **Step 2: Rewrite `src/components/ProfileStats.tsx`**

```tsx
import React from "react";
import { ITEM_CATEGORY_LABELS, type ItemCategory } from "@/types/item";
import type { ProfileStatsData } from "@/types/profile";

interface ProfileStatsProps {
  stats: ProfileStatsData;
}

const CATEGORIES: ItemCategory[] = ["TYPE_A", "TYPE_B", "TYPE_C"];

export default function ProfileStats({ stats }: ProfileStatsProps) {
  return (
    <div className="profile-stats-grid">
      {CATEGORIES.map((category) => (
        <div key={category} className="card profile-stat-card">
          <span className={`badge badge-${category.toLowerCase().replace("_", "-")}`}>
            {ITEM_CATEGORY_LABELS[category]}
          </span>
          <span className="profile-stat-value">{stats.byCategory[category] ?? 0}</span>
        </div>
      ))}
      <div className="card profile-stat-card">
        <span className="profile-stat-label">Total Progress</span>
        <span className="profile-stat-value">{stats.totalProgress}</span>
      </div>
      <div className="card profile-stat-card">
        <span className="profile-stat-label">Average Rating Given</span>
        <span className="profile-stat-value">
          {stats.averageRating !== null ? stats.averageRating.toFixed(1) : "—"}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `src/components/ProfileFavorites.tsx`**

```tsx
import React from "react";
import ItemCardComponent from "./ItemCard";
import type { ItemCard } from "@/types/item";

interface ProfileFavoritesProps {
  favorites: ItemCard[];
}

export default function ProfileFavorites({ favorites }: ProfileFavoritesProps) {
  if (favorites.length === 0) {
    return <p className="profile-favorites-empty">No favorites yet.</p>;
  }

  return (
    <div className="series-grid">
      {favorites.map((item) => (
        <ItemCardComponent key={item.id} item={item} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify with a type-check**

```bash
npx tsc --noEmit src/types/profile.ts src/components/ProfileStats.tsx src/components/ProfileFavorites.tsx 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to these three files.

- [ ] **Step 5: Commit**

```bash
git add src/types/profile.ts src/components/ProfileStats.tsx src/components/ProfileFavorites.tsx
git commit -m "feat: genericize profile statistics types and components to Item/UserItem"
```

---

### Task 7: Genericize HeroSlider to 3 categories

**Files:**
- Modify: `src/components/HeroSlider.tsx` (in place)
- Modify: `src/app/globals.css` (add 3 hero-slider-dot category color rules)

**Interfaces:**
- Consumes: `ItemCard`, `ITEM_CATEGORY_LABELS` (`src/types/item.ts`, Plan A1).
- Produces: `<HeroSlider byCategory={Record<ItemCategory, ItemCard[]>} />`. Consumed by Task 10 (home page).

**Why this shape:** the old `HeroSlider` took 4 separate arrays (`tv`/`anime`/`manga`/`novel`), one per content type, each pre-fetched from a different external API. The generic starter has exactly 3 categories (`TYPE_A`/`TYPE_B`/`TYPE_C`) from one source, so the slider takes a single `byCategory` map instead of one prop per category — this avoids hardcoding category names into the prop list, matching the rest of this plan's category-driven (not type-A/B/C-hardcoded) component design.

- [ ] **Step 1: Add hero-slider-dot category colors**

In `src/app/globals.css`, find the existing `.hero-slider-dot.*` rules (around line 1194-1197, near `.hero-slider-dot.tv`) and add three more immediately after `.hero-slider-dot.novel`:

```css
.hero-slider-dot.type-a { background: var(--color-type-a); }
.hero-slider-dot.type-b { background: var(--color-type-b); }
.hero-slider-dot.type-c { background: var(--color-type-c); }
```

- [ ] **Step 2: Rewrite `src/components/HeroSlider.tsx`**

```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ITEM_CATEGORY_LABELS, type ItemCard, type ItemCategory } from "@/types/item";

interface HeroSliderProps {
  byCategory: Record<ItemCategory, ItemCard[]>;
}

const CATEGORY_ORDER: ItemCategory[] = ["TYPE_A", "TYPE_B", "TYPE_C"];
const CATEGORY_SLUG: Record<ItemCategory, string> = {
  TYPE_A: "type-a",
  TYPE_B: "type-b",
  TYPE_C: "type-c",
};

export default function HeroSlider({ byCategory }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = CATEGORY_ORDER.map((category) => ({
    id: CATEGORY_SLUG[category],
    title: ITEM_CATEGORY_LABELS[category],
    tagline: `Trending ${ITEM_CATEGORY_LABELS[category]}`,
    items: (byCategory[category] ?? []).slice(0, 3),
  })).filter((s) => s.items.length >= 3);

  // Auto-play effect
  useEffect(() => {
    if (isPaused || slides.length <= 1) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPaused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="hero-slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Elegant tab controls */}
      <div className="hero-slider-tabs" role="tablist">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            role="tab"
            aria-selected={activeIndex === idx}
            className={`hero-slider-tab ${activeIndex === idx ? "active" : ""}`}
            onClick={() => setActiveIndex(idx)}
          >
            <span className={`hero-slider-dot ${slide.id}`} />
            {slide.title}
          </button>
        ))}
      </div>

      {/* Slide Content Stack */}
      <div className="hero-slider-content">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`hero-slider-slide ${activeIndex === idx ? "active" : ""}`}
            aria-hidden={activeIndex !== idx}
          >
            <div className="hero-poster-grid">
              {slide.items.map((item, i) => (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className={`hero-poster-item hero-poster-${i}`}
                >
                  {item.coverImage ? (
                    <>
                      <Image
                        src={item.coverImage}
                        alt={item.title}
                        fill
                        sizes="(max-width: 900px) 100vw, 320px"
                        className="hero-poster-img"
                        priority={idx === 0}
                      />
                      {/* Premium overlay with details */}
                      <div className="hero-poster-info">
                        <span className="hero-poster-number">#{i + 1}</span>
                        <div className="hero-poster-meta">
                          <h3 className="hero-poster-title">{item.title}</h3>
                          {item.ratingExternal && (
                            <div className="hero-poster-row">
                              <span className="hero-poster-rating">
                                ★ {item.ratingExternal.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="poster-card-placeholder">
                      <span>{item.title}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify with a type-check**

```bash
npx tsc --noEmit src/components/HeroSlider.tsx 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to this file.

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroSlider.tsx src/app/globals.css
git commit -m "feat: genericize HeroSlider to 3 item categories"
```

---

### Task 8: Item detail page — `/items/[id]`

**Files:**
- Create: `src/app/items/[id]/page.tsx`

**Interfaces:**
- Consumes: `prisma.item.findUnique`, `prisma.userItem.findUnique`, `prisma.rating.findUnique` (Plan A1 schema), `getCurrentUser` (`src/lib/auth/helpers.ts`, unchanged), `AddToTrackingButton` (Task 2), `RatingWidget` (Task 2), `ITEM_CATEGORY_LABELS`/`ITEM_STATUS_LABELS` (`src/types/item.ts`, Plan A1).
- Produces: the `/items/[id]` route. No other task depends on this page directly, but Task 9 (browse page) and Task 11 (home page) link to it via `ItemCard`/`ItemListRow`/`HeroSlider`, all already pointed at `/items/${id}`.

This page queries Prisma directly (no internal fetch round-trip), matching the existing direct-Prisma convention already used by `/library` and `/profile/[username]` pages.

- [ ] **Step 1: Create `src/app/items/[id]/page.tsx`**

```tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ITEM_CATEGORY_LABELS, ITEM_STATUS_LABELS } from "@/types/item";
import type { TrackingStatus } from "@/types/user-item";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import AddToTrackingButton from "@/components/AddToTrackingButton";
import RatingWidget from "@/components/RatingWidget";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return { title: "Item Not Found" };

  return {
    title: item.title,
    description: item.description?.slice(0, 160) || `Track ${item.title}`,
    openGraph: {
      title: item.title,
      description: item.description?.slice(0, 160),
      images: item.coverImage ? [{ url: item.coverImage }] : [],
    },
  };
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });

  if (!item) {
    notFound();
  }

  const user = await getCurrentUser();
  let existingEntry: { id: string; status: TrackingStatus } | null = null;
  let existingRating: { score: number; review: string | null } | null = null;

  if (user) {
    const [entryRow, ratingRow] = await Promise.all([
      prisma.userItem.findUnique({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
      }),
      prisma.rating.findUnique({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
      }),
    ]);
    if (entryRow) existingEntry = { id: entryRow.id, status: entryRow.status };
    if (ratingRow) existingRating = { score: ratingRow.score, review: ratingRow.review };
  }

  return (
    <div className="page-enter">
      <div className="container-content detail-content">
        <div className="detail-layout">
          {/* Poster */}
          <aside className="detail-poster-col">
            <div className="detail-poster">
              {item.coverImage ? (
                <Image
                  src={item.coverImage}
                  alt={item.title}
                  width={300}
                  height={450}
                  className="detail-poster-img"
                  priority
                />
              ) : (
                <div className="detail-poster-placeholder">No Image</div>
              )}
            </div>

            <AddToTrackingButton
              itemId={item.id}
              initialEntry={existingEntry}
              isSignedIn={!!user}
            />
          </aside>

          {/* Info */}
          <div className="detail-info">
            <div className="detail-meta-row">
              <span className={`badge badge-${item.category.toLowerCase().replace("_", "-")}`}>
                {ITEM_CATEGORY_LABELS[item.category]}
              </span>
              <span className="detail-status">{ITEM_STATUS_LABELS[item.status]}</span>
            </div>

            <h1 className="detail-title">{item.title}</h1>

            {item.ratingExternal != null && item.ratingExternal > 0 && (
              <div className="detail-ratings">
                <div className="detail-rating-item">
                  <span className="detail-rating-score">{item.ratingExternal.toFixed(1)}</span>
                  <span className="detail-rating-label">External</span>
                </div>
              </div>
            )}

            <RatingWidget
              itemId={item.id}
              initialRating={existingRating}
              isSignedIn={!!user}
            />

            {item.totalUnits != null && (
              <div className="detail-counts">
                <span className="detail-count-item">
                  <strong>{item.totalUnits}</strong> units
                </span>
              </div>
            )}

            {item.description && (
              <div className="detail-synopsis">
                <h2 className="detail-section-title">Description</h2>
                <p>{item.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify with a type-check**

```bash
npx tsc --noEmit "src/app/items/[id]/page.tsx" 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to this file.

- [ ] **Step 3: Manual verification**

With the dev server running (`npm run dev`) and a known seeded item id (query `npx prisma studio` or `psql` for an `Item.id`):

```
http://localhost:3000/items/<item-id>
```

Expected: page renders title, category badge, status, description, "Add to Tracking" button (sign-in prompt if logged out). A 404 for an unknown id.

- [ ] **Step 4: Commit**

```bash
git add "src/app/items/[id]/page.tsx"
git commit -m "feat: add item detail page (/items/[id])"
```

---

### Task 9: Browse page — `/browse`

**Files:**
- Create: `src/app/browse/page.tsx`

**Interfaces:**
- Consumes: `GET /api/items?q=&category=&status=`, `GET /api/items/suggest?q=` (Plan A1), `ItemCard`/`ItemListRow` (Task 1), `BrowseSuggestions`/`BrowseFilters` (Task 4), `ItemCategory`/`ItemStatus` types (`src/types/item.ts`, Plan A1).
- Produces: the `/browse` route. No other task depends on this page.

This page is deliberately simpler than the old `/explore`: no pagination/Load More (`/api/items` returns all matches in one call — only 12 seed items exist), no genre filter or year range (`Item` has neither field), filtering happens server-side via query params instead of client-side post-filtering.

- [ ] **Step 1: Create `src/app/browse/page.tsx`**

```tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ItemCard from "@/components/ItemCard";
import ItemListRow from "@/components/ItemListRow";
import BrowseSuggestions, { type BrowseSuggestion } from "@/components/BrowseSuggestions";
import BrowseFilters from "@/components/BrowseFilters";
import type { ItemCard as ItemCardData, ItemCategory, ItemStatus } from "@/types/item";

export default function BrowsePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const router = useRouter();
  const [suggestions, setSuggestionsState] = useState<BrowseSuggestion[]>([]);
  const suggestionsRef = useRef<BrowseSuggestion[]>([]);
  const setSuggestions = useCallback((next: BrowseSuggestion[]) => {
    suggestionsRef.current = next;
    setSuggestionsState(next);
  }, []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestRequestIdRef = useRef(0);
  const [selectedCategories, setSelectedCategories] = useState<ItemCategory[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<ItemStatus[]>([]);

  const filtersActive = selectedCategories.length > 0 || selectedStatuses.length > 0;

  function toggleCategory(category: ItemCategory) {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  }

  function toggleStatus(status: ItemStatus) {
    setSelectedStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  }

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedStatuses([]);
  }

  type SortOption = "relevance" | "rating";
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  const sortedResults = sortBy === "relevance"
    ? results
    : [...results].sort((a, b) => (b.ratingExternal ?? -1) - (a.ratingExternal ?? -1));

  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    try {
      const stored = window.localStorage.getItem("browse-view-mode");
      if (stored === "grid" || stored === "list") return stored;
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — keep default "grid"
    }
    return "grid";
  });

  function handleViewModeChange(mode: "grid" | "list") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("browse-view-mode", mode);
    } catch {
      // localStorage unavailable — preference just won't persist this session
    }
  }

  const buildQuery = useCallback((q: string, categories: ItemCategory[], statuses: ItemStatus[]) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    // /api/items accepts one category/status value — use the first selected filter chip
    if (categories.length > 0) params.set("category", categories[0]);
    if (statuses.length > 0) params.set("status", statuses[0]);
    return params.toString();
  }, []);

  const search = useCallback(async (q: string, categories: ItemCategory[], statuses: ItemStatus[]) => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/items?${buildQuery(q, categories, statuses)}`);
      const data = await res.json();
      if (requestIdRef.current !== requestId) return;
      setResults(data.success ? data.data : []);
    } catch {
      if (requestIdRef.current !== requestId) return;
      setResults([]);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [buildQuery]);

  function handleSuggestionSelect(id: string) {
    setShowSuggestions(false);
    router.push(`/items/${id}`);
  }

  function handleSearchInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[activeSuggestionIndex].id);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  // Debounced search — fires on query OR filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(query, selectedCategories, selectedStatuses);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedCategories, selectedStatuses, search]);

  // Debounced autocomplete suggestions
  useEffect(() => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);

    if (query.length < 2) {
      if (suggestionsRef.current.length > 0) setSuggestions([]);
      return;
    }

    suggestDebounceRef.current = setTimeout(async () => {
      const requestId = ++suggestRequestIdRef.current;
      try {
        const res = await fetch(`/api/items/suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (suggestRequestIdRef.current !== requestId) return;
        setSuggestions(data.success ? data.data : []);
        setActiveSuggestionIndex(-1);
      } catch {
        if (suggestRequestIdRef.current === requestId) setSuggestions([]);
      }
    }, 200);

    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [query, setSuggestions]);

  return (
    <div className="container-content page-enter explore-page">
      <div className="explore-header">
        <h1 className="explore-title">Browse</h1>
        <p className="explore-subtitle">Search and filter items by category and status</p>
      </div>

      <div className="explore-search-bar">
        <svg className="explore-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          id="search-input"
          type="text"
          className="explore-search-input"
          placeholder="Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setShowSuggestions(false)}
          onKeyDown={handleSearchInputKeyDown}
          autoFocus
        />
        {query && (
          <button
            className="explore-search-clear"
            onClick={() => {
              requestIdRef.current++;
              suggestRequestIdRef.current++;
              setQuery("");
              setResults([]);
              setSearched(false);
              setSuggestions([]);
              setShowSuggestions(false);
            }}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
        {showSuggestions && (
          <BrowseSuggestions
            suggestions={suggestions}
            activeIndex={activeSuggestionIndex}
            onSelect={handleSuggestionSelect}
            onHover={setActiveSuggestionIndex}
          />
        )}
      </div>

      <div className="explore-toolbar">
        <select
          className="explore-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          aria-label="Sort results"
        >
          <option value="relevance">Relevance</option>
          <option value="rating">Rating</option>
        </select>

        <div className="explore-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "grid" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("grid")}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "list" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("list")}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <BrowseFilters
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        selectedStatuses={selectedStatuses}
        onToggleStatus={toggleStatus}
        active={filtersActive}
        onClear={clearFilters}
      />

      <div className="explore-results">
        {loading ? (
          <div className="series-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="poster-card skeleton" />
            ))}
          </div>
        ) : results.length > 0 ? (
          viewMode === "grid" ? (
            <div className="series-grid">
              {sortedResults.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="series-list">
              {sortedResults.map((item) => (
                <ItemListRow key={item.id} item={item} />
              ))}
            </div>
          )
        ) : searched ? (
          <div className="explore-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <p>No items found</p>
            <span>Try a different search term or filter</span>
          </div>
        ) : (
          <div className="explore-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <p>Start typing to search, or pick a filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify with a type-check**

```bash
npx tsc --noEmit src/app/browse/page.tsx 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to this file.

- [ ] **Step 3: Manual verification**

With the dev server running, visit `http://localhost:3000/browse`. Type a query matching a seeded item title (e.g. "Static") — confirm results and autocomplete both populate. Toggle a category/status filter chip — confirm results narrow. Toggle grid/list view — confirm it persists across a page reload.

- [ ] **Step 4: Commit**

```bash
git add src/app/browse/page.tsx
git commit -m "feat: add browse page (/browse)"
```

---

### Task 10: My-items page — `/my-items`

**Files:**
- Create: `src/app/my-items/page.tsx`

**Interfaces:**
- Consumes: `requireAuth` (`src/lib/auth/helpers.ts`, unchanged), `prisma.userItem.findMany` (Plan A1 schema), `TrackingBoard` (Task 3), `UserItemEntry` type (`src/types/user-item.ts`, Plan A1).
- Produces: the `/my-items` route, auth-gated. No other task depends on this page.

- [ ] **Step 1: Create `src/app/my-items/page.tsx`**

```tsx
import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import TrackingBoard from "@/components/TrackingBoard";
import type { UserItemEntry } from "@/types/user-item";

export const metadata: Metadata = {
  title: "My Items",
  description: "Your personal tracking list",
};

export const dynamic = "force-dynamic";

export default async function MyItemsPage() {
  const user = await requireAuth();

  const rows = await prisma.userItem.findMany({
    where: { userId: user.id },
    include: { item: true },
    orderBy: { updatedAt: "desc" },
  });

  const entries: UserItemEntry[] = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    itemId: row.itemId,
    status: row.status,
    isFavorite: row.isFavorite,
    progress: row.progress ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    item: {
      id: row.item.id,
      category: row.item.category,
      status: row.item.status,
      title: row.item.title,
      description: row.item.description ?? undefined,
      coverImage: row.item.coverImage ?? undefined,
      totalUnits: row.item.totalUnits ?? undefined,
      ratingExternal: row.item.ratingExternal ?? undefined,
    },
  }));

  return (
    <div className="container-content page-enter library-page">
      <div className="library-header">
        <h1 className="library-title">My Items</h1>
      </div>

      {entries.length === 0 ? (
        <div className="library-empty">
          <div className="library-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="m9 10 2 2 4-4" />
            </svg>
          </div>
          <h2 className="library-empty-title">Nothing tracked yet</h2>
          <p className="library-empty-text">
            Start by browsing items and adding them to your tracking list.
          </p>
          <div className="library-empty-actions">
            <Link href="/browse" className="btn btn-primary">
              Browse Items
            </Link>
          </div>
        </div>
      ) : (
        <TrackingBoard initialEntries={entries} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify with a type-check**

```bash
npx tsc --noEmit src/app/my-items/page.tsx 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to this file.

- [ ] **Step 3: Manual verification**

Signed in, visit `http://localhost:3000/my-items`. Empty state shows "Browse Items" link when nothing tracked. After tracking an item from `/items/[id]`, confirm it appears here with working status-change, favorite-toggle, +1 progress, and remove actions, and that the status tabs filter correctly.

- [ ] **Step 4: Commit**

```bash
git add src/app/my-items/page.tsx
git commit -m "feat: add my-items page (/my-items)"
```

---

### Task 11: Home page rewrite — `/`

**Files:**
- Modify: `src/app/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `prisma.item.findMany` (Plan A1 schema), `HeroSlider` (Task 7), `ItemCard` component (Task 1), `ItemCategory` type (`src/types/item.ts`, Plan A1).
- Produces: the `/` route. No other task depends on this page.

Drops entirely (no replacement): the platform-strip ("Available on Netflix/Crunchyroll/...") since `Item` has no platform-availability data; `AiringTodaySection`/calendar integration, removed per the design spec; the 5 separate per-content-type trending sections, replaced by one "Trending" grid. `dynamic = "force-dynamic"` is kept since the page reads live DB state same as before.

- [ ] **Step 1: Rewrite `src/app/page.tsx`**

```tsx
import React from "react";
import Link from "next/link";
import ItemCard from "@/components/ItemCard";
import HeroSlider from "@/components/HeroSlider";
import { ITEM_CATEGORY_LABELS, type ItemCard as ItemCardData, type ItemCategory } from "@/types/item";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const CATEGORIES: ItemCategory[] = ["TYPE_A", "TYPE_B", "TYPE_C"];

function toItemCard(row: {
  id: string;
  category: ItemCategory;
  status: ItemCardData["status"];
  title: string;
  description: string | null;
  coverImage: string | null;
  totalUnits: number | null;
  ratingExternal: number | null;
}): ItemCardData {
  return {
    id: row.id,
    category: row.category,
    status: row.status,
    title: row.title,
    description: row.description ?? undefined,
    coverImage: row.coverImage ?? undefined,
    totalUnits: row.totalUnits ?? undefined,
    ratingExternal: row.ratingExternal ?? undefined,
  };
}

export default async function HomePage() {
  const allItems = await prisma.item.findMany({ orderBy: { title: "asc" } });
  const items = allItems.map(toItemCard);

  const byCategory = CATEGORIES.reduce((acc, category) => {
    acc[category] = items.filter((i) => i.category === category);
    return acc;
  }, {} as Record<ItemCategory, ItemCardData[]>);

  const trending = items.filter((i) => i.status === "ONGOING").slice(0, 8);

  return (
    <div className="page-enter">
      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="container-content hero-grid">
          {/* Left — copy */}
          <div className="hero-copy">
            <p className="hero-eyebrow-text">A generic SaaS starter</p>

            <h1 className="hero-title">
              Track anything.<br />
              <span className="hero-title-accent">Stay on top of progress.</span>
            </h1>

            <p className="hero-body">
              A working example of auth, personal tracking, ratings, and
              cron-based notifications — built on a generic Item/UserItem model
              you can adapt to any content domain.
            </p>

            <div className="hero-actions">
              <Link href="/browse" className="btn btn-primary btn-lg">
                Browse catalogue
              </Link>
              <Link href="/auth/signin" className="btn btn-ghost btn-lg">
                Sign in
              </Link>
            </div>
          </div>

          {/* Right — visual slider */}
          <div className="hero-visual">
            <HeroSlider byCategory={byCategory} />
            <div className="hero-visual-fade" />
          </div>
        </div>
      </section>

      <div className="container-content">
        {/* ── Trending ── */}
        {trending.length > 0 && (
          <section className="trending-section" id="trending">
            <div className="section-header">
              <h2 className="section-title">Trending</h2>
              <Link href="/browse" className="section-see-all">
                See all →
              </Link>
            </div>
            <div className="series-grid">
              {trending.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* ── What you can track ── */}
        <section className="content-types-section">
          <h2 className="section-label">What you can track</h2>
          <div className="content-type-grid">
            {CATEGORIES.map((category) => (
              <div key={category} className="content-type-card">
                <span className={`badge badge-${category.toLowerCase().replace("_", "-")}`}>
                  {ITEM_CATEGORY_LABELS[category]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify with a type-check**

```bash
npx tsc --noEmit src/app/page.tsx 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to this file.

- [ ] **Step 3: Manual verification**

Visit `http://localhost:3000/`. Confirm the hero slider shows 3 category tabs (each with 3 posters), the Trending section shows ongoing items, and "What you can track" shows 3 category badges.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: rewrite home page for generic Item model"
```

---

### Task 12: Genericize profile page — `/profile/[username]`

**Files:**
- Modify: `src/app/profile/[username]/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `prisma.userItem.findMany`/`.aggregate`, `prisma.rating.aggregate` (Plan A1 schema), `ProfileHeader` (unchanged), `ProfileStats`/`ProfileFavorites` (Task 6), `ProfileStatsData` (`src/types/profile.ts`, Task 6), `ItemCard` type (`src/types/item.ts`, Plan A1).
- Produces: the `/profile/[username]` route. No other task depends on this page. This is the **last task in Plan A2** — once committed, A2 is complete.

- [ ] **Step 1: Rewrite `src/app/profile/[username]/page.tsx`**

```tsx
import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileStats from "@/components/ProfileStats";
import ProfileFavorites from "@/components/ProfileFavorites";
import type { ItemCategory } from "@/types/item";
import type { ProfileStatsData } from "@/types/profile";
import type { ItemCard } from "@/types/item";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `${username}'s tracking profile`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    notFound();
  }

  const [itemsByCategory, progressSum, ratingAvg, favoriteEntries] = await Promise.all([
    prisma.userItem.findMany({
      where: { userId: user.id },
      select: { item: { select: { category: true } } },
    }),
    prisma.userItem.aggregate({
      where: { userId: user.id },
      _sum: { progress: true },
    }),
    prisma.rating.aggregate({
      where: { userId: user.id },
      _avg: { score: true },
    }),
    prisma.userItem.findMany({
      where: { userId: user.id, isFavorite: true },
      include: { item: true },
    }),
  ]);

  const byCategory = itemsByCategory.reduce((acc, row) => {
    const category = row.item.category as ItemCategory;
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {} as Record<ItemCategory, number>);

  const stats: ProfileStatsData = {
    byCategory,
    totalProgress: progressSum._sum.progress ?? 0,
    averageRating: ratingAvg._avg.score,
  };

  const favorites: ItemCard[] = favoriteEntries.map((entry) => ({
    id: entry.item.id,
    category: entry.item.category,
    status: entry.item.status,
    title: entry.item.title,
    description: entry.item.description ?? undefined,
    coverImage: entry.item.coverImage ?? undefined,
    totalUnits: entry.item.totalUnits ?? undefined,
    ratingExternal: entry.item.ratingExternal ?? undefined,
  }));

  return (
    <div className="container-content page-enter">
      <ProfileHeader
        displayName={user.name}
        username={user.username ?? username}
        image={user.image}
        joinedAt={user.createdAt.toISOString()}
      />

      <h2 className="profile-section-title">Statistics</h2>
      <ProfileStats stats={stats} />

      <h2 className="profile-section-title">Favorites</h2>
      <ProfileFavorites favorites={favorites} />
    </div>
  );
}
```

- [ ] **Step 2: Verify with a type-check**

```bash
npx tsc --noEmit "src/app/profile/[username]/page.tsx" 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to this file.

- [ ] **Step 3: Manual verification**

Visit `http://localhost:3000/profile/<your-username>` (set a username via `/auth/set-username` first if needed). Confirm category counts, total progress, average rating, and favorites grid all render correctly after tracking/favoriting/rating a few items.

- [ ] **Step 4: Commit**

```bash
git add "src/app/profile/[username]/page.tsx"
git commit -m "feat: genericize profile page to Item/UserItem statistics"
```

---

## Self-Review Notes

**Spec coverage:** Sayfalar/route'lar tablosu (design spec § "Sayfalar ve route'lar") — `/` (Task 11) ✓, `/browse` (Task 9) ✓, `/items/[id]` (Task 8) ✓, `/my-items` (Task 10) ✓, `/profile/[username]` (Task 12) ✓, `/auth/signin`/`/auth/signup` already correct, unchanged ✓. Navbar links updated to Browse/My Items, Calendar/Settings removed (Task 5) ✓. Bileşen genericization list from the design spec: `SeriesCard→ItemCard`/`SeriesListRow→ItemListRow` (Task 1) ✓, `HeroSlider` (Task 7) ✓, `AddToLibraryButton→AddToTrackingButton` (Task 2) ✓, `LibraryBoard→TrackingBoard`/`LibraryItemCard→UserItemCard`/`LibraryItemRow→UserItemRow` (Task 3) ✓, `ProfileHeader`/`ProfileStats`/`ProfileFavorites` (Task 6, `ProfileHeader` needs no change — confirmed already generic) ✓, `NotificationBell`/`NotificationTrigger` (Task 5, `NotificationTrigger` needs no change — confirmed already generic) ✓, `SearchSuggestions→BrowseSuggestions`/`ExploreFilters→BrowseFilters` (Task 4) ✓, `RatingWidget` (Task 2) ✓. Types: `series.ts→item.ts`/`library.ts→user-item.ts` already done in Plan A1; `profile.ts` genericized here (Task 6) ✓.

**Deliberately dropped, not carried over (confirmed against design spec's Out of Scope):** `RedirectButton`, language-wait select (Calendar/Language-Tracking/Notes-Redirect features — all explicitly out of scope for the whole sub-project), genre filter chips and year range (no `genres`/`year` field on `Item`), search-result pagination/Load More (`/api/items` has no pagination), content-type sub-tabs on `/my-items` (spec only calls for a status filter).

**Placeholder scan:** Clean — every step has complete, runnable code; no "similar to Task N" references, no TODOs.

**Type consistency:** `ItemCard`/`ItemDetail` (Task 1 consumer of Plan A1's `src/types/item.ts`) field names (`id`, `category`, `status`, `title`, `description`, `coverImage`, `totalUnits`, `ratingExternal`) used identically across Tasks 1, 7, 8, 9, 11, 12. `UserItemEntry` (Task 3 consumer of Plan A1's `src/types/user-item.ts`) field names (`id`, `userId`, `itemId`, `status`, `isFavorite`, `progress`, `notes`, `createdAt`, `updatedAt`, `item`) used identically across Tasks 3, 10. `ProfileStatsData.byCategory`/`.totalProgress`/`.averageRating` (Task 6) used identically in Task 12. No drift found between task definitions and consumers.

**Note (Task 12, end of plan):** Once this plan is fully executed, the app is **functionally complete for its new pages** (`/`, `/browse`, `/items/[id]`, `/my-items`, `/profile/[username]`, `/auth/*`) but the full project `npm run type-check` and `npm run lint` will **still fail** — old domain pages/components/routes (`/explore`, `/library`, `/series/[id]`, `/calendar`, `/settings`, old API routes, old components like `SeriesCard`/`LibraryBoard`/`RedirectButton`) remain on disk and still reference deleted Prisma models. This is expected and resolved entirely by Plan A3 (cleanup/deletion sweep), not by this plan. `npm run dev` should work correctly for every route this plan touches; do not navigate to the old routes during manual verification — they are known-broken pending A3.

