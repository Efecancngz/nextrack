# Favicon & App Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close `docs/phases.md`'s "Favicon and app icons" Phase 1.6 checklist item with a real, branded "progress-bookmark" icon, generated entirely in code via `next/og`'s `ImageResponse` and Next.js 16's file-based icon convention — no backend changes, no external image tool.

**Architecture:** Two new self-contained route files using Next.js 16's code-generation icon convention: `src/app/icon.tsx` (32×32 favicon) and `src/app/apple-icon.tsx` (180×180 Apple touch icon). Each renders an identical `viewBox`-relative inline SVG mark (a notched bookmark silhouette, top portion solid white fill, bottom portion outline-only) on a rounded brand-indigo background, sized only by the exported `size` constant. Next.js auto-injects the appropriate `<link>` tags — no `layout.tsx` changes.

**Tech Stack:** Next.js 16 App Router (`next/og`'s `ImageResponse`, Satori-rendered), TypeScript, no test framework (none configured in this repo — verification is `npm run type-check` + `npm run lint` + manual browser check).

## Global Constraints

- The mark is built from native SVG elements (`<polygon>`, `<rect>`) inside the `ImageResponse` JSX, not CSS `clip-path` — Satori's support for `clip-path: polygon()` on plain HTML elements is unreliable in practice (caught by an external technical review during spec — see the spec's "Why SVG instead of CSS clip-path" section).
- Background color is the literal hex `#5b5fcf` (this codebase's `--color-brand` value) — `ImageResponse` JSX cannot read CSS custom properties from `globals.css`, so the value must be hardcoded.
- The SVG mark uses a `viewBox="0 0 100 100"` with `width="100%" height="100%"`, making it scale-invariant — the JSX is byte-identical between `icon.tsx` and `apple-icon.tsx` except for the exported `size` constant.
- Exact SVG geometry (verified against the spec's stated proportions — 38% width, 60% height, 78% notch depth, 58% fill — before being adopted): `<polygon points="31,20 69,20 69,80 50,67 31,80" stroke="white" strokeWidth="6" strokeLinejoin="round" fill="none" />` for the outline, `<rect x="31" y="20" width="38" height="35" fill="white" />` for the top fill.
- `favicon.ico` is NOT touched or regenerated — Next.js cannot code-generate `.ico` files; the existing generic placeholder stays as a legacy fallback.
- No `manifest.json`, no `opengraph-image.tsx`, no changes to `Navbar.tsx` — all explicitly out of scope per the spec.
- `npm run type-check` and `npm run lint` must be clean before committing.
- No `git push` without explicit user instruction. Conventional Commits format for every commit message.
- This project's dev server has a known Turbopack bug on this path (non-ASCII `ü`) — use `npx next dev --webpack` for manual verification, not `npm run dev`.

---

## File Structure

New files:
- `src/app/icon.tsx` — 32×32 favicon, code-generated via `ImageResponse`.
- `src/app/apple-icon.tsx` — 180×180 Apple touch icon, code-generated via `ImageResponse`, identical mark JSX to `icon.tsx`.

Modified files:
- `docs/phases.md` — check off "Favicon and app icons" (Phase 1.6).

---

### Task 1: Generate the progress-bookmark favicon and Apple touch icon

**Files:**
- Create: `src/app/icon.tsx`
- Create: `src/app/apple-icon.tsx`
- Modify: `docs/phases.md`

**Interfaces:**
- Consumes: `ImageResponse` from `next/og`. No other project code.
- Produces: nothing consumed by other tasks — this plan has only one task. Next.js auto-discovers both files by their reserved filenames and injects `<link rel="icon">` / `<link rel="apple-touch-icon">` into every page's `<head>` with no further wiring.

- [ ] **Step 1: Write `src/app/icon.tsx`**

```tsx
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#5b5fcf",
          borderRadius: "22%",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="31" y="20" width="38" height="35" fill="white" />
          <polygon
            points="31,20 69,20 69,80 50,67 31,80"
            stroke="white"
            strokeWidth="6"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 2: Write `src/app/apple-icon.tsx`**

Identical mark, only the `size` export and `Icon` function name differ:

```tsx
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#5b5fcf",
          borderRadius: "22%",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="31" y="20" width="38" height="35" fill="white" />
          <polygon
            points="31,20 69,20 69,80 50,67 31,80"
            stroke="white"
            strokeWidth="6"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Manual verification**

With `npx next dev --webpack` running:
- Visit `/icon` directly in the browser — confirm it renders a 32×32 indigo rounded square with a white bookmark mark (solid top, outlined bottom).
- Visit `/apple-icon` directly — confirm the same mark at 180×180.
- Visit any page (e.g. `/`) and view-source / inspect `<head>` — confirm `<link rel="icon" href="/icon?...">` and `<link rel="apple-touch-icon" href="/apple-icon?...">` tags are present.
- Check the actual browser tab icon (not just the `/icon` route at full size) — confirm the notch and fill-line are still legible at real favicon size, not mush. If the mark reads as a blur at tab size, that's a design problem to flag, not something to silently ship.

- [ ] **Step 5: Check off the phases.md item**

In `docs/phases.md`, find the line:
```
- [ ] Favicon and app icons
```
under `### 1.6 Polish & Deploy (~2 days)`, and change it to:
```
- [x] Favicon and app icons
```

- [ ] **Step 6: Commit**

```bash
git add src/app/icon.tsx src/app/apple-icon.tsx docs/phases.md
git commit -m "feat: add branded favicon and apple touch icon"
```

---

## Final Verification

After the task is committed:

1. `npm run type-check` — exits 0.
2. `npm run lint` — exits 0.
3. Full check with `npx next dev --webpack` running: `/icon` and `/apple-icon` both render the bookmark mark correctly at their respective sizes; the browser tab shows the new icon instead of the generic Next.js default; `<head>` contains both new `<link>` tags.
4. Recommend a final whole-branch code review (`superpowers:requesting-code-review`) before merging, same as the prior two sub-projects' process — small as this change is, the SVG geometry is exactly the kind of detail worth a second pair of eyes given it was already revised once during spec review.
