# Favicon & App Icons — Design Spec

**Status:** Approved
**Scope:** Phase 1 close-out, sub-project 3 of 4 (explore page and library page polish done; Cloudflare deploy + Neon migration sync follows separately — see `docs/phases.md`).

## Goal

Close `docs/phases.md`'s "Favicon and app icons" Phase 1.6 checklist item with a real, branded icon — replacing the generic placeholder `favicon.ico` Next.js ships by default — using Next.js 16's file-based icon convention (`icon.tsx` / `apple-icon.tsx`), generated entirely in code via `next/og`'s `ImageResponse`. No external image-editing tool, no binary asset generation.

## Out of Scope

- PWA `manifest.json` / installable web app — separate Phase 2/3 checklist item (`docs/phases.md` line 210), not this sub-project.
- Open Graph / Twitter card images (`opengraph-image.tsx`) — `layout.tsx`'s `metadata.openGraph` has no `images` field configured, which is a real gap, but it's a distinct concern from "favicon and app icons" and not part of this spec.
- Changing the existing `Navbar.tsx` logo mark (the 4-block bento SVG) — that's a separate, already-shipped piece of UI. Not touched here.
- Regenerating `favicon.ico` itself — Next.js cannot code-generate a `.ico` file ("You cannot generate a `favicon` icon. Use `icon` or a `favicon.ico` file instead," confirmed in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`). The existing generic `favicon.ico` stays as a legacy fallback for browsers/contexts that hard-code looking for it; `icon`/`apple-icon` take precedence in virtually all modern browsers and OSes.

## Current State

- `src/app/favicon.ico` is the unmodified Next.js default placeholder icon (confirmed via `file`: a standard 16×16/32×32 multi-resolution `.ico`, not branded).
- No `src/app/icon.*` or `src/app/apple-icon.*` file exists — Next.js currently falls back to `favicon.ico` alone for everything.
- `src/app/layout.tsx`'s `metadata` object has no `icons` field — none is needed; Next.js auto-detects file-convention icons and injects the appropriate `<link>` tags without any metadata config.
- Brand color is `--color-brand: #5b5fcf` (muted indigo), defined in `src/app/globals.css`.

## Design

### Concept: the progress-bookmark

The product's core pitch is tracking *where you are* across TV, anime, manga, manhwa, light novels, and webtoons. A bookmark is the literal object for "my place in a story" — but a plain bookmark silhouette alone is a generic stock icon. The signature detail: the bookmark's fill level visually encodes progress — the top portion is solid white (watched/read), the bottom portion is outline-only (remaining) — so the icon itself depicts "partially through," not just "saved."

```
┌─────────────────┐
│                 │   rounded-square canvas, background = brand indigo
│   ▐▐▐▐▐▐▐       │   solid white fill (top ~58% of the bookmark shape)
│   ▐▐▐▐▐▐▐       │
│   ╎╎╎╎╎╎╎       │   white outline only (bottom ~42%, interior transparent)
│    ╲   ╱        │   notched bookmark point (clip-path V-cut)
│     ╲ ╱         │
└─────────────────┘
```

### Visual spec

- **Canvas:** square, background `#5b5fcf` (existing `--color-brand` value, hardcoded as a literal hex since `ImageResponse` JSX can't read CSS custom properties from `globals.css`), `borderRadius` ≈ 22% of canvas size, flexbox-centered content.
- **Bookmark shape:** a box ~38% of canvas width × ~60% of canvas height, centered, with `clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 78%, 0% 100%)'` — a rectangle with the bottom edge folded up to a point at 50% horizontal / 78% vertical, producing the classic forked bookmark silhouette.
- **Outline:** the clipped box gets a solid white border (~6% of canvas size, floored at 2px so it doesn't disappear at 32px) tracing the entire bookmark silhouette, including the notch.
- **Fill:** an absolutely-positioned child div covering the top 58% of the bookmark box, solid white background — this paints over the border in that region, so only the top portion reads as a solid filled shape; the bottom 42% shows just the traced white outline against the indigo background, reading as "unfilled."
- No text, no gradients, no drop shadows — flat, two-tone, legible at 16–32px.

### Implementation

Two new self-contained files, each following Next.js 16's code-generation icon convention (`next/og`'s `ImageResponse`). Per the codebase's existing convention (see `src/components/*.tsx` all using PascalCase filenames despite `CLAUDE.md`'s stated kebab-case rule — established pattern wins), and since each file is mandated by Next.js's own file-convention naming (`icon.tsx`, `apple-icon.tsx`) anyway, both files are fully self-contained with no shared helper module — the ~25 lines of mark JSX are duplicated once between two files rather than introducing a shared component for two call sites that will essentially never change independently.

- `src/app/icon.tsx` — 32×32, `image/png`, the favicon shown in browser tabs/bookmarks.
- `src/app/apple-icon.tsx` — 180×180, `image/png`, used for iOS "Add to Home Screen" and Safari.

Both export `size`/`contentType` per Next.js's icon route convention; Next.js auto-injects the `<link rel="icon">` / `<link rel="apple-touch-icon">` tags — no `layout.tsx` changes needed.

## Error Handling

Not applicable — these are statically-generated icons (Next.js generates them at build time since they use no request-time APIs or uncached data, per the "Good to know" note in Next.js's app-icons docs), not runtime code with failure modes.

## Testing / Verification

No automated test framework in this repo (per `CLAUDE.md`). Verification is `npm run type-check` + `npm run lint` + manual browser check:
- Run `npx next dev --webpack`, visit any page, confirm the browser tab shows the new indigo bookmark icon instead of the default Next.js icon.
- View page source / inspect `<head>` — confirm `<link rel="icon" href="/icon?...">` and `<link rel="apple-touch-icon" href="/apple-icon?...">` tags are present.
- Visually confirm at actual favicon size (zoom out / check the literal tab icon, not just the rendered `/icon` route at full size) that the notch and fill-line are still legible, not mush — if not, adjust the proportions before considering the task done.
- Confirm `docs/phases.md`'s "Favicon and app icons" checklist item gets checked off as part of this work.
