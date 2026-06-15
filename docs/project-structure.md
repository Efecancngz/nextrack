# Project Structure Deep Dive — Free Serie Tracker

Her klasörün **neden** var olduğu, **ne içerdiği** ve **kuralları**.

---

## Kök Dizin

```
serietracker/
├── CLAUDE.md                     # AI asistan referans dosyası
├── docs/                         # Proje dokümantasyonu (bu dosyalar)
│   ├── architecture.md           # Üst düzey mimari
│   ├── design-patterns.md        # Pattern detayları + örnek implementasyonlar
│   ├── database-schema.md        # ERD + Prisma şeması
│   ├── api-contracts.md          # Endpoint sözleşmeleri
│   ├── swagger-setup.md          # OpenAPI/Swagger kurulumu
│   ├── project-structure.md      # Bu dosya
│   └── phases.md                 # Geliştirme fazları
├── src/                          # Tüm uygulama kodu
├── prisma/                       # Veritabanı şeması ve migration'lar
├── public/                       # Statik dosyalar (favicon, logolar)
├── .env.example                  # Env değişkenleri şablonu
├── .env.local                    # Gerçek env değişkenleri (gitignore'da)
├── .gitignore
├── next.config.ts                # Next.js konfigürasyonu
├── tailwind.config.ts            # Tailwind CSS konfigürasyonu
├── tsconfig.json                 # TypeScript konfigürasyonu
├── eslint.config.mjs             # ESLint konfigürasyonu
└── package.json
```

---

## `src/` — Uygulama Kodu

```
src/
├── app/                          # Next.js App Router (sayfa + API)
├── components/                   # React bileşenleri
├── lib/                          # İş mantığı, servisler, altyapı
├── types/                        # TypeScript tip tanımları
└── hooks/                        # Custom React hook'ları
```

---

## `src/app/` — Next.js App Router

**Kural**: Bu klasör sadece routing ve layout tanımlar. İş mantığı buraya YAZILMAZ.

```
src/app/
├── layout.tsx                    # Root layout — HTML, fontlar, tema provider
├── globals.css                   # Global stiller, Tailwind @import, CSS variables
├── not-found.tsx                 # 404 sayfası
├── error.tsx                     # Genel hata sayfası
├── loading.tsx                   # Genel loading state
│
├── (auth)/                       # Auth sayfa grubu (ayrı layout)
│   ├── layout.tsx                # Auth layout — minimal, logo + form
│   ├── login/
│   │   └── page.tsx              # Giriş sayfası
│   └── register/
│       └── page.tsx              # Kayıt sayfası
│
├── (main)/                       # Ana uygulama grubu (navbar + footer)
│   ├── layout.tsx                # Main layout — navbar, sidebar, footer
│   ├── page.tsx                  # Ana sayfa (trending, yeni bölümler)
│   ├── explore/
│   │   └── page.tsx              # Keşfet/Arama sayfası
│   ├── series/
│   │   └── [id]/
│   │       └── page.tsx          # Seri detay sayfası
│   └── library/
│       └── page.tsx              # Kişisel kütüphane (auth gerekli)
│
├── api/                          # REST API Route'ları
│   ├── docs/
│   │   └── route.ts              # GET — Swagger JSON spec
│   ├── auth/
│   │   ├── [...nextauth]/
│   │   │   └── route.ts          # Auth.js catch-all handler
│   │   ├── register/
│   │   │   └── route.ts          # POST — Email/password kayıt
│   │   └── session/
│   │       └── route.ts          # GET — Aktif session bilgisi
│   ├── series/
│   │   ├── route.ts              # GET — Arama (query params)
│   │   ├── trending/
│   │   │   └── route.ts          # GET — Trending listesi
│   │   └── [id]/
│   │       ├── route.ts          # GET — Seri detayı
│   │       └── similar/
│   │           └── route.ts      # GET — Benzer seriler
│   ├── explore/
│   │   ├── route.ts              # GET — Filtreli keşfet
│   │   ├── genres/
│   │   │   └── route.ts          # GET — Tür listesi
│   │   └── platforms/
│   │       └── route.ts          # GET — Platform listesi
│   ├── library/
│   │   ├── route.ts              # GET — Liste, POST — Ekle
│   │   └── [id]/
│   │       ├── route.ts          # PATCH — Durum güncelle, DELETE — Kaldır
│   │       └── progress/
│   │           └── route.ts      # PATCH — Bölüm ilerlemesi güncelle
│   └── ratings/
│       ├── route.ts              # POST — Puan ver
│       └── [id]/
│           └── route.ts          # PATCH — Güncelle, DELETE — Sil
│
└── api-docs/
    └── page.tsx                  # Swagger UI sayfası
```

### Route Group Kuralları

- **`(auth)/`**: Giriş/kayıt sayfaları — minimal layout, navbar yok
- **`(main)/`**: Ana uygulama — tam layout (navbar, footer, sidebar)
- Parantezli klasörler URL'ye yansımaz → `/login` olur, `/auth/login` olmaz

### API Route Kuralları

1. Her `route.ts` sadece HTTP method export'u yapar (`GET`, `POST`, `PATCH`, `DELETE`)
2. Her handler `withErrorHandler` middleware'i ile sarılır
3. Auth gerektiren endpoint'ler `withAuth` middleware'i kullanır
4. Her input Zod ile validate edilir
5. İş mantığı Service katmanına delege edilir

---

## `src/components/` — React Bileşenleri

**Kural**: Bileşenler "aptal" olmalı — kendi veri çekme işlemi yapmazlar, prop alırlar.

```
src/components/
├── ui/                           # shadcn/ui temel bileşenleri
│   ├── button.tsx                # npx shadcn@latest add button
│   ├── card.tsx
│   ├── dialog.tsx                # Modal
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx
│   ├── skeleton.tsx              # Loading iskeletleri
│   ├── tabs.tsx
│   ├── toast.tsx                 # Bildirim toast
│   ├── tooltip.tsx
│   └── badge.tsx
│
├── series/                       # Seri ile ilgili bileşenler
│   ├── series-card.tsx           # Kart görünümü — poster + bilgi
│   ├── series-list-item.tsx      # Liste görünümü — tek satır
│   ├── series-grid.tsx           # Grid konteyner + view mode toggle
│   ├── series-hero.tsx           # Detay sayfası hero banner
│   ├── rating-badge.tsx          # Çoklu kaynak puan göstergesi
│   ├── rating-input.tsx          # Kullanıcı puan girişi (1-10 stars)
│   ├── platform-list.tsx         # Platform ikonları listesi
│   ├── progress-tracker.tsx      # S2E5 / Ch.45 ilerleyici
│   ├── genre-tags.tsx            # Tür etiketleri
│   ├── episode-list.tsx          # Bölüm listesi (detay sayfası)
│   └── library-status-select.tsx # Durum seçici (Watching, Plan, vb.)
│
├── layout/                       # Sayfa düzeni bileşenleri
│   ├── navbar.tsx                # Üst navigasyon çubuğu
│   ├── mobile-nav.tsx            # Mobil hamburger menü
│   ├── footer.tsx                # Alt bilgi
│   ├── theme-toggle.tsx          # Dark/Light/System toggle
│   └── user-menu.tsx             # Kullanıcı avatar + dropdown
│
├── auth/                         # Auth form bileşenleri
│   ├── login-form.tsx            # Email/password giriş formu
│   ├── register-form.tsx         # Kayıt formu
│   ├── google-button.tsx         # Google ile giriş butonu
│   └── auth-guard.tsx            # Protected route wrapper
│
└── common/                       # Genel amaçlı bileşenler
    ├── search-input.tsx          # Debounced arama input
    ├── pagination.tsx            # Sayfalama bileşeni
    ├── loading-skeleton.tsx      # Genel yükleme iskeleti
    ├── empty-state.tsx           # Boş durum görseli + mesaj
    ├── error-state.tsx           # Hata durumu görseli
    ├── content-type-tabs.tsx     # TV/Anime/Manga/... tab'ları
    └── view-mode-toggle.tsx      # Kart ↔ Liste geçiş butonu
```

### Bileşen Kuralları

| Kural | Açıklama |
|---|---|
| **Server-first** | Varsayılan olarak Server Component. `"use client"` sadece state/event gerektiğinde. |
| **Prop-driven** | Bileşen kendi datasını çekmez, üstten prop alır. |
| **Tek sorumluluk** | Her bileşen tek bir iş yapar. |
| **Interface Props** | `interface Props {}` kullan, `type Props =` değil. |
| **Barrel export** | Her alt klasörde `index.ts` ile re-export. |

---

## `src/lib/` — İş Mantığı & Altyapı

**Kural**: Framework-agnostic kod buraya gelir. React import'u OLMAZ (hook'lar hariç, onlar `hooks/`'ta).

```
src/lib/
├── auth/                         # Auth.js konfigürasyonu
│   ├── config.ts                 # Auth.js options (providers, callbacks)
│   └── helpers.ts                # getCurrentUser(), requireAuth() helpers
│
├── db/                           # Veritabanı bağlantısı
│   └── client.ts                 # Prisma singleton client
│
├── repositories/                 # Data Access Layer — DB sorguları
│   ├── base.repository.ts        # Abstract base class
│   ├── series.repository.ts      # Series tablosu
│   ├── library.repository.ts     # UserLibrary + Progress
│   ├── rating.repository.ts      # UserRating + ExternalRating
│   ├── user.repository.ts        # User tablosu
│   └── index.ts                  # Barrel export
│
├── providers/                    # External API Providers (Strategy Pattern)
│   ├── content-provider.interface.ts  # Ortak interface
│   ├── tmdb.provider.ts          # TMDB API — TV dizileri
│   ├── anilist.provider.ts       # AniList GraphQL — Anime, Manga, LN
│   ├── mangadex.provider.ts      # MangaDex API — Manga/Manhwa chapters
│   ├── jikan.provider.ts         # Jikan (MAL) — Backup ratings
│   ├── provider.factory.ts       # Factory — ContentType → Provider
│   └── index.ts
│
├── services/                     # Service Layer — İş mantığı
│   ├── series.service.ts         # Seri keşfetme, arama, detay
│   ├── library.service.ts        # Kütüphane yönetimi
│   ├── rating.service.ts         # Puanlama mantığı
│   ├── auth.service.ts           # Kayıt, şifre hashing
│   └── index.ts
│
├── middleware/                   # API middleware HOF'ları
│   ├── error-handler.ts          # Global try-catch wrapper
│   ├── rate-limit.ts             # Token bucket rate limiter
│   ├── auth-guard.ts             # Auth kontrolü
│   └── validate.ts               # Zod validation wrapper
│
├── validations/                  # Zod şemaları
│   ├── auth.ts                   # registerSchema, loginSchema
│   ├── series.ts                 # searchSchema, exploreSchema
│   ├── library.ts                # addToLibrarySchema, progressSchema
│   ├── rating.ts                 # ratingSchema
│   └── common.ts                 # paginationSchema, idSchema
│
├── adapters/                     # Veri dönüşüm adaptörleri
│   └── rating.adapter.ts         # Rating normalization (0-10 scale)
│
├── errors/                       # Custom error sınıfları
│   └── index.ts                  # AppError class + factory methods
│
├── swagger/                      # OpenAPI/Swagger konfigürasyonu
│   └── config.ts                 # swagger-jsdoc options + spec
│
└── utils/                        # Yardımcı fonksiyonlar
    ├── api-response.ts           # apiResponse(), apiError() helpers
    ├── date.ts                   # Tarih formatlama
    ├── string.ts                 # Slug, truncate vb.
    └── cn.ts                     # Tailwind className merge (shadcn)
```

### Katman İlişkileri

```
API Routes → Services → Repositories → Prisma (DB)
                     → Providers → External APIs (TMDB, AniList)
                     → Adapters → Rating normalization
```

**KESİNLİKLE OLMAYACAK İLİŞKİLER:**
- ❌ API Route → Repository (Service'i atlama)
- ❌ Component → Repository (Presentation → DAL)
- ❌ Provider → Repository (birbirinden bağımsız)
- ❌ Service → API Route (ters bağımlılık)

---

## `src/types/` — TypeScript Tip Tanımları

```
src/types/
├── api.ts                        # API request/response tipleri
├── series.ts                     # SeriesCard, SeriesDetail, Platform
├── library.ts                    # LibraryEntry, Progress, LibraryStatus
├── rating.ts                     # UserRating, ExternalRating
├── auth.ts                       # Session, User extend
├── providers.ts                  # ContentProvider interface tipleri
└── common.ts                     # PaginationParams, ApiResponse<T>
```

### Tip Paylaşım Kuralları

- Prisma otomatik tipleri: `@prisma/client`'tan import
- API response tipleri: `types/api.ts`'den import — hem frontend hem backend kullanır
- Provider tipleri: `types/providers.ts` — sadece lib/ katmanında kullanılır
- Component prop tipleri: Bileşen dosyasının içinde tanımlanır

---

## `src/hooks/` — Custom React Hook'ları

```
src/hooks/
├── use-debounce.ts               # Debounced değer (arama input)
├── use-library.ts                # Kütüphane CRUD + optimistic updates
├── use-theme.ts                  # Tema yönetimi (dark/light/system)
├── use-view-mode.ts              # Kart/Liste görünüm toggle
├── use-media-query.ts            # Responsive breakpoint detection
└── use-search.ts                 # Arama state + debounce + API çağrısı
```

---

## `prisma/` — Veritabanı

```
prisma/
├── schema.prisma                 # Ana veritabanı şeması
├── migrations/                   # Otomatik oluşan migration dosyaları
│   └── 20260615_init/
│       └── migration.sql
└── seed.ts                       # Test verileri (opsiyonel)
```

---

## İsimlendirme Kuralları

| Öğe | Format | Örnek |
|---|---|---|
| Dosya adı | `kebab-case` | `series-card.tsx`, `rating.adapter.ts` |
| React bileşen | `PascalCase` | `SeriesCard`, `RatingBadge` |
| Fonksiyon/değişken | `camelCase` | `getUserLibrary`, `isStale` |
| Sabit | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE`, `CACHE_TTL` |
| Tip/Interface | `PascalCase` | `SeriesCardResponse`, `ContentProvider` |
| Enum değeri | `UPPER_SNAKE_CASE` | `TV_SERIES`, `PLAN_TO_WATCH` |
| CSS class | `kebab-case` | Tailwind utility class'ları |
| Env variable | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `TMDB_API_KEY` |
| API endpoint | `kebab-case` | `/api/series/trending` |
| DB tablo | `PascalCase` | Prisma convention: `Series`, `UserLibrary` |

---

## Import Sırası Kuralları

```typescript
// 1. External packages
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// 2. Internal modules (absolute path with @/)
import { SeriesService } from "@/lib/services/series.service";
import { searchSchema } from "@/lib/validations/series";
import { withErrorHandler } from "@/lib/middleware/error-handler";

// 3. Types
import type { SeriesCardResponse } from "@/types/api";

// 4. Relative imports (avoid if possible, use @/ instead)
import { formatDate } from "./helpers";
```
