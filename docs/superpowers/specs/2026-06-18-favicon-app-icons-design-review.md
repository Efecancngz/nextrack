# Design Review: Favicon & App Icons Design Spec

**Reviewer:** Antigravity (Gemini)  
**Date:** 2026-06-18  
**Status:** Approved with Recommendations  

---

## Overview

The proposed design spec in [2026-06-18-favicon-app-icons-design.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/superpowers/specs/2026-06-18-favicon-app-icons-design.md) outlines a clean, modern approach to generating the favicon and app icons for the Personal Library using Next.js 16's file-based icon route conventions (`icon.tsx` and `apple-icon.tsx`).

### Approved Aspects
1. **Next.js conventions**: The dynamic code generation approach leveraging `next/og`'s `ImageResponse` is highly recommended. It avoids repository binary asset bloat and simplifies style changes.
2. **Static optimization**: Because the routes do not consume dynamic headers or query parameters, they will be pre-generated as static PNG files at build-time, rendering zero runtime penalty in production on Cloudflare.
3. **Core Concept**: The "progress-bookmark" concept matches the brand identity cleanly and is simple enough to remain highly readable at typical favicon sizes (16px and 32px).

---

## Technical Recommendation: Satori CSS clip-path Limitation

> [!WARNING]
> **Satori CSS Limitation on `clip-path`**  
> Next.js's `ImageResponse` uses **Satori** under the hood to compile JSX markup into an SVG/PNG output. While Satori's documentation lists CSS `clipPath` as a supported property, using CSS `clip-path: polygon(...)` on standard HTML elements (`div`, `span`, etc.) frequently fails to render properly, clips incorrectly, or is ignored by Satori's parser.

### Proposed SVG Solution
Instead of CSS-based clipping, use **inline SVG elements directly in the JSX**. Native SVG elements are fully supported by Satori and render deterministically.

Here is the recommended SVG mockup that matches the spec's visual dimensions (bookmark width ~38%, height ~60%, centered, top 58% filled solid white, bottom 42% outlined only):

```tsx
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#5b5fcf', // --color-brand
          borderRadius: '22%',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'flex' }}
        >
          {/* Top solid fill representing progress (top ~58% of the bookmark) */}
          <rect x="31" y="20" width="38" height="35" fill="white" />
          
          {/* Outline tracing the entire notched bookmark silhouette */}
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
    {
      ...size,
    }
  )
}
```

---

## Conclusion

The design spec is approved for implementation. The author should incorporate the native SVG workaround into the upcoming implementation plan.
