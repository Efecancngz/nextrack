# Phase 2.3 Notifications — Döngü Optimizasyonu İnceleme Raporu

Bu rapor, `docs/superpowers/specs/2026-06-20-notifications-design.md` spesifikasyonunda önerilen bölüm kontrol döngüsünün performans analizini ve optimizasyon çözümünü içermektedir.

---

## 1. Mevcut Tasarım Analizi

Mevcut spesifikasyondaki `checkForNewEpisodes` fonksiyonu, kütüphanedeki serileri kontrol etmek için sıralı (sequential) bir `for...of` döngüsü kullanmaktadır:

```ts
for (const item of items) {
  // ...
  if (series.source === "tmdb") {
    newCount = await getTvEpisodeCount(series.externalId);
  }
  // Her istek bir öncekinin bitmesini bekler
}
```

### Risk ve Performans Sıkıntısı:
* **Sıralı Bekleme:** Kullanıcının kütüphanesinde 20 adet aktif içerik varsa ve her API sorgusu ortalama 150ms sürüyorsa, toplam süre `20 * 150ms = 3 saniye` olacaktır. Bir veya birden fazla API sorgusu yavaş yanıt verdiğinde ya da zaman aşımına uğradığında bu süre 5-10 saniyenin üzerine çıkabilir.
* **API Zaman Aşımı:** `/api/notifications/check` endpoint'i sunucu tarafında çok uzun süre açık kalacağından Gateway Timeout (504) veya sunucu kaynaklarının gereksiz bloke olması riskini artırır.

---

## 2. Önerilen Çözüm: Paralel (`Promise.all`) Yapısı

API çağrılarının sıralı yapılmak yerine aynı anda (paralel) başlatılması, toplam işlem süresini en yavaş çalışan tek bir isteğin süresine (yaklaşık 200-300ms) düşürür.

### Optimize Edilmiş Kod Taslağı:

```ts
export async function checkForNewEpisodes(userId: string): Promise<{ created: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.notificationsEnabled) return { created: 0 };

  if (user.lastNotificationCheckAt) {
    const elapsed = Date.now() - user.lastNotificationCheckAt.getTime();
    if (elapsed < THROTTLE_MS) return { created: 0 };
  }

  const items = await prisma.libraryItem.findMany({
    where: { userId },
    include: { series: true },
  });

  // Tüm istekleri paralel olarak başlatıyoruz
  const results = await Promise.all(
    items.map(async (item) => {
      const { series } = item;
      try {
        let newCount: number | null = null;
        let field: "totalEpisodes" | "totalChapters" = "totalEpisodes";

        if (series.source === "tmdb") {
          newCount = await getTvEpisodeCount(series.externalId);
          field = "totalEpisodes";
        } else if (series.source === "anilist" && series.contentType === "ANIME") {
          newCount = await getAnimeEpisodeCount(series.externalId);
          field = "totalEpisodes";
        } else if (series.source === "mangadex") {
          const { total } = await getMangaChapters(series.externalId, 1, 1);
          newCount = total;
          field = "totalChapters";
        } else {
          return 0;
        }

        const oldCount = field === "totalEpisodes" ? series.totalEpisodes : series.totalChapters;
        if (newCount !== null && oldCount !== null && newCount > oldCount) {
          const unit = field === "totalEpisodes" ? "episode" : "chapter";
          
          // Her bir güncelleme kendi içinde işlemsel (transactional) çalışır
          await prisma.$transaction([
            prisma.notification.create({
              data: {
                userId,
                seriesId: series.id,
                libraryItemId: item.id,
                message: `${series.title} just reached ${unit} ${newCount}`,
              },
            }),
            prisma.series.update({
              where: { id: series.id },
              data: { [field]: newCount },
            }),
          ]);
          return 1;
        }
      } catch (err) {
        console.error(`[Notifications] Failed to check ${series.source}-${series.externalId}:`, err);
      }
      return 0;
    })
  );

  const created = results.reduce((acc, val) => acc + val, 0);

  await prisma.user.update({
    where: { id: userId },
    data: { lastNotificationCheckAt: new Date() },
  });

  return { created };
}
```

### Bu Yaklaşımın Avantajları:
1. **Maksimum Hız:** Sorgu süresi kütüphane boyutuna bağlı olarak doğrusal (linear) artmaz, sabit (constant) kalır.
2. **Hata İzolasyonu:** `Promise.all` içindeki map fonksiyonlarında bireysel `try/catch` blokları bulunduğu için, tek bir serinin başarısız olması diğer serilerin kontrol edilmesini engellemez.
