# Phase 2.3 Notifications — Mimari İnceleme ve Değerlendirme Raporu

Bu rapor, **Phase 2.3 (Notifications)** aşaması kapsamında önerilen mimariyi değerlendirmek ve performans/kullanıcı deneyimi optimizasyonlarını sunmak amacıyla hazırlanmıştır.

---

## 1. Genel Değerlendirme

Önerilen mimari altyapı genel hatlarıyla oldukça sağlam, kaynak dostu ve projenin mevcut yapısına tam uyumludur.

* **Prisma Notification Modeli:** `id`, `userId`, `seriesId`, `libraryItemId`, `message`, `isRead`, `createdAt` alanları bildirimlerin yönetimi, listelenmesi ve ilgili seriye kolayca link verilmesi için tam olarak yeterlidir.
* **Kullanıcı Ayarları:** `notificationsEnabled` ile kullanıcılara bildirimleri kapatma seçeneği sunulması ve `lastNotificationCheckAt` ile veritabanı/API sorgularının throttling (sınırlandırma) mekanizmasına tabi tutulması kaynak tüketimini optimize eder.
* **Hafifletilmiş Harici Sorgular:** Manga Dex için `getMangaChapters(mangaId, 1, 1)` gibi sadece toplam bölüm sayısını dönen hafif sorguların tercih edilmesi rate limit koruması açısından kritik bir kazançtır.

---

## 2. Mimari Riskler ve Çözüm Önerisi (Tetikleme Mekanizması)

### Risk: Server-Side Bloke Etme Sorunu (layout.tsx)
Eğer bildirim kontrolü `layout.tsx` gibi root seviyesindeki bir **Server Component** içinde `await checkForNewEpisodes(userId)` şeklinde tetiklenirse:
1. **Sayfa Yükleme Gecikmesi:** Throttling süresi dolduğunda (örn. 1 saatte bir), kullanıcı herhangi bir sayfaya girdiğinde arka plandaki tüm API isteklerinin (belki 20-50 arası harici sorgu) tamamlanmasını beklemek zorunda kalacaktır. Bu durum sayfa açılışını saniyelerce bloke eder.
2. **Serverless Kısıtı:** Kontrolü `await` kullanmadan arka planda çalıştırmayı denemek, Cloudflare Workers/Pages veya AWS Lambda gibi serverless ortamlarda container'ın yanıt döner dönmez hemen dondurulmasından (freeze) dolayı arka plan işinin yarıda kesilmesine sebep olur.

### Çözüm: Client-Side Trigger + Lightweight API Endpoint
Bu riski çözmek için tetikleme mekanizmasının **asenkron (non-blocking)** olarak tasarlanması önerilir:

1. **Client-Side Trigger:** Navbar veya root layout içerisine görünmez, hafif bir Client Component (`NotificationTrigger`) yerleştirilir. Bu bileşen, sayfa tarayıcıya yüklendikten sonra `useEffect` ile asenkron olarak sunucuya istek atar:
   ```ts
   // src/components/NotificationTrigger.tsx
   "use client";
   import { useEffect } from "react";

   export default function NotificationTrigger() {
     useEffect(() => {
       fetch("/api/notifications/check", { method: "POST" }).catch(console.error);
     }, []);

     return null;
   }
   ```
2. **API Endpoint (`POST /api/notifications/check`):** Sunucu tarafındaki bu endpoint:
   * Kullanıcının en son ne zaman kontrol yaptığını (`lastNotificationCheckAt`) kontrol eder.
   * Son kontrolün üzerinden 1 saat geçmemişse hemen `200 OK` (no-op) döner.
   * Kontrol süresi dolmuşsa harici API sorgularını çalıştırır, yeni bölümleri tespit edip `Notification` tablosuna yazar ve `Series` tablosundaki `totalEpisodes` / `totalChapters` alanlarını günceller.
3. **Zil İkonu (Bell Icon) Entegrasyonu:** Bu sayede kullanıcılar site içinde dolaşırken sayfa yükleme gecikmesi yaşamazlar ve kontrol tamamlandığında zil ikonunun yanındaki bildirim rozeti dinamik olarak güncellenebilir.
