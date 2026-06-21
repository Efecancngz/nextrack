# Generic SaaS Starter — Core Architecture Sadeleştirme — Design

## Goal

"Free Serie Tracker"i, dizi/anime/manga'ya özel her şeyi (TMDB/AniList/MangaDex/Jikan entegrasyonları, içerik türü mantığı, marka) kaldırıp yerine tek, jenerik bir "Item" örnek domaini koyarak genel amaçlı bir Next.js + Prisma + Cloudflare Workers SaaS başlangıç şablonuna dönüştürmek. Amaç: auth, kişisel takip/ilerleme, cron-tabanlı bildirim, arama ve çok-kiracılı profil sayfası gibi temel mimari kalıpları canlı, çalışan bir örnek üzerinden göstermek — soyut/boş bir iskelet değil.

## Out of Scope

- **Dokümantasyon ve marka yeniden yazımı** (README, `docs/`, `package.json` metadata) — ayrı bir sonraki sub-project (B).
- **Deploy altyapısı doğrulama** (Cloudflare Workers + cron'un yeni şemayla gerçekten çalıştığının teyidi) — ayrı bir sonraki sub-project (C).
- **Calendar/Schedule kalıbı (eski Phase 2.2)** — tamamen kaldırılıyor, jenerikleştirilmiyor. Zaman dilimi karmaşıklığı yüksek, mimariyi göstermek için şart değil.
- **Language Tracking kalıbı (eski Phase 2.5)** — tamamen kaldırılıyor. Çok domain-spesifik (MangaDex dil verisi), jenerikleştirmenin anlamı yok.
- **Notes/Redirect Links kalıbı (eski Phase 2.6)** — tamamen kaldırılıyor. Google-redirect mantığı jenerik bir şablonda anlamsız.
- **Mevcut dev veritabanındaki satırların korunması** — bu bir portfolyo/şablon deposu, canlı kullanıcı verisi yok; migration temiz bir reset olarak tasarlanıyor (tüm domain tabloları silinip jenerik olanlarla değiştiriliyor).
- **Birden fazla dış API istemcisinin korunması** — TMDB/AniList/MangaDex/Jikan'ın hepsi kaldırılıp yerine tek, anahtar gerektirmeyen bir örnek kaynak (mock veri üretici) konuyor — şablonu klonlayan herkesin sıfır API anahtarıyla çalıştırabilmesi için.

## Current State (kaldırılacak/değiştirilecek olanlar)

**Prisma modelleri (kaldırılacak):** `Series`, `LibraryItem`, `UserRating`, `Notification` (jenerikleştirilecek, silinmeyecek), `EpisodeLanguage`, `UserNote`, `SearchKeyword`. `User`, `Account`, `Session`, `VerificationToken` (Auth.js gerekli şema) korunur.

**Dış API istemcileri (silinecek):** `src/lib/api/tmdb.ts`, `src/lib/api/tmdb-mock.ts`, `src/lib/api/anilist.ts`, `src/lib/api/mangadex.ts`, `src/lib/api/jikan.ts` ve bunlara ait `tests/unit/api/*.test.ts` dosyaları.

**Domain-spesifik lib dosyaları (silinecek):** `src/lib/calendar.ts`, `src/lib/notifications.ts` (jenerikleştirilecek, yeniden yazılacak — silinmeyecek), `src/lib/language-tracking.ts`, `src/lib/redirect-url.ts` (ve `tests/unit/lib/redirect-url.test.ts`), `src/lib/validations/notes.ts`, `src/lib/validations/search-keywords.ts`, `src/lib/db/series-cache.ts` (jenerikleştirilecek).

**Sayfalar (silinecek):** `src/app/calendar/`, `src/app/settings/`, `src/app/series/[id]/` (jenerikleştirilecek → `src/app/items/[id]/`), `src/app/explore/` (jenerikleştirilecek → `src/app/browse/`), `src/app/library/` (jenerikleştirilecek → `src/app/my-items/`).

**API route'ları (silinecek):** `src/app/api/notes/`, `src/app/api/search-keywords/`, `src/app/api/trending/`, `src/app/api/series/`, `src/app/api/library/`, `src/app/api/search/` (hepsi jenerikleştirilecek karşılıklarıyla değiştirilecek).

**Bileşenler (silinecek):** `LanguageWaitWidget.tsx`, `SeriesNoteWidget.tsx`, `RedirectButton.tsx`, `SearchKeywordManager.tsx`, `CalendarBoard.tsx`, `AiringTodaySection.tsx`.

**Bileşenler (jenerikleştirilecek, silinmeyecek):** `SeriesCard.tsx`→`ItemCard.tsx`, `SeriesListRow.tsx`→`ItemListRow.tsx`, `HeroSlider.tsx`, `AddToLibraryButton.tsx`→`AddToTrackingButton.tsx`, `LibraryBoard.tsx`→`TrackingBoard.tsx`, `LibraryItemCard.tsx`/`LibraryItemRow.tsx`→`UserItemCard.tsx`/`UserItemRow.tsx`, `ProfileHeader.tsx`/`ProfileStats.tsx`/`ProfileFavorites.tsx`, `NotificationBell.tsx`/`NotificationTrigger.tsx`, `SearchSuggestions.tsx`→`BrowseSuggestions.tsx`, `ExploreFilters.tsx`→`BrowseFilters.tsx`, `RatingWidget.tsx`.

**Types (jenerikleştirilecek):** `src/types/series.ts`→`src/types/item.ts`, `src/types/library.ts`→`src/types/user-item.ts`, `src/types/profile.ts` (korunur), `src/types/search-keyword.ts` (silinir).

## Design

### Veri Modeli

```prisma
enum ItemCategory {
  TYPE_A
  TYPE_B
  TYPE_C
}

enum ItemStatus {
  ONGOING
  COMPLETED
  HIATUS
  CANCELLED
  UPCOMING
}

model Item {
  id            String       @id @default(cuid())
  externalId    String
  source        String       // "example-source" — tek, jenerik örnek kaynak
  category      ItemCategory
  status        ItemStatus   @default(ONGOING)
  title         String
  description   String?
  coverImage    String?
  totalUnits    Int?         // jenerik "toplam bölüm/chapter/parça sayısı" — bildirim diff'i bunun üzerinden çalışır
  ratingExternal Float?
  cachedAt      DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  userItems     UserItem[]
  ratings       Rating[]
  notifications Notification[]

  @@unique([externalId, source])
  @@index([category])
  @@index([title])
}

enum TrackingStatus {
  ACTIVE
  PLANNED
  COMPLETED
  PAUSED
  DROPPED
}

model UserItem {
  id         String         @id @default(cuid())
  userId     String
  itemId     String
  status     TrackingStatus @default(PLANNED)
  isFavorite Boolean        @default(false)
  progress   Int?
  notes      String?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([userId, itemId])
  @@index([userId])
  @@index([userId, status])
}

model Rating {
  id        String   @id @default(cuid())
  userId    String
  itemId    String
  score     Int
  review    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([userId, itemId])
  @@index([userId])
  @@index([itemId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  itemId    String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```

`User` modeli aynı kalır (`notificationsEnabled`, `lastNotificationCheckAt`, `username` dahil), sadece `libraryItems`/`userRatings` ilişki adları `userItems`/`ratings` olarak güncellenir.

### Örnek dış kaynak (API anahtarı gerektirmeyen mock)

`src/lib/api/example-source.ts` — sabit, küçük bir bellek-içi örnek veri seti (10-15 öğe, 3 kategori) döner; `searchExampleItems(query)`, `getExampleItemDetail(externalId)`, `getTrendingExampleItems()` fonksiyonları gerçek API client'larının imzasını taklit eder (Promise-tabanlı, aynı dönüş şekli). Ayrıca `simulateExampleItemUpdate(externalId)` — `totalUnits`'i rastgele/deterministik artıran bir fonksiyon, cron job'ın test edilebilmesi için (gerçek hayatta "yeni bölüm çıktı" senaryosunu taklit eder).

### Bildirim mimarisi (Phase 2.3'ün jenerikleştirilmiş hali)

`src/lib/notifications.ts` → `checkForItemUpdates()`: her `Item` için `example-source`'tan güncel `totalUnits` değerini çeker, veritabanındaki `Item.totalUnits` ile kıyaslar; artış varsa `Item.totalUnits`'i günceller VE o `Item`'ı (herhangi bir `status` ile) `UserItem` üzerinden takip eden her kullanıcı için bir `Notification` oluşturur — orijinal `checkForNewEpisodes()` ile birebir aynı desen, sadece alan adları jenerik.

Cron tetikleyici (`custom-worker.ts`, mevcut Cloudflare Cron Trigger altyapısı) ve `POST /api/notifications/check` (request-tetiklemeli, throttle'lı) ikisi de korunur, sadece çağırdıkları fonksiyon `checkForItemUpdates()` olur.

### Sayfalar ve route'lar

- `/` — ana sayfa, `getTrendingExampleItems()`'ten gelen öne çıkan öğeler
- `/browse` — arama + filtre (eski `/explore`)
- `/items/[id]` — öğe detay sayfası (puanlama widget'ı, takibe ekle butonu)
- `/my-items` — kişisel takip panosu (durum filtresi, grid/list görünüm — bu UX deseni korunur, iyi bir showcase)
- `/profile/[username]` — herkese açık istatistik sayfası (jenerik etiketlerle)
- `/auth/signin`, `/auth/signup` — aynen korunur

Navbar linkleri: Browse, My Items, (Calendar ve Settings kaldırılır).

### API route'ları

- `GET /api/items` — arama/listeleme (eski `/api/search`)
- `GET /api/items/suggest` — autocomplete (eski `/api/search/suggest`)
- `GET /api/items/[id]` — detay
- `GET /api/items/trending` — ana sayfa için öne çıkanlar
- `POST /api/user-items` — takibe ekle
- `GET /api/user-items` — kullanıcının takip listesi
- `PATCH /api/user-items/[id]` — durum/ilerleme/favori/not güncelle (tek route, üç şema sırayla denenir — mevcut `library/[id]/route.ts` desenini takip eder)
- `DELETE /api/user-items/[id]` — takipten çıkar
- `POST /api/items/[id]/rating` — puanla
- `GET /api/notifications`, `PATCH /api/notifications/mark-read`, `PATCH /api/notifications/settings`, `POST /api/notifications/check` — aynen korunur, sadece iç mantık `checkForItemUpdates()`'e bağlanır

Tüm route'lar mevcut `requireAuth()` + `compose(withErrorHandler, withRateLimit)` + `successResponse`/`Responses` deseniyle yazılır — bu kısım hiç değişmiyor.

## Error Handling

- Migration, mevcut dev veritabanındaki tüm domain tablolarını silip yenilerini oluşturan tek, temiz bir migration olarak yazılır (yukarıda "Out of Scope"ta belirtildiği gibi, veri korunmuyor).
- `example-source.ts`'in mock veri üretimi hata fırlatmaz (gerçek ağ çağrısı yok), bu yüzden gerçek API client'larındaki try/catch+mock-fallback deseni gerekmez — basitleştirilir.
- Diğer tüm hata yönetimi (auth, validasyon, ownership) mevcut `AppError`/`Responses` desenini birebir korur.

## Testing

- `tests/unit/api/example-source.test.ts` — mock veri üretici fonksiyonlarının doğru şekil döndürdüğünü test eder (mevcut `tests/unit/api/*.test.ts` desenini takip eder).
- `tests/unit/lib/notifications.test.ts` (yeni, önceden test edilmemiş bir alan) — `checkForItemUpdates()`'in artış olduğunda doğru `Notification` satırlarını oluşturduğunu, artış olmadığında oluşturmadığını test eder.
- Mevcut `tests/unit/utils/*.test.ts` (api-response, app-error, middleware) hiç değişmeden kalır.
- Manuel doğrulama: kayıt ol → browse'da ara → bir öğeyi takibe ekle → puanla → not ekle → `/api/notifications/check`'i tetikle (mock kaynağın `simulateExampleItemUpdate`'i çağrılarak) → bildirim oluştuğunu doğrula → `/my-items`'te durum/ilerleme/favori değişikliklerinin çalıştığını doğrula → `/profile/[username]`'de istatistiklerin doğru göründüğünü doğrula.
