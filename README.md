# Generic SaaS Starter

*Read this in [Turkish / Türkçe](#türkçe)*

Generic SaaS Starter is a full-stack Next.js 16 template demonstrating a working pattern for auth, personal content tracking, dual ratings, and cron-based notifications — built on a content-agnostic `Item`/`UserItem` data model you can adapt to any domain (a course tracker, a reading list, a habit tracker, a watch list — anything with "items a user tracks progress and opinions on").

This is a portfolio/demonstration project, not a live product. It ships with one placeholder example data source (`src/lib/api/example-source.ts`) standing in for a real external API integration — see [api-sources.md](docs/api-sources.md) for the pattern to follow when wiring in a real one.

---

## 🚀 Features

- **Auth.js v5**: Google OAuth + email/password, JWT sessions, custom username-setup flow.
- **Generic tracking model**: `Item` (category/status/title/rating, no domain-specific fields) + `UserItem` (personal tracking status, favorite toggle, a single generic progress counter, notes).
- **Personal tracking statuses**: Active, Planned, Completed, Paused, Dropped — with a status-filtered, grid/list-toggleable tracking board.
- **Dual rating system**: external rating (cached on the `Item`) alongside a personal 1-10 score + review.
- **Search & browse**: debounced search with autocomplete suggestions, category/status filtering.
- **In-app notifications**: a real Cloudflare Cron-driven (well — request-triggered, throttled server-side) check for item updates, with a bell-icon dropdown and on/off toggle.
- **Public profile pages**: per-user stats (tracked-by-category counts, total progress, average rating) and a favorites grid, no auth required to view.
- **Theme support**: dark mode default, light mode, system preference.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React-based full-stack framework |
| **Language** | TypeScript | Type-safe development |
| **Database** | PostgreSQL (Neon.tech) | Serverless cloud SQL database |
| **ORM** | Prisma | Type-safe SQL client and migration runner |
| **Auth** | Auth.js (NextAuth v5) | Google OAuth & Email/Password authentication |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Custom UI, not generic AI-template look |
| **Deployment** | Cloudflare Workers + Pages | Free tier, unlimited bandwidth |
| **Adapter** | @opennextjs/cloudflare | Bridge to run Next.js on Cloudflare Workers |

---

## 📂 Project Structure & Documentation

Architectural and design decisions are documented in the `docs/` folder:

- 📐 [architecture.md](docs/architecture.md) — System architecture, data flow, caching & rate-limit strategy (describes what's actually built, not an aspirational target).
- 🎨 [design-patterns.md](docs/design-patterns.md) — The patterns actually used in this codebase (HOF middleware composition, error factory, generic response wrapper) with real examples.
- 📁 [project-structure.md](docs/project-structure.md) — Folder layout and naming conventions.
- 🔗 [api-contracts.md](docs/api-contracts.md) — REST API endpoints, request/response shapes, and Zod schemas.
- 🗄️ [database-schema.md](docs/database-schema.md) — ER diagram and Prisma schema.
- 🌐 [api-sources.md](docs/api-sources.md) — The example-data-source pattern for plugging in a real external API.
- 🚀 [deploy.md](docs/deploy.md) — Cloudflare Workers deploy guidance.
- 📈 [phases.md](docs/phases.md) — Development history, including the pivot from a TV-tracker product to this generic template.
- 🏁 [getting-started.md](docs/getting-started.md) — Local setup (with/without Docker), environment variables, and Prisma commands.

---

## 💻 Local Setup Instructions

See the **[Getting Started Guide](docs/getting-started.md)** for step-by-step local setup (native Node.js or Docker), environment variable configuration, and database migrations.

---

## 🚀 Production Deployment

To deploy to Cloudflare Workers & Pages:

```bash
# Login to Cloudflare account
npx wrangler login

# Build & deploy the project with OpenNext
npx opennextjs-cloudflare build
npx wrangler deploy
```

See [deploy.md](docs/deploy.md) for the full Cloudflare setup and why it's used instead of Vercel.

---

## 📄 License
This project is built for portfolio and demonstration purposes. All rights reserved.

<br/>
<hr/>
<br/>

# Türkçe

Generic SaaS Starter, kimlik doğrulama, kişisel içerik takibi, çiftli puanlama sistemi ve cron tabanlı bildirimler için çalışan bir örüntüyü gösteren, Next.js 16 üzerine kurulu full-stack bir şablon projedir. Herhangi bir alana uyarlanabilen, içerik bağımsız bir `Item`/`UserItem` veri modeli üzerine inşa edilmiştir (kurs takibi, okuma listesi, alışkanlık takibi, izleme listesi — kullanıcının ilerleme ve görüş kaydettiği her şey).

Bu proje canlı bir ürün değil, bir portfolyo/demo projesidir. Gerçek bir dış API entegrasyonunun yerine geçen tek bir örnek veri kaynağıyla (`src/lib/api/example-source.ts`) birlikte gelir — gerçek bir kaynak bağlamak için izlenecek örüntü için [api-sources.md](docs/api-sources.md) dosyasına bakın.

---

## 🚀 Özellikler

- **Auth.js v5**: Google OAuth & e-posta/şifre girişi, JWT oturumları, özel kullanıcı adı belirleme akışı.
- **Generic takip modeli**: `Item` (kategori/durum/başlık/puan, alana özgü alan yok) + `UserItem` (kişisel takip durumu, favori, tek bir generic ilerleme sayacı, notlar).
- **Kişisel takip durumları**: Active, Planned, Completed, Paused, Dropped — durum filtreli, grid/liste geçişli bir takip panosu ile.
- **Çiftli puanlama sistemi**: `Item` üzerinde önbelleğe alınan dış puan, kişisel 1-10 puan + yorumun yanında.
- **Arama ve keşfet**: debounce'lu arama, otomatik tamamlama önerileri, kategori/durum filtreleme.
- **Uygulama içi bildirimler**: öğe güncellemeleri için sunucu tarafında saatlik throttle edilen bir kontrol, zil ikonlu açılır liste ve aç/kapa anahtarı ile.
- **Herkese açık profil sayfaları**: kullanıcı başına istatistikler (kategoriye göre takip sayısı, toplam ilerleme, ortalama puan) ve favoriler ızgarası, görüntülemek için giriş gerekmez.
- **Tema desteği**: varsayılan karanlık tema, aydınlık tema, sistem tercihi.

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React tabanlı full-stack framework |
| **Dil** | TypeScript | Güvenli ve ölçeklenebilir kod yapısı |
| **Veritabanı** | PostgreSQL (Neon.tech) | Sunucusuz (Serverless) SQL veritabanı |
| **ORM** | Prisma | Tip güvenli SQL sorguları ve şema yönetimi |
| **Kimlik Doğrulama** | Auth.js (NextAuth v5) | Google OAuth & E-posta/Şifre girişi |
| **Tasarım / Stil** | Tailwind CSS v4 + shadcn/ui | Özel arayüz, generic AI şablon görünümünde değil |
| **Dağıtım (Deploy)** | Cloudflare Workers + Pages | Ücretsiz katman, sınırsız bant genişliği |
| **Adaptör** | @opennextjs/cloudflare (OpenNext) | Next.js'i Cloudflare Workers üzerinde çalıştırma köprüsü |

---

## 📂 Proje Yapısı ve Dokümantasyon

Mimari ve tasarım kararları `docs/` klasöründe belgelenmiştir:

- 📐 [architecture.md](docs/architecture.md) — Sistem mimarisi, veri akışı, caching ve rate-limit stratejisi (gerçekte ne inşa edildiğini anlatır, ulaşılmamış bir hedefi değil).
- 🎨 [design-patterns.md](docs/design-patterns.md) — Bu kod tabanında gerçekten kullanılan pattern'ler (HOF middleware kompozisyonu, hata factory'si, generic response wrapper) gerçek örneklerle.
- 📁 [project-structure.md](docs/project-structure.md) — Klasör yapısı ve isimlendirme kuralları.
- 🔗 [api-contracts.md](docs/api-contracts.md) — REST API uç noktaları, istek/yanıt şemaları ve Zod doğrulama kuralları.
- 🗄️ [database-schema.md](docs/database-schema.md) — ER şeması ve Prisma tanımlamaları.
- 🌐 [api-sources.md](docs/api-sources.md) — Gerçek bir dış API bağlamak için örnek-veri-kaynağı örüntüsü.
- 🚀 [deploy.md](docs/deploy.md) — Cloudflare Workers deploy rehberi.
- 📈 [phases.md](docs/phases.md) — Geliştirme geçmişi, TV-tracker ürününden bu generic şablona geçiş dahil.
- 🏁 [getting-started.md](docs/getting-started.md) — Yerel kurulum (Docker'lı/Docker'sız), çevre değişkenleri ve Prisma komutları.

---

## 💻 Yerel Geliştirme Kurulumu

Adım adım yerel kurulum (native Node.js veya Docker), çevre değişkeni yapılandırması ve veritabanı migration'ları için **[Başlangıç Rehberi](docs/getting-started.md)** belgesine bakın.

---

## 🚀 Canlıya Dağıtım (Deployment)

Cloudflare Workers ve Pages kullanarak canlıya almak için:

```bash
# Cloudflare hesabı ile yetkilendirme
npx wrangler login

# Projeyi OpenNext ile derleme ve deploy etme
npx opennextjs-cloudflare build
npx wrangler deploy
```

Cloudflare kurulumunun tamamı ve neden Vercel yerine Cloudflare kullanıldığı için [deploy.md](docs/deploy.md) dosyasına bakın.

---

## 📄 Lisans
Bu proje portfolyo ve demo amaçlı geliştirilmiştir. Tüm hakları saklıdır.
