# Phase 2.5 Language/Translation Tracking — Mimari İnceleme Raporu

Bu rapor, **Phase 2.5 (Language/Translation Tracking)** aşaması kapsamında önerilen mimariyi değerlendirmek ve Cloudflare Workers ortamındaki kritik entegrasyon risklerini çözmek amacıyla hazırlanmıştır.

---

## 1. Genel Mimari Değerlendirmesi

Önerilen mimari yaklaşım, projenin Cloudflare Workers ve OpenNext altyapısına son derece uygundur:

* **custom-worker.ts Sarmalayıcısı:** OpenNext'in ürettiği `.open-next/worker.js` dosyasını sarmalayıp `scheduled()` handler'ı eklemek, Next.js projelerinde cron görevlerini çalıştırmak için en temiz ve performanslı yöntemdir.
* **MangaDex İstek Tekilleştirme (Deduplication):** Aynı seriyi ve dili bekleyen birden fazla kullanıcı olduğunda MangaDex'e tek bir istek atılıp sonucun dağıtılması, hem API rate limitlerini (5 req/sec limitini) korur hem de cron işleminin çalışma süresini kısaltır.
* **EpisodeLanguage Modeli:** `(seriesId, language)` üzerinde unique kurgulanan bu model, dil bazlı en son bilinen bölüm sayılarını saklamak için en verimli ve yalın veri tasarımıdır.

---

## 2. Kritik Entegrasyon Riski: Cloudflare Workers scheduled() ve Prisma Modül Yükleme Hatası

### Risk Analizi:
Cloudflare Workers (ve genel olarak serverless ortamlar) çalışırken global `process.env` modül yükleme (module evaluation) anında henüz tanımlanmamıştır. Ortam değişkenleri ve veritabanı bağlantı linkleri (`DATABASE_URL`), sadece handler fonksiyonları (`fetch` veya `scheduled`) tetiklendiğinde `env` parametresi aracılığıyla Workers'a paslanır.

Eğer `custom-worker.ts` dosyasında Prisma istemcisini (`src/lib/db/prisma.ts`) en üstte standart import olarak çağırırsak:
1. Prisma modülü `DATABASE_URL` henüz boştayken yüklenir.
2. `prisma.ts` içindeki bağlantı dizesi varsayılan değere (`postgresql://mock:mock@localhost:5432/mock`) kilitlenir.
3. Cron tetiklendiğinde veritabanına bağlanılamaz ve işlem çöker.

---

## 3. Önerilen Çözüm (Dinamik Import & Env Mapping)

Bu sorunu aşmak için ortam değişkenlerini `process.env`'e kopyaladıktan sonra veritabanı işlemlerini yürütecek dosyaları **dinamik olarak (`await import(...)`)** içe aktarmalıyız. Ayrıca cron sürecinin yarıda kesilmesini önlemek amacıyla `ctx.waitUntil` kullanılmalıdır.

### `custom-worker.ts` Örnek Uygulaması:

```ts
// custom-worker.ts
import defaultWorker from "./.open-next/worker.js";

export default {
  async fetch(request, env, ctx) {
    return defaultWorker.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    // 1. Ortam değişkenlerini haritalandır (Prisma'nın okuyabilmesi için)
    process.env.DATABASE_URL = env.DATABASE_URL;
    process.env.DIRECT_URL = env.DIRECT_URL;
    
    // 2. Modülleri dinamik olarak içe aktar (Module evaluation bu satırda gerçekleşecek)
    const { checkLanguageAvailability } = await import("./src/lib/notifications");
    
    // 3. Cloudflare'e asenkron iş bitene kadar çalışmayı durdurmamasını söyle
    ctx.waitUntil(checkLanguageAvailability());
  }
};
```

### Wrangler Yapılandırması (`wrangler.toml`):
```toml
# Main giriş noktasını custom-worker.ts olarak güncelle
main = "custom-worker.ts"

[triggers]
crons = ["0 */2 * * *"] # 2 saatte bir tetiklenir
```
