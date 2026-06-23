# Project Structure Deep Dive — Generic SaaS Starter

Her klasörün **neden** var olduğu, **ne içerdiği** ve **kuralları**.

---

## Kök Dizin

```
serietracker/
├── CLAUDE.md                     # AI asistan referans dosyası (gitignored)
├── AGENTS.md                     # Next.js 16 breaking-change uyarıları (takip ediliyor, gitignored DEĞİL)
├── README.md                     # Proje tanıtımı (EN + TR)
├── docs/                         # Proje dokümantasyonu (bu dosyalar)
│   ├── architecture.md           # Gerçek sistem mimarisi
│   ├── design-patterns.md        # Bu kod tabanında gerçekten kullanılan pattern'ler
│   ├── database-schema.md        # ERD + Prisma şeması
│   ├── api-contracts.md          # Endpoint sözleşmeleri
│   ├── api-sources.md            # Örnek veri kaynağı örüntüsü
│   ├── deploy.md                 # Cloudflare deploy rehberi
│   ├── getting-started.md        # Yerel kurulum rehberi
│   ├── project-structure.md      # Bu dosya
│   └── phases.md                 # Geliştirme geçmişi
├── src/                          # Tüm uygulama kodu
├── prisma/                       # Veritabanı şeması ve migration'lar
├── public/                       # Statik dosyalar (favicon, logolar)
├── tests/unit/                   # Vitest birim testleri
├── .env.example                  # Env değişkenleri şablonu
├── .env.local                    # Gerçek env değişkenleri (gitignore'da)
├── .gitignore
├── .dockerignore
├── Dockerfile                    # Container build tanımı
├── docker-compose.yml            # Yerel container orkestrasyon
├── components.json               # shadcn/ui CLI konfigürasyonu
├── next.config.ts                # Next.js konfigürasyonu
├── open-next.config.ts           # OpenNext (Cloudflare adapter) konfigürasyonu
├── postcss.config.mjs            # PostCSS/Tailwind v4 konfigürasyonu (Tailwind v4'te ayrı tailwind.config.ts YOK)
├── prisma.config.ts              # Prisma CLI konfigürasyonu
├── tsconfig.json                 # TypeScript konfigürasyonu
├── eslint.config.mjs             # ESLint konfigürasyonu
├── vitest.config.ts              # Vitest test konfigürasyonu
├── wrangler.toml                 # Cloudflare Workers konfigürasyonu
├── custom-worker.ts              # OpenNext worker wrapper (fetch handler)
└── package.json
```

---

## `src/` — Uygulama Kodu

```
src/
├── app/                          # Next.js App Router (sayfa + API) — DÜZ yapı, route group yok
├── components/                   # React bileşenleri
├── lib/                          # İş mantığı, yardımcılar, altyapı
├── types/                        # TypeScript tip tanımları
├── middleware.ts                 # Edge runtime route koruması (bkz. aşağıda)
└── generated/prisma/             # Prisma client çıktısı (gitignored, `npm run db:generate` ile üretilir)
```

### `src/middleware.ts` — Edge Route Koruması

`experimental-edge` runtime'da çalışır, `src/lib/auth/edge.ts`'deki hafif (Prisma/bcrypt importsuz) NextAuth instance'ını sarar. `/my-items` altını oturum açmamış kullanıcılardan korur ve oturum açmış ama kullanıcı adı belirlememiş kullanıcıları `/auth/set-username`'e yönlendirir. `matcher` API route'larını, statik asset'leri ve görselleri hariç tutar.

**Not:** Bu projede `repositories/`, `services/`, `providers/` katmanları YOKTUR. API Route'lar Prisma'yı doğrudan çağırır. Bkz. [architecture.md](architecture.md).

---

## `src/app/` — Next.js App Router

```
src/app/
├── page.tsx                      # Ana sayfa — hero slider + trending grid
├── layout.tsx                    # Root layout — HTML, fontlar, navbar, footer
├── globals.css                   # Global stiller, Tailwind @import, CSS variables
├── not-found.tsx                 # 404 sayfası
├── error.tsx                     # Genel hata sayfası
├── loading.tsx                   # Genel loading state
├── icon.tsx, apple-icon.tsx      # Favicon üretimi
│
├── auth/
│   ├── signin/page.tsx           # Giriş sayfası
│   ├── signup/page.tsx           # Kayıt sayfası
│   └── set-username/page.tsx     # Kullanıcı adı belirleme akışı
│
├── browse/page.tsx               # Arama/filtre/sıralama — debounce'lu, autocomplete'li
├── items/[id]/page.tsx           # Item detay sayfası
├── my-items/page.tsx             # requireAuth()-gated — kişisel takip panosu
├── profile/[username]/page.tsx   # Herkese açık, auth gerektirmez — istatistik + favoriler
│
└── api/
    ├── auth/[...nextauth]/route.ts   # Auth.js catch-all handler
    ├── auth/register/route.ts        # POST — e-posta/şifre kayıt
    ├── items/route.ts                # GET — liste/filtre (q/category/status)
    ├── items/suggest/route.ts        # GET — otomatik tamamlama, 8 ile sınırlı
    ├── items/trending/route.ts       # GET — trend olan item'lar
    ├── items/[id]/route.ts           # GET — item detayı
    ├── items/[id]/rating/route.ts    # PUT — kişisel puan ver/güncelle
    ├── user-items/route.ts           # GET/POST — takip listesi / takibe ekle
    ├── user-items/[id]/route.ts      # PATCH/DELETE — durum/favori/ilerleme güncelle, kaldır
    ├── user/username/route.ts        # POST — kullanıcı adı belirle
    └── notifications/
        ├── route.ts                  # GET — bildirim listesi + okunmamış sayısı
        ├── check/route.ts            # POST — yeni güncellemeleri kontrol et (throttled)
        ├── mark-read/route.ts        # PATCH — tümünü okundu işaretle
        └── settings/route.ts         # PATCH — bildirim aç/kapa
```

### API Route Kuralları

1. Her `route.ts` HTTP method export'u yapar (`GET`, `POST`, `PATCH`, `DELETE`)
2. Her handler `compose(withErrorHandler, withRateLimit)(handler)` ile sarılır
3. Auth gerektiren endpoint'ler handler içinde `requireAuth()` çağırır (ayrı bir middleware değil)
4. Her input Zod ile validate edilir (`src/lib/validations/*.ts`)
5. Prisma doğrudan handler içinde çağrılır — Service/Repository katmanı yok

---

## `src/components/` — React Bileşenleri

**Kural**: Bileşenler "aptal" olmalı — kendi veri çekme işlemi yapmazlar, prop alırlar.

```
src/components/
├── ui/                            # shadcn/ui temel bileşenleri: badge, button, card, dialog,
│                                  #   input, select, separator, sheet, skeleton, sonner, tabs
├── providers/
│   └── session-provider.tsx       # "use client" — next-auth/react SessionProvider'ı sarar
├── Navbar.tsx, Footer.tsx         # Sayfa düzeni
├── HeroSlider.tsx                 # Ana sayfa kahraman görseli — kategoriye göre gruplu
├── ItemCard.tsx, ItemListRow.tsx  # Item kart/satır görünümü
├── AddToTrackingButton.tsx        # Item detay sayfasında takibe ekle/durum değiştir
├── RatingWidget.tsx               # Kişisel puanlama widget'ı
├── TrackingBoard.tsx              # Kişisel takip panosu (durum filtreli, grid/liste)
├── UserItemCard.tsx, UserItemRow.tsx  # TrackingBoard'un kart/satır görünümü
├── BrowseFilters.tsx              # Kategori/durum filtreleri
├── BrowseSuggestions.tsx          # Arama otomatik tamamlama açılır listesi
├── ProfileHeader.tsx, ProfileStats.tsx, ProfileFavorites.tsx  # Profil sayfası bileşenleri
└── NotificationBell.tsx, NotificationTrigger.tsx  # Bildirim zili + sessiz tetikleyici
```

### Bileşen Kuralları

| Kural | Açıklama |
|---|---|
| **Server-first** | Varsayılan olarak Server Component. `"use client"` sadece state/event gerektiğinde. |
| **Prop-driven** | Bileşen kendi datasını çekmez, üstten prop alır. |
| **Tek sorumluluk** | Her bileşen tek bir iş yapar. |
| **Interface Props** | `interface Props {}` kullan, `type Props =` değil. |

---

## `src/lib/` — İş Mantığı & Altyapı

```
src/lib/
├── api/example-source.ts         # Örnek veri kaynağı — gerçek dış API'nin yerine geçen placeholder
├── auth/
│   ├── config.ts                 # Auth.js options (Node runtime)
│   ├── edge.ts                   # Edge-uyumlu hafif NextAuth instance (Prisma/bcrypt import etmez)
│   └── helpers.ts                # requireAuth(), getCurrentUser()
├── db/prisma.ts                  # Prisma singleton client
├── notifications.ts              # checkForItemUpdates() — throttled, paralel, transactional yazma
├── utils.ts                      # cn() — Tailwind className merge
├── utils/
│   ├── api-response.ts           # successResponse(), errorResponse(), Responses.{notFound,...}
│   ├── app-error.ts              # AppError sınıfı + factory metodları
│   └── middleware.ts             # withErrorHandler, withRateLimit, compose() HOF'ları
└── validations/
    ├── auth.ts                   # registerSchema
    ├── item.ts                   # itemCategoryEnum, addToTrackingSchema, rateItemSchema, vb.
    └── notifications.ts          # updateNotificationSettingsSchema
```

**Kural**: Framework-agnostic kod buraya gelir. React import'u OLMAZ.

### Katman İlişkileri

```
API Routes → Prisma (doğrudan) → PostgreSQL
API Routes → src/lib/utils/* (hata yönetimi, response formatlama, rate limit)
API Routes → src/lib/validations/* (Zod doğrulama)
```

**KESİNLİKLE OLMAYACAK İLİŞKİLER:**
- ❌ Component → Prisma (Presentation katmanı veriye doğrudan erişmez, sayfa Server Component'i çeker ve prop olarak geçer)
- ❌ Var olmayan bir Service/Repository katmanına referans

---

## `src/types/` — TypeScript Tip Tanımları

```
src/types/
├── common.ts                     # ApiResponse<T>, PaginationMeta, PaginatedResponse<T> — sadece generic tipler
├── item.ts                       # ItemCategory, ItemStatus, ItemCard, ItemDetail
├── user-item.ts                  # TrackingStatus, UserItemEntry
├── profile.ts                    # ProfileStatsData
└── next-auth.d.ts                # Auth.js Session/JWT tip genişletmeleri
```

---

## `prisma/` — Veritabanı

```
prisma/
├── schema.prisma                 # Ana veritabanı şeması — User/Account/Session/VerificationToken + Item/UserItem/Rating/Notification
├── migrations/                   # Migration dosyaları (asla elle silinmez)
└── seed.ts                       # example-source.ts'deki 12 örnek Item'ı veritabanına yükler
```

---

## İsimlendirme Kuralları

| Öğe | Format | Örnek |
|---|---|---|
| Dosya adı | `kebab-case` | `example-source.ts`, `app-error.ts` |
| React bileşen | `PascalCase` | `ItemCard`, `TrackingBoard` |
| Fonksiyon/değişken | `camelCase` | `requireAuth`, `successResponse` |
| Sabit | `UPPER_SNAKE_CASE` | `EXAMPLE_ITEMS` |
| Tip/Interface | `PascalCase` | `ItemCard`, `UserItemEntry` |
| Enum değeri | `UPPER_SNAKE_CASE` | `TYPE_A`, `ACTIVE` |
| CSS class | `kebab-case` | Tailwind utility class'ları |
| Env variable | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `NEXTAUTH_SECRET` |
| API endpoint | `kebab-case` | `/api/user-items` |
| DB tablo | `PascalCase` | Prisma convention: `Item`, `UserItem` |

---

## Import Sırası Kuralları

```typescript
// 1. External packages
import { type NextRequest } from "next/server";
import { z } from "zod";

// 2. Internal modules (absolute path with @/)
import { prisma } from "@/lib/db/prisma";
import { itemCategoryEnum } from "@/lib/validations/item";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

// 3. Types
import type { ItemCard } from "@/types/item";

// 4. Relative imports (avoid if possible, use @/ instead)
```
