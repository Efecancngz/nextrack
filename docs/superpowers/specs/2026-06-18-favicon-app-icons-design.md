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

- **Canvas:** square, background `#5b5fcf` (existing `--color-brand` value, hardcoded as a literal hex since `ImageResponse` JSX can't read CSS custom properties from `globals.css`), `borderRadius: '22%'` (percentage border-radius is a common, reliable Satori pattern — used pervasively for circular avatars in `og-image`/`ImageResponse` examples elsewhere), flexbox-centered content.
- **Bookmark shape:** rendered as a single inline `<svg viewBox="0 0 100 100">` nested inside the canvas `<div>`, sized `width="100%" height="100%"` so it scales automatically with whichever canvas size (`32` or `180`) the parent `ImageResponse` renders at — no per-size pixel math needed.
  - A `<polygon points="31,20 69,20 69,80 50,67 31,80" stroke="white" strokeWidth="6" strokeLinejoin="round" fill="none" />` traces the full notched bookmark silhouette (bottom edge folded up to a point at x=50, y=67 — 78% down the shape's 60-unit height, matching the "78% notch depth" intent).
  - A `<rect x="31" y="20" width="38" height="35" fill="white" />` covers the top portion of the same bounding box (35 of the shape's 60-unit height ≈ 58%) — since the notch only affects the *bottom* edge, the top portion is a plain rectangle, no clipping needed. Painted so it reads as solid fill; the polygon's stroke beneath/around it is the same white, so paint order between the two doesn't matter visually.
  - Net effect: top ~58% reads as a solid filled bookmark, bottom ~42% reads as outline-only (notch included) — the same "progress" visual from the original concept, just built from native SVG primitives instead of CSS `clip-path`.
- No text, no gradients, no drop shadows — flat, two-tone, legible at 16–32px.

**Why SVG instead of CSS `clip-path`:** the initial draft of this spec used `clip-path: polygon(...)` on a plain `<div>`. An external technical review (Antigravity/Gemini, consulted by the project owner) flagged that while Satori's docs list `clipPath` as supported, applying `clip-path: polygon()` to ordinary HTML elements is unreliable in practice and frequently fails to render or clips incorrectly. Native `<svg>`/`<polygon>`/`<rect>` elements are fully and deterministically supported by Satori, so the design was revised to use them instead — same visual result, lower implementation risk. The reviewer's suggested coordinates were verified against this spec's stated proportions (38% width, 60% height, 78% notch depth, 58% fill) before being adopted — they match exactly.

### Implementation

Two new self-contained files, each following Next.js 16's code-generation icon convention (`next/og`'s `ImageResponse`). Per the codebase's existing convention (see `src/components/*.tsx` all using PascalCase filenames despite `CLAUDE.md`'s stated kebab-case rule — established pattern wins), and since each file is mandated by Next.js's own file-convention naming (`icon.tsx`, `apple-icon.tsx`) anyway, both files are fully self-contained with no shared helper module. Since the SVG mark is now `viewBox`-relative (scale-invariant), the JSX is byte-identical between the two files except for the exported `size`; duplicating that one block across two mandated, independent files is simpler than introducing a shared component for two call sites that will essentially never change independently.

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
