# Free Serie Tracker 📺📚

*Read this in [Turkish / Türkçe](#türkçe)*

Free Serie Tracker is a full-stack web application designed to help users track TV series, anime, manga, manhwa, light novels, and webtoons in one place, showing the most up-to-date official streaming/reading platforms (Netflix, Crunchyroll, Disney+, etc.) where the content is legally available.

This project follows the **JustWatch** model; it does not contain pirated/illegal links and only displays legitimate and licensed publisher information.

---

## 🚀 Features (MVP)

- **Multi-Content Support**: Track TV Series, Anime, Manga, Manhwa, Light Novels, and Webtoons.
- **Official Platform Tracking (JustWatch Model)**: Integrated with TMDB, AniList, and MangaDex to list official platforms and episode details.
- **Personal Library**: Categorize content as *Watching*, *Plan to Watch*, *Completed*, *On Hold*, and *Dropped*.
- **Progress Tracking**: Record your current progress (e.g., season/episode S2E5, or chapter numbers for manga/manhwa).
- **Dual Rating System**: Display both normalized external ratings (TMDB/AniList/IMDb scale of 0-10) and your personal rating (1-10).
- **Search & Discover**: Advanced filtering by type, genre, platform, score, and status.
- **Theme Support**: Default modern dark mode, light mode, and system preference toggle.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React-based full-stack framework |
| **Language** | TypeScript | Type-safe development |
| **Database** | PostgreSQL (Neon.tech) | Serverless cloud SQL database |
| **ORM** | Prisma | Type-safe SQL client and migration runner |
| **Auth** | Auth.js (NextAuth v5) | Google OAuth & Email/Password authentication |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Premium, custom user interface design |
| **Deployment** | Cloudflare Workers + Pages | Ad-friendly, ultra-fast hosting with unlimited bandwidth |
| **Adapter** | @opennextjs/cloudflare | Bridge to run Next.js on Cloudflare Workers |
| **Monetization** | Google AdSense | Display Ads & Native Ad Cards integration |

---

## 📂 Project Structure & Documentation

Detailed architectural and design decisions are documented in the `docs/` folder:

- 📐 [architecture.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/architecture.md) — System architecture, data flow diagrams, caching & rate-limit strategies.
- 🎨 [design-patterns.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/design-patterns.md) — 13 design patterns used in the project (Repository, Strategy, Factory, Middleware, etc.) with TypeScript examples.
- 📁 [project-structure.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/project-structure.md) — Folder layout rules and layer-dependency constraints.
- 🔗 [api-contracts.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/api-contracts.md) — REST API endpoints, request/response structures, and Zod schemas.
- 📖 [swagger-setup.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/swagger-setup.md) — Swagger UI setup and JSDoc annotations.
- 🗄️ [database-schema.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/database-schema.md) — ER diagram and Prisma schema configurations.
- 📈 [phases.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/phases.md) — 3-phase roadmap and task list.
- 💸 [monetization-and-deploy.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/monetization-and-deploy.md) — Cloudflare setup, Google AdSense placement strategy, and domain management.
- 🚀 [getting-started.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/getting-started.md) — Running the app (with/without Docker), integrated APIs, and commands.

---

## 💻 Local Setup Instructions

Please refer to the detailed **[Getting Started Guide](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/getting-started.md)** for step-by-step instructions on running the project locally (using native Node.js or containerized Docker), configuring environment variables, and running database migrations.

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

---

## 📄 License
This project is designed for personal learning and portfolio purposes. All rights reserved.

<br/>
<hr/>
<br/>

# Türkçe

Free Serie Tracker, dünya genelinde yayınlanan dizi, anime, manga, manhwa, light novel ve webtoon serilerini tek bir yerden takip etmenizi sağlayan ve bu içeriklerin en güncel resmi olarak hangi yayın platformlarında (Netflix, Crunchyroll, Disney+, vb.) izlenebileceğini/okunabileceğini gösteren full-stack bir web uygulamasıdır.

Bu proje **JustWatch** modelini benimser; korsan/yasadışı içerik bağlantıları barındırmaz, yalnızca yasal ve lisanslı yayıncı bilgilerini gösterir.

---

## 🚀 Özellikler (MVP)

- **Çoklu İçerik Desteği**: TV Dizileri, Anime, Manga, Manhwa, Light Novel ve Webtoon takibi.
- **Resmi Platform Takibi (JustWatch Modeli)**: TMDB, AniList ve MangaDex entegrasyonu ile resmi izleme/okuma platformlarını ve bölüm detaylarını listeleme.
- **Kişisel Kütüphane**: İçerikleri *İzliyorum (Watching)*, *Planlıyorum (Plan)*, *Tamamlandı (Completed)*, *Beklemede (On Hold)* ve *Bırakıldı (Dropped)* şeklinde kategorize etme.
- **İlerleme Takibi**: Hangi sezonda, hangi bölümde (örn: S2E5) veya manga/manhwalarda kaçıncı sayfada/bölümde kaldığını kaydetme.
- **Çiftli Puanlama Sistemi**: Hem dış kaynaklardan gelen normalize edilmiş puanları (TMDB/AniList/IMDb 0-10) hem de kişisel 1-10 puanlamanızı görüntüleme.
- **Arama ve Keşfet**: Tür, platform, puan ve içerik tipine göre gelişmiş filtreleme özellikleri.
- **Tema Desteği**: Gözü yormayan modern karanlık tema (Dark mode default), aydınlık tema ve sistem tercihi desteği.

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React tabanlı full-stack framework |
| **Dil** | TypeScript | Güvenli ve ölçeklenebilir kod yapısı |
| **Veritabanı** | PostgreSQL (Neon.tech) | Sunucusuz (Serverless) SQL veritabanı |
| **ORM** | Prisma | Tip güvenli SQL sorguları ve şema yönetimi |
| **Kimlik Doğrulama** | Auth.js (NextAuth v5) | Google OAuth & E-posta/Şifre girişi |
| **Tasarım / Stil** | Tailwind CSS v4 + shadcn/ui | Özel, modern ve premium arayüz |
| **Dağıtım (Deploy)** | Cloudflare Workers + Pages | Reklam dostu, yüksek hızlı ve sınırsız bant genişliği |
| **Adaptör** | @opennextjs/cloudflare (OpenNext) | Next.js'i Cloudflare Workers üzerinde çalıştırma köprüsü |
| **Gelir Modeli** | Google AdSense | Display Ads & Native Ad Cards entegrasyonu |

---

## 📂 Proje Yapısı ve Dokümantasyon

Tüm mimari ve tasarım kararları projenin `docs/` klasöründe detaylıca belgelenmiştir:

- 📐 [architecture.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/architecture.md) — Sistem mimarisi, veri akış şemaları, caching ve rate limit kuralları.
- 🎨 [design-patterns.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/design-patterns.md) — Projede kullanılan 13 tasarım deseni (Repository, Strategy, Factory, Custom HOF Middleware, vb.) ve TypeScript örnekleri.
- 📁 [project-structure.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/project-structure.md) — Dosya ve klasör yapısı kuralları, katmanlar arası yasaklı ilişkiler.
- 🔗 [api-contracts.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/api-contracts.md) — REST API uç noktaları, istek/yanıt şemaları ve Zod doğrulama kuralları.
- 📖 [swagger-setup.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/swagger-setup.md) — Swagger UI kurulumu ve JSDoc tanımlamaları.
- 🗄️ [database-schema.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/database-schema.md) — Veritabanı ER şeması ve Prisma tanımlamaları.
- 📈 [phases.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/phases.md) — 3 fazdan oluşan yol haritası ve yapılacaklar listesi.
- 💸 [monetization-and-deploy.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/monetization-and-deploy.md) — Cloudflare kurulumu, Google AdSense yerleşimleri ve domain yönetimi.
- 🚀 [getting-started.md](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/getting-started.md) — Docker'lı veya Docker'sız çalıştırma rehberi, entegre API'ler ve veritabanı komutları.

---

## 💻 Yerel Geliştirme Kurulumu

Detaylı çalıştırma talimatları (Docker konteyner desteği, Neon PostgreSQL kurulumu, çevre değişkenleri ve Prisma komutları dahil) için **[Başlangıç Rehberi](file:///c:/Users/efeca/OneDrive/Masaüstü/serietracker/docs/getting-started.md)** belgesini inceleyebilirsiniz.

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

---

## 📄 Lisans
Bu proje kişisel gelişim amaçlı tasarlanmış olup tüm hakları saklıdır.
